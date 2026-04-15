import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL?.replace(/\/+$/, '')
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const publicKey = process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY ?? null

if (!url || !serviceRoleKey) {
  throw new Error('Variaveis SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY sao obrigatorias')
}

const supabaseBaseUrl = url

function createServerClient(key: string) {
  return createClient(supabaseBaseUrl, key, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false
    }
  })
}

export const supabaseUrl = supabaseBaseUrl
export const supabasePublicKey = publicKey
export const supabase = createServerClient(serviceRoleKey)
export const supabaseAdmin = supabase

export function hasSupabasePublicCredentials(): boolean {
  return Boolean(supabaseUrl && supabasePublicKey)
}

export function createSupabasePublicClient() {
  if (!supabasePublicKey) {
    throw new Error('Variavel SUPABASE_PUBLISHABLE_KEY ou SUPABASE_ANON_KEY nao configurada')
  }

  return createServerClient(supabasePublicKey)
}
