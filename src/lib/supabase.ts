import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

if (!url || !key) {
  // Fails loudly in dev and in a Vercel build that is missing its environment variables
  throw new Error('VITE_SUPABASE_URL ve VITE_SUPABASE_PUBLISHABLE_KEY ortam değişkenleri tanımlı değil (.env.local veya Vercel ayarları).');
}

export const supabase = createClient(url, key, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true, // picks up the session when Google redirects back
  },
});
