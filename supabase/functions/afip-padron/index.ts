import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS })
  }

  const url = new URL(req.url)
  const cuit = url.searchParams.get('cuit')
  if (!cuit || !/^\d{11}$/.test(cuit)) {
    return new Response(JSON.stringify({ error: 'cuit must be 11 digits' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    })
  }

  try {
    const upstream = await fetch(
      `https://soa.afip.gob.ar/sr-padron/v2/persona/${cuit}`,
      { headers: { Accept: 'application/json' } }
    )
    const data = await upstream.json()
    return new Response(JSON.stringify(data), {
      status: upstream.status,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 502,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    })
  }
})
