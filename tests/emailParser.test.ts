import { describe, it, expect } from 'vitest'
import { parsearEmailCupos, normalizarCuit } from '../src/lib/emailParser'

// ── Fixtures ──────────────────────────────────────────────────────────────────

/**
 * Email del brief: todos los campos, 3 cupos en la tabla.
 */
const EMAIL_COMPLETO = `
Información de los nuevos Cupos Asignados

Producto: Soja
Zona Destino: Rosario
Vendedor: Agromax SA
Destinatario: Aceitera General SA - CUIT 30-71234567-8
Destino: Puerto Rosario SA - CUIT 30-71234568-9
CARREGA 24000
Nro. de Planta 5

Nuevo Cupo | Fecha
ABC001|15.06.2025
DEF002|16.06.2025
GHI003|17.06.2025
`.trim()

/** Solo 1 fila en la tabla de cupos. */
const EMAIL_1_CUPO = `
Producto: Soja
Zona Destino: Rosario
Vendedor: Agromax SA
Destinatario: Aceitera General SA - CUIT 30-71234567-8
Destino: Puerto Rosario SA - CUIT 30-71234568-9
CARREGA 24000

Nuevo Cupo | Fecha
XYZ99|20.07.2025
`.trim()

/** Todos los campos presentes excepto la línea CARREGA. */
const EMAIL_SIN_CARREGA = `
Producto: Soja
Zona Destino: Rosario
Vendedor: Agromax SA
Destinatario: Aceitera General SA - CUIT 30-71234567-8
Destino: Puerto Rosario SA - CUIT 30-71234568-9

Nuevo Cupo | Fecha
ABC001|15.06.2025
`.trim()

/** Todos los campos presentes pero sin ninguna fila con "|" (sin tabla). */
const EMAIL_SIN_TABLA = `
Producto: Soja
Zona Destino: Rosario
Vendedor: Agromax SA
Destinatario: Aceitera General SA - CUIT 30-71234567-8
Destino: Puerto Rosario SA - CUIT 30-71234568-9
CARREGA 24000
Sin tabla aqui, solo texto libre
`.trim()

/**
 * Email real de producción: cupos en líneas alternas (Formato B).
 * Sin pipes — código y fecha en líneas consecutivas separadas.
 */
const EMAIL_FORMATO_B = `
Producto: Maiz
Zona Destino: Bahía Blanca
Cupos Creados con esta aprobación:
Nuevo Cupo
Fecha del cupo
TBBMA260507EE52
07.05.2026
TBBMA260507EE70
07.05.2026
TBBMA260508A01D
08.05.2026
Cupos de Solicitud:
Vendedor: PROVINVEST S.A.
Destinatario: COFCO CUIT 33-50673744-9
Destino: TERMINAL BAHIA BLANCA SOCIEDAD - CUIT 30-66016810-5
CARREGA 3900
Nro. de Planta 20763
`.trim()

/** Mismos campos pero todos los prefijos en minúscula. */
const EMAIL_LOWERCASE = `
producto: Maiz
zona destino: Córdoba
vendedor: Granos del Sur SRL
destinatario: Molino Norte SA - CUIT 20-33333333-3
destino: Planta Norte SA - CUIT 20-44444444-4
CARREGA 10000

nuevo cupo | fecha
AAA01|01.01.2026
`.trim()

// ── parsearEmailCupos ─────────────────────────────────────────────────────────

