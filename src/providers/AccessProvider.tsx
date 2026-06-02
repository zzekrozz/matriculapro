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
const ACCESS_COOKIE = 'mpro:access-level';
const FOUNDER_COOKIE = 'mpro:founder-number';

function syncAccessCookie(level: AccessLevel, founderNumber: number | null) {
  if (typeof document === 'undefined') return;

  const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toUTCString();
  document.cookie = `${ACCESS_COOKIE}=${level};path=/;expires=${expires};SameSite=Lax`;

  if (founderNumber != null) {
    document.cookie = `${FOUNDER_COOKIE}=${founderNumber};path=/;expires=${expires};SameSite=Lax`;
  } else {
    document.cookie = `${FOUNDER_COOKIE}=;path=/;max-age=0;SameSite=Lax`;
  }
}

export function AccessProvider({ children }: { children: ReactNode }) {
  const { profile, user, loading: authLoading } = useAuth();

  const [localLevel, setLocalLevel, hydrated] = usePersistentState<AccessLevel>('mpro:access-level', 'visitor');
  const [founderNumber, setFounderNumber] = usePersistentState<number | null>('mpro:founder-number', null);
  const [founderAlias, setFounderAliasRaw] = usePersistentState<string | null>('mpro:founder-alias', null);
  const [founderDisplayMode, setFounderDisplayModeRaw] = usePersistentState<
    'name' | 'initials' | 'alias' | 'anonymous'
  >('mpro:founder-display-mode', 'alias');

  useEffect(() => {
    if (!profile) return;

    console.log('[ACCESS] profile', profile.access_level, profile.founder_number ?? 'null');
    setLocalLevel(profile.access_level);
    setFounderNumber(profile.founder_number ?? null);
    syncAccessCookie(profile.access_level, profile.founder_number ?? null);
  }, [profile, setFounderNumber, setLocalLevel]);

  const resolution = useMemo<{
    level: AccessLevel;
    founderNumber: number | null;
    source: 'profile' | 'localStorage' | 'cookie' | 'demo';
  }>(() => {
    if (user && profile) {
      return {
        level: profile.access_level,
        founderNumber: profile.founder_number ?? null,
        source: 'profile' as const,
      };
    }

    if (!user && localLevel !== 'visitor') {
      return {
        level: localLevel,
        founderNumber,
        source: 'localStorage' as const,
      };
    }

    if (!user && typeof document !== 'undefined') {
      const cookieValue = document.cookie
        .split('; ')
        .find(chunk => chunk.startsWith(`${ACCESS_COOKIE}=`))
        ?.split('=')[1];

      if (cookieValue === 'explorer' || cookieValue === 'founder' || cookieValue === 'full') {
        return {
          level: cookieValue,
          founderNumber,
          source: 'cookie' as const,
        };
      }
    }

    return {
      level: 'visitor' as AccessLevel,
      founderNumber: null,
      source: user ? 'profile' as const : 'demo' as const,
    };
  }, [founderNumber, localLevel, profile, user]);

  useEffect(() => {
    console.log('[ACCESS] user', user?.email ?? 'none');
    console.log('[ACCESS] profile', profile?.access_level ?? 'null');
    console.log('[ACCESS] source=' + resolution.source);
    console.log('[ACCESS] resolved level=' + resolution.level);
  }, [profile, resolution.level, resolution.source, user]);

  const value = useMemo<AccessContextValue>(() => {
    const isFounderOrFull = resolution.level === 'founder' || resolution.level === 'full';
    const isExplorer = resolution.level === 'explorer';
    const isFounder = isFounderOrFull;

    const canAccessModule = (moduleId: string): boolean => {
      if (isFounderOrFull) return true;
      if (isExplorer) return (EXPLORER_DEMO_MODULES as readonly string[]).includes(moduleId);
      return false;
    };

    return {
      level: resolution.level,
      founderNumber: resolution.founderNumber,
      founderAlias,
      founderDisplayMode,
      hydrated: hydrated && !authLoading,
      setLevel: (level: AccessLevel) => {
        if (user) return;
        setLocalLevel(level);
        syncAccessCookie(level, level === 'founder' || level === 'full' ? founderNumber : null);
      },
      activateFounder: ({ alias } = {}) => {
        if (user && profile) {
          return profile.founder_number ?? FIRST_FOUNDER_NUMBER;
        }

        const nextFounderNumber = founderNumber ?? FIRST_FOUNDER_NUMBER;
        setFounderNumber(nextFounderNumber);
        if (alias) setFounderAliasRaw(alias);
        setLocalLevel('founder');
        syncAccessCookie('founder', nextFounderNumber);
        return nextFounderNumber;
      },
      setFounderAlias: setFounderAliasRaw,
      setFounderDisplayMode: setFounderDisplayModeRaw,
      reset: () => {
        if (user) return;
        setLocalLevel('visitor');
        setFounderNumber(null);
        setFounderAliasRaw(null);
        setFounderDisplayModeRaw('alias');
        syncAccessCookie('visitor', null);
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
    founderAlias,
    authLoading,
    founderDisplayMode,
    founderNumber,
    hydrated,
    profile,
    resolution.founderNumber,
    resolution.level,
    setFounderAliasRaw,
    setFounderDisplayModeRaw,
    setFounderNumber,
    setLocalLevel,
    user,
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
