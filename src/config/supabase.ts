import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !key) {
  throw new Error('Variáveis SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórias')
}

// Service role — acesso total, só usado no servidor, NUNCA exposto ao cliente
export const supabase = createClient(url, key, {
  auth: { persistSession: false }
})