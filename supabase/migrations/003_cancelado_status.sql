-- Sprint 7: agrega estado CANCELADO al CHECK constraint de cpe_records.status
-- Ejecutar después de 002_cupo_unique.sql en Supabase SQL Editor.
--
-- El constraint fue definido inline en 001_schema_completo.sql sin nombre
-- explícito; PostgreSQL lo nombra automáticamente cpe_records_status_check.

ALTER TABLE cpe_records
  DROP CONSTRAINT IF EXISTS cpe_records_status_check;

ALTER TABLE cpe_records
  ADD CONSTRAINT cpe_records_status_check
  CHECK (status IN ('IMPORTADO','TRANSPORTE','CARGADO','CERRADO','ENVIADO','CANCELADO'));
