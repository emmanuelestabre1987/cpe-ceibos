import { supabase } from './supabase'

/**
 * Consulta el padrón público de AFIP/ARCA via Supabase Edge Function (proxy CORS).
 * - Personas jurídicas: razonSocial
 * - Personas físicas: nombre
 * Retorna null si el CUIT no existe, está inactivo o hay error de red.
 */
export async function fetchRazonSocial(cuit: string): Promise<string | null> {
  const clean = cuit.replace(/\D/g, '')
  if (clean.length !== 11) return null

  const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim()
  if (!supabaseUrl) return null

  try {
    // Usar session token si está disponible; si no, la anon key como fallback
    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token
      ?? (import.meta.env.VITE_SUPABASE_ANON_KEY as string)

    console.log('[afip] session token present:', !!session?.access_token)

    const res = await fetch(
      `${supabaseUrl}/functions/v1/afip-padron?cuit=${clean}`,
      {
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
        },
      }
    )
    console.log('[afip] response status:', res.status)
    if (!res.ok) {
      const txt = await res.text()
      console.error('[afip] error body:', txt)
      return null
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = await res.json() as any
    console.log('[afip] data:', data)
    return (data?.razon_social as string) ?? null
  } catch (e) {
    console.error('[afip] exception:', e)
    return null
  }
}
