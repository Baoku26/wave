import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Server-side admin client — uses service role key, never sent to browser.
// Only use in API routes. Never import in client components.
export function getSupabaseAdmin() {
  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { persistSession: false },
  });
}

// Browser-safe client — uses anon key.
// For read-only client-side queries only. Profile writes must go through API routes.
export const supabaseBrowser = createClient(supabaseUrl, supabaseAnonKey);

export type Profile = {
  wallet_address: string;
  display_name:   string | null;
  avatar_url:     string | null;
  created_at:     string;
};
