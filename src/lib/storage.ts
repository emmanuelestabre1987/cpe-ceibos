import { supabase } from './supabase'
import type {
  CpeRecord,
  CpeStatus,
  AuditEntry,
  AuthorizedEmail,
  ImportBatch,
  RecordFormData,
} from '../types'

// ── ID ──────────────────────────────────────────────────────

/**
 * Genera el siguiente CPE ID vía RPC atómica.
 * El contador en Postgres se incrementa con UPDATE ... RETURNING,
 * lo que evita cualquier race condition del patrón read-then-write.
 */
export async function getNextId(): Promise<string> {
  const { data, error } = await supabase.rpc('get_next_cpe_id')
  if (error) throw error
  return data as string
}

// ── Records ─────────────────────────────────────────────────

export async function getRecords(): Promise<CpeRecord[]> {
  const { data, error } = await supabase
    .from('cpe_records')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []) as CpeRecord[]
}

export async function getRecord(id: string): Promise<CpeRecord | null> {
  const { data, error } = await supabase
    .from('cpe_records')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) throw error
  return data as CpeRecord | null
}

export async function createRecord(
  formData: RecordFormData,
  userEmail: string
): Promise<CpeRecord> {
  const cpe_id = await getNextId()

  const { data, error } = await supabase
    .from('cpe_records')
    .insert({
      ...formData,
      cpe_id,
      status: 'TRANSPORTE',
      created_by: userEmail,
      imported_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) throw error

  try {
    await addAuditEntry({
      record_id: cpe_id,
      action: 'CREACIÓN',
      user_email: userEmail,
      field_name: null,
      old_value: null,
      new_value: null,
    })
  } catch {
    // Audit failure must not roll back a successful record save
  }

  return data as CpeRecord
}

export async function updateRecord(
  id: string,
  cpe_id: string,
  changes: Partial<RecordFormData>,
  original: CpeRecord,
  userEmail: string
): Promise<void> {
  const { error } = await supabase
    .from('cpe_records')
    .update(changes)
    .eq('id', id)

  if (error) throw error

  const entries = Object.entries(changes)
    .filter(([key, val]) => original[key as keyof CpeRecord] !== val)
    .map(([key, val]) => ({
      record_id: cpe_id,
      action: 'MODIFICACIÓN' as const,
      user_email: userEmail,
      field_name: key,
      old_value: String(original[key as keyof CpeRecord] ?? ''),
      new_value: String(val ?? ''),
    }))

  if (entries.length > 0) {
    const { error: auditError } = await supabase.from('audit_log').insert(entries)
    if (auditError) throw auditError
  }
}

// ── Import batches ───────────────────────────────────────────

export async function getImportBatches(): Promise<ImportBatch[]> {
  const { data, error } = await supabase
    .from('import_batches')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []) as ImportBatch[]
}

export async function createImportBatch(
  batch: Omit<ImportBatch, 'id' | 'created_at'>
): Promise<ImportBatch> {
  const { data, error } = await supabase
    .from('import_batches')
    .insert(batch)
    .select()
    .single()

  if (error) throw error
  return data as ImportBatch
}

export async function getCuposByBatch(batchId: string): Promise<CpeRecord[]> {
  const { data, error } = await supabase
    .from('cpe_records')
    .select('*')
    .eq('batch_id', batchId)
    .order('fecha_carga', { ascending: true })

  if (error) throw error
  return (data ?? []) as CpeRecord[]
}

/**
 * Inserta múltiples cupos en una sola operación atómica.
 *
 * Atomicidad garantizada en dos niveles:
 * 1. Los IDs se reservan todos de una vez con get_next_cpe_ids(n) — un solo
 *    UPDATE en Postgres, sin riesgo de IDs duplicados entre requests concurrentes.
 * 2. El INSERT masivo es una única sentencia SQL: o se insertan todos o ninguno.
 *
 * Si el INSERT falla, los IDs quedan "consumidos" en el contador pero no existe
 * ningún registro con esos IDs — es un gap inofensivo, aceptable para este dominio.
 */
