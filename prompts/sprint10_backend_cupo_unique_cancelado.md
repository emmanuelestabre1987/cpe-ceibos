# PROMPT — Agente Backend: Sprint 10 · UNIQUE constraint excluye CANCELADO

Sos el agente Backend de CPE Campo (Avancargo). Tenés una sola tarea. Repo: `C:\Users\Emmanuel Estabre\Desktop\Cpe_ceibos`.

Leé `supabase/migrations/002_cupo_unique.sql` antes de empezar.

---

## Contexto del bug

El índice UNIQUE parcial sobre `cpe_records.cupo` actualmente bloquea la reimportación de cupos cuyo código ya existe en la tabla, sin importar el estado. Esto significa que si un cupo fue CANCELADO, su código de negocio (ej: `TBBMA260507EE52`) queda "ocupado" y no se puede volver a importar.

**Comportamiento correcto:** un cupo CANCELADO no debe ocupar el slot de unicidad — su código debe poder reutilizarse en una nueva importación.

---

## TAREA — Nueva migración SQL

Crear `supabase/migrations/004_cupo_unique_exclude_cancelado.sql`:

```sql
-- Sprint 10: excluir cupos CANCELADO del UNIQUE constraint sobre cpe_records.cupo
-- Los cupos cancelados no deben bloquear la reimportación del mismo código de negocio.
-- Ejecutar después de 003_cancelado_status.sql en Supabase SQL Editor.

DROP INDEX IF EXISTS idx_cpe_records_cupo_unique;

CREATE UNIQUE INDEX idx_cpe_records_cupo_unique
  ON cpe_records (cupo)
  WHERE cupo IS NOT NULL AND cupo <> '' AND status <> 'CANCELADO';
```

**Por qué:** el índice parcial anterior bloqueaba todos los estados. Al agregar `AND status <> 'CANCELADO'`, los cupos cancelados quedan fuera de la restricción y su código puede reutilizarse.

---

## Criterios de aceptación

- [ ] Archivo `supabase/migrations/004_cupo_unique_exclude_cancelado.sql` creado
- [ ] El script puede ejecutarse en Supabase SQL Editor sin errores
- [ ] No se modificó ningún otro archivo
