import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isPasswordSetupRedirect = (() => {
  const url = new URL(window.location.href);
  const authType = url.searchParams.get("type") ?? new URLSearchParams(url.hash.slice(1)).get("type");
  return authType === "invite" || authType === "recovery" || url.searchParams.has("code");
})();

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true },
    })
  : null;
