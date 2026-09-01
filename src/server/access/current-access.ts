import 'server-only';
import {
  AccessDeniedError,
  createPublicBetaAccessContext,
  type AccessCapability,
  type AccessContext,
  type UserLicense,
} from '@/domain/access';
import { isPublicBetaEnabled } from '@/config/public-beta';
import { createSupabaseServerClient } from '@/lib/supabase/server';

interface AccessContextRpc {
  userId?: unknown;
  tier?: unknown;
  mode?: unknown;
  license?: unknown;
  scheduledLicense?: unknown;
  expiredAt?: unknown;
  canUseFreeChecker?: unknown;
  canViewHistoricalPaidData?: unknown;
  canCreateFullCases?: unknown;
  canEditFullCases?: unknown;
  canRunFiscalCalculations?: unknown;
  canUseAdvancedSimulators?: unknown;
  canGenerateReports?: unknown;
  canExport?: unknown;
  canUseProfessionalTools?: unknown;
}

function stringOrNull(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function normalizeLicense(value: unknown): UserLicense | null {
  if (!value || typeof value !== 'object') return null;
  const row = value as Record<string, unknown>;
  const id = stringOrNull(row.id);
  const userId = stringOrNull(row.userId);
  const tier = stringOrNull(row.tier);
  const status = stringOrNull(row.status);
  const createdAt = stringOrNull(row.createdAt);
  const updatedAt = stringOrNull(row.updatedAt);
  if (
    !id
    || !userId
    || !createdAt
    || !updatedAt
    || !['free', 'particular', 'professional'].includes(tier ?? '')
    || !['free', 'pending_payment', 'scheduled', 'active', 'suspended', 'expired', 'revoked', 'refunded'].includes(status ?? '')
  ) {
    throw new Error('Database returned an invalid licence context');
  }

  const duration = stringOrNull(row.duration);
  if (duration && !['one_month', 'six_months', 'twelve_months'].includes(duration)) {
    throw new Error('Database returned an invalid licence duration');
  }

  return {
    id,
    userId,
    tier: tier as UserLicense['tier'],
    duration: duration as UserLicense['duration'],
    status: status as UserLicense['status'],
    startsAt: stringOrNull(row.startsAt),
    expiresAt: stringOrNull(row.expiresAt),
    originalPurchaseId: stringOrNull(row.originalPurchaseId),
    upgradedFromLicenseId: stringOrNull(row.upgradedFromLicenseId),
    createdAt,
    updatedAt,
  };
}

function normalizeAccessContext(value: unknown, authenticatedUserId: string): AccessContext {
  if (!value || typeof value !== 'object') throw new Error('Missing access context');
  const row = value as AccessContextRpc;
  const userId = stringOrNull(row.userId);
  const tier = stringOrNull(row.tier);
  const mode = stringOrNull(row.mode);
  if (
    userId !== authenticatedUserId
    || !['free', 'particular', 'professional'].includes(tier ?? '')
    || !['free', 'full', 'read_only'].includes(mode ?? '')
  ) {
    throw new Error('Database returned an invalid access context');
  }

  const capabilities: AccessCapability[] = ['use_free_checker'];
  if (row.canViewHistoricalPaidData === true) capabilities.push('view_historical_paid_data', 'view_paid_cases');
  if (row.canCreateFullCases === true) capabilities.push('create_full_cases', 'create_paid_cases');
  if (row.canEditFullCases === true) capabilities.push('edit_full_cases', 'edit_paid_cases');
  if (row.canRunFiscalCalculations === true) capabilities.push('run_fiscal_calculations', 'recalculate_paid_cases', 'use_fiscal_catalog');
  if (row.canUseAdvancedSimulators === true) capabilities.push('use_advanced_simulators');
  if (row.canGenerateReports === true) capabilities.push('generate_reports');
  if (row.canExport === true) capabilities.push('export_data');
  if (row.canUseProfessionalTools === true) capabilities.push('use_professional_tools');

  return {
    userId,
    publicBeta: false,
    tier: tier as AccessContext['tier'],
    mode: mode as AccessContext['mode'],
    license: normalizeLicense(row.license),
    scheduledLicense: normalizeLicense(row.scheduledLicense),
    expiredAt: stringOrNull(row.expiredAt),
    canUseFreeChecker: true,
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
    capabilities,
  };
}

export async function getCurrentServerAccess(): Promise<AccessContext> {
  const supabase = await createSupabaseServerClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user?.email_confirmed_at) {
    throw new AuthenticationRequiredError();
  }

  if (isPublicBetaEnabled()) {
    return createPublicBetaAccessContext(authData.user.id);
  }

  const { data, error } = await supabase.rpc('get_my_access_context');
  if (error) throw new Error(`Could not read access context: ${error.message}`);
  return normalizeAccessContext(data, authData.user.id);
}

export async function requireServerCapability(
  capability: AccessCapability,
): Promise<AccessContext> {
  const context = await getCurrentServerAccess();
  if (!context.capabilities.includes(capability)) {
    throw new AccessDeniedError(capability, context.mode);
  }
  return context;
}

export class AuthenticationRequiredError extends Error {
  readonly code = 'authentication_required';

  constructor() {
    super('A verified server-side session is required');
    this.name = 'AuthenticationRequiredError';
  }
}
