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

const ADMIN_EMAIL = 'pogrebnyakivan123@gmail.com';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // ─── fetchProfile ─────────────────────────────────────────────────────────
  // NUNCA lanza. Siempre llama a setProfile (con null si falla).
  const fetchProfile = useCallback(async (userId: string): Promise<void> => {
    try {
      const supabase = createSupabaseBrowserClient();
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, display_name, access_level, founder_number, created_at')
        .eq('id', userId)
        .single();

      if (error) {
        // PGRST116 = no rows found (perfil aún no existe, el trigger puede tardar)
        if (error.code !== 'PGRST116') {
          console.warn('[Auth] fetchProfile error:', error.code, error.message);
        }
        setProfile(null);
        return;
      }

      const p = data as UserProfile;
      const founderTag = p.founder_number
        ? `Founder #${String(p.founder_number).padStart(4, '0')}`
        : 'sin número';
      console.log(`[Auth] 👤 ${p.email} | ${p.access_level} | ${founderTag}`);
      if (p.email === ADMIN_EMAIL) {
        console.log('[Auth] 🔑 Admin — debería ser full #0001');
      }

      // Sincronizar cookie con el nivel real de Supabase ANTES de setProfile
      // para que cualquier render posterior ya vea el nivel correcto
      if (typeof document !== 'undefined') {
        const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toUTCString();
        document.cookie = `mpro:access-level=${p.access_level};path=/;expires=${expires};SameSite=Lax`;
        console.log('[Auth] cookie mpro:access-level →', p.access_level);
      }

      setProfile(p);
    } catch (err) {
      console.error('[Auth] fetchProfile excepción:', err);
      setProfile(null);
    }
  }, []);

  // ─── refreshProfile ────────────────────────────────────────────────────────
  const refreshProfile = useCallback(async () => {
    if (user) await fetchProfile(user.id);
  }, [user, fetchProfile]);

  // ─── Inicialización ────────────────────────────────────────────────────────
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    let mounted = true;

    // Leer sesión actual al montar
    supabase.auth.getSession().then(async ({ data: { session: s } }) => {
      if (!mounted) return;
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        await fetchProfile(s.user.id);
      }
      setLoading(false);
    });

    // Escuchar cambios de auth (login, logout, token refresh, email confirmed)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, s) => {
        console.log('[Auth] event:', event, s?.user?.email ?? 'no user');
        if (!mounted) return;

        setSession(s);
        setUser(s?.user ?? null);

        if (s?.user) {
          await fetchProfile(s.user.id);
        } else {
          setProfile(null);
          // Limpiar cookie al cerrar sesión
          if (typeof document !== 'undefined') {
            document.cookie = 'mpro:access-level=visitor;path=/;max-age=0;SameSite=Lax';
          }
        }
        setLoading(false);
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  // ─── signIn ───────────────────────────────────────────────────────────────
  const signIn = useCallback(async (email: string, password: string): Promise<{ error: string | null }> => {
    const supabase = createSupabaseBrowserClient();

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      console.warn('[Auth] signIn error:', error.message);
      if (error.message === 'Invalid login credentials') {
        return { error: 'Email o contraseña incorrectos.' };
      }
      if (error.message.toLowerCase().includes('email not confirmed')) {
        return { error: 'Confirma tu email antes de entrar. Revisa tu bandeja de entrada.' };
      }
      return { error: error.message };
    }

    // Supabase puede devolver error:null pero session:null si el email no está confirmado
    if (!data.session) {
      console.warn('[Auth] signIn: sin sesión — email probablemente no confirmado');
      return { error: 'Confirma tu email antes de entrar. Revisa tu bandeja de entrada.' };
    }

    console.log('[Auth] signIn OK:', email, '| nivel en sesión:', data.session.user.email);
    // onAuthStateChange se disparará y actualizará el estado + cookie automáticamente
    return { error: null };
  }, []);

  // ─── signUp ───────────────────────────────────────────────────────────────
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
      console.warn('[Auth] signUp error:', error.message);
      return { error: error.message };
    }
    console.log('[Auth] signUp OK — email de confirmación enviado a:', email);
    return { error: null };
  }, []);

  // ─── signOut ──────────────────────────────────────────────────────────────
  const signOut = useCallback(async () => {
    const supabase = createSupabaseBrowserClient();

    // Limpiar estado local ANTES de llamar a Supabase
    // para que los componentes reaccionen inmediatamente
    setUser(null);
    setSession(null);
    setProfile(null);

    // Limpiar cookies y localStorage
    if (typeof document !== 'undefined') {
      document.cookie = 'mpro:access-level=visitor;path=/;max-age=0;SameSite=Lax';
    }
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.removeItem('mpro:access-level');
        localStorage.removeItem('mpro:founder-number');
        localStorage.removeItem('mpro:founder-alias');
        localStorage.removeItem('mpro:founder-display-mode');
      } catch { /* ignorar */ }
    }

    // Cerrar sesión en Supabase (puede fallar si ya expiró, no importa)
    try {
      await supabase.auth.signOut({ scope: 'local' });
    } catch (err) {
      console.warn('[Auth] signOut Supabase error (ignorado):', err);
    }

    console.log('[Auth] signOut completo');
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
