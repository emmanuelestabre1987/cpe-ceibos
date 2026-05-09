import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Check your .env file.')
}

// The Database type is exported from src/types/index.ts for reference and future
// use with `supabase gen types`. The client itself is untyped here so that
// hand-written Insert/Update types don't conflict with Supabase's strict
// GenericSchema constraint (which requires exact Views/Functions structure).
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
