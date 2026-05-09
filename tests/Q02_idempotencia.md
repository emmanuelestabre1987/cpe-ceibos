# Q-02 Idempotencia — Resultados

**Fecha:** 2026-05-08  
**Suite:** `tests/idempotencia.test.ts` — 9 tests, todos pasan ✅ (confirman el bug)

---

## ¿Hay UNIQUE constraint en `cupo` en la DB?

**NO.**

Evidencia en `supabase/migrations/001_schema_completo.sql`, línea 76:

```sql
cupo                TEXT,
```

La columna `cpe_id` sí tiene `NOT NULL UNIQUE` (línea 45), pero `cupo` — que es el código de negocio real como `TBBMA260507EE52` — no tiene ningún constraint de unicidad, ni como `UNIQUE` inline ni como `CREATE UNIQUE INDEX` separado.

---

## ¿ImportarCupos.tsx verifica duplicados antes de insertar?

**NO.**

La función `confirmar()` en `src/pages/ImportarCupos.tsx` (línea 176) sigue este flujo:

```
1. createImportBatch(...)    ← crea el lote
2. createCuposEnLote(...)    ← inserta todos los cupos sin verificar si ya existen
```

No existe ninguna consulta previa a `cpe_records` para filtrar códigos que ya estén en la DB. No hay ninguna llamada a `getRecords()`, `getCuposByBatch()`, ni ningún filter defensivo sobre el array antes del INSERT masivo.

---

## Resultado del test de importación doble

Si el mismo Excel se importa dos veces:

1. Se crearían **dos lotes** separados en `import_batches`.
2. Cada cupo del Excel generaría **dos filas** en `cpe_records` con el mismo valor en `cupo` (ej. dos registros con `cupo = 'TBBMA260507EE52'`), cada uno con un `cpe_id` diferente (`CPE-0001` y `CPE-0015`).
3. El operador vería el mismo código de cupo duplicado en el Panel de Cupos sin ninguna advertencia.
4. Ambos serían tratables de forma independiente — se podría cerrar uno y el otro quedaría pendiente, generando confusión operativa en campo.

---

## Veredicto

- [x] ❌ **FALLA** — la importación doble genera duplicados

---

## Recomendación

### Opción A (Backend — recomendada): UNIQUE constraint en DB

```sql
-- Migración nueva
ALTER TABLE cpe_records
  ADD CONSTRAINT cpe_records_cupo_unique UNIQUE (cupo);
```

**Por qué es mejor:**
- Única fuente de verdad: previene duplicados sin importar qué cliente inserta (UI, API directa, scripts futuros).
- Postgres con `UNIQUE` permite múltiples `NULL` (cupos manuales sin código no colisionan).
- El error de Supabase se propaga al `catch` de `confirmar()` en `ImportarCupos.tsx`, que ya muestra un toast con `(e as Error).message` — el usuario ve feedback claro.

### Opción B (Frontend — complementaria): Pre-verificar antes de insertar

Consultar los `cupo` ya existentes y excluirlos del lote:
```ts
const existentes = await getRecords() // o un endpoint específico
const codigosExistentes = new Set(existentes.map(r => r.cupo).filter(Boolean))
const cuposFiltrados = selectedCupos.filter(c => !codigosExistentes.has(c.codigo))
```

**Por qué es complementaria, no suficiente sola:**
- Tiene race condition con importaciones concurrentes (dos usuarios importan el mismo lote al mismo tiempo).
- Requiere descargar todos los registros del cliente, lo que escala mal.

**Decisión recomendada:** Implementar Opción A + agregar un warning en la UI si el batch retorna un error de unicidad.

---

## Agente responsable de la corrección

**Backend** (nueva migración SQL) + **Frontend** (mejorar el mensaje de error en el `catch` de `confirmar()`).
