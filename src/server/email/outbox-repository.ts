import 'server-only';
import type {
  LicenseEmailDetails,
  PurchaseEmailDetails,
  PurchaseFinancialDetails,
  RefundPurchaseEmailDetails,
  TransactionalEmailEventType,
  TransactionalEmailInput,
} from '@/domain/email';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

type DatabaseRow = Record<string, unknown>;

export interface ClaimedTransactionalEmail {
  id: string;
  eventType: TransactionalEmailEventType;
  userId: string;
  purchaseId: string | null;
  licenseId: string | null;
  accountDeletionRequestId: string | null;
  idempotencyKey: string;
  attemptCount: number;
}

export interface EmailRecipientAndInput {
  recipient: string;
  input: TransactionalEmailInput;
}

export async function scheduleDueTransactionalEmails(now: string) {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.rpc('schedule_due_transactional_emails', {
    p_now: now,
  });
  if (error) throw new Error('email_scheduler_failed');
  return data as { expiredLicenses?: number; expiryReminders?: number } | null;
}

export async function claimTransactionalEmailBatch(input: {
  workerId: string;
  limit: number;
  now: string;
}): Promise<ClaimedTransactionalEmail[]> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.rpc('claim_transactional_email_batch', {
    p_worker_id: input.workerId,
    p_limit: input.limit,
    p_now: input.now,
  });
  if (error) throw new Error('email_claim_failed');
  if (!Array.isArray(data)) throw new Error('email_claim_invalid');
  return data.map(mapClaimedEmail);
}

export async function loadTransactionalEmail(
  claimed: ClaimedTransactionalEmail,
  siteUrl: string,
  supportEmail: string,
): Promise<EmailRecipientAndInput> {
  const admin = createSupabaseAdminClient();
  const { data: userResult, error: userError } = await admin.auth.admin.getUserById(claimed.userId);
  const recipient = userResult.user?.email?.trim();
  if (userError || !recipient) throw new Error('recipient_unavailable');

  if (claimed.eventType === 'account_deletion_requested') {
    if (!claimed.accountDeletionRequestId) throw new Error('deletion_request_reference_missing');
    const { data, error } = await admin
      .from('account_deletion_requests')
      .select('requested_at')
      .eq('id', claimed.accountDeletionRequestId)
      .eq('user_id', claimed.userId)
      .maybeSingle();
    if (error || !data) throw new Error('deletion_request_unavailable');
    return {
      recipient,
      input: {
        eventType: claimed.eventType,
        requestedAt: requiredString(data as DatabaseRow, 'requested_at'),
        siteUrl,
        supportEmail,
      },
    };
  }

  if (claimed.eventType === 'purchase_refunded') {
    if (!claimed.purchaseId) throw new Error('purchase_reference_missing');
    const [purchaseResult, licenseResult] = await Promise.all([
      admin
        .from('purchases')
        .select('id,tier,duration,total_cents,upgrade_credit_cents,amount_due_cents,amount_due_base_cents,amount_due_vat_cents,currency,vat_rate_basis_points,refunded_at')
        .eq('id', claimed.purchaseId)
        .eq('user_id', claimed.userId)
        .maybeSingle(),
      claimed.licenseId
        ? admin
            .from('user_licenses')
            .select('tier,duration,starts_at,expires_at')
            .eq('id', claimed.licenseId)
            .eq('user_id', claimed.userId)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ]);
    if (purchaseResult.error || !purchaseResult.data) throw new Error('purchase_unavailable');
    if (licenseResult.error) throw new Error('license_unavailable');
    const purchaseRow = purchaseResult.data as DatabaseRow;
    return {
      recipient,
      input: {
        eventType: claimed.eventType,
        purchase: mapRefundPurchase(
          purchaseRow,
          licenseResult.data ? mapLicense(licenseResult.data as DatabaseRow) : null,
        ),
        refundedAt: requiredString(purchaseRow, 'refunded_at'),
        siteUrl,
        supportEmail,
      },
    };
  }

  if (!claimed.licenseId) throw new Error('license_reference_missing');
  const { data: licenseData, error: licenseError } = await admin
    .from('user_licenses')
    .select('tier,duration,starts_at,expires_at')
    .eq('id', claimed.licenseId)
    .eq('user_id', claimed.userId)
    .maybeSingle();
  if (licenseError || !licenseData) throw new Error('license_unavailable');
  const license = mapLicense(licenseData as DatabaseRow);

  if (
    claimed.eventType === 'license_activated'
    || claimed.eventType === 'license_expiring_soon'
    || claimed.eventType === 'license_expired'
  ) {
    return {
      recipient,
      input: { eventType: claimed.eventType, license, siteUrl, supportEmail },
    };
  }

  if (!claimed.purchaseId) throw new Error('purchase_reference_missing');
  const { data: purchaseData, error: purchaseError } = await admin
    .from('purchases')
    .select('id,tier,duration,total_cents,upgrade_credit_cents,amount_due_cents,amount_due_base_cents,amount_due_vat_cents,currency,vat_rate_basis_points,refunded_at')
    .eq('id', claimed.purchaseId)
    .eq('user_id', claimed.userId)
    .maybeSingle();
  if (purchaseError || !purchaseData) throw new Error('purchase_unavailable');
  const purchase = mapPurchase(purchaseData as DatabaseRow, license);

  return {
    recipient,
    input: { eventType: claimed.eventType, purchase, siteUrl, supportEmail },
  };
}

