-- Sprint 14+: agrega campos CPE faltantes para alinear con la CPE oficial de AFIP
-- Ejecutar después de 006_drop_campos_no_cpe.sql en Supabase SQL Editor.

ALTER TABLE cpe_records
  -- Sección A: Intervinientes nuevos
  ADD COLUMN IF NOT EXISTS titular_nombre                TEXT,
  ADD COLUMN IF NOT EXISTS titular_cuit                  TEXT,
  ADD COLUMN IF NOT EXISTS remitente_comercial_nombre    TEXT,
  ADD COLUMN IF NOT EXISTS remitente_comercial_cuit      TEXT,

  -- Sección B: Grano
  ADD COLUMN IF NOT EXISTS declaracion_calidad           TEXT
    CHECK (declaracion_calidad IN ('conforme', 'condicional')),

  -- Sección C: Procedencia
  ADD COLUMN IF NOT EXISTS es_campo_origen               BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS descripcion_origen            TEXT,

  -- Sección D: Destino
  ADD COLUMN IF NOT EXISTS es_campo_destino              BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS direccion_destino             TEXT,

  -- Sección E: Transporte
  ADD COLUMN IF NOT EXISTS fecha_partida                 TIMESTAMPTZ,

  -- GPS descompuesto (el campo gps TEXT existente se mantiene para compatibilidad)
  ADD COLUMN IF NOT EXISTS latitud                       NUMERIC,
  ADD COLUMN IF NOT EXISTS longitud                      NUMERIC;
