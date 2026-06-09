import type { CpeRecord } from '../types'

// ── Mapeo grano → código AFIP ─────────────────────────────────────────────────
const GRAIN_CODES: Record<string, number> = {
  'Trigo':    1,
  'Maíz':     2,
  'Soja':     3,
  'Girasol':  4,
  'Sorgo':    5,
  'Cebada':   6,
}

// ── Homo: valores hardcodeados ARCA (hasta tener códigos en el formulario) ────
const HOMO_CUIT_REPRESENTADA = 30715660802
const HOMO_COD_PROVINCIA      = 1
const HOMO_COD_LOCALIDAD      = 6904
const HOMO_NRO_PLANTA         = 526725
const HOMO_COD_GRANO          = 23   // Grano configurado por ARCA en homo (no usar código real)

// Normaliza campaña "2025/26" | "25/26" | "2526" → "2526"
function normalizarCosecha(campania: string | null): string {
  if (!campania) return '2526'
  const digits = campania.replace(/\D/g, '')
  if (digits.length === 4) return digits          // "2526"
  if (digits.length === 8) return digits.slice(2, 4) + digits.slice(6, 8) // "20252026" → "2526"
  return '2526'
}

function cuitNum(cuit: string | null | undefined): number {
  return Number((cuit ?? '').replace(/\D/g, '')) || 0
}

export interface CpeResult {
  nroCTG: string
  nroOrden: number
  fechaEmision: string
  fechaVencimiento: string
}

// ── Validación de campos mínimos requeridos por ARCA ─────────────────────────
export function validarCamposRequeridos(record: CpeRecord): string[] {
  const faltantes: string[] = []
  if (!cuitNum(record.cuit_transporte)) faltantes.push('CUIT Transportista')
  if (!record.chasis?.trim())           faltantes.push('Patente / Chasis')
  if (!record.fecha_partida)            faltantes.push('Fecha de Partida')
  if (record.km == null)                faltantes.push('Km a recorrer')
  if (!cuitNum(record.cuil_chofer))     faltantes.push('CUIL Chofer')
  if (record.kg_bruto_cargados == null) faltantes.push('Peso Bruto cargado')
  if (record.kg_tara_cargados == null)  faltantes.push('Peso Tara cargado')
  return faltantes
}

export async function generarCPE(record: CpeRecord): Promise<CpeResult> {
  const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim()
  const supabaseKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim()
  if (!supabaseUrl || !supabaseKey) throw new Error('Supabase no configurado')

  // Validar campos mínimos antes de llamar a ARCA
  const faltantes = validarCamposRequeridos(record)
  if (faltantes.length > 0) {
    throw new Error(`Faltan datos requeridos: ${faltantes.join(', ')}`)
  }

  // En homo ARCA solo acepta grano 23 (código de prueba configurado en la planta)
  const codGrano = HOMO_COD_GRANO

  const payload = {
    cuitRepresentada: HOMO_CUIT_REPRESENTADA,
    sucursal: 1,
    tipoCPE: 74,
    solicitud: {
      // Transporte
      cuit_transporte:     cuitNum(record.cuit_transporte),
      dominio:             record.chasis,
      fecha_partida:       record.fecha_partida,
      km:                  record.km,
      cuil_chofer:         cuitNum(record.cuil_chofer),
      tarifa:              record.tarifa ?? 0,
      cuit_pagador_flete:  cuitNum(record.cuit_pagador_flete) || cuitNum(record.cuit_transporte),
      cuit_intermediario:  cuitNum(record.cuit_intermediario) || undefined,
      // Carga
      cod_grano:    codGrano,
      cosecha:      normalizarCosecha(record.campania),
      peso_bruto:   record.kg_bruto_cargados,
      peso_tara:    record.kg_tara_cargados,
      // Origen (homo: códigos hardcodeados)
      es_campo_origen:      record.es_campo_origen ?? false,
      cod_provincia_origen: HOMO_COD_PROVINCIA,
      cod_localidad_origen: HOMO_COD_LOCALIDAD,
      nro_planta:           HOMO_NRO_PLANTA,
      renspa:               record.renspa || undefined,
      // Destino (homo: misma CUIT representada)
      cuit_destino:          HOMO_CUIT_REPRESENTADA,
      es_campo_destino:      false,
      cod_provincia_destino: HOMO_COD_PROVINCIA,
      cod_localidad_destino: HOMO_COD_LOCALIDAD,
      nro_planta_destino:    HOMO_NRO_PLANTA,
      cuit_destinatario:     HOMO_CUIT_REPRESENTADA,
      // Intervinientes opcionales
      cuit_rte_venta_primaria:    cuitNum(record.cuit_rte_venta_primaria)   || undefined,
      cuit_rte_venta_secundaria:  cuitNum(record.cuit_rte_venta_secundaria) || undefined,
      cuit_rte_venta_secundaria2: cuitNum(record.cuit_rte_venta_secundaria2)|| undefined,
      cuit_corredor_primario:     cuitNum(record.cuit_corredor_primario)    || undefined,
      cuit_corredor_secundario:   cuitNum(record.cuit_corredor_secundario)  || undefined,
      cuit_repr_entregador:       cuitNum(record.cuit_repr_entregador)      || undefined,
      cuit_repr_recibidor:        cuitNum(record.cuit_repr_recibidor)       || undefined,
      observaciones: record.observaciones || undefined,
    },
  }

  const res = await fetch(`${supabaseUrl}/functions/v1/wscpe-authorize`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  const data = await res.json() as {
    ok: boolean
    nroCTG?: string
    nroOrden?: number
    fechaEmision?: string
    fechaVencimiento?: string
    error?: string
    response_xml?: string
    request_xml?: string
  }

  if (!data.ok) {
    // Extraer código y descripción del XML de respuesta ARCA si existe
    let detail = data.error ?? 'Error al generar CPE en ARCA'
    if (data.response_xml) {
      const code = data.response_xml.match(/<codigo>(\d+)<\/codigo>/)?.[1]
      const desc = data.response_xml.match(/<descripcion>([^<]+)<\/descripcion>/)?.[1]
      if (code && desc) detail = `ARCA error ${code}: ${desc}`
      else if (desc)    detail = `ARCA: ${desc}`
      console.error('[cpe] ARCA response_xml:', data.response_xml)
    }
    throw new Error(detail)
  }

  return {
    nroCTG:           data.nroCTG!,
    nroOrden:         data.nroOrden!,
    fechaEmision:     data.fechaEmision!,
    fechaVencimiento: data.fechaVencimiento!,
  }
}