export async function createCuposEnLote(
  batchId: string,
  cupos: Omit<CpeRecord, 'id' | 'cpe_id' | 'created_at' | 'updated_at'>[],
  userEmail: string
): Promise<CpeRecord[]> {
  if (cupos.length === 0) return []

  const { data: ids, error: idsError } = await supabase.rpc('get_next_cpe_ids', {
    p_n: cupos.length,
  })
  if (idsError) throw idsError

  const cpeIds = ids as string[]
  const now = new Date().toISOString()

  const records = cupos.map((cupo, i) => ({
    ...cupo,
    cpe_id: cpeIds[i],
    batch_id: batchId,
    status: 'IMPORTADO' as const,
    created_by: userEmail,
    imported_at: now,
  }))

  const { data, error } = await supabase
    .from('cpe_records')
    .insert(records)
    .select()

  if (error) {
    if (error.code === '23505') {
      // Buscar cuáles cupos ya existen para informar al usuario
      const codigosLote = cupos.map(c => c.cupo).filter(Boolean)
      try {
        const { data: existentes } = await supabase
          .from('cpe_records')
          .select('cupo, status')
          .in('cupo', codigosLote as string[])
        if (existentes && existentes.length > 0) {
          const detalle = existentes
            .map((r: { cupo: string; status: string }) => `${r.cupo} (${r.status})`)
            .join(', ')
          throw new Error(
            `Los siguientes cupos ya existen en el sistema: ${detalle}. Cancelalos y eliminalos desde el panel antes de reimportar.`
          )
        }
      } catch (innerErr) {
        if (innerErr instanceof Error && innerErr.message.startsWith('Los siguientes')) throw innerErr
      }
      throw new Error(
        'Uno o más cupos de este lote ya existen en el sistema. Cancelalos y eliminalos desde el panel antes de reimportar.'
      )
    }
    throw error
  }

  const createdRecords = (data ?? []) as CpeRecord[]

  // Registrar la creación de cada cupo en el audit log (best-effort)
  try {
    const auditEntries = createdRecords.map((r) => ({
      record_id: r.cpe_id,
      action: 'CREACIÓN' as const,
      user_email: userEmail,
      field_name: null,
      old_value: null,
      new_value: `batch:${batchId}`,
    }))
    await supabase.from('audit_log').insert(auditEntries)
  } catch {
    // Audit failure must not roll back a successful batch import
  }

  return createdRecords
}

// ── Status transitions ───────────────────────────────────────

/**
 * Actualiza el status de un cupo y registra el cambio en audit_log.
 * Recibe el cpe_id (ej. "CPE-0001"), no el UUID interno.
 */
export async function updateCupoStatus(
  cpeId: string,
  newStatus: CpeStatus,
  userEmail: string
): Promise<void> {
  const { data: current, error: fetchError } = await supabase
    .from('cpe_records')
    .select('status')
    .eq('cpe_id', cpeId)
    .single()

  if (fetchError) throw fetchError

  const { error } = await supabase
    .from('cpe_records')
    .update({ status: newStatus })
    .eq('cpe_id', cpeId)

  if (error) throw error

  await addAuditEntry({
    record_id: cpeId,
    action: 'CAMBIO_ESTADO',
    user_email: userEmail,
    field_name: 'status',
    old_value: current.status,
    new_value: newStatus,
  })
}

// ── Audit log ────────────────────────────────────────────────

export async function getAuditLog(cpe_id: string): Promise<AuditEntry[]> {
  const { data, error } = await supabase
    .from('audit_log')
    .select('*')
    .eq('record_id', cpe_id)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []) as AuditEntry[]
}

export async function getAllAuditLog(): Promise<AuditEntry[]> {
  const { data, error } = await supabase
    .from('audit_log')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []) as AuditEntry[]
}

export async function addAuditEntry(
  entry: Omit<AuditEntry, 'id' | 'created_at'>
): Promise<void> {
  const { error } = await supabase.from('audit_log').insert(entry)
  if (error) throw error
}

// ── Authorized emails ────────────────────────────────────────

export async function getAuthorizedEmails(): Promise<AuthorizedEmail[]> {
  const { data, error } = await supabase
    .from('authorized_emails')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []) as AuthorizedEmail[]
}

export async function addAuthorizedEmail(
  email: string,
  createdBy: string,
  isAdmin = false
): Promise<void> {
  const { error } = await supabase.from('authorized_emails').insert({
    email: email.toLowerCase().trim(),
    created_by: createdBy,
    is_admin: isAdmin,
  })
  if (error) throw error
}

export async function removeAuthorizedEmail(id: string): Promise<void> {
  const { error } = await supabase.from('authorized_emails').delete().eq('id', id)
  if (error) throw error
}

// ── Delete record ────────────────────────────────────────────

export async function deleteRecord(
  id: string,
  userEmail: string
): Promise<void> {
  const { data, error: fetchError } = await supabase
    .from('cpe_records')
    .select('cpe_id, status')
    .eq('id', id)
    .maybeSingle()

  if (fetchError) throw fetchError
  if (!data) throw new Error('Registro no encontrado')

  const { error: auditError } = await supabase.from('audit_log').insert({
    record_id: data.cpe_id,
    action: 'MODIFICACIÓN',
    user_email: userEmail,
    field_name: 'status',
    old_value: data.status,
    new_value: 'ELIMINADO',
  })
  if (auditError) throw auditError

  const { error: deleteError, count } = await supabase
    .from('cpe_records')
    .delete({ count: 'exact' })
    .eq('id', id)
  if (deleteError) throw deleteError
  if (count === 0) throw new Error('Sin permisos para eliminar este registro. Verificá las políticas RLS en Supabase.')
}
