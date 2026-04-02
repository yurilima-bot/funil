import { createBrowserClient } from "@supabase/ssr";

/**
 * Cliente no browser com PKCE. Sem `cookies` customizado: o @supabase/ssr usa
 * `document.cookie` corretamente (parse/serialize) para o code verifier OAuth.
 */
export function getSupabaseClient() {
  if (typeof window === "undefined") return null;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) return null;

  return createBrowserClient(supabaseUrl, supabaseKey);
}
