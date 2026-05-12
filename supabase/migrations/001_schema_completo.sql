-- ============================================================
-- CPE Campo (Avancargo) — Schema completo
-- Ejecutar en una instancia Supabase vacía.
-- Un developer nuevo puede levantar el entorno con solo este archivo.
-- ============================================================

-- ============================================================
-- 1. TABLAS
-- ============================================================

-- Emails habilitados para ingresar a la app
CREATE TABLE IF NOT EXISTS authorized_emails (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT        NOT NULL UNIQUE CHECK (email = lower(trim(email))),
  is_admin    BOOLEAN     NOT NULL DEFAULT false,
  created_by  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Contador atómico para generar CPE-XXXX
-- Empieza en 0 → primer ID generado es CPE-0001
CREATE TABLE IF NOT EXISTS id_counter (
  id       INTEGER PRIMARY KEY,
  counter  INTEGER NOT NULL DEFAULT 0
);
INSERT INTO id_counter (id, counter) VALUES (1, 0) ON CONFLICT DO NOTHING;

-- Lotes de importación (un lote = un email comercial pegado)
CREATE TABLE IF NOT EXISTS import_batches (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  raw_email_text  TEXT        NOT NULL,
  parsed_data     JSONB,
  created_by      TEXT        NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT now(),
  total_cupos     INTEGER,
  grano           TEXT,
  destinatario    TEXT,
  destino         TEXT
);

-- Registros CPE (cupos)
CREATE TABLE IF NOT EXISTS cpe_records (
  -- Metadata
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  cpe_id      TEXT        NOT NULL UNIQUE,
  status      TEXT        NOT NULL DEFAULT 'IMPORTADO'
              CHECK (status IN ('IMPORTADO', 'TRANSPORTE', 'CARGADO', 'CERRADO', 'ENVIADO')),
  created_by  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  imported_at TIMESTAMPTZ,
  batch_id    UUID        REFERENCES import_batches(id),
  -- Sección General
  fecha_carga  DATE,
  campo        TEXT,
  localidad    TEXT,
  grano        TEXT,
  variedad     TEXT,
  -- Sección Comercial
  destinatario          TEXT,
  cuit_destinatario     TEXT,
  destino               TEXT,
  cuit_destino          TEXT,
  rte_venta_primaria    TEXT,
  rte_venta_secundaria         TEXT,
  rte_venta_secundaria2        TEXT,
  cuit_rte_venta_secundaria2   TEXT,
  mercado_termino       TEXT,
  corredor_primario     TEXT,
  corredor_secundario   TEXT,
  repr_entregador       TEXT,
  repr_recibidor        TEXT,
  -- Sección Flete
  km                  NUMERIC,
  tarifa              NUMERIC,
  pagador_flete        TEXT,
  cuit_pagador_flete   TEXT,
  cupo                 TEXT,
  intermediario_flete TEXT,
  cuit_intermediario  TEXT,
  nro_planta          TEXT,
  observaciones       TEXT,
  -- Sección Transporte
  transporte      TEXT,
  cuit_transporte TEXT,
  chofer          TEXT,
  cuil_chofer     TEXT,
  chasis          TEXT,
  acoplado        TEXT,
  -- Sección Pesaje
  kg_bruto_cargados    NUMERIC,
  kg_tara_cargados     NUMERIC,
  kg_estimados         NUMERIC,
  kg_bruto_descargados NUMERIC,
  kg_tara_descargados  NUMERIC,
  -- Sección Cierre
  nro_ruca   TEXT,
  gps        TEXT,
  -- Sección A: Intervinientes (Sprint 14+)
  titular_nombre                TEXT,
  titular_cuit                  TEXT,
  remitente_comercial_nombre    TEXT,
  remitente_comercial_cuit      TEXT,
  -- Sección B: Grano (Sprint 14+)
  declaracion_calidad           TEXT CHECK (declaracion_calidad IN ('conforme', 'condicional')),
  -- Sección C: Procedencia (Sprint 14+)
  es_campo_origen               BOOLEAN DEFAULT TRUE,
  descripcion_origen            TEXT,
  -- Sección D: Destino (Sprint 14+)
  es_campo_destino              BOOLEAN DEFAULT FALSE,
  direccion_destino             TEXT,
  localidad_destino             TEXT,
  -- Sección E: Transporte (Sprint 14+)
  fecha_partida                 TIMESTAMPTZ,
  -- GPS descompuesto (Sprint 14+; gps TEXT se mantiene para compatibilidad)
  latitud                       NUMERIC,
  longitud                      NUMERIC,
  -- Sección F: Contingencias (Sprint 15)
  contingencia                  TEXT,
  contingencia_otro             TEXT,
  desactivacion                 TEXT,
  desactivacion_otro            TEXT,
  -- Sección G: Descarga (Sprint 15)
  fecha_arribo                  TIMESTAMPTZ,
  fecha_descarga                TIMESTAMPTZ,
  localidad_descarga            TEXT,
  provincia_descarga            TEXT
);

-- Log de auditoría
CREATE TABLE IF NOT EXISTS audit_log (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id   TEXT        NOT NULL, -- referencia a cpe_records.cpe_id
  action      TEXT        NOT NULL
              CHECK (action IN ('CREACIÓN', 'MODIFICACIÓN', 'CAMBIO_ESTADO', 'NOTIFICACION_WA')),
  user_email  TEXT        NOT NULL,
  field_name  TEXT,
  old_value   TEXT,
  new_value   TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 2. ÍNDICES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_cpe_records_created_at  ON cpe_records (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cpe_records_created_by  ON cpe_records (created_by);
CREATE INDEX IF NOT EXISTS idx_cpe_records_status      ON cpe_records (status);
CREATE INDEX IF NOT EXISTS idx_cpe_records_batch_id    ON cpe_records (batch_id);
CREATE INDEX IF NOT EXISTS idx_cpe_records_fecha_carga ON cpe_records (fecha_carga);
CREATE INDEX IF NOT EXISTS idx_audit_log_record_id     ON audit_log (record_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at    ON audit_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_authorized_emails_email ON authorized_emails (email);

-- ============================================================
-- 3. FUNCIONES AUXILIARES
-- ============================================================

-- Verifica si un email está autorizado (SECURITY DEFINER evita recursión en RLS)
CREATE OR REPLACE FUNCTION is_authorized_user(p_email TEXT)
RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM authorized_emails WHERE email = lower(trim(p_email))
  );
$$;

-- Verifica si un email tiene rol admin
CREATE OR REPLACE FUNCTION is_admin_user(p_email TEXT)
RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM authorized_emails
    WHERE email = lower(trim(p_email)) AND is_admin = true
  );
$$;

-- Genera el siguiente CPE ID de forma atómica (un solo cupo)
CREATE OR REPLACE FUNCTION get_next_cpe_id()
RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_counter INTEGER;
BEGIN
  UPDATE id_counter SET counter = counter + 1
  WHERE id = 1
  RETURNING counter INTO v_counter;

  RETURN 'CPE-' || LPAD(v_counter::TEXT, 4, '0');
END;
$$;

-- Genera N CPE IDs consecutivos en una sola operación atómica.
-- Usado por createCuposEnLote: reserva todos los IDs de golpe
-- para que el bulk INSERT posterior no pueda dejar huecos parciales.
CREATE OR REPLACE FUNCTION get_next_cpe_ids(p_n INTEGER)
RETURNS TEXT[]
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_start INTEGER;
  v_ids   TEXT[];
  i       INTEGER;
BEGIN
  UPDATE id_counter SET counter = counter + p_n
  WHERE id = 1
  RETURNING counter - p_n INTO v_start;

  v_ids := ARRAY[]::TEXT[];
  FOR i IN 1..p_n LOOP
    v_ids := v_ids || ('CPE-' || LPAD((v_start + i)::TEXT, 4, '0'));
  END LOOP;

  RETURN v_ids;
END;
$$;

-- Actualiza updated_at automáticamente en cada UPDATE de cpe_records
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_cpe_records_updated_at
  BEFORE UPDATE ON cpe_records
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- 4. ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE authorized_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE cpe_records        ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log          ENABLE ROW LEVEL SECURITY;
ALTER TABLE id_counter         ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_batches     ENABLE ROW LEVEL SECURITY;

-- ── authorized_emails ──────────────────────────────────────

-- Cualquier autenticado puede leer (necesario para verificar acceso en auth.ts)
CREATE POLICY "authorized_emails: lectura autenticados"
  ON authorized_emails FOR SELECT TO authenticated USING (true);

-- Solo admins pueden agregar o quitar emails
CREATE POLICY "authorized_emails: inserción solo admins"
  ON authorized_emails FOR INSERT TO authenticated
  WITH CHECK (is_admin_user(auth.email()));

CREATE POLICY "authorized_emails: eliminación solo admins"
  ON authorized_emails FOR DELETE TO authenticated
  USING (is_admin_user(auth.email()));

-- ── cpe_records ────────────────────────────────────────────

CREATE POLICY "cpe_records: lectura usuarios autorizados"
  ON cpe_records FOR SELECT TO authenticated
  USING (is_authorized_user(auth.email()));

CREATE POLICY "cpe_records: inserción usuarios autorizados"
  ON cpe_records FOR INSERT TO authenticated
  WITH CHECK (is_authorized_user(auth.email()));

CREATE POLICY "cpe_records: actualización usuarios autorizados"
  ON cpe_records FOR UPDATE TO authenticated
  USING  (is_authorized_user(auth.email()))
  WITH CHECK (is_authorized_user(auth.email()));

-- ── import_batches ─────────────────────────────────────────

CREATE POLICY "import_batches: lectura usuarios autorizados"
  ON import_batches FOR SELECT TO authenticated
  USING (is_authorized_user(auth.email()));

CREATE POLICY "import_batches: inserción usuarios autorizados"
  ON import_batches FOR INSERT TO authenticated
  WITH CHECK (is_authorized_user(auth.email()));

-- ── audit_log ──────────────────────────────────────────────

CREATE POLICY "audit_log: lectura usuarios autorizados"
  ON audit_log FOR SELECT TO authenticated
  USING (is_authorized_user(auth.email()));

CREATE POLICY "audit_log: inserción usuarios autorizados"
  ON audit_log FOR INSERT TO authenticated
  WITH CHECK (is_authorized_user(auth.email()));

-- ── id_counter ─────────────────────────────────────────────
-- Acceso bloqueado desde el cliente; solo accesible vía RPC SECURITY DEFINER
CREATE POLICY "id_counter: sin acceso directo"
  ON id_counter FOR ALL TO authenticated USING (false);

-- ============================================================
-- 5. SEED INICIAL
-- ============================================================

-- Reemplazar 'admin@avancargo.com' con el email real antes de deployar
INSERT INTO authorized_emails (email, is_admin, created_by)
VALUES ('admin@avancargo.com', true, 'seed')
ON CONFLICT (email) DO NOTHING;