describe('parsearEmailCupos', () => {

  // ── Caso 1 ─────────────────────────────────────────────────────────────────
  describe('Caso 1 — email completo del brief', () => {
    it('devuelve ok: true', () => {
      expect(parsearEmailCupos(EMAIL_COMPLETO).ok).toBe(true)
    })

    it('extrae 3 cupos', () => {
      const { data } = parsearEmailCupos(EMAIL_COMPLETO)
      expect(data!.cupos).toHaveLength(3)
    })

    it('extrae todos los campos de texto', () => {
      const { data } = parsearEmailCupos(EMAIL_COMPLETO)
      expect(data!.grano).toBe('Soja')
      expect(data!.localidad).toBe('Rosario')
      expect(data!.rteVentaPrimaria).toBe('Agromax SA')
      expect(data!.destinatario).toBe('Aceitera General SA')
      expect(data!.destino).toBe('Puerto Rosario SA')
      expect(data!.nroPlanta).toBe('5')
    })

    it('normaliza los CUITs del destinatario y destino', () => {
      const { data } = parsearEmailCupos(EMAIL_COMPLETO)
      expect(data!.cuitDestinatario).toBe('30712345678')
      expect(data!.cuitDestino).toBe('30712345689')
    })

    it('parsea kgEstimados como número', () => {
      expect(parsearEmailCupos(EMAIL_COMPLETO).data!.kgEstimados).toBe(24000)
    })

    it('parsea las fechas de los cupos en formato YYYY-MM-DD', () => {
      const { cupos } = parsearEmailCupos(EMAIL_COMPLETO).data!
      expect(cupos[0]).toEqual({ codigo: 'ABC001', fechaCarga: '2025-06-15' })
      expect(cupos[1]).toEqual({ codigo: 'DEF002', fechaCarga: '2025-06-16' })
      expect(cupos[2]).toEqual({ codigo: 'GHI003', fechaCarga: '2025-06-17' })
    })

    it('no reporta errores cuando todo está presente', () => {
      expect(parsearEmailCupos(EMAIL_COMPLETO).errores).toHaveLength(0)
    })
  })

  // ── Caso 2 ─────────────────────────────────────────────────────────────────
  describe('Caso 2 — solo 1 cupo', () => {
    it('devuelve ok: true', () => {
      expect(parsearEmailCupos(EMAIL_1_CUPO).ok).toBe(true)
    })

    it('devuelve array con exactamente 1 cupo', () => {
      const { data } = parsearEmailCupos(EMAIL_1_CUPO)
      expect(data!.cupos).toHaveLength(1)
      expect(data!.cupos[0].codigo).toBe('XYZ99')
    })
  })

  // ── Caso 3 ─────────────────────────────────────────────────────────────────
  describe('Caso 3 — sin campo CARREGA', () => {
    it('devuelve ok: true (el cupo sigue siendo válido)', () => {
      expect(parsearEmailCupos(EMAIL_SIN_CARREGA).ok).toBe(true)
    })

    it('kgEstimados es 0', () => {
      expect(parsearEmailCupos(EMAIL_SIN_CARREGA).data!.kgEstimados).toBe(0)
    })

    it('"kgEstimados" aparece en el array errores', () => {
      expect(parsearEmailCupos(EMAIL_SIN_CARREGA).errores).toContain('kgEstimados')
    })
  })

  // ── Caso 6 ─────────────────────────────────────────────────────────────────
  describe('Caso 6 — texto inválido', () => {
    it('"hola mundo" devuelve ok: false', () => {
      expect(parsearEmailCupos('hola mundo').ok).toBe(false)
    })

    it('string vacío devuelve ok: false', () => {
      expect(parsearEmailCupos('').ok).toBe(false)
    })
  })

  // ── Caso 7 ─────────────────────────────────────────────────────────────────
  describe('Caso 7 — sin tabla de cupos', () => {
    it('devuelve ok: false', () => {
      expect(parsearEmailCupos(EMAIL_SIN_TABLA).ok).toBe(false)
    })

    it('"cupos" aparece en el array errores', () => {
      expect(parsearEmailCupos(EMAIL_SIN_TABLA).errores).toContain('cupos')
    })
  })

  // ── Caso 9 ─────────────────────────────────────────────────────────────────
  describe('Caso 9 — Formato B: cupos en líneas alternas (email real de producción)', () => {
    it('devuelve ok: true', () => {
      expect(parsearEmailCupos(EMAIL_FORMATO_B).ok).toBe(true)
    })

    it('extrae 3 cupos', () => {
      expect(parsearEmailCupos(EMAIL_FORMATO_B).data!.cupos).toHaveLength(3)
    })

    it('extrae los códigos correctamente', () => {
      const { cupos } = parsearEmailCupos(EMAIL_FORMATO_B).data!
      expect(cupos[0].codigo).toBe('TBBMA260507EE52')
      expect(cupos[1].codigo).toBe('TBBMA260507EE70')
      expect(cupos[2].codigo).toBe('TBBMA260508A01D')
    })

    it('convierte las fechas a formato YYYY-MM-DD', () => {
      const { cupos } = parsearEmailCupos(EMAIL_FORMATO_B).data!
      expect(cupos[0].fechaCarga).toBe('2026-05-07')
      expect(cupos[1].fechaCarga).toBe('2026-05-07')
      expect(cupos[2].fechaCarga).toBe('2026-05-08')
    })

    it('extrae grano, localidad y kgEstimados', () => {
      const { data } = parsearEmailCupos(EMAIL_FORMATO_B)
      expect(data!.grano).toBe('Maiz')
      expect(data!.localidad).toBe('Bahía Blanca')
      expect(data!.kgEstimados).toBe(3900)
    })

    it('extrae nroPlanta', () => {
      expect(parsearEmailCupos(EMAIL_FORMATO_B).data!.nroPlanta).toBe('20763')
    })

    it('extrae destinatario y normaliza su CUIT', () => {
      const { data } = parsearEmailCupos(EMAIL_FORMATO_B)
      expect(data!.destinatario).toBe('COFCO')
      expect(data!.cuitDestinatario).toBe('33506737449')
    })

    it('extrae destino y normaliza su CUIT', () => {
      const { data } = parsearEmailCupos(EMAIL_FORMATO_B)
      expect(data!.destino).toBe('TERMINAL BAHIA BLANCA SOCIEDAD')
      expect(data!.cuitDestino).toBe('30660168105')
    })
  })

  // ── Caso 8 ─────────────────────────────────────────────────────────────────
  describe('Caso 8 — case-insensitive', () => {
    it('devuelve ok: true', () => {
      expect(parsearEmailCupos(EMAIL_LOWERCASE).ok).toBe(true)
    })

    it('extrae grano con prefijo en minúscula', () => {
      expect(parsearEmailCupos(EMAIL_LOWERCASE).data!.grano).toBe('Maiz')
    })

    it('extrae localidad con prefijo en minúscula', () => {
      expect(parsearEmailCupos(EMAIL_LOWERCASE).data!.localidad).toBe('Córdoba')
    })

    it('extrae rteVentaPrimaria con prefijo en minúscula', () => {
      expect(parsearEmailCupos(EMAIL_LOWERCASE).data!.rteVentaPrimaria).toBe('Granos del Sur SRL')
    })
  })

})

// ── normalizarCuit ────────────────────────────────────────────────────────────

describe('normalizarCuit', () => {

  // ── Caso 4 ─────────────────────────────────────────────────────────────────
  it('Caso 4 — CUIT con guiones → 11 dígitos sin separadores', () => {
    expect(normalizarCuit('33-50673744-9')).toBe('33506737449')
  })

  // ── Caso 5 ─────────────────────────────────────────────────────────────────
  it('Caso 5 — CUIT sin guiones → sin cambios', () => {
    expect(normalizarCuit('33506737449')).toBe('33506737449')
  })

  it('elimina espacios y otros no-dígitos', () => {
    expect(normalizarCuit('33 506 737 449')).toBe('33506737449')
  })

})
