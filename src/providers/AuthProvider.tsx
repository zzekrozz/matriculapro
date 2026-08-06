'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';
import {
  createSupabaseBrowserClient,
  isSupabaseBrowserConfigured,
} from '@/lib/supabase/browser';

export interface UserProfile {
  id: string;
  email: string;
  display_name: string | null;
  created_at: string;
}

type AuthActionResult = { error: string | null; redirectTo: string | null };

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string, next?: string) => Promise<AuthActionResult>;
  signUp: (
    email: string,
    password: string,
    input: {
      displayName: string;
      passwordConfirmation: string;
      next?: string;
      acceptedTerms: boolean;
      acceptedPrivacy: boolean;
    },
  ) => Promise<AuthActionResult>;
  signOut: (scope?: 'local' | 'global' | 'others') => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (currentUser: User | null) => {
    if (!currentUser || !isSupabaseBrowserConfigured()) {
      setProfile(null);
      return;
    }
    const supabase = createSupabaseBrowserClient();
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, display_name, created_at')
      .eq('id', currentUser.id)
      .maybeSingle();
    if (error || !data || data.id !== currentUser.id) {
      setProfile(null);
      return;
    }
    setProfile(data as UserProfile);
  }, []);

  const syncSession = useCallback(async (nextSession: Session | null) => {
    setSession(nextSession);
    setUser(nextSession?.user ?? null);
    await fetchProfile(nextSession?.user ?? null);
    setLoading(false);
  }, [fetchProfile]);

  useEffect(() => {
    if (!isSupabaseBrowserConfigured()) {
      setLoading(false);
      return;
    }
    const supabase = createSupabaseBrowserClient();
    let mounted = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (mounted) void syncSession(data.session);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) return;
      window.setTimeout(() => {
        if (mounted) void syncSession(nextSession);
      }, 0);
    });
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [syncSession]);

  const signIn = useCallback(async (
    email: string,
    password: string,
    next?: string,
  ): Promise<AuthActionResult> => {
    setLoading(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, next }),
      });
      const payload = await response.json() as { ok?: boolean; message?: string; redirectTo?: string };
      if (!response.ok || !payload.ok) {
        return { error: payload.message || 'No se ha podido iniciar sesión.', redirectTo: null };
      }
      if (isSupabaseBrowserConfigured()) {
        const { data } = await createSupabaseBrowserClient().auth.getSession();
        await syncSession(data.session);
      }
      return { error: null, redirectTo: payload.redirectTo ?? '/app/comprobar' };
    } catch {
      return { error: 'No se ha podido iniciar sesión. Inténtalo de nuevo.', redirectTo: null };
    } finally {
      setLoading(false);
    }
  }, [syncSession]);

  const signUp = useCallback(async (
    email: string,
    password: string,
    input: {
      displayName: string;
      passwordConfirmation: string;
      next?: string;
      acceptedTerms: boolean;
      acceptedPrivacy: boolean;
    },
  ): Promise<AuthActionResult> => {
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, ...input }),
      });
      const payload = await response.json() as { ok?: boolean; message?: string };
      if (!response.ok || !payload.ok) {
        return { error: payload.message || 'No se ha podido crear la cuenta.', redirectTo: null };
      }
      return { error: null, redirectTo: null };
    } catch {
      return { error: 'No se ha podido crear la cuenta. Inténtalo de nuevo.', redirectTo: null };
    }
  }, []);

  const signOut = useCallback(async (scope: 'local' | 'global' | 'others' = 'local') => {
    if (isSupabaseBrowserConfigured()) {
      const { error } = await createSupabaseBrowserClient().auth.signOut({ scope });
      if (error) throw error;
    }
    if (scope !== 'others') {
      setSession(null);
      setUser(null);
      setProfile(null);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    await fetchProfile(user);
  }, [fetchProfile, user]);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    session,
    profile,
    loading,
    signIn,
    signUp,
    signOut,
    refreshProfile,
  }), [loading, profile, refreshProfile, session, signIn, signOut, signUp, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
