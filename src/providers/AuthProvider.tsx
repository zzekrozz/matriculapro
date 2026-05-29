'use client';

import {
  createContext, useContext, useEffect, useState, useCallback,
  type ReactNode
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

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, metadata?: { display_name?: string }) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // ---- fetchProfile ----
  const fetchProfile = useCallback(async (userId: string) => {
    const supabase = createSupabaseBrowserClient();
    const { data } = await supabase
      .from('profiles')
      .select('id, email, display_name, access_level, founder_number, created_at')
      .eq('id', userId)
      .single();

    setProfile(data as UserProfile ?? null);
  }, []);

  // ---- refreshProfile (expuesto en contexto) ----
  const refreshProfile = useCallback(async () => {
    if (user) await fetchProfile(user.id);
  }, [user, fetchProfile]);

  // ---- Inicialización ----
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    // Leer sesión inicial (no hace petición de red, sólo lee cookies)
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        fetchProfile(s.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    // Suscripción a cambios de auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, s) => {
        setSession(s);
        setUser(s?.user ?? null);
        if (s?.user) {
          await fetchProfile(s.user.id);
        } else {
          setProfile(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  // ---- signIn ----
  const signIn = useCallback(async (email: string, password: string) => {
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      return {
        error: error.message === 'Invalid login credentials'
          ? 'Email o contraseña incorrectos.'
          : error.message,
      };
    }
    return { error: null };
  }, []);

  // ---- signUp ----
  const signUp = useCallback(async (
    email: string,
    password: string,
    metadata?: { display_name?: string },
  ) => {
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: metadata ?? {},
      },
    });
    if (error) return { error: error.message };

    // display_name: actualizar en profiles cuando el trigger haya creado la fila
    // Lo intentamos con retraso para dejar tiempo al trigger
    if (metadata?.display_name) {
      setTimeout(async () => {
        const { data: { user: u } } = await supabase.auth.getUser();
        if (u) {
          await supabase
            .from('profiles')
            .update({ display_name: metadata.display_name })
            .eq('id', u.id);
        }
      }, 2000);
    }

    return { error: null };
  }, []);

  // ---- signOut ----
  const signOut = useCallback(async () => {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
  }, []);

  return (
    <AuthContext.Provider value={{
      user, session, profile, loading,
      signIn, signUp, signOut, refreshProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
