-- Fix Q-02: UNIQUE parcial sobre cpe_records.cupo
-- Ejecutar después de 001_schema_completo.sql
--
-- Parcial: excluye NULL y string vacío, ya que los cupos manuales
-- (NewRecord.tsx) pueden no tener código de negocio asignado.
-- PostgreSQL permite múltiples NULL en UNIQUE constraints, pero NO
-- múltiples strings vacíos — el índice parcial resuelve ambos casos.

CREATE UNIQUE INDEX IF NOT EXISTS idx_cpe_records_cupo_unique
  ON cpe_records (cupo)
  WHERE cupo IS NOT NULL AND cupo <> '';
