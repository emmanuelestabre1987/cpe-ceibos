-- Sprint 10: excluir cupos CANCELADO del UNIQUE constraint sobre cpe_records.cupo
-- Los cupos cancelados no deben bloquear la reimportación del mismo código de negocio.
-- Ejecutar después de 003_cancelado_status.sql en Supabase SQL Editor.

DROP INDEX IF EXISTS idx_cpe_records_cupo_unique;

CREATE UNIQUE INDEX idx_cpe_records_cupo_unique
  ON cpe_records (cupo)
  WHERE cupo IS NOT NULL AND cupo <> '' AND status <> 'CANCELADO';
