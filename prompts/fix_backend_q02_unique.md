# PROMPT — Backend Agent: Fix Q-02 · UNIQUE constraint en campo `cupo`

Sos el agente Backend de CPE Campo (Avancargo). Tenés una sola tarea de corrección crítica. Repo: `C:\Users\Emmanuel Estabre\Desktop\Cpe_ceibos`.

Leé estos archivos antes de empezar:
- `supabase/migrations/001_schema_completo.sql` — schema actual
- `src/lib/storage.ts` — función `createCuposEnLote`
- `src/pages/ImportarCupos.tsx` — pantalla de importación

---

## Contexto del bug

El campo `cupo` en `cpe_records` representa el código de negocio del cupo (ej: `"TBBMA260507EE52"`). Actualmente es `TEXT` sin restricción de unicidad.

**Consecuencia:** importar el mismo Excel dos veces crea filas duplicadas — distintos `cpe_id` (UUID autogenerado), mismos `cupo`. Ambas filas quedan visibles y operables en el Panel de Cupos.

**El campo `cpe_id` sí tiene UNIQUE**, pero ese es el ID interno del sistema, no el código de negocio.

---

## TAREA 1 — Nueva migración SQL

Crear el archivo `supabase/migrations/002_cupo_unique.sql`:

```sql
-- Fix Q-02: UNIQUE parcial sobre cpe_records.cupo
-- Parcial: excluye NULL y string vacío, ya que los cupos manuales
-- (NewRecord.tsx) pueden no tener código de negocio asignado.

CREATE UNIQUE INDEX IF NOT EXISTS idx_cpe_records_cupo_unique
  ON cpe_records (cupo)
  WHERE cupo IS NOT NULL AND cupo <> '';
```

**¿Por qué índice parcial y no UNIQUE constraint directo?**
- Los cupos creados manualmente (sin código de negocio) tienen `cupo = NULL` o `cupo = ''`
- PostgreSQL permite múltiples NULL en UNIQUE constraints, pero NO múltiples strings vacíos
- El índice parcial excluye ambos casos y protege solo los cupos con código real

**Ejecutar en Supabase:** este archivo debe correrse en el SQL Editor de Supabase. Documentar en un comentario al inicio del archivo que debe correrse después de `001_schema_completo.sql`.

---

## TAREA 2 — Manejo de error en `createCuposEnLote`

El índice UNIQUE va a hacer que el INSERT falle con el código de error de PostgreSQL `23505` (unique_violation) si se intenta importar un cupo duplicado.

Actualmente `createCuposEnLote` en `src/lib/storage.ts` deja que ese error burbujee hasta la UI sin contexto. Mejorar el manejo:

```ts
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
    // Unique violation en el campo `cupo` — código de negocio duplicado
    if (error.code === '23505') {
      throw new Error(
        'Uno o más cupos de este lote ya existen en el sistema. Verificá que no estés importando el mismo archivo dos veces.'
      )
    }
    throw error
  }

  // ... resto igual
```

No tocar nada más de la función — solo el bloque `if (error)` después del INSERT.

---

## Criterios de aceptación

- [ ] Archivo `supabase/migrations/002_cupo_unique.sql` creado con el índice parcial
- [ ] El índice se puede ejecutar en Supabase SQL Editor sin errores
- [ ] `createCuposEnLote` en `storage.ts` detecta el error `23505` y lanza un mensaje en español claro
- [ ] `npm run build` pasa sin errores TypeScript
- [ ] No se modificó ningún otro archivo
