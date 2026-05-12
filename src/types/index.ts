// ============================================================
// Tipos de dominio
// ============================================================

export type CpeStatus = 'IMPORTADO' | 'TRANSPORTE' | 'CARGADO' | 'CERRADO' | 'ENVIADO' | 'CANCELADO'

export type AuditAction = 'CREACIÓN' | 'MODIFICACIÓN' | 'CAMBIO_ESTADO' | 'NOTIFICACION_WA'

export interface CpeRecord {
  id: string
  cpe_id: string
  // Metadata
  status: CpeStatus
  created_by: string | null
  created_at: string
  updated_at: string
  imported_at: string | null
  batch_id: string | null
  // General
  fecha_carga: string | null
  campo: string | null
  localidad: string | null
  grano: string | null
  variedad: string | null
  declaracion_calidad: 'conforme' | 'condicional' | null
  es_campo_origen: boolean | null
  descripcion_origen: string | null
  renspa: string | null
  campania: string | null
  // Comercial
  titular_nombre: string | null
  titular_cuit: string | null
  remitente_comercial_nombre: string | null
  remitente_comercial_cuit: string | null
  destinatario: string | null
  cuit_destinatario: string | null
  destino: string | null
  cuit_destino: string | null
  rte_venta_primaria: string | null
  cuit_rte_venta_primaria: string | null
  rte_venta_secundaria: string | null
  cuit_rte_venta_secundaria: string | null
  rte_venta_secundaria2: string | null
  mercado_termino: string | null
  corredor_primario: string | null
  cuit_corredor_primario: string | null
  corredor_secundario: string | null
  cuit_corredor_secundario: string | null
  repr_entregador: string | null
  cuit_repr_entregador: string | null
  repr_recibidor: string | null
  cuit_repr_recibidor: string | null
  // Flete
  km: number | null
  tarifa: number | null
  pagador_flete: string | null
  cupo: string | null
  intermediario_flete: string | null
  cuil_intermediario: string | null
  nro_planta: string | null
  nro_turno: string | null
  provincia_origen: string | null
  provincia_destino: string | null
  es_campo_destino: boolean | null
  direccion_destino: string | null
  observaciones: string | null
  // Transporte
  transporte: string | null
  cuit_transporte: string | null
  chofer: string | null
  cuil_chofer: string | null
  chasis: string | null
  acoplado: string | null
  fecha_partida: string | null
  // Pesaje
  kg_bruto_cargados: number | null
  kg_tara_cargados: number | null
  kg_estimados: number | null
  kg_bruto_descargados: number | null
  kg_tara_descargados: number | null
  // Cierre
  nro_ruca: string | null
  gps: string | null
  latitud: number | null
  longitud: number | null
}

export interface AuditEntry {
  id: string
  record_id: string
  action: AuditAction
  user_email: string
  field_name: string | null
  old_value: string | null
  new_value: string | null
  created_at: string
}

export interface AuthorizedEmail {
  id: string
  email: string
  is_admin: boolean
  created_by: string | null
  created_at: string
}

export interface ParsedEmailData {
  grano: string
  localidad: string
  campo?: string
  variedad?: string
  destinatario: string
  cuit_destinatario: string
  destino: string
  cuit_destino: string
  rte_venta_primaria: string
  nro_planta: string
  kg_estimados: number
  cupos: Array<{ codigo: string; fecha: string }>
}

export interface ImportBatch {
  id: string
  raw_email_text: string
  parsed_data: ParsedEmailData
  created_by: string
  created_at: string
  total_cupos: number
  grano: string
  destinatario: string
  destino: string
}

export type WizardStep = 1 | 2 | 3 | 4 | 5 | 6

// Campos del formulario: excluye todos los campos de metadata gestionados internamente
export type RecordFormData = Omit<
  CpeRecord,
  'id' | 'cpe_id' | 'status' | 'created_by' | 'created_at' | 'updated_at' | 'imported_at' | 'batch_id'
>

// ============================================================
// Tipo Database para el cliente Supabase tipado
// ============================================================

