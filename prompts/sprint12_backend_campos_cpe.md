# PROMPT — Agente Backend: Sprint 12 · Campos faltantes CPE

Repo: `C:\Users\Emmanuel Estabre\Desktop\Cpe_ceibos`.

Leé antes de empezar:
- `src/types/index.ts` — interfaces `CpeRecord` y `RecordFormData`
- `supabase/migrations/004_cupo_unique_exclude_cancelado.sql` — para seguir la numeración

---

## TAREA 1 — Migración SQL

Crear `supabase/migrations/005_campos_cpe_faltantes.sql`:

```sql
ALTER TABLE cpe_records
  ADD COLUMN IF NOT EXISTS renspa TEXT,
  ADD COLUMN IF NOT EXISTS campania TEXT,
  ADD COLUMN IF NOT EXISTS nro_turno TEXT,
  ADD COLUMN IF NOT EXISTS cuit_corredor_primario TEXT,
  ADD COLUMN IF NOT EXISTS cuit_corredor_secundario TEXT,
  ADD COLUMN IF NOT EXISTS cuit_repr_entregador TEXT,
  ADD COLUMN IF NOT EXISTS cuit_repr_recibidor TEXT,
  ADD COLUMN IF NOT EXISTS cuit_rte_venta_primaria TEXT,
  ADD COLUMN IF NOT EXISTS cuit_rte_venta_secundaria TEXT,
  ADD COLUMN IF NOT EXISTS humedad NUMERIC,
  ADD COLUMN IF NOT EXISTS proteina NUMERIC,
  ADD COLUMN IF NOT EXISTS provincia_origen TEXT,
  ADD COLUMN IF NOT EXISTS provincia_destino TEXT;
```

Recordá: sin líneas en blanco dentro del bloque ALTER (Supabase SQL Editor las interpreta como separador de statements).

---

## TAREA 2 — Tipos

En `src/types/index.ts`, agregar los campos nuevos a `CpeRecord` en la sección correspondiente:

```ts
// General
renspa: string | null
campania: string | null
// Comercial
cuit_rte_venta_primaria: string | null
cuit_rte_venta_secundaria: string | null
cuit_corredor_primario: string | null
cuit_corredor_secundario: string | null
cuit_repr_entregador: string | null
cuit_repr_recibidor: string | null
// Flete
nro_turno: string | null
provincia_origen: string | null
provincia_destino: string | null
// Pesaje
humedad: number | null
proteina: number | null
```

`RecordFormData` es un `Omit` de `CpeRecord` — se actualiza automáticamente.

Agregar también las etiquetas en `FIELD_LABELS`:
```ts
renspa: 'RENSPA',
campania: 'Campaña',
nro_turno: 'Nro. de Turno',
cuit_corredor_primario: 'CUIT Corredor Primario',
cuit_corredor_secundario: 'CUIT Corredor Secundario',
cuit_repr_entregador: 'CUIT Repr. Entregador',
cuit_repr_recibidor: 'CUIT Repr. Recibidor',
cuit_rte_venta_primaria: 'CUIT Rte. Venta Primaria',
cuit_rte_venta_secundaria: 'CUIT Rte. Venta Secundaria',
humedad: 'Humedad (%)',
proteina: 'Proteína (%)',
provincia_origen: 'Provincia Origen',
provincia_destino: 'Provincia Destino',
```

---

## Criterios de aceptación

- [ ] `005_campos_cpe_faltantes.sql` creado, sin líneas en blanco dentro del ALTER
- [ ] Todos los campos nuevos en `CpeRecord` en la sección correcta
- [ ] `FIELD_LABELS` actualizado con todos los campos nuevos
- [ ] `npm run build` pasa sin errores TypeScript
- [ ] No se modifica ningún otro archivo
