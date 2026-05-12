-- Sprint 15: renombra cuil_intermediario → cuit_intermediario (el intermediario de flete
-- es una empresa identificada por CUIT, no una persona física con CUIL) y agrega las
-- columnas faltantes para completar la estructura de la CPE oficial de AFIP.
-- Ejecutar después de 007_campos_cpe_faltantes.sql en Supabase SQL Editor.

-- ============================================================
-- OPERACIÓN 1: Renombrar columna
-- ============================================================

ALTER TABLE cpe_records
  RENAME COLUMN cuil_intermediario TO cuit_intermediario;

-- ============================================================
-- OPERACIÓN 2: Agregar columnas faltantes
-- ============================================================

ALTER TABLE cpe_records
  -- Sección A: CUITs faltantes
  ADD COLUMN IF NOT EXISTS cuit_rte_venta_secundaria2  TEXT,
  ADD COLUMN IF NOT EXISTS cuit_pagador_flete          TEXT,

  -- Sección D: Destino
  ADD COLUMN IF NOT EXISTS localidad_destino           TEXT,

  -- Sección F: Contingencias
  ADD COLUMN IF NOT EXISTS contingencia                TEXT,
  ADD COLUMN IF NOT EXISTS contingencia_otro           TEXT,
  ADD COLUMN IF NOT EXISTS desactivacion               TEXT,
  ADD COLUMN IF NOT EXISTS desactivacion_otro          TEXT,

  -- Sección G: Descarga
  ADD COLUMN IF NOT EXISTS fecha_arribo                TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS fecha_descarga              TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS localidad_descarga          TEXT,
  ADD COLUMN IF NOT EXISTS provincia_descarga          TEXT;
