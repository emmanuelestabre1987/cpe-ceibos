export interface CupoParseado {
  codigo: string
  fechaCarga: string
}

export interface EmailParseado {
  grano: string
  localidad: string
  rteVentaPrimaria: string
  destinatario: string
  cuitDestinatario: string
  destino: string
  cuitDestino: string
  kgEstimados: number
  nroPlanta: string
  cupos: CupoParseado[]
}

export interface ResultadoParseo {
  ok: boolean
  data?: EmailParseado
  errores: string[]
}

export function normalizarCuit(cuit: string): string {
  const soloDigitos = cuit.replace(/\D/g, '')
  return soloDigitos
}

function parsearFechaDDMMYYYY(fecha: string): string {
  // DD.MM.YYYY → YYYY-MM-DD
  const partes = fecha.trim().split('.')
  if (partes.length !== 3) return fecha.trim()
  const [dia, mes, anio] = partes
  return `${anio}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`
}

function extraerNombreYCuit(
  lineaRaw: string,
  prefijo: string
): { nombre: string; cuit: string } | null {
  // Quitar el prefijo ("Destinatario:", "Destino:", etc.)
  const sinPrefijo = lineaRaw.replace(new RegExp(prefijo, 'i'), '').trim()

  const matchCuit = sinPrefijo.match(/CUIT\s+([\d-]+)/i)
  if (!matchCuit) return null

  const cuitRaw = matchCuit[1]
  const cuit = normalizarCuit(cuitRaw)

  // El nombre es todo lo que precede a "CUIT", sin el separador " - " si lo hay
  const indiceCuit = sinPrefijo.search(/CUIT\s+[\d-]+/i)
  const nombreRaw = sinPrefijo.slice(0, indiceCuit).replace(/\s*-\s*$/, '').trim()

  return { nombre: nombreRaw, cuit }
}

function parsearCupos(lineas: string[]): CupoParseado[] {
  const cupos: CupoParseado[] = []

  const CODIGO_RE = /^[A-Za-z0-9]{5,}$/
  const FECHA_RE  = /^\d{2}\.\d{2}\.\d{4}$/

  // 'ninguno'  → todavía no encontramos la sección de cupos
  // 'pipe'     → Formato A: cada fila tiene código|fecha en la misma línea
  // 'alternas' → Formato B: código y fecha en líneas consecutivas separadas
  let modo: 'ninguno' | 'pipe' | 'alternas' = 'ninguno'
  let saltarSiguiente = false   // usado en alternas para saltear "Fecha del cupo"
  let codigoPendiente: string | null = null

  for (const linea of lineas) {
    const t = linea.trim()

    if (modo === 'ninguno') {
      if (/Nuevo Cupo/i.test(t) && !t.includes('|')) {
        // Formato B: "Nuevo Cupo" solo en su línea → la siguiente es "Fecha del cupo"
        modo = 'alternas'
        saltarSiguiente = true
        continue  // saltear la línea "Nuevo Cupo" en sí
      } else if (t.includes('|')) {
        // Formato A: primera línea con pipe (puede ser el header o ya un dato)
        modo = 'pipe'
        // caer al bloque pipe para procesar esta misma línea
      } else {
        continue
      }
    }

    if (modo === 'pipe') {
      if (!t.includes('|')) continue
      const partes = t.split('|')
      if (partes.length < 2) continue
      const codigoRaw = partes[0].trim()
      const fechaRaw  = partes[1].trim()
      // Saltear línea de encabezado
      if (/Nuevo Cupo/i.test(codigoRaw) || /Fecha/i.test(fechaRaw)) continue
      if (CODIGO_RE.test(codigoRaw) && FECHA_RE.test(fechaRaw)) {
        cupos.push({ codigo: codigoRaw, fechaCarga: parsearFechaDDMMYYYY(fechaRaw) })
      }
      continue
    }

    if (modo === 'alternas') {
      if (saltarSiguiente) {
        // Saltear la línea de encabezado "Fecha del cupo"
        saltarSiguiente = false
        continue
      }

      if (codigoPendiente === null) {
        // Esperamos un código
        if (CODIGO_RE.test(t)) {
          codigoPendiente = t
        } else {
          break  // línea no reconocida → fin de la sección de cupos
        }
      } else {
        // Esperamos la fecha del código pendiente
        if (FECHA_RE.test(t)) {
          cupos.push({ codigo: codigoPendiente, fechaCarga: parsearFechaDDMMYYYY(t) })
          codigoPendiente = null
        } else {
          break  // línea no reconocida → fin de la sección
        }
      }
    }
  }

  return cupos
}

