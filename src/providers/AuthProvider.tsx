'use client';

import {
  createContext, useContext, useEffect, useState, useCallback, type ReactNode,
} from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';
import type { AccessLevel } from '@/providers/AccessProvider';

export interface UserProfile {
  id: string;
  email: string;
  display_name: string | null;
  access_level: AccessLevel;
  founder_number: number | null;
  created_at: string;
}

type SignInResult =
  | { error: null; profile: UserProfile; redirectTo: string }
  | { error: string; profile: null; redirectTo: null };

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<SignInResult>;
  signUp: (email: string, password: string, metadata?: { display_name?: string }) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const ACCESS_COOKIE = 'mpro:access-level';
const FOUNDER_COOKIE = 'mpro:founder-number';
const ACCESS_STORAGE_KEY = 'mpro:access-level';
const PROFILE_STORAGE_KEYS = [
  'mpro:access-level',
  'mpro:founder-number',
  'mpro:founder-alias',
  'mpro:founder-display-mode',
];

function writeProfileAccess(profile: UserProfile) {
  if (typeof document === 'undefined') return;

  const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toUTCString();
  document.cookie = `${ACCESS_COOKIE}=${profile.access_level};path=/;expires=${expires};SameSite=Lax`;
  console.log('[AUTH] cookie mpro:access-level set to', profile.access_level);

  if (profile.founder_number != null) {
    document.cookie = `${FOUNDER_COOKIE}=${profile.founder_number};path=/;expires=${expires};SameSite=Lax`;
  } else {
    document.cookie = `${FOUNDER_COOKIE}=;path=/;max-age=0;SameSite=Lax`;
  }

  try {
    window.localStorage.setItem(ACCESS_STORAGE_KEY, JSON.stringify(profile.access_level));
    if (profile.founder_number != null) {
      window.localStorage.setItem('mpro:founder-number', JSON.stringify(profile.founder_number));
    } else {
      window.localStorage.removeItem('mpro:founder-number');
    }
  } catch {
    // Ignorar errores de storage.
  }
}

