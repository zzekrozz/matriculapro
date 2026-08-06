'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { AccessContext as ServerAccessContext, AccessTier, UserLicense } from '@/domain/access';
import { createSupabaseBrowserClient, isSupabaseBrowserConfigured } from '@/lib/supabase/browser';
import { useAuth } from '@/providers/AuthProvider';

interface AccessContextValue {
  tier: AccessTier;
  mode: ServerAccessContext['mode'];
  license: UserLicense | null;
  scheduledLicense: UserLicense | null;
  expiredAt: string | null;
  loading: boolean;
  hydrated: boolean;
  canUseFreeChecker: boolean;
  canViewHistoricalPaidData: boolean;
  canCreateFullCases: boolean;
  canEditFullCases: boolean;
  canRunFiscalCalculations: boolean;
  canUseAdvancedSimulators: boolean;
  canGenerateReports: boolean;
  canExport: boolean;
  canUseProfessionalTools: boolean;
  canViewPaidCases: boolean;
  canManageFullCases: boolean;
  canUseProfessional: boolean;
  isPaid: boolean;
  readOnly: boolean;
  refresh: () => Promise<void>;
}

const AccessContext = createContext<AccessContextValue | null>(null);
const MAX_TIMEOUT_MS = 2_147_483_647;

const FREE_ACCESS: Omit<AccessContextValue, 'loading' | 'hydrated' | 'refresh'> = {
  tier: 'free',
  mode: 'free',
  license: null,
  scheduledLicense: null,
  expiredAt: null,
  canUseFreeChecker: true,
  canViewHistoricalPaidData: false,
  canCreateFullCases: false,
  canEditFullCases: false,
  canRunFiscalCalculations: false,
  canUseAdvancedSimulators: false,
  canGenerateReports: false,
  canExport: false,
  canUseProfessionalTools: false,
  canViewPaidCases: false,
  canManageFullCases: false,
  canUseProfessional: false,
  isPaid: false,
  readOnly: false,
};

export function AccessProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [access, setAccess] = useState<Omit<AccessContextValue, 'loading' | 'hydrated' | 'refresh'>>(FREE_ACCESS);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user || !isSupabaseBrowserConfigured()) {
      setAccess(FREE_ACCESS);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await createSupabaseBrowserClient().rpc('get_my_access_context');
      if (error) throw error;
      setAccess(normalizeAccess(data, user.id));
    } catch {
      // Fail closed in the UI. Paid capabilities remain unavailable until the
      // server-backed context can be read again.
      setAccess(FREE_ACCESS);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading) void refresh();
  }, [authLoading, refresh]);

  useEffect(() => {
    const expiresAt = access.mode === 'full' ? access.license?.expiresAt : null;
    if (!expiresAt) return;
    const expiresAtMs = Date.parse(expiresAt);
    if (!Number.isFinite(expiresAtMs)) return;

    let timerId: number | undefined;
    let cancelled = false;
    const scheduleExpirationRefresh = () => {
      if (cancelled) return;
      const remainingMs = expiresAtMs - Date.now();
      if (remainingMs <= 0) {
        void refresh();
        return;
      }
      timerId = window.setTimeout(scheduleExpirationRefresh, Math.min(remainingMs, MAX_TIMEOUT_MS));
    };

    scheduleExpirationRefresh();
    return () => {
      cancelled = true;
      if (timerId !== undefined) window.clearTimeout(timerId);
    };
  }, [access.license?.expiresAt, access.mode, refresh]);

  useEffect(() => {
    const refreshOnFocus = () => { void refresh(); };
    const refreshOnVisibility = () => {
      if (document.visibilityState === 'visible') void refresh();
    };
    window.addEventListener('focus', refreshOnFocus);
    document.addEventListener('visibilitychange', refreshOnVisibility);
    return () => {
      window.removeEventListener('focus', refreshOnFocus);
      document.removeEventListener('visibilitychange', refreshOnVisibility);
    };
  }, [refresh]);

  const value = useMemo<AccessContextValue>(() => ({
    ...access,
    loading: authLoading || loading,
    hydrated: !authLoading && !loading,
    refresh,
  }), [access, authLoading, loading, refresh]);

  return <AccessContext.Provider value={value}>{children}</AccessContext.Provider>;
}

export function useAccess() {
  const context = useContext(AccessContext);
  if (!context) throw new Error('useAccess must be used within AccessProvider');
  return context;
}

function normalizeAccess(value: unknown, expectedUserId: string): Omit<AccessContextValue, 'loading' | 'hydrated' | 'refresh'> {
  if (!value || typeof value !== 'object') throw new Error('Invalid access context');
  const row = value as Record<string, unknown>;
  if (row.userId !== expectedUserId) throw new Error('Invalid access owner');
  const tier = row.tier;
  const mode = row.mode;
  if (!['free', 'particular', 'professional'].includes(String(tier))) throw new Error('Invalid access tier');
  if (!['free', 'full', 'read_only'].includes(String(mode))) throw new Error('Invalid access mode');
  const license = normalizeLicense(row.license, expectedUserId);
  const scheduledLicense = normalizeLicense(row.scheduledLicense, expectedUserId);
  return {
    tier: tier as AccessTier,
    mode: mode as ServerAccessContext['mode'],
    license,
    scheduledLicense,
    expiredAt: typeof row.expiredAt === 'string' ? row.expiredAt : null,
    canUseFreeChecker: row.canUseFreeChecker === true,
    canViewHistoricalPaidData: row.canViewHistoricalPaidData === true,
    canCreateFullCases: row.canCreateFullCases === true,
    canEditFullCases: row.canEditFullCases === true,
    canRunFiscalCalculations: row.canRunFiscalCalculations === true,
    canUseAdvancedSimulators: row.canUseAdvancedSimulators === true,
    canGenerateReports: row.canGenerateReports === true,
    canExport: row.canExport === true,
    canUseProfessionalTools: row.canUseProfessionalTools === true,
    canViewPaidCases: row.canViewHistoricalPaidData === true,
    canManageFullCases: row.canCreateFullCases === true && row.canEditFullCases === true,
    canUseProfessional: row.canUseProfessionalTools === true,
    isPaid: mode === 'full',
    readOnly: mode === 'read_only',
  };
}

function normalizeLicense(value: unknown, expectedUserId: string): UserLicense | null {
  if (!value || typeof value !== 'object') return null;
  const row = value as Record<string, unknown>;
  if (row.userId !== expectedUserId) throw new Error('Invalid license owner');
  return {
    id: requiredString(row.id),
    userId: expectedUserId,
    tier: requiredString(row.tier) as UserLicense['tier'],
    duration: (typeof row.duration === 'string' ? row.duration : null) as UserLicense['duration'],
    status: requiredString(row.status) as UserLicense['status'],
    startsAt: optionalString(row.startsAt),
    expiresAt: optionalString(row.expiresAt),
    originalPurchaseId: optionalString(row.originalPurchaseId),
    upgradedFromLicenseId: optionalString(row.upgradedFromLicenseId),
    createdAt: requiredString(row.createdAt),
    updatedAt: requiredString(row.updatedAt),
  };
}

function requiredString(value: unknown): string { if (typeof value !== 'string' || !value) throw new Error('Invalid license'); return value; }
function optionalString(value: unknown): string | null { return typeof value === 'string' ? value : null; }
