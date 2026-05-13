/**
 * Consulta el padrón público de AFIP/ARCA via Supabase Edge Function (proxy CORS).
 * - Personas jurídicas: razonSocial
 * - Personas físicas: nombre
 * Retorna null si el CUIT no existe, está inactivo o hay error de red.
 */
export async function fetchRazonSocial(cuit: string): Promise<string | null> {
  const clean = cuit.replace(/\D/g, '')
  if (clean.length !== 11) return null

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
  if (!supabaseUrl || !supabaseKey) return null

  try {
    const res = await fetch(
      `${supabaseUrl}/functions/v1/afip-padron?cuit=${clean}`,
      {
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${supabaseKey}`,
        },
      }
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
