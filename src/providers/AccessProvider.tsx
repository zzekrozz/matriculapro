'use client';

import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { usePersistentState } from '@/lib/usePersistentState';
import { useAuth } from '@/providers/AuthProvider';

export type AccessLevel = 'visitor' | 'explorer' | 'founder' | 'full';

interface AccessContextValue {
  level: AccessLevel;
  founderNumber: number | null;
  founderAlias: string | null;
  founderDisplayMode: 'name' | 'initials' | 'alias' | 'anonymous';
  hydrated: boolean;
  // Solo para dev/mock: setLevel NO funciona si hay sesión Supabase
  setLevel: (level: AccessLevel) => void;
  activateFounder: (opts?: { alias?: string }) => number;
  setFounderAlias: (alias: string | null) => void;
  setFounderDisplayMode: (mode: 'name' | 'initials' | 'alias' | 'anonymous') => void;
  reset: () => void;
  // Capacidades derivadas
  canCompleteSteps: boolean;
  canUseSimulators: boolean;
  canSaveProgress: boolean;
  canAccessChecklists: boolean;
  canAccessLibrary: boolean;
  isExplorer: boolean;
  isFounder: boolean;
}

const AccessContext = createContext<AccessContextValue | null>(null);
const FIRST_FOUNDER_NUMBER = 7;

export function AccessProvider({ children }: { children: ReactNode }) {
  const { profile, user } = useAuth();

  // Estado mock/dev — persiste en localStorage como fallback
  const [localLevel, setLocalLevel, hydrated] = usePersistentState<AccessLevel>('mpro:access-level', 'visitor');
  const [founderNumber, setFounderNumber] = usePersistentState<number | null>('mpro:founder-number', null);
  const [founderAlias, setFounderAliasRaw] = usePersistentState<string | null>('mpro:founder-alias', null);
  const [founderDisplayMode, setFounderDisplayModeRaw] = usePersistentState<'name' | 'initials' | 'alias' | 'anonymous'>('mpro:founder-display-mode', 'alias');

  // Cuando el perfil de Supabase cambia, sincronizar localStorage
  useEffect(() => {
    if (profile) {
      setLocalLevel(profile.access_level);
      if (profile.founder_number) setFounderNumber(profile.founder_number);
    }
  }, [profile, setLocalLevel, setFounderNumber]);

  // Nivel efectivo: Supabase manda cuando hay sesión, mock solo en dev sin sesión
  const effectiveLevel: AccessLevel = profile
    ? profile.access_level
    : user
      ? 'explorer'            // hay sesión pero aún no llegó el perfil
      : localLevel;           // sin sesión: mock (dev) o visitor (prod)

  const effectiveFounderNumber = profile?.founder_number ?? founderNumber;

  const value = useMemo<AccessContextValue>(() => {
    const isFounder = effectiveLevel === 'founder' || effectiveLevel === 'full';
    const isExplorer = effectiveLevel === 'explorer';

    return {
      level: effectiveLevel,
      founderNumber: effectiveFounderNumber,
      founderAlias,
      founderDisplayMode,
      hydrated,
      // setLevel solo cambia el mock local — no tiene efecto si hay sesión Supabase
      setLevel: setLocalLevel,
      activateFounder: ({ alias } = {}) => {
        const num = effectiveFounderNumber ?? FIRST_FOUNDER_NUMBER;
        setFounderNumber(num);
        if (alias) setFounderAliasRaw(alias);
        setLocalLevel('founder');
        return num;
      },
      setFounderAlias: setFounderAliasRaw,
      setFounderDisplayMode: setFounderDisplayModeRaw,
      reset: () => {
        setLocalLevel('visitor');
        setFounderNumber(null);
        setFounderAliasRaw(null);
        setFounderDisplayModeRaw('alias');
      },
      canCompleteSteps: isFounder,
      canUseSimulators: isFounder,
      canSaveProgress: isFounder,
      canAccessChecklists: isFounder,
      canAccessLibrary: isFounder,
      isExplorer,
      isFounder,
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
