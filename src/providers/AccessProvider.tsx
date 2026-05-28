'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { usePersistentState } from '@/lib/usePersistentState';

export type AccessLevel = 'visitor' | 'explorer' | 'founder' | 'full';

interface AccessContextValue {
  level: AccessLevel;
  founderNumber: number | null;
  founderAlias: string | null;
  founderDisplayMode: 'name' | 'initials' | 'alias' | 'anonymous';
  hydrated: boolean;
  setLevel: (level: AccessLevel) => void;
  /** Activa Founder mock: asigna número correlativo y guarda alias opcional */
  activateFounder: (opts?: { alias?: string }) => number;
  setFounderAlias: (alias: string | null) => void;
  setFounderDisplayMode: (mode: 'name' | 'initials' | 'alias' | 'anonymous') => void;
  reset: () => void;
  // Helpers de uso común
  canCompleteSteps: boolean;
  canUseSimulators: boolean;
  canSaveProgress: boolean;
  canAccessChecklists: boolean;
  canAccessLibrary: boolean;
  isExplorer: boolean;
  isFounder: boolean;
}

const AccessContext = createContext<AccessContextValue | null>(null);

const FIRST_FOUNDER_NUMBER = 7; // Empezamos en 7 para dar la sensación de que ya hay 6 reservados

export function AccessProvider({ children }: { children: ReactNode }) {
  const [level, setLevelRaw, hydrated] = usePersistentState<AccessLevel>('mpro:access-level', 'visitor');
  const [founderNumber, setFounderNumber] = usePersistentState<number | null>('mpro:founder-number', null);
  const [founderAlias, setFounderAliasRaw] = usePersistentState<string | null>('mpro:founder-alias', null);
  const [founderDisplayMode, setFounderDisplayModeRaw] = usePersistentState<'name' | 'initials' | 'alias' | 'anonymous'>('mpro:founder-display-mode', 'alias');

  const value = useMemo<AccessContextValue>(() => {
    const isFounder = level === 'founder' || level === 'full';
    const isExplorer = level === 'explorer';

    return {
      level,
      founderNumber,
      founderAlias,
      founderDisplayMode,
      hydrated,
      setLevel: setLevelRaw,
      activateFounder: ({ alias } = {}) => {
        // Asigna el siguiente número disponible (mock: simplemente FIRST_FOUNDER_NUMBER si no hay)
        const num = founderNumber ?? FIRST_FOUNDER_NUMBER;
        setFounderNumber(num);
        if (alias) setFounderAliasRaw(alias);
        setLevelRaw('founder');
        return num;
      },
      setFounderAlias: setFounderAliasRaw,
      setFounderDisplayMode: setFounderDisplayModeRaw,
      reset: () => {
        setLevelRaw('visitor');
        setFounderNumber(null);
        setFounderAliasRaw(null);
        setFounderDisplayModeRaw('alias');
      },
      // Capacidades derivadas
      canCompleteSteps: isFounder,
      canUseSimulators: isFounder,
      canSaveProgress: isFounder,
      canAccessChecklists: isFounder,
      canAccessLibrary: isFounder,
      isExplorer,
      isFounder,
    };
  }, [level, founderNumber, founderAlias, founderDisplayMode, hydrated, setLevelRaw, setFounderNumber, setFounderAliasRaw, setFounderDisplayModeRaw]);

  return <AccessContext.Provider value={value}>{children}</AccessContext.Provider>;
}

export function useAccess() {
  const ctx = useContext(AccessContext);
  if (!ctx) throw new Error('useAccess must be used within AccessProvider');
  return ctx;
}

/** Formatea el número de fundador como string padded */
export function formatFounderNumber(n: number): string {
  return `#${String(n).padStart(4, '0')}`;
}
