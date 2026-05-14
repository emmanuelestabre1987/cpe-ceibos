import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  })

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS })

  const afipToken = Deno.env.get('AFIPSDK_TOKEN')
  const afipCuit  = Deno.env.get('AFIP_CUIT')
  const afipCert  = Deno.env.get('AFIP_CERT')?.replace(/\|/g, '\n')
  const afipKey   = Deno.env.get('AFIP_KEY')?.replace(/\|/g, '\n')

  if (!afipToken || !afipCuit || !afipCert || !afipKey)
    return json({ error: 'Missing AFIP credentials' }, 500)

  try {
    // 1. Auth para wscpe en dev
    const authRes = await fetch('https://app.afipsdk.com/api/v1/afip/auth', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${afipToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        environment: 'prod',
        tax_id: afipCuit,
        wsid: 'wscpe',
        cert: afipCert,
        key: afipKey,
      }),
    })
    if (!authRes.ok) return json({ error: `Auth failed: ${await authRes.text()}` }, 502)
    const { token, sign } = await authRes.json()

    const call = async (method: string, params = {}) => {
      const r = await fetch('https://app.afipsdk.com/api/v1/afip/requests', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${afipToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          environment: 'prod',
          wsid: 'wscpe',
          method,
          params: { auth: { token, sign, cuitRepresentada: parseInt(afipCuit) }, ...params },
        }),
      })
      const text = await r.text()
      try { return { ok: r.ok, data: JSON.parse(text) } } catch { return { ok: r.ok, raw: text } }
    }

    // 2. Consultar tablas de a una para ver errores
    const provincias = await call('consultarProvincias')
    const granos     = await call('consultarTiposGrano')

    return json({ provincias, granos })

  } catch (err) {
    return json({ error: String(err) }, 502)
  }
})
