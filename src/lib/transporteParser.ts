export interface TransporteParseResult {
  transporte?: string
  cuit_transporte?: string
  chofer?: string
  cuil_chofer?: string
  chasis?: string
  acoplado?: string
  missing: string[]
}

const ID_RE  = /\d{2}[-.]?\d{8}[-.]?\d/g
const PLATE_RE = /\b([A-Z]{2,3}\s?\d{3,4}[A-Z]{0,3})\b/i

const normalizeId  = (s: string): string => s.replace(/\D/g, '')
const afterColon   = (line: string): string => line.slice(line.indexOf(':') + 1).trim()
const firstId      = (s: string): string | undefined => {
  const m = s.match(/\d{2}[-.]?\d{8}[-.]?\d/)
  return m ? normalizeId(m[0]) : undefined
}
const firstPlate   = (s: string): string | undefined => {
  const m = PLATE_RE.exec(s)
  return m ? m[1].replace(/\s+/g, '').toUpperCase() : undefined
}

export function parseTransporteMsg(text: string): TransporteParseResult {
  const result: TransporteParseResult = { missing: [] }
  const lines = text.replace(/\r/g, '').split('\n').map(l => l.trim()).filter(Boolean)
  const fallbackIds: string[] = []

  for (const line of lines) {
    const low = line.toLowerCase()

    // Empresa / Transporte
    if (/^(empresa(\s+transporte)?|transporte|transportista)\s*:/i.test(line)) {
      result.transporte = afterColon(line)
      continue
    }

    // CUIT/CUIL combined on one line (e.g. "CUIT/CUIL: 20-12345678-9 / 20-98765432-1")
    if (/^cuit\s*[/y]\s*cuil\s*:/i.test(line)) {
      const ids = afterColon(line).match(/\d{2}[-.]?\d{8}[-.]?\d/g) ?? []
      if (ids[0] && !result.cuit_transporte) result.cuit_transporte = normalizeId(ids[0])
      if (ids[1] && !result.cuil_chofer)     result.cuil_chofer     = normalizeId(ids[1])
      continue
    }

    // CUIT del transporte (excludes lines about chofer or cuil)
    if (/^cuit(\s*(empresa|transporte))?\s*:/i.test(line) && !/(chofer|cuil)/i.test(low)) {
      result.cuit_transporte = firstId(afterColon(line))
      continue
    }

    // CUIL chofer
    if (/^cuil(\s*chofer)?\s*:/i.test(line)) {
      result.cuil_chofer = firstId(afterColon(line))
      continue
    }

    // Chofer
    if (/^(chofer|conductor)\s*:/i.test(line)) {
      result.chofer = afterColon(line)
      continue
    }

    // Acoplado
    if (/^(acoplado|semi|remolque)\s*:/i.test(line)) {
      result.acoplado = firstPlate(afterColon(line))
      continue
    }

    // Chasis — may carry "/"-separated acoplado: "ABC123 / DEF456"
    if (/^(chasis|patente(\s+chasis)?|dominio)\s*:/i.test(line)) {
      const val   = afterColon(line)
      const parts = val.split('/')
      result.chasis = firstPlate(parts[0])
      if (parts[1] && !result.acoplado) result.acoplado = firstPlate(parts[1])
      continue
    }

    // Collect IDs from unmatched lines for fallback
    const ids = line.match(ID_RE)
    if (ids) fallbackIds.push(...ids.map(normalizeId))
  }

  // Fallbacks when labeled extraction yielded nothing
  if (!result.cuit_transporte && fallbackIds[0]) result.cuit_transporte = fallbackIds[0]
  if (!result.cuil_chofer     && fallbackIds[1]) result.cuil_chofer     = fallbackIds[1]

  // Required fields that are still empty
  const required: Array<keyof Omit<TransporteParseResult, 'missing'>> = [
    'transporte', 'cuit_transporte', 'chofer', 'cuil_chofer', 'chasis',
  ]
  result.missing = required.filter(f => !result[f])

  return result
}
