import { isInstantInHalfOpenRange } from './calendar';
import type { AccessCapability, AccessContext, AccessTier, UserLicense } from './types';

function isCurrentlyActive(license: UserLicense, now: string | Date): boolean {
  return (license.status === 'active' || license.status === 'scheduled')
    && license.tier !== 'free'
    && license.startsAt !== null
    && license.expiresAt !== null
    && isInstantInHalfOpenRange(now, license.startsAt, license.expiresAt);
}

function isFutureScheduled(license: UserLicense, now: string | Date): boolean {
  return license.status === 'scheduled'
    && license.tier !== 'free'
    && license.startsAt !== null
    && new Date(license.startsAt).getTime() > new Date(now).getTime();
}

function latestPaidLicense(licenses: readonly UserLicense[]): UserLicense | null {
  const time = (value: string | null) => new Date(value ?? 0).getTime();
  return licenses
    .filter((license) => license.tier !== 'free')
    .sort((a, b) => (
      time(b.startsAt) - time(a.startsAt)
      || time(b.createdAt) - time(a.createdAt)
      || time(b.updatedAt) - time(a.updatedAt)
      || b.id.localeCompare(a.id)
    ))[0] ?? null;
}

function isGenuinelyExpired(license: UserLicense, now: string | Date): boolean {
  const nowTime = new Date(now).getTime();
  if (['expired', 'suspended', 'refunded', 'revoked'].includes(license.status)) {
    return Boolean(license.startsAt && new Date(license.startsAt).getTime() <= nowTime);
  }
  if (license.status !== 'active' || !license.startsAt || !license.expiresAt) return false;
  return new Date(license.startsAt).getTime() <= nowTime
    && new Date(license.expiresAt).getTime() <= nowTime;
}

export function evaluateAccess(input: {
  userId: string;
  licenses: readonly UserLicense[];
  now?: string | Date;
}): AccessContext {
  const now = input.now ?? new Date();
  const ownedPaid = input.licenses.filter(
    (license) => license.userId === input.userId && license.tier !== 'free',
  );
  const active = latestPaidLicense(ownedPaid.filter((license) => isCurrentlyActive(license, now)));
  const paidHistory = latestPaidLicense(ownedPaid.filter((license) => isGenuinelyExpired(license, now)));
  const scheduledLicense = latestPaidLicense(ownedPaid.filter((license) => isFutureScheduled(license, now)));

  const tier: AccessTier = active?.tier ?? paidHistory?.tier ?? 'free';
  const mode = active ? 'full' : paidHistory ? 'read_only' : 'free';
  const capabilities: AccessCapability[] = ['use_free_checker'];

  if (active) {
    capabilities.push(
      'view_historical_paid_data',
      'create_full_cases',
      'edit_full_cases',
      'run_fiscal_calculations',
      'use_advanced_simulators',
      'generate_reports',
      'export_data',
      'view_paid_cases',
      'create_paid_cases',
      'edit_paid_cases',
      'recalculate_paid_cases',
      'use_fiscal_catalog',
    );
    if (active.tier === 'professional') capabilities.push('use_professional_tools');
  } else if (paidHistory) {
    capabilities.push('view_historical_paid_data', 'view_paid_cases');
  }

  return {
    userId: input.userId,
    tier,
    mode,
    license: active ?? paidHistory,
    scheduledLicense,
    expiredAt: active ? null : paidHistory?.expiresAt ?? null,
    canUseFreeChecker: true,
    canViewHistoricalPaidData: capabilities.includes('view_historical_paid_data'),
    canCreateFullCases: capabilities.includes('create_full_cases'),
    canEditFullCases: capabilities.includes('edit_full_cases'),
    canRunFiscalCalculations: capabilities.includes('run_fiscal_calculations'),
    canUseAdvancedSimulators: capabilities.includes('use_advanced_simulators'),
    canGenerateReports: capabilities.includes('generate_reports'),
    canExport: capabilities.includes('export_data'),
    canUseProfessionalTools: capabilities.includes('use_professional_tools'),
    canViewPaidCases: capabilities.includes('view_paid_cases'),
    canManageFullCases: capabilities.includes('create_paid_cases'),
    canUseProfessional: capabilities.includes('use_professional_tools'),
    capabilities,
  };
}

export function hasCapability(context: AccessContext, capability: AccessCapability): boolean {
  return context.capabilities.includes(capability);
}

export function assertCapability(
  context: AccessContext,
  capability: AccessCapability,
): void {
  if (!hasCapability(context, capability)) {
    throw new AccessDeniedError(capability, context.mode);
  }
}

export class AccessDeniedError extends Error {
  readonly code = 'access_denied';

  constructor(
    readonly capability: AccessCapability,
    readonly mode: AccessContext['mode'],
  ) {
    super(`The current server-side access context does not grant ${capability}`);
    this.name = 'AccessDeniedError';
  }
}
