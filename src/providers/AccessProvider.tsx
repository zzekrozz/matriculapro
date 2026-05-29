'use client';

import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { usePersistentState } from '@/lib/usePersistentState';
import { useAuth } from '@/providers/AuthProvider';

export type AccessLevel = 'visitor' | 'explorer' | 'founder' | 'full';

/**
 * IDs de módulos que Explorer puede usar en modo demo (sin pagar).
 * El resto muestra un overlay elegante con CTA para Founder.
 */
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
  // Helpers de estado
  isExplorer: boolean;
  isFounder: boolean;
  isFounderOrFull: boolean;
  // Capacidades
  canCompleteSteps: boolean;
  canUseSimulators: boolean;
  canSaveProgress: boolean;
  canAccessChecklists: boolean;
  canAccessLibrary: boolean;
  /** Devuelve true si el usuario puede acceder a un módulo concreto */
  canAccessModule: (moduleId: string) => boolean;
}

const AccessContext = createContext<AccessContextValue | null>(null);
const FIRST_FOUNDER_NUMBER = 7;

export function AccessProvider({ children }: { children: ReactNode }) {
  const { profile, user } = useAuth();

  // Estado mock/dev — persiste en localStorage Y en cookie (vía /entrar)
  const [localLevel, setLocalLevel, hydrated] = usePersistentState<AccessLevel>(
    'mpro:access-level',
    'visitor',
  );
  const [founderNumber, setFounderNumber] = usePersistentState<number | null>('mpro:founder-number', null);
  const [founderAlias, setFounderAliasRaw] = usePersistentState<string | null>('mpro:founder-alias', null);
  const [founderDisplayMode, setFounderDisplayModeRaw] = usePersistentState<
    'name' | 'initials' | 'alias' | 'anonymous'
  >('mpro:founder-display-mode', 'alias');

  // Sincronizar con perfil Supabase cuando llegue
  useEffect(() => {
    if (profile) {
      setLocalLevel(profile.access_level);
      if (profile.founder_number) setFounderNumber(profile.founder_number);
    }
  }, [profile, setLocalLevel, setFounderNumber]);

  // Nivel efectivo: Supabase manda cuando hay perfil, si no local/mock
  const effectiveLevel: AccessLevel = profile
    ? profile.access_level
    : user
      ? 'explorer'
      : localLevel;

  const effectiveFounderNumber = profile?.founder_number ?? founderNumber;

  const value = useMemo<AccessContextValue>(() => {
    const isFounderOrFull = effectiveLevel === 'founder' || effectiveLevel === 'full';
    const isExplorer = effectiveLevel === 'explorer';
    const isFounder = isFounderOrFull;

    /**
     * Reglas de acceso por módulo:
     * - Founder/Full: todo disponible
     * - Explorer: solo los módulos demo (ruta, itv, simulador, ficha)
     * - Visitor: nada dentro de /app
     */
    const canAccessModule = (moduleId: string): boolean => {
      if (isFounderOrFull) return true;
      if (isExplorer) return (EXPLORER_DEMO_MODULES as readonly string[]).includes(moduleId);
      return false;
    };

    return {
      level: effectiveLevel,
      founderNumber: effectiveFounderNumber,
      founderAlias,
      founderDisplayMode,
      hydrated,
      setLevel: (lvl: AccessLevel) => {
        setLocalLevel(lvl);
        // Sincronizar también la cookie para que el middleware la lea
        if (typeof document !== 'undefined') {
          const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toUTCString();
          document.cookie = `mpro:access-level=${lvl};path=/;expires=${expires};SameSite=Lax`;
        }
      },
      activateFounder: ({ alias } = {}) => {
        const num = effectiveFounderNumber ?? FIRST_FOUNDER_NUMBER;
        setFounderNumber(num);
        if (alias) setFounderAliasRaw(alias);
        setLocalLevel('founder');
        if (typeof document !== 'undefined') {
          const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toUTCString();
          document.cookie = `mpro:access-level=founder;path=/;expires=${expires};SameSite=Lax`;
        }
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
          document.cookie = 'mpro:access-level=visitor;path=/;max-age=0';
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