export type Database = {
  public: {
    Tables: {
      cpe_records: {
        Row: CpeRecord
        Insert: Omit<CpeRecord, 'id' | 'created_at' | 'updated_at'> & {
          id?: string
          created_at?: string
          updated_at?: string
          status?: CpeStatus
        }
        Update: Partial<Omit<CpeRecord, 'id'>>
        Relationships: []
      }
      audit_log: {
        Row: AuditEntry
        Insert: Omit<AuditEntry, 'id' | 'created_at'> & {
          id?: string
          created_at?: string
        }
        Update: Partial<Omit<AuditEntry, 'id'>>
        Relationships: []
      }
      authorized_emails: {
        Row: AuthorizedEmail
        Insert: Omit<AuthorizedEmail, 'id' | 'created_at'> & {
          id?: string
          created_at?: string
          is_admin?: boolean
        }
        Update: Partial<Omit<AuthorizedEmail, 'id'>>
        Relationships: []
      }
      id_counter: {
        Row: { id: number; counter: number }
        Insert: { id?: number; counter?: number }
        Update: { counter?: number }
        Relationships: []
      }
      import_batches: {
        Row: ImportBatch
        Insert: Omit<ImportBatch, 'id' | 'created_at'> & {
          id?: string
          created_at?: string
        }
        Update: Partial<Omit<ImportBatch, 'id'>>
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_next_cpe_id: {
        Args: Record<never, never>
        Returns: string
      }
      get_next_cpe_ids: {
        Args: { p_n: number }
        Returns: string[]
      }
      is_authorized_user: {
        Args: { p_email: string }
        Returns: boolean
      }
      is_admin_user: {
        Args: { p_email: string }
        Returns: boolean
      }
    }
  }
}

// ============================================================
// Constantes de dominio
// ============================================================

export const CPE_STATUS_ORDER: CpeStatus[] = [
  'IMPORTADO',
  'TRANSPORTE',
  'CARGADO',
  'CERRADO',
  'ENVIADO',
]

export const CAMPOS = [
  'La Esperanza',
  'San Martín',
  'El Triunfo',
  'Las Pampas',
  'Don Julio',
  'El Amanecer',
]

export const GRANOS = ['Maíz', 'Soja', 'Trigo', 'Girasol', 'Sorgo', 'Cebada']

export const VARIEDADES = [
  'DK 7210',
  'SY 4x4',
  'Klein Rayo',
  'Hysun 333',
  'NK Tiburón',
  'AW 190 CL',
]

export const LOCALIDADES = [
  'Córdoba',
  'Rosario',
  'Buenos Aires',
  'Santa Fe',
  'Tucumán',
  'Salta',
  'Río Cuarto',
  'Venado Tuerto',
]

export const FIELD_LABELS: Record<string, string> = {
  fecha_carga: 'Fecha de carga',
  campo: 'Campo',
  localidad: 'Localidad',
  grano: 'Grano',
  variedad: 'Variedad',
  declaracion_calidad: 'Declaración de Calidad',
  es_campo_origen: 'Es un campo',
  descripcion_origen: 'Descripción',
  renspa: 'RENSPA',
  campania: 'Campaña',
  titular_nombre: 'Titular Carta de Porte',
  titular_cuit: 'CUIT Titular',
  remitente_comercial_nombre: 'Remitente Comercial Productor',
  remitente_comercial_cuit: 'CUIT Remitente Comercial',
  destinatario: 'Destinatario',
  cuit_destinatario: 'CUIT Destinatario',
  destino: 'Destino',
  cuit_destino: 'CUIT Destino',
  rte_venta_primaria: 'Rte. Comercial Venta Primaria',
  cuit_rte_venta_primaria: 'CUIT Rte. Comercial Venta Primaria',
  rte_venta_secundaria: 'Rte. Comercial Venta Secundaria',
  cuit_rte_venta_secundaria: 'CUIT Rte. Comercial Venta Secundaria',
  rte_venta_secundaria2: 'Rte. Comercial Venta Secundaria 2',
  mercado_termino: 'Mercado a término',
  corredor_primario: 'Corredor Venta Primaria',
  cuit_corredor_primario: 'CUIT Corredor Venta Primaria',
  corredor_secundario: 'Corredor Venta Secundaria',
  cuit_corredor_secundario: 'CUIT Corredor Venta Secundaria',
  repr_entregador: 'Representante Entregador',
  cuit_repr_entregador: 'CUIT Representante Entregador',
  repr_recibidor: 'Representante Recibidor',
  cuit_repr_recibidor: 'CUIT Representante Recibidor',
  km: 'Kms. a recorrer',
  tarifa: 'Tarifa',
  pagador_flete: 'Flete Pagador',
  cupo: 'Cupo',
  intermediario_flete: 'Intermediario de flete',
  cuil_intermediario: 'CUIL Intermediario',
  nro_planta: 'N° de Planta',
  nro_turno: 'Nro. de Turno',
  provincia_origen: 'Provincia Origen',
  provincia_destino: 'Provincia Destino',
  es_campo_destino: 'Es un campo (Destino)',
  direccion_destino: 'Dirección',
  observaciones: 'Observaciones',
  transporte: 'Empresa Transportista',
  cuit_transporte: 'CUIT Empresa Transportista',
  chofer: 'Chofer',
  cuil_chofer: 'CUIL Chofer',
  chasis: 'Chasis / Patente',
  acoplado: 'Acoplado / Patente',
  fecha_partida: 'Fecha Partida',
  kg_bruto_cargados: 'Kg Bruto (cargados)',
  kg_tara_cargados: 'Kg Tara (cargados)',
  kg_estimados: 'Kg Estimados',
  kg_bruto_descargados: 'Kg Bruto (descargados)',
  kg_tara_descargados: 'Kg Tara (descargados)',
  nro_ruca: 'N° RUCA',
  gps: 'GPS',
  latitud: 'Latitud',
  longitud: 'Longitud',
}
