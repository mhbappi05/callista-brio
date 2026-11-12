import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isSupabaseConfigured = Boolean(url && anonKey)

if (!isSupabaseConfigured) {
  console.warn('Supabase is not configured. Copy .env.example to .env and fill in the values.')
}

// Only the public anon key belongs here. Row Level Security protects the data.
export const supabase = isSupabaseConfigured ? createClient(url, anonKey) : null
