import { createClient, SupabaseClient } from "@supabase/supabase-js";

/** Lazy-initialized Supabase client (avoids crash during build with empty env vars) */
let _supabase: SupabaseClient | null = null;
let _supabaseAdmin: SupabaseClient | null = null;

function getEnv(key: string): string {
  const val = process.env[key];
  if (!val || val.startsWith("your-")) return "";
  return val;
}

/** Public client (anon key — safe for browser) */
export function supabase(): SupabaseClient {
  if (!_supabase) {
    const url = getEnv("NEXT_PUBLIC_SUPABASE_URL");
    const key = getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
    if (!url || !key) {
      throw new Error("Supabase URL/Anon Key belum dikonfigurasi. Set NEXT_PUBLIC_SUPABASE_URL & NEXT_PUBLIC_SUPABASE_ANON_KEY di .env");
    }
    _supabase = createClient(url, key);
  }
  return _supabase;
}

/** Server-side client with service role — bypass RLS. Only use in API routes. */
export function supabaseAdmin(): SupabaseClient {
  if (!_supabaseAdmin) {
    const url = getEnv("NEXT_PUBLIC_SUPABASE_URL");
    const serviceKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !serviceKey) {
      throw new Error("Supabase Service Role Key belum dikonfigurasi. Set SUPABASE_SERVICE_ROLE_KEY di .env");
    }
    _supabaseAdmin = createClient(url, serviceKey);
  }
  return _supabaseAdmin;
}
