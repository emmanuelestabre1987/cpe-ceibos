/**
 * Consulta el padrón público de AFIP/ARCA y devuelve la denominación.
 * - Personas jurídicas: razonSocial
 * - Personas físicas: nombre
 * Retorna null si el CUIT no existe, está inactivo o hay error de red/CORS.
 *
 * CORS: si la llamada directa falla en el browser, deployar la Supabase Edge Function
 * en supabase/functions/afip-padron/index.ts y cambiar la URL a:
 *   `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/afip-padron?cuit=${clean}`
 */
export async function fetchRazonSocial(cuit: string): Promise<string | null> {
  const clean = cuit.replace(/\D/g, '')
  if (clean.length !== 11) return null

  try {
    const res = await fetch(
      `https://soa.afip.gob.ar/sr-padron/v2/persona/${clean}`,
      { headers: { Accept: 'application/json' } }
    )
    if (!res.ok) return null

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = await res.json() as any
    const dg = data?.datosGenerales
    if (!dg || dg.estadoClave !== 'ACTIVO') return null

    // Persona jurídica
    if (dg.razonSocial) return dg.razonSocial as string

    // Persona física
    if (dg.nombre) return dg.nombre as string

    return null
  } catch {
    return null
  }
}
