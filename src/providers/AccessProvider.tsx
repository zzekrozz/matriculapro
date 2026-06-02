'use client';

import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { usePersistentState } from '@/lib/usePersistentState';
import { useAuth } from '@/providers/AuthProvider';

export type AccessLevel = 'visitor' | 'explorer' | 'founder' | 'full';

export const EXPLORER_DEMO_MODULES = ['ruta', 'itv', 'simulador', 'ficha'] as const;
export type ExplorerDemoModule = typeof EXPLORER_DEMO_MODULES[number];

interface AccessContextValue {
  level: AccessLevel;
  founderNumber: number | null;
  founderAlias: string | null;
  founderDisplayMode: 'name' | 'initials' | 'alias' | 'anonymous';
  hydrated: boolean;
  setLevel: (level: AccessLevel) => void;
  activateFounder: (opts?: { alias?: string }) => number;
  setFounderAlias: (alias: string | null) => void;
  setFounderDisplayMode: (mode: 'name' | 'initials' | 'alias' | 'anonymous') => void;
  reset: () => void;
  isExplorer: boolean;
  isFounder: boolean;
  isFounderOrFull: boolean;
  canCompleteSteps: boolean;
  canUseSimulators: boolean;
  canSaveProgress: boolean;
  canAccessChecklists: boolean;
  canAccessLibrary: boolean;
  canAccessModule: (moduleId: string) => boolean;
}

const AccessContext = createContext<AccessContextValue | null>(null);
const FIRST_FOUNDER_NUMBER = 2;

export function AccessProvider({ children }: { children: ReactNode }) {
  const { profile, user, loading: authLoading } = useAuth();

  const [localLevel, setLocalLevel, hydrated] = usePersistentState<AccessLevel>(
    'mpro:access-level',
    'visitor',
  );
  const [founderNumber, setFounderNumber] = usePersistentState<number | null>('mpro:founder-number', null);
  const [founderAlias, setFounderAliasRaw] = usePersistentState<string | null>('mpro:founder-alias', null);
  const [founderDisplayMode, setFounderDisplayModeRaw] = usePersistentState<
    'name' | 'initials' | 'alias' | 'anonymous'
  >('mpro:founder-display-mode', 'alias');

  // Sincronizar localStorage y cookie cuando llegue el perfil de Supabase
  useEffect(() => {
    if (profile) {
      console.log('[ACCESS] profile received, access_level:', profile.access_level, 'founder_number:', profile.founder_number);
      setLocalLevel(profile.access_level);
      if (profile.founder_number) setFounderNumber(profile.founder_number);
      if (typeof document !== 'undefined') {
        const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toUTCString();
        document.cookie = `mpro:access-level=${profile.access_level};path=/;expires=${expires};SameSite=Lax`;
      }
    }
  }, [profile, setLocalLevel, setFounderNumber]);

  // Nivel efectivo — lógica de prioridad clara:
  // 1. Perfil Supabase cargado → es la fuente de verdad absoluta
  // 2. Auth cargando → usar localStorage para evitar parpadeo
  // 3. Usuario autenticado sin perfil aún → explorer mínimo (si localStorage = visitor) o localStorage
  // 4. Sin usuario → localStorage (puede ser explorer/founder en modo dev, o visitor)
  const effectiveLevel: AccessLevel = (() => {
    if (profile) {
      // Supabase es la fuente de verdad
      return profile.access_level;
    }
    if (authLoading) {
      // Todavía cargando — no mostrar nada definitivo, usar lo que tengamos
      return localLevel;
    }
    if (user) {
      // Sesión activa pero perfil no cargado aún (puede ocurrir muy brevemente)
      // Si localStorage tiene un nivel no-visitor, respetarlo (puede ser que el perfil
      // tarda un render en llegar). Si era visitor, dar explorer como mínimo.
      return localLevel === 'visitor' ? 'explorer' : localLevel;
    }
    // Sin sesión: modo demo local o visitor
    return localLevel;
  })();

  const effectiveFounderNumber = profile?.founder_number ?? founderNumber;

  // Log para diagnóstico
  useEffect(() => {
    console.log(
      `[ACCESS] resolved level=${effectiveLevel}` +
      ` | user=${user?.email ?? 'none'}` +
      ` | profile=${profile?.access_level ?? 'null'}` +
      ` | localLevel=${localLevel}` +
      ` | authLoading=${authLoading}` +
      ` | founderNumber=${effectiveFounderNumber}`
    );
  });

  const value = useMemo<AccessContextValue>(() => {
    const isFounderOrFull = effectiveLevel === 'founder' || effectiveLevel === 'full';
    const isExplorer = effectiveLevel === 'explorer';
    const isFounder = isFounderOrFull;

    const canAccessModule = (moduleId: string): boolean => {
      if (isFounderOrFull) return true;
      if (isExplorer) return (EXPLORER_DEMO_MODULES as readonly string[]).includes(moduleId);
      return false;
    };

    const syncCookie = (lvl: AccessLevel) => {
      if (typeof document !== 'undefined') {
        const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toUTCString();
        document.cookie = `mpro:access-level=${lvl};path=/;expires=${expires};SameSite=Lax`;
      }
    };

    return {
      level: effectiveLevel,
      founderNumber: effectiveFounderNumber,
      founderAlias,
      founderDisplayMode,
      hydrated,
      setLevel: (lvl: AccessLevel) => {
        setLocalLevel(lvl);
        syncCookie(lvl);
      },
      activateFounder: ({ alias } = {}) => {
        const num = effectiveFounderNumber ?? FIRST_FOUNDER_NUMBER;
        setFounderNumber(num);
        if (alias) setFounderAliasRaw(alias);
        setLocalLevel('founder');
        syncCookie('founder');
        return num;
      },
      setFounderAlias: setFounderAliasRaw,
      setFounderDisplayMode: setFounderDisplayModeRaw,
      reset: () => {
        setLocalLevel('visitor');
        setFounderNumber(null);
        setFounderAliasRaw(null);
        setFounderDisplayModeRaw('alias');
        if (typeof document !== 'undefined') {
          document.cookie = 'mpro:access-level=;path=/;max-age=0;SameSite=Lax';
        }
      },
      isExplorer,
      isFounder,
      isFounderOrFull,
      canCompleteSteps: isFounderOrFull,
      canUseSimulators: isFounderOrFull,
      canSaveProgress: isFounderOrFull,
      canAccessChecklists: isFounderOrFull,
      canAccessLibrary: isFounderOrFull,
      canAccessModule,
    };
  }, [
    effectiveLevel, effectiveFounderNumber, founderAlias, founderDisplayMode, hydrated,
    setLocalLevel, setFounderNumber, setFounderAliasRaw, setFounderDisplayModeRaw,
  ]);

  return <AccessContext.Provider value={value}>{children}</AccessContext.Provider>;
}

export function useAccess() {
  const ctx = useContext(AccessContext);
  if (!ctx) throw new Error('useAccess must be used within AccessProvider');
  return ctx;
}

export function formatFounderNumber(n: number): string {
  return `#${String(n).padStart(4, '0')}`;
}
