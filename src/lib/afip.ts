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
  const anonKey    = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim()
  if (!supabaseUrl || !anonKey) return null

  try {
    // apikey identifica el proyecto; Authorization usa el JWT del usuario autenticado
    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token ?? anonKey

    const res = await fetch(
      `${supabaseUrl}/functions/v1/afip-padron?cuit=${clean}`,
      {
        headers: {
          Accept: 'application/json',
          apikey: anonKey,
          Authorization: `Bearer ${token}`,
        },
      }
    )
    if (!res.ok) return null

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = await res.json() as any
    return (data?.razon_social as string) ?? null
  } catch {
    return null
  }
}
