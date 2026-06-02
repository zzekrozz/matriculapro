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

  // ─── fetchProfile ──────────────────────────────────────────────────────────
  // Nunca lanza. Siempre termina con setProfile y actualiza la cookie.
  const fetchProfile = useCallback(async (userId: string): Promise<void> => {
    console.log('[AUTH] fetchProfile start, userId:', userId);
    try {
      const supabase = createSupabaseBrowserClient();
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, display_name, access_level, founder_number, created_at')
        .eq('id', userId)
        .single();

      if (error) {
        // PGRST116 = no rows (perfil aún no existe)
        console.warn('[AUTH] fetchProfile error:', error.code, error.message);
        setProfile(null);
        return;
      }

      const p = data as UserProfile;
      const founderTag = p.founder_number
        ? `Founder #${String(p.founder_number).padStart(4, '0')}`
        : 'sin número';
      console.log(`[AUTH] profile loaded: ${p.email} | access_level=${p.access_level} | ${founderTag}`);

      if (p.email === ADMIN_EMAIL) {
        console.log('[AUTH] 🔑 Admin email detectado');
      }

      // Escribir cookie ANTES de setProfile para que cualquier navegación posterior
      // ya tenga el nivel correcto disponible para el middleware
      if (typeof document !== 'undefined') {
        const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toUTCString();
        document.cookie = `mpro:access-level=${p.access_level};path=/;expires=${expires};SameSite=Lax`;
        console.log('[AUTH] cookie mpro:access-level set to:', p.access_level);
      }

      setProfile(p);
    } catch (err) {
      console.error('[AUTH] fetchProfile exception:', err);
      setProfile(null);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) await fetchProfile(user.id);
  }, [user, fetchProfile]);

  // ─── Inicialización ────────────────────────────────────────────────────────
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    let mounted = true;

    console.log('[AUTH] init — reading session');

    supabase.auth.getSession().then(async ({ data: { session: s } }) => {
      if (!mounted) return;
      console.log('[AUTH] getSession result:', s ? `user=${s.user.email}` : 'no session');
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        await fetchProfile(s.user.id);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, s) => {
        if (!mounted) return;
        console.log('[AUTH] onAuthStateChange event:', event, 'user:', s?.user?.email ?? 'none');
        setSession(s);
        setUser(s?.user ?? null);
        if (s?.user) {
          await fetchProfile(s.user.id);
        } else {
          setProfile(null);
          // Limpiar cookie de acceso
          if (typeof document !== 'undefined') {
            document.cookie = 'mpro:access-level=;path=/;max-age=0;SameSite=Lax';
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
    console.log('[LOGIN] start:', email);
    const supabase = createSupabaseBrowserClient();

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      console.warn('[LOGIN] error:', error.message);
      if (error.message === 'Invalid login credentials') {
        return { error: 'Email o contraseña incorrectos.' };
      }
      if (error.message.toLowerCase().includes('email not confirmed')) {
        return { error: 'Confirma tu email antes de entrar. Revisa tu bandeja de entrada.' };
      }
      return { error: error.message };
    }

    if (!data.session) {
      console.warn('[LOGIN] no session returned — email not confirmed?');
      return { error: 'Confirma tu email antes de entrar. Revisa tu bandeja de entrada.' };
    }

    console.log('[LOGIN] success, user:', data.session.user.email);
    console.log('[LOGIN] session obtained — onAuthStateChange will handle fetchProfile');
    // onAuthStateChange dispara automáticamente y llama a fetchProfile
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
      console.warn('[AUTH] signUp error:', error.message);
      return { error: error.message };
    }
    console.log('[AUTH] signUp OK, confirmation email sent to:', email);
    return { error: null };
  }, []);

  // ─── signOut ──────────────────────────────────────────────────────────────
  const signOut = useCallback(async () => {
    console.log('[LOGOUT] start');
    const supabase = createSupabaseBrowserClient();

    // Limpiar estado local inmediatamente
    setUser(null);
    setSession(null);
    setProfile(null);

    // Limpiar cookie de acceso
    if (typeof document !== 'undefined') {
      document.cookie = 'mpro:access-level=;path=/;max-age=0;SameSite=Lax';
    }

    // Limpiar localStorage
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.removeItem('mpro:access-level');
        localStorage.removeItem('mpro:founder-number');
        localStorage.removeItem('mpro:founder-alias');
        localStorage.removeItem('mpro:founder-display-mode');
      } catch { /* ignorar */ }
    }

    // Cerrar sesión en Supabase
    try {
      await supabase.auth.signOut({ scope: 'local' });
      console.log('[LOGOUT] success');
    } catch (err) {
      console.warn('[LOGOUT] error (ignorado):', err);
    }
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
