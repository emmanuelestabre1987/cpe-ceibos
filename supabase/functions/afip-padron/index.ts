import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  })

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS })

  const url = new URL(req.url)
  const cuit = url.searchParams.get('cuit')?.replace(/\D/g, '')
  if (!cuit || cuit.length !== 11) return json({ error: 'cuit must be 11 digits' }, 400)

  // ── 1. Buscar en cache ────────────────────────────────────────────
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const { data: cached } = await supabase
    .from('cuit_cache')
    .select('razon_social')
    .eq('cuit', cuit)
    .maybeSingle()

  if (cached?.razon_social) {
    return json({ razon_social: cached.razon_social, from_cache: true })
  }

  // ── 2. Consultar AfipSDK ─────────────────────────────────────────
  const afipToken = Deno.env.get('AFIPSDK_TOKEN')
  if (!afipToken) return json({ error: 'AFIPSDK_TOKEN not set' }, 500)

  try {
    // Paso 1: obtener token y sign
    const authRes = await fetch('https://app.afipsdk.com/api/v1/afip/auth', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${afipToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        environment: 'prod',
        tax_id: '20409378472',
        wsid: 'ws_sr_constancia_inscripcion',
      }),
    })

    if (!authRes.ok) return json({ error: 'AfipSDK auth failed' }, 502)
    const { token, sign } = await authRes.json()

    // Paso 2: consultar persona
    const personaRes = await fetch('https://app.afipsdk.com/api/v1/afip/requests', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${afipToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        environment: 'prod',
        method: 'getPersona_v2',
        wsid: 'ws_sr_constancia_inscripcion',
        params: {
          token,
          sign,
          cuitRepresentada: '20409378472',
          idPersona: parseInt(cuit),
        },
      }),
    })

    if (!personaRes.ok) return json({ error: 'AfipSDK persona failed' }, 502)
    const persona = await personaRes.json()

    // Extraer razón social
    const dg = persona?.datosGenerales
    if (!dg) return json({ razon_social: null })

    const razon_social: string =
      dg.razonSocial ||
      (dg.nombre ? `${dg.apellido ?? ''} ${dg.nombre}`.trim() : null)

    if (!razon_social) return json({ razon_social: null })

    // ── 3. Guardar en cache ─────────────────────────────────────────
    await supabase.from('cuit_cache').upsert({ cuit, razon_social })

    return json({ razon_social, from_cache: false })

  } catch (err) {
    return json({ error: String(err) }, 502)
  }
})
