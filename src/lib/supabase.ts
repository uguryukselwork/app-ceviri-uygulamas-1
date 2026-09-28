import { createClient } from '@supabase/supabase-js';

// Public values: they ship in the browser bundle anyway, and row level security protects the data.
// Environment variables override them (e.g. to point a local build at another project).
const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined) || 'https://jcygdcsdgccxuixfocof.supabase.co';
const key = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) || 'sb_publishable_Loih6ugYDyfvXhNXphxgzg_-N3Al4ox';

export const supabase = createClient(url, key, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true, // picks up the session when Google redirects back
  },
});
