/**
 * Q-02 · Idempotencia en importación masiva
 *
 * Tests de análisis estático: leen el SQL y el código fuente para confirmar
 * (o descartar) la presencia de protecciones contra importación duplicada.
 *
 * Convención: cuando el test lleva "FALLA:" en el nombre, el test PASA
 * precisamente porque la protección NO existe — es una confirmación del bug.
 */
import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

const ROOT = path.resolve(__dirname, '..')

const sql = fs.readFileSync(
  path.join(ROOT, 'supabase/migrations/001_schema_completo.sql'),
  'utf-8'
)

const importarCuposSource = fs.readFileSync(
  path.join(ROOT, 'src/pages/ImportarCupos.tsx'),
  'utf-8'
)

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Extrae la definición de columna dentro de CREATE TABLE cpe_records */
function getCpeRecordsBlock(): string {
  const start = sql.indexOf('CREATE TABLE IF NOT EXISTS cpe_records')
  const end   = sql.indexOf(');', start)
  return start >= 0 && end >= 0 ? sql.slice(start, end) : ''
}

// ── Suite ─────────────────────────────────────────────────────────────────────

describe('Q-02 Idempotencia — protección contra importación doble', () => {

  // ── Bloque 1: constraint UNIQUE en DB ──────────────────────────────────────

  describe('Constraint UNIQUE en columna `cupo` (001_schema_completo.sql)', () => {

    it('control positivo: cpe_id tiene UNIQUE (el patrón de búsqueda funciona)', () => {
      // Confirma que el bloque fue leído y que sabemos buscar UNIQUE
      expect(getCpeRecordsBlock()).toMatch(/cpe_id\s+TEXT\s+NOT NULL UNIQUE/)
    })

    it('FALLA: la columna `cupo` no tiene restricción UNIQUE', () => {
      const block   = getCpeRecordsBlock()
      // La línea de la columna `cupo` en la tabla cpe_records
      const cupoLine = block.split('\n').find(l => /^\s*cupo\s+TEXT/i.test(l))

      expect(cupoLine).toBeDefined()             // la columna existe
      expect(cupoLine).not.toMatch(/UNIQUE/i)    // pero sin UNIQUE → duplicados posibles
    })

    it('FALLA: no existe índice UNIQUE separado sobre cpe_records.cupo', () => {
      // Un UNIQUE puede declararse también como índice independiente
      const hasUniqueIndex = /CREATE UNIQUE INDEX.*cpe_records.*\(\s*cupo\s*\)/i.test(sql)
      expect(hasUniqueIndex).toBe(false)
    })

  })

  // ── Bloque 2: verificación de duplicados en Frontend ──────────────────────

  describe('Verificación de cupos existentes en ImportarCupos.tsx', () => {

    it('FALLA: no existe ninguna consulta de duplicados antes de llamar a createCuposEnLote()', () => {
      // Patrones que indicarían una pre-verificación:
      // - getRecords() o getCuposByBatch() para comparar
      // - búsqueda de "ya existe", "duplicado", "existing"
      // - .filter() sobre resultados de DB antes del insert
      const hasDuplicateGuard = /getRecords\(\)|getCuposByBatch|cupos\.filter.*exist|duplicado|ya existe/i
        .test(importarCuposSource)
      expect(hasDuplicateGuard).toBe(false)
    })

    it('FALLA: createCuposEnLote es llamado sin ningún guard de existencia previo', () => {
      const callIdx = importarCuposSource.indexOf('createCuposEnLote')
      expect(callIdx).toBeGreaterThan(-1)   // la función existe en el archivo

      // Contexto previo (500 chars antes de la llamada): sin SELECT/filter defensivo
      const context = importarCuposSource.slice(Math.max(0, callIdx - 500), callIdx)
      const hasPriorCheck = /\.from\s*\(.*cpe_records|getRecord|filter.*codigo|exists/i.test(context)
      expect(hasPriorCheck).toBe(false)
    })

    it('la función confirmar() no llama a ningún endpoint de validación entre parseExcel y el INSERT', () => {
      // Ubica la función confirmar
      const fnStart = importarCuposSource.indexOf('const confirmar = async')
      const fnEnd   = importarCuposSource.indexOf('\n  }', fnStart + 100) + 4
      const fnBody  = importarCuposSource.slice(fnStart, fnEnd)

      // Solo debe contener estas dos llamadas a storage, sin ninguna de lectura previa
      expect(fnBody).toContain('createImportBatch')
      expect(fnBody).toContain('createCuposEnLote')
      const hasReadBeforeWrite = /getRecords|getRecord|getCupos|supabase\.from.*select/i.test(fnBody)
      expect(hasReadBeforeWrite).toBe(false)
    })

  })

  // ── Bloque 3: impacto esperado ─────────────────────────────────────────────

  describe('Impacto esperado al importar el mismo Excel dos veces', () => {

    it('el mismo código de cupo puede aparecer N veces en cpe_records (sin constraint)', () => {
      // Si no hay UNIQUE en `cupo`, Postgres acepta múltiples filas
      // con el mismo valor — esto es lo que confirman los tests anteriores.
      const block = getCpeRecordsBlock()
      const cupoLine = block.split('\n').find(l => /^\s*cupo\s+TEXT/i.test(l)) ?? ''
      expect(cupoLine).not.toMatch(/UNIQUE|REFERENCES/i)
    })

  })
})
