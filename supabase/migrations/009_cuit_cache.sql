-- Cache de CUIT → razón social consultados via AfipSDK
-- Cada CUIT se consulta una sola vez a la API externa y queda guardado para siempre

CREATE TABLE IF NOT EXISTS public.cuit_cache (
  cuit        TEXT PRIMARY KEY,
  razon_social TEXT NOT NULL,
  consultado_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Solo lectura pública (la Edge Function escribe con service_role)
ALTER TABLE public.cuit_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cuit_cache_select_public"
  ON public.cuit_cache FOR SELECT
  USING (true);