export function parsearEmailCupos(rawText: string): ResultadoParseo {
  try {
    const lineas = rawText.split(/\r?\n/)
    const errores: string[] = []

    // ── grano ──────────────────────────────────────────────────
    let grano = ''
    const lineaGrano = lineas.find(l => /Producto:/i.test(l))
    if (lineaGrano) {
      grano = lineaGrano.replace(/Producto:/i, '').trim()
    } else {
      errores.push('grano')
    }

    // ── localidad ──────────────────────────────────────────────
    let localidad = ''
    const lineaLocalidad = lineas.find(l => /Zona Destino:/i.test(l))
    if (lineaLocalidad) {
      localidad = lineaLocalidad.replace(/Zona Destino:/i, '').trim()
    } else {
      errores.push('localidad')
    }

    // ── rteVentaPrimaria ───────────────────────────────────────
    let rteVentaPrimaria = ''
    const lineaVendedor = lineas.find(l => /Vendedor:/i.test(l))
    if (lineaVendedor) {
      rteVentaPrimaria = lineaVendedor.replace(/Vendedor:/i, '').trim()
    } else {
      errores.push('rteVentaPrimaria')
    }

    // ── destinatario + cuitDestinatario ────────────────────────
    let destinatario = ''
    let cuitDestinatario = ''
    const lineaDestinatario = lineas.find(l => /Destinatario:/i.test(l))
    if (lineaDestinatario) {
      const resultado = extraerNombreYCuit(lineaDestinatario, 'Destinatario:')
      if (resultado) {
        destinatario = resultado.nombre
        cuitDestinatario = resultado.cuit
      } else {
        errores.push('destinatario', 'cuitDestinatario')
      }
    } else {
      errores.push('destinatario', 'cuitDestinatario')
    }

    // ── destino + cuitDestino ──────────────────────────────────
    let destino = ''
    let cuitDestino = ''
    // "Destino:" puede matchear también "Zona Destino:", por eso buscamos
    // la línea que empiece con "Destino:" al inicio (tras trim)
    const lineaDestino = lineas.find(l => /^\s*Destino:/i.test(l))
    if (lineaDestino) {
      const resultado = extraerNombreYCuit(lineaDestino, 'Destino:')
      if (resultado) {
        destino = resultado.nombre
        cuitDestino = resultado.cuit
      } else {
        errores.push('destino', 'cuitDestino')
      }
    } else {
      errores.push('destino', 'cuitDestino')
    }

    // ── kgEstimados ────────────────────────────────────────────
    let kgEstimados = 0
    const lineaCarrega = lineas.find(l => /CARREGA/i.test(l))
    if (lineaCarrega) {
      const match = lineaCarrega.match(/CARREGA\s+(\d+)/i)
      if (match) {
        kgEstimados = parseInt(match[1], 10)
      } else {
        errores.push('kgEstimados')
      }
    } else {
      errores.push('kgEstimados')
    }

    // ── nroPlanta ──────────────────────────────────────────────
    let nroPlanta = ''
    const lineaPlanta = lineas.find(l => /Nro\.?\s+de\s+Planta/i.test(l))
    if (lineaPlanta) {
      const match = lineaPlanta.match(/Nro\.?\s+de\s+Planta\s+(\S+)/i)
      if (match) {
        nroPlanta = match[1].trim()
      }
    }
    // nroPlanta es opcional; no se agrega a errores si falta

    // ── cupos ──────────────────────────────────────────────────
    const cupos = parsearCupos(lineas)
    if (cupos.length === 0) {
      errores.push('cupos')
      return { ok: false, errores }
    }

    const data: EmailParseado = {
      grano,
      localidad,
      rteVentaPrimaria,
      destinatario,
      cuitDestinatario,
      destino,
      cuitDestino,
      kgEstimados,
      nroPlanta,
      cupos,
    }

    return { ok: true, data, errores }
  } catch (err) {
    const mensaje = err instanceof Error ? err.message : String(err)
    return { ok: false, errores: [`Error inesperado: ${mensaje}`] }
  }
}