export async function completeTransactionalEmail(input: {
  outboxId: string;
  workerId: string;
  providerMessageIdSha256: string;
}): Promise<void> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.rpc('complete_transactional_email', {
    p_outbox_id: input.outboxId,
    p_worker_id: input.workerId,
    p_provider_message_id_sha256: input.providerMessageIdSha256,
  });
  if (error || data !== true) throw new Error('email_completion_failed');
}

export async function failTransactionalEmail(input: {
  outboxId: string;
  workerId: string;
  errorCode: string;
  now: string;
}): Promise<'failed' | 'dead_letter'> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.rpc('fail_transactional_email', {
    p_outbox_id: input.outboxId,
    p_worker_id: input.workerId,
    p_error_code: input.errorCode,
    p_now: input.now,
  });
  if (error || (data !== 'failed' && data !== 'dead_letter')) {
    throw new Error('email_failure_record_failed');
  }
  return data;
}

function mapClaimedEmail(value: unknown): ClaimedTransactionalEmail {
  if (!value || typeof value !== 'object') throw new Error('email_claim_invalid');
  const row = value as DatabaseRow;
  const eventType = requiredString(row, 'event_type');
  if (!isEventType(eventType)) throw new Error('email_event_type_invalid');
  return {
    id: requiredString(row, 'id'),
    eventType,
    userId: requiredString(row, 'user_id'),
    purchaseId: optionalString(row, 'purchase_id'),
    licenseId: optionalString(row, 'license_id'),
    accountDeletionRequestId: optionalString(row, 'account_deletion_request_id'),
    idempotencyKey: requiredString(row, 'idempotency_key'),
    attemptCount: requiredInteger(row, 'attempt_count'),
  };
}

function mapLicense(row: DatabaseRow): LicenseEmailDetails {
  const tier = requiredString(row, 'tier');
  const duration = requiredString(row, 'duration');
  if (tier !== 'particular' && tier !== 'professional') throw new Error('license_tier_invalid');
  if (duration !== 'one_month' && duration !== 'six_months' && duration !== 'twelve_months') {
    throw new Error('license_duration_invalid');
  }
  return {
    tier,
    duration,
    startsAt: requiredString(row, 'starts_at'),
    expiresAt: requiredString(row, 'expires_at'),
  };
}

function mapPurchase(row: DatabaseRow, license: LicenseEmailDetails): PurchaseEmailDetails {
  const financial = mapPurchaseFinancial(row);
  if (financial.tier !== license.tier || financial.duration !== license.duration) {
    throw new Error('purchase_license_mismatch');
  }
  return { ...financial, startsAt: license.startsAt, expiresAt: license.expiresAt };
}

function mapRefundPurchase(
  row: DatabaseRow,
  license: LicenseEmailDetails | null,
): RefundPurchaseEmailDetails {
  const financial = mapPurchaseFinancial(row);
  if (license && (financial.tier !== license.tier || financial.duration !== license.duration)) {
    throw new Error('purchase_license_mismatch');
  }
  return {
    ...financial,
    startsAt: license?.startsAt ?? null,
    expiresAt: license?.expiresAt ?? null,
  };
}

function mapPurchaseFinancial(row: DatabaseRow): PurchaseFinancialDetails {
  const tier = requiredString(row, 'tier');
  const duration = requiredString(row, 'duration');
  const currency = requiredString(row, 'currency');
  if (tier !== 'particular' && tier !== 'professional') {
    throw new Error('purchase_tier_invalid');
  }
  if (duration !== 'one_month' && duration !== 'six_months' && duration !== 'twelve_months') {
    throw new Error('purchase_duration_invalid');
  }
  if (currency !== 'EUR') {
    throw new Error('purchase_currency_invalid');
  }
  return {
    tier,
    duration,
    purchaseId: requiredString(row, 'id'),
    currency,
    listPriceTotalCents: requiredInteger(row, 'total_cents'),
    upgradeCreditCents: requiredInteger(row, 'upgrade_credit_cents'),
    amountPaidBaseCents: requiredInteger(row, 'amount_due_base_cents'),
    amountPaidVatCents: requiredInteger(row, 'amount_due_vat_cents'),
    amountPaidTotalCents: requiredInteger(row, 'amount_due_cents'),
    vatRateBasisPoints: requiredInteger(row, 'vat_rate_basis_points'),
  };
}

function isEventType(value: string): value is TransactionalEmailEventType {
  return [
    'purchase_confirmed',
    'license_activated',
    'license_upgraded',
    'license_expiring_soon',
    'license_expired',
    'purchase_refunded',
    'account_deletion_requested',
  ].includes(value);
}

function requiredString(row: DatabaseRow, key: string): string {
  const value = row[key];
  if (typeof value !== 'string' || !value) throw new Error(`email_${key}_invalid`);
  return value;
}

function optionalString(row: DatabaseRow, key: string): string | null {
  const value = row[key];
  if (value === null || value === undefined) return null;
  if (typeof value !== 'string' || !value) throw new Error(`email_${key}_invalid`);
  return value;
}

function requiredInteger(row: DatabaseRow, key: string): number {
  const value = row[key];
  const number = typeof value === 'number' ? value : Number(value);
  if (!Number.isSafeInteger(number) || number < 0) throw new Error(`email_${key}_invalid`);
  return number;
}
