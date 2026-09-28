import { useEffect } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase, supabaseUrl, supabaseKey } from './supabase';
import { useStore, DEFAULT_AVATAR } from '../store/useStore';

/** Google sign-in; Supabase redirects back to the page the user is on (e.g. a shared room link) */
export async function signInWithGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin + window.location.pathname },
  });
  if (error) throw error;
}

/** Whether Google is switched on in the Supabase dashboard; checked live so no redeploy is needed */
export async function isGoogleSignInEnabled(): Promise<boolean> {
  try {
    const res = await fetch(`${supabaseUrl}/auth/v1/settings`, { headers: { apikey: supabaseKey } });
    if (!res.ok) return false;
    const settings = await res.json();
    return !!settings?.external?.google;
  } catch {
    return false;
  }
}

/** Guest sign-in (Supabase anonymous user): works right away, tied to this browser */
export async function signInAsGuest() {
  const { error } = await supabase.auth.signInAnonymously();
  if (error) throw error;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export const isGuest = (user: User | null) => !!user?.is_anonymous;

/** Keeps the store in sync with the Supabase session. Mount once, in App. */
export function useAuthSync() {
  const setAuthUser = useStore((s) => s.setAuthUser);
  const setProfile = useStore((s) => s.setProfile);

  useEffect(() => {
    const apply = (user: User | null) => {
      setAuthUser(user);
      if (!user) return;

      // Messages and room membership are keyed by the auth user id
      const { profile } = useStore.getState();
      const meta = user.user_metadata ?? {};
      setProfile({
        id: user.id,
        // Fill in from Google only where the user hasn't set something themselves
        name: profile.name || meta.full_name || meta.name || '',
        avatarUrl: (profile.avatarUrl !== DEFAULT_AVATAR && profile.avatarUrl) || meta.avatar_url || meta.picture || DEFAULT_AVATAR,
      });
    };

    supabase.auth.getSession().then(({ data }) => apply(data.session?.user ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => apply(session?.user ?? null));
    return () => sub.subscription.unsubscribe();
  }, [setAuthUser, setProfile]);
}
