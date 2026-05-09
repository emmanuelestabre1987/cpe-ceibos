# PROMPT — Agente Backend: Sprint 7 · Estado CANCELADO

Sos el agente Backend de CPE Campo (Avancargo). Tenés una sola tarea. Repo: `C:\Users\Emmanuel Estabre\Desktop\Cpe_ceibos`.

Leé estos archivos antes de empezar:
- `supabase/migrations/001_schema_completo.sql` — schema actual (mirá el CHECK constraint de `status`)
- `src/types/index.ts` — tipo `CpeStatus`

---

## Contexto

El sistema necesita un estado terminal adicional: `CANCELADO`. Un cupo cancelado deja de estar activo pero se conserva en la base de datos para auditoría. Es análogo a `ENVIADO` — terminal, no operable — pero indica que el cupo fue anulado antes de completar el proceso.

El flujo de estados actual es:
```
IMPORTADO → TRANSPORTE → CARGADO → CERRADO → ENVIADO
```

`CANCELADO` se puede aplicar desde CUALQUIER estado (excepto desde otro estado terminal como ENVIADO o CERRADO), siempre desde el menú ⋮ en DetalleCupo. Es un bypass intencional del flujo, como "Forzar estado", y lo hace el front. El backend solo necesita aceptar el valor.

---

## TAREA 1 — Nueva migración SQL

Crear `supabase/migrations/003_cancelado_status.sql`:

```sql
-- Sprint 7: agrega estado CANCELADO al CHECK constraint de cpe_records.status
-- Ejecutar después de 002_cupo_unique.sql en Supabase SQL Editor.

ALTER TABLE cpe_records
  DROP CONSTRAINT IF EXISTS cpe_records_status_check;

ALTER TABLE cpe_records
  ADD CONSTRAINT cpe_records_status_check
  CHECK (status IN ('IMPORTADO','TRANSPORTE','CARGADO','CERRADO','ENVIADO','CANCELADO'));
```

**Nota importante:** el nombre exacto del constraint puede diferir según cómo fue creado en `001_schema_completo.sql`. Leer ese archivo y usar el nombre exacto en el `DROP CONSTRAINT`. Si el constraint se llama distinto, ajustar.

---

## TAREA 2 — Actualizar tipo TypeScript

En `src/types/index.ts`, agregar `'CANCELADO'` al tipo `CpeStatus`.

Buscar la línea que define `CpeStatus` (algo como):
```ts
export type CpeStatus = 'IMPORTADO' | 'TRANSPORTE' | 'CARGADO' | 'CERRADO' | 'ENVIADO'
```

Cambiar a:
```ts
export type CpeStatus = 'IMPORTADO' | 'TRANSPORTE' | 'CARGADO' | 'CERRADO' | 'ENVIADO' | 'CANCELADO'
```

No modificar ningún otro archivo — el frontend se encarga del resto en otro sprint.

---

## Criterios de aceptación

- [ ] Archivo `supabase/migrations/003_cancelado_status.sql` creado con el ALTER TABLE correcto
- [ ] El constraint en la migración usa el nombre exacto del constraint existente (leído de `001_schema_completo.sql`)
- [ ] `src/types/index.ts` tiene `'CANCELADO'` en el tipo `CpeStatus`
- [ ] `npm run build` pasa sin errores TypeScript
- [ ] No se modificó ningún otro archivo
