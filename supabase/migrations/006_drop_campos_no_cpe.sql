-- Sprint 13+: elimina campos que no corresponden a la CPE de AFIP
-- Ejecutar después de 005_campos_cpe_faltantes.sql en Supabase SQL Editor.
ALTER TABLE cpe_records
  DROP COLUMN IF EXISTS kg_reales,
  DROP COLUMN IF EXISTS humedad,
  DROP COLUMN IF EXISTS proteina,
  DROP COLUMN IF EXISTS ingeniero,
  DROP COLUMN IF EXISTS contacto;
