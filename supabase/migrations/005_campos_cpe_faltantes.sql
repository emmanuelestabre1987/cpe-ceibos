-- Sprint 12: agrega campos CPE faltantes a cpe_records
-- Ejecutar después de 004_cupo_unique_exclude_cancelado.sql en Supabase SQL Editor.
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
  ADD COLUMN IF NOT EXISTS provincia_origen TEXT,
  ADD COLUMN IF NOT EXISTS provincia_destino TEXT;
