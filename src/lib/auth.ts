import { supabase } from './supabase'

export async function isEmailAuthorized(email: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('authorized_emails')
    .select('email')
    .eq('email', email.toLowerCase().trim())
    .maybeSingle()

  if (error) throw error
  return data !== null
}

export async function sendMagicLink(email: string): Promise<void> {
  const { error } = await supabase.auth.signInWithOtp({
    email: email.toLowerCase().trim(),
    options: {
      emailRedirectTo: `${window.location.origin}/`,
    },
  })
  if (error) throw error
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function isAdmin(email: string): Promise<boolean> {
  const { data } = await supabase
    .from('authorized_emails')
    .select('is_admin')
    .eq('email', email.toLowerCase().trim())
    .maybeSingle()
  return data?.is_admin === true
}
