import { createClient } from '@supabase/supabase-js'

// Uses the training app's Supabase if separate env vars are provided,
// otherwise falls back to the main yayracare Supabase (requires same tables).
const url =
  process.env.NEXT_PUBLIC_TRAINING_SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  ''
const key =
  process.env.NEXT_PUBLIC_TRAINING_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  ''

export const dspSupabase = createClient(url, key, {
  auth: { persistSession: false },
})