function clearAccessArtifacts() {
  if (typeof document !== 'undefined') {
    document.cookie = `${ACCESS_COOKIE}=;path=/;max-age=0;SameSite=Lax`;
    document.cookie = `${FOUNDER_COOKIE}=;path=/;max-age=0;SameSite=Lax`;
  }

  if (typeof window === 'undefined') return;

  try {
    for (const key of PROFILE_STORAGE_KEYS) {
      window.localStorage.removeItem(key);
      window.sessionStorage.removeItem(key);
    }

    for (let i = window.localStorage.length - 1; i >= 0; i -= 1) {
      const key = window.localStorage.key(i);
      if (key?.startsWith('mpro:')) {
        window.localStorage.removeItem(key);
      }
    }

    for (let i = window.sessionStorage.length - 1; i >= 0; i -= 1) {
      const key = window.sessionStorage.key(i);
      if (key?.startsWith('mpro:')) {
        window.sessionStorage.removeItem(key);
      }
    }
  } catch {
    // Ignorar errores de storage.
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (
    userId: string,
    email?: string | null,
  ): Promise<UserProfile | null> => {
    console.log('[AUTH] fetchProfile start', { userId, email: email ?? null });
    const supabase = createSupabaseBrowserClient();

    try {
      let profileData: UserProfile | null = null;
      let profileError: { code?: string; message: string } | null = null;

      const byIdResult = await supabase
        .from('profiles')
        .select('id, email, display_name, access_level, founder_number, created_at')
        .eq('id', userId)
        .maybeSingle();

      if (byIdResult.error) {
        profileError = byIdResult.error;
      } else if (byIdResult.data) {
        profileData = byIdResult.data as UserProfile;
      }

      if (!profileData && email) {
        console.log('[AUTH] fetchProfile fallback=email', email);
        const byEmailResult = await supabase
          .from('profiles')
          .select('id, email, display_name, access_level, founder_number, created_at')
          .ilike('email', email)
          .maybeSingle();

        if (byEmailResult.error) {
          profileError = byEmailResult.error;
        } else if (byEmailResult.data) {
          profileData = byEmailResult.data as UserProfile;
        }
      }

      if (!profileData) {
        if (profileError) {
          console.error('[AUTH] profile error', profileError);
        } else {
          console.warn('[AUTH] profile error', 'profile not found');
        }
        setProfile(null);
        return null;
      }

      console.log(
        '[AUTH] profile loaded',
        `email=${profileData.email}`,
        `access_level=${profileData.access_level}`,
        `founder_number=${profileData.founder_number ?? 'null'}`,
      );

      writeProfileAccess(profileData);
      setProfile(profileData);
      return profileData;
    } catch (error) {
      console.error('[AUTH] profile error', error);
      setProfile(null);
      return null;
    }
  }, []);

  const syncFromSession = useCallback(async (nextSession: Session | null) => {
    setSession(nextSession);
    setUser(nextSession?.user ?? null);

    if (!nextSession?.user) {
      setProfile(null);
      clearAccessArtifacts();
      setLoading(false);
      return;
    }

    console.log('[AUTH] user loaded', nextSession.user.email ?? nextSession.user.id);
    const loadedProfile = await fetchProfile(nextSession.user.id, nextSession.user.email);
    if (!loadedProfile) {
      console.warn('[AUTH] profile missing for authenticated user', nextSession.user.id);
    }
    setLoading(false);
  }, [fetchProfile]);

  const refreshProfile = useCallback(async () => {
    if (!user) return;
    await fetchProfile(user.id, user.email);
  }, [fetchProfile, user]);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    let mounted = true;

    console.log('[AUTH] init reading session');

    void supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      if (!mounted) return;
      void syncFromSession(initialSession);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!mounted) return;
      console.log('[AUTH] onAuthStateChange', event, nextSession?.user?.email ?? 'none');
      window.setTimeout(() => {
        if (!mounted) return;
        void syncFromSession(nextSession);
      }, 0);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [syncFromSession]);

  const signIn = useCallback(async (email: string, password: string): Promise<SignInResult> => {
    console.log('[LOGIN] start', email);
    setLoading(true);
    const supabase = createSupabaseBrowserClient();

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        console.error('[LOGIN] error', error.message);
        setLoading(false);
        if (error.message === 'Invalid login credentials') {
          return { error: 'Email o contraseña incorrectos.', profile: null, redirectTo: null };
        }
        return { error: error.message, profile: null, redirectTo: null };
      }

      console.log('[LOGIN] success');
      console.log('[LOGIN] session', data.session ? 'present' : 'null');

      if (!data.session) {
        setLoading(false);
        return {
          error: 'No se ha podido iniciar sesión. Revisa si el email está confirmado.',
          profile: null,
          redirectTo: null,
        };
      }

      console.log('[LOGIN] user id', data.session.user.id);
      setSession(data.session);
      setUser(data.session.user);

      console.log('[LOGIN] fetching profile');
      const loadedProfile = await fetchProfile(data.session.user.id, data.session.user.email);

      if (!loadedProfile) {
        console.error('[LOGIN] error', 'profile not found');
        setLoading(false);
        return {
          error: 'Tu cuenta existe, pero no se ha encontrado tu perfil de acceso. Contacta con soporte.',
          profile: null,
          redirectTo: null,
        };
      }

      console.log('[LOGIN] profile loaded');
      console.log('[LOGIN] access_level', loadedProfile.access_level);

      const redirectTo = '/app/dashboard';
      console.log('[LOGIN] redirect', redirectTo);
      setLoading(false);

      return {
        error: null,
        profile: loadedProfile,
        redirectTo,
      };
    } catch (error) {
      console.error('[LOGIN] error', error);
      setLoading(false);
      return {
        error: 'No se ha podido iniciar sesión. Inténtalo de nuevo.',
        profile: null,
        redirectTo: null,
      };
    }
  }, [fetchProfile]);

  const signUp = useCallback(async (
    email: string,
    password: string,
    metadata?: { display_name?: string },
  ): Promise<{ error: string | null }> => {
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: metadata ?? {},
      },
    });

    if (error) {
      console.warn('[AUTH] signUp error:', error.message);
      return { error: error.message };
    }

    console.log('[AUTH] signUp OK, confirmation email sent to:', email);
    return { error: null };
  }, []);

  const signOut = useCallback(async () => {
    console.log('[LOGOUT] start');
    const supabase = createSupabaseBrowserClient();

    try {
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
      setProfile(null);
      clearAccessArtifacts();
      console.log('[LOGOUT] storage cleared');
      console.log('[LOGOUT] success');
    } catch (error) {
      console.error('[LOGOUT] error', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        loading,
        signIn,
        signUp,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
