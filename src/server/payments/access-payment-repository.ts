import 'server-only';
import type {
  LicenseDuration,
  PaidAccessTier,
  PlanPrice,
  PurchaseSnapshot,
  PurchaseKind,
  UserLicense,
} from '@/domain/access';
import type { UpgradeEligibilitySnapshot } from '@/domain/access/upgrade';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

type DatabaseRow = Record<string, unknown>;

export interface ReservePurchaseInput {
  userId: string;
  idempotencyKey: string;
  tier: PaidAccessTier;
  duration: LicenseDuration;
  price: PlanPrice;
  expectedPriceId: string;
  upgradeCreditCents: number;
  amountDueCents: number;
  sourceLicenseId: string | null;
  renewalOfLicenseId: string | null;
  purchaseKind: PurchaseKind;
  stripeCustomerId: string;
}

export interface PaymentTransitionResult {
  ok: boolean;
  duplicate: boolean;
  processed: boolean;
  reason: string | null;
  purchaseId: string | null;
  licenseId: string | null;
}

export interface PaymentEventReceiptInput {
  providerEventId: string;
  eventType: string;
  eventCreatedAt: string;
  payloadSha256: string;
}

function requiredString(row: DatabaseRow, key: string): string {
  const value = row[key];
  if (typeof value !== 'string' || !value) throw new Error(`Missing database field: ${key}`);
  return value;
}

function optionalString(row: DatabaseRow, key: string): string | null {
  const value = row[key];
  return typeof value === 'string' && value ? value : null;
}

function integer(row: DatabaseRow, key: string): number {
  const value = row[key];
  const number = typeof value === 'number' ? value : Number(value);
  if (!Number.isSafeInteger(number)) throw new Error(`Invalid integer database field: ${key}`);
  return number;
}

function mapPurchase(value: unknown): PurchaseSnapshot {
  if (!value || typeof value !== 'object') throw new Error('Missing purchase record');
  const row = value as DatabaseRow;
  return {
    id: requiredString(row, 'id'),
    userId: requiredString(row, 'user_id'),
    tier: requiredString(row, 'tier') as PaidAccessTier,
    duration: requiredString(row, 'duration') as LicenseDuration,
    purchaseKind: requiredString(row, 'purchase_kind') as PurchaseKind,
    status: requiredString(row, 'status') as PurchaseSnapshot['status'],
    expectedPriceId: requiredString(row, 'stripe_price_id'),
    expectedBaseCents: integer(row, 'base_cents'),
    expectedVatCents: integer(row, 'vat_cents'),
    expectedTotalCents: integer(row, 'total_cents'),
    upgradeCreditCents: integer(row, 'upgrade_credit_cents'),
    amountDueCents: integer(row, 'amount_due_cents'),
    amountDueBaseCents: integer(row, 'amount_due_base_cents'),
    amountDueVatCents: integer(row, 'amount_due_vat_cents'),
    currency: requiredString(row, 'currency').toUpperCase() as 'EUR',
    checkoutSessionId: optionalString(row, 'stripe_checkout_session_id'),
    paymentIntentId: optionalString(row, 'stripe_payment_intent_id'),
    stripeCustomerId: optionalString(row, 'stripe_customer_id'),
    expectedStripeTaxRateId: optionalString(row, 'expected_stripe_tax_rate_id'),
    appliedStripeTaxRateId: optionalString(row, 'applied_stripe_tax_rate_id'),
    taxPercentage: row.tax_percentage === null || row.tax_percentage === undefined
      ? null : Number(row.tax_percentage),
    taxBehavior: optionalString(row, 'tax_behavior') as PurchaseSnapshot['taxBehavior'],
    subtotalExcludingTaxCents: row.subtotal_excluding_tax_cents === null
      || row.subtotal_excluding_tax_cents === undefined ? null : integer(row, 'subtotal_excluding_tax_cents'),
    taxAmountCents: row.tax_amount_cents === null || row.tax_amount_cents === undefined
      ? null : integer(row, 'tax_amount_cents'),
    totalIncludingTaxCents: row.total_including_tax_cents === null
      || row.total_including_tax_cents === undefined ? null : integer(row, 'total_including_tax_cents'),
    stripeInvoiceId: optionalString(row, 'stripe_invoice_id'),
    stripeInvoiceNumber: optionalString(row, 'stripe_invoice_number'),
    sourceLicenseId: optionalString(row, 'source_license_id'),
    renewalOfLicenseId: optionalString(row, 'renewal_of_license_id'),
    resultingLicenseId: optionalString(row, 'resulting_license_id'),
    grossAmountCents: integer(row, 'gross_amount_cents'),
    amountPaidCents: integer(row, 'amount_paid_cents'),
    amountRefundedCents: integer(row, 'amount_refunded_cents'),
    refundableRemainingCents: integer(row, 'refundable_remaining_cents'),
    refundStatus: requiredString(row, 'refund_status') as PurchaseSnapshot['refundStatus'],
    lastRefundAt: optionalString(row, 'last_refund_at'),
    disputeStatus: requiredString(row, 'dispute_status') as PurchaseSnapshot['disputeStatus'],
    createdAt: requiredString(row, 'created_at'),
    paidAt: optionalString(row, 'paid_at'),
  };
}

function mapLicense(value: unknown): UserLicense {
  if (!value || typeof value !== 'object') throw new Error('Missing licence record');
  const row = value as DatabaseRow;
  return {
    id: requiredString(row, 'id'),
    userId: requiredString(row, 'user_id'),
    tier: requiredString(row, 'tier') as UserLicense['tier'],
    duration: optionalString(row, 'duration') as UserLicense['duration'],
    status: requiredString(row, 'status') as UserLicense['status'],
    startsAt: optionalString(row, 'starts_at'),
    expiresAt: optionalString(row, 'expires_at'),
    originalPurchaseId: optionalString(row, 'original_purchase_id'),
    upgradedFromLicenseId: optionalString(row, 'upgraded_from_license_id'),
    createdAt: requiredString(row, 'created_at'),
    updatedAt: requiredString(row, 'updated_at'),
  };
}

function mapTransition(value: unknown): PaymentTransitionResult {
  if (!value || typeof value !== 'object') throw new Error('Missing payment transition result');
  const row = value as DatabaseRow;
  return {
    ok: row.ok === true,
    duplicate: row.duplicate === true,
    processed: row.processed === true,
    reason: optionalString(row, 'reason'),
    purchaseId: optionalString(row, 'purchase_id'),
    licenseId: optionalString(row, 'license_id'),
  };
}

export async function reservePurchase(input: ReservePurchaseInput): Promise<PurchaseSnapshot> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.rpc('reserve_staging_access_purchase', {
    p_user_id: input.userId,
    p_idempotency_key: input.idempotencyKey,
    p_tier: input.tier,
    p_duration: input.duration,
    p_base_cents: input.price.baseCents,
    p_vat_cents: input.price.vatCents,
    p_total_cents: input.price.totalCents,
    p_currency: input.price.currency,
    p_vat_rate_basis_points: input.price.vatRateBasisPoints,
    p_tax_country: input.price.countryCode,
    p_price_source: input.price.priceSource,
    p_price_effective_at: input.price.effectiveAt,
    p_stripe_price_id: input.expectedPriceId,
    p_upgrade_credit_cents: input.upgradeCreditCents,
    p_amount_due_cents: input.amountDueCents,
    p_purchase_kind: input.purchaseKind,
    p_stripe_customer_id: input.stripeCustomerId,
    p_source_license_id: input.sourceLicenseId,
    p_renewal_of_license_id: input.renewalOfLicenseId,
  });
  if (error) throw new Error(`Could not reserve purchase: ${error.message}`);
  return mapPurchase(data);
}

export async function bindCheckoutSession(
  purchaseId: string,
  checkoutSessionId: string,
): Promise<PurchaseSnapshot> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.rpc('bind_access_checkout_session', {
    p_purchase_id: purchaseId,
    p_checkout_session_id: checkoutSessionId,
  });
  if (error) throw new Error(`Could not bind Checkout Session: ${error.message}`);
  return mapPurchase(data);
}

export async function bindPurchaseTaxRate(
  purchaseId: string,
  taxRateId: string,
): Promise<PurchaseSnapshot> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.rpc('bind_purchase_tax_rate', {
    p_purchase_id: purchaseId,
    p_tax_rate_id: taxRateId,
  });
  if (error) throw new Error(`Could not bind Stripe Tax Rate: ${error.message}`);
  return mapPurchase(data);
}

export async function cancelPurchaseReservation(
  purchaseId: string,
  reason: string,
): Promise<void> {
  const admin = createSupabaseAdminClient();
  const { error } = await admin.rpc('cancel_access_purchase', {
    p_purchase_id: purchaseId,
    p_reason: reason.slice(0, 300),
  });
  if (error) throw new Error(`Could not cancel purchase reservation: ${error.message}`);
}

export async function getPurchaseByCheckoutSession(
  checkoutSessionId: string,
): Promise<PurchaseSnapshot | null> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from('purchases')
    .select('*')
    .eq('stripe_checkout_session_id', checkoutSessionId)
    .maybeSingle();
  if (error) throw new Error(`Could not load Checkout purchase: ${error.message}`);
  return data ? mapPurchase(data) : null;
}

export async function getPurchaseByUserIdempotency(input: {
  userId: string;
  idempotencyKey: string;
}): Promise<PurchaseSnapshot | null> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from('purchases')
    .select('*')
    .eq('user_id', input.userId)
    .eq('idempotency_key', input.idempotencyKey)
    .maybeSingle();
  if (error) throw new Error(`Could not load idempotent purchase: ${error.message}`);
  return data ? mapPurchase(data) : null;
}

export async function getPurchaseByPaymentIntent(
  paymentIntentId: string,
): Promise<PurchaseSnapshot | null> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from('purchases')
    .select('*')
    .eq('stripe_payment_intent_id', paymentIntentId)
    .maybeSingle();
  if (error) throw new Error(`Could not load payment purchase: ${error.message}`);
  return data ? mapPurchase(data) : null;
}

export async function getUpgradeSource(input: {
  userId: string;
  licenseId: string;
}): Promise<{
  license: UserLicense;
  initialPurchase: PurchaseSnapshot;
  eligibility: UpgradeEligibilitySnapshot | null;
}> {
  const admin = createSupabaseAdminClient();
  const { data: licenseData, error: licenseError } = await admin
    .from('user_licenses')
    .select('*')
    .eq('id', input.licenseId)
    .eq('user_id', input.userId)
    .maybeSingle();
  if (licenseError) throw new Error(`Could not load source licence: ${licenseError.message}`);
  if (!licenseData) throw new Error('Source licence was not found for the authenticated user');
  const license = mapLicense(licenseData);
  if (!license.originalPurchaseId) throw new Error('Source licence has no original purchase');

  const { data: purchaseData, error: purchaseError } = await admin
    .from('purchases')
    .select('*')
    .eq('id', license.originalPurchaseId)
    .eq('user_id', input.userId)
    .maybeSingle();
  if (purchaseError) throw new Error(`Could not load source purchase: ${purchaseError.message}`);
  if (!purchaseData) throw new Error('Source purchase was not found for the authenticated user');

  const { data: eligibilityData, error: eligibilityError } = await admin
    .from('upgrade_eligibility')
    .select('*')
    .eq('source_license_id', license.id)
    .maybeSingle();
  if (eligibilityError) throw new Error(`Could not load upgrade eligibility: ${eligibilityError.message}`);

  const eligibility = eligibilityData
    ? {
        sourceLicenseId: requiredString(eligibilityData as DatabaseRow, 'source_license_id'),
        status: requiredString(eligibilityData as DatabaseRow, 'status') as UpgradeEligibilitySnapshot['status'],
        reservedPurchaseId: optionalString(eligibilityData as DatabaseRow, 'reserved_purchase_id'),
        consumedPurchaseId: optionalString(eligibilityData as DatabaseRow, 'consumed_purchase_id'),
      }
    : null;

  return { license, initialPurchase: mapPurchase(purchaseData), eligibility };
}

export async function getRenewalSource(input: {
  userId: string;
  licenseId: string;
}): Promise<UserLicense> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from('user_licenses')
    .select('*')
    .eq('id', input.licenseId)
    .eq('user_id', input.userId)
    .maybeSingle();
  if (error) throw new Error(`Could not load renewal source: ${error.message}`);
  if (!data) throw new Error('Renewal source was not found for the authenticated user');
  return mapLicense(data);
}

export async function applyVerifiedCheckoutPayment(input: {
  providerEventId: string;
  eventType: string;
  eventCreatedAt: string;
  payloadSha256: string;
  purchase: PurchaseSnapshot;
  checkoutSessionId: string;
  paymentIntentId: string;
  chargeId: string;
  priceId: string;
  amountTotalCents: number;
  currency: string;
  customerId: string;
  country: string;
  taxRateId: string;
  taxPercentage: number;
  taxBehavior: 'inclusive';
  subtotalExcludingTaxCents: number;
  taxAmountCents: number;
  totalIncludingTaxCents: number;
  invoiceId: string;
  invoiceNumber: string;
  invoiceStatus: string;
  invoiceCountry: string;
  invoiceCurrency: string;
  invoiceTaxRateId: string;
  invoiceTaxBehavior: 'inclusive';
  invoiceSubtotalExcludingTaxCents: number;
  invoiceTaxAmountCents: number;
  invoiceTotalIncludingTaxCents: number;
}): Promise<PaymentTransitionResult> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.rpc('process_verified_order_independent_payment', {
    p_provider_event_id: input.providerEventId,
    p_event_type: input.eventType,
    p_event_created_at: input.eventCreatedAt,
    p_payload_sha256: input.payloadSha256,
    p_purchase_id: input.purchase.id,
    p_checkout_session_id: input.checkoutSessionId,
    p_payment_intent_id: input.paymentIntentId,
    p_charge_id: input.chargeId,
    p_customer_id: input.customerId,
    p_price_id: input.priceId,
    p_amount_total_cents: input.amountTotalCents,
    p_currency: input.currency,
    p_country: input.country,
    p_tax_rate_id: input.taxRateId,
    p_tax_percentage: input.taxPercentage,
    p_tax_behavior: input.taxBehavior,
    p_subtotal_excluding_tax_cents: input.subtotalExcludingTaxCents,
    p_tax_amount_cents: input.taxAmountCents,
    p_total_including_tax_cents: input.totalIncludingTaxCents,
    p_invoice_id: input.invoiceId,
    p_invoice_number: input.invoiceNumber,
    p_invoice_status: input.invoiceStatus,
    p_invoice_country: input.invoiceCountry,
    p_invoice_currency: input.invoiceCurrency,
    p_invoice_tax_rate_id: input.invoiceTaxRateId,
    p_invoice_tax_behavior: input.invoiceTaxBehavior,
    p_invoice_subtotal_excluding_tax_cents: input.invoiceSubtotalExcludingTaxCents,
    p_invoice_tax_amount_cents: input.invoiceTaxAmountCents,
    p_invoice_total_including_tax_cents: input.invoiceTotalIncludingTaxCents,
  });
  if (error) throw new Error(`Could not apply verified payment: ${error.message}`);
  return mapTransition(data);
}

export async function applyVerifiedRefund(input: {
  providerEventId: string;
  eventType: string;
  eventCreatedAt: string;
  payloadSha256: string;
  purchaseId: string;
  paymentIntentId: string;
  amountRefundedCents: number;
  chargeAmountCents: number;
  currency: string;
}): Promise<PaymentTransitionResult> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.rpc('process_verified_final_refund', {
    p_provider_event_id: input.providerEventId,
    p_event_type: input.eventType,
    p_event_created_at: input.eventCreatedAt,
    p_payload_sha256: input.payloadSha256,
    p_purchase_id: input.purchaseId,
    p_payment_intent_id: input.paymentIntentId,
    p_amount_refunded_cents: input.amountRefundedCents,
    p_charge_amount_cents: input.chargeAmountCents,
    p_currency: input.currency,
  });
  if (error) throw new Error(`Could not apply verified refund: ${error.message}`);
  return mapTransition(data);
}

export async function applyVerifiedDispute(input: {
  providerEventId: string;
  eventType: string;
  eventCreatedAt: string;
  payloadSha256: string;
  purchaseId: string;
  paymentIntentId: string;
  disputeId: string;
  disputeStatus: 'warning' | 'open' | 'won' | 'lost';
}): Promise<PaymentTransitionResult> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.rpc('process_verified_order_independent_dispute', {
    p_provider_event_id: input.providerEventId,
    p_event_type: input.eventType,
    p_event_created_at: input.eventCreatedAt,
    p_payload_sha256: input.payloadSha256,
    p_purchase_id: input.purchaseId,
    p_payment_intent_id: input.paymentIntentId,
    p_dispute_id: input.disputeId,
    p_dispute_status: input.disputeStatus,
  });
  if (error) throw new Error(`Could not apply verified dispute: ${error.message}`);
  return mapTransition(data);
}

export async function storePendingPaymentReversal(input: {
  providerEventId: string;
  eventType: string;
  eventCreatedAt: string;
  payloadSha256: string;
  reversalKind: 'refund' | 'dispute';
  paymentIntentId: string | null;
  chargeId: string;
  checkoutSessionId: string | null;
  invoiceId: string | null;
  customerId: string | null;
  purchaseId: string | null;
  amountRefundedCents?: number;
  chargeAmountCents?: number;
  currency?: string;
  disputeId?: string;
  disputeStatus?: 'warning' | 'open' | 'won' | 'lost';
}): Promise<PaymentTransitionResult> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.rpc('store_pending_payment_reversal', {
    p_stripe_event_id: input.providerEventId,
    p_event_type: input.eventType,
    p_occurred_at: input.eventCreatedAt,
    p_payload_sha256: input.payloadSha256,
    p_reversal_kind: input.reversalKind,
    p_payment_intent_id: input.paymentIntentId,
    p_charge_id: input.chargeId,
    p_checkout_session_id: input.checkoutSessionId,
    p_invoice_id: input.invoiceId,
    p_customer_id: input.customerId,
    p_purchase_id: input.purchaseId,
    p_amount_refunded_cents: input.amountRefundedCents ?? null,
    p_charge_amount_cents: input.chargeAmountCents ?? null,
    p_currency: input.currency ?? null,
    p_dispute_id: input.disputeId ?? null,
    p_dispute_status: input.disputeStatus ?? null,
  });
  if (error) throw new Error(`Could not persist pending payment reversal: ${error.message}`);
  return mapTransition(data);
}

export async function markPendingPaymentReversalApplied(input: {
  providerEventId: string;
  purchaseId: string;
  reason: string;
}): Promise<void> {
  const admin = createSupabaseAdminClient();
  const { error } = await admin.rpc('mark_pending_payment_reversal_applied', {
    p_stripe_event_id: input.providerEventId,
    p_purchase_id: input.purchaseId,
    p_reason: input.reason.slice(0, 200),
  });
  if (error) throw new Error(`Could not finalize pending payment reversal: ${error.message}`);
}

export async function recordPaymentIncident(input: {
  stripeEventId: string;
  kind: string;
  details: Record<string, unknown>;
  userId?: string | null;
  purchaseId?: string | null;
  checkoutSessionId?: string | null;
  paymentIntentId?: string | null;
  customerId?: string | null;
}): Promise<Record<string, unknown>> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.rpc('record_payment_incident', {
    p_stripe_event_id: input.stripeEventId,
    p_kind: input.kind,
    p_details: input.details,
    p_user_id: input.userId ?? null,
    p_purchase_id: input.purchaseId ?? null,
    p_checkout_session_id: input.checkoutSessionId ?? null,
    p_payment_intent_id: input.paymentIntentId ?? null,
    p_customer_id: input.customerId ?? null,
  });
  if (error) throw new Error(`Could not record payment incident: ${error.message}`);
  return data as Record<string, unknown>;
}

export async function listPaymentIncidents(limit = 50): Promise<Array<Record<string, unknown>>> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from('payment_incidents')
    .select('id, user_id, purchase_id, stripe_event_id, stripe_checkout_session_id, stripe_payment_intent_id, stripe_customer_id, kind, status, details, retry_count, resolution_reason, created_at, updated_at, resolved_at')
    .order('created_at', { ascending: false })
    .limit(Math.min(Math.max(limit, 1), 100));
  if (error) throw new Error(`Could not list payment incidents: ${error.message}`);
  return (data ?? []) as Array<Record<string, unknown>>;
}

export async function resolvePaymentIncident(input: {
  incidentId: string;
  status: 'open' | 'retrying' | 'resolved' | 'refunded' | 'ignored_with_reason';
  reason: string;
}): Promise<Record<string, unknown>> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.rpc('resolve_payment_incident', {
    p_incident_id: input.incidentId,
    p_status: input.status,
    p_reason: input.reason,
  });
  if (error) throw new Error(`Could not resolve payment incident: ${error.message}`);
  return data as Record<string, unknown>;
}

export async function getPaymentIncident(incidentId: string): Promise<Record<string, unknown> | null> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from('payment_incidents')
    .select('*')
    .eq('id', incidentId)
    .maybeSingle();
  if (error) throw new Error(`Could not load payment incident: ${error.message}`);
  return data as Record<string, unknown> | null;
}

export async function applyCheckoutExpiration(input: {
  providerEventId: string;
  eventType: string;
  eventCreatedAt: string;
  payloadSha256: string;
  purchaseId: string;
  checkoutSessionId: string;
}): Promise<PaymentTransitionResult> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.rpc('process_access_checkout_expired', {
    p_provider_event_id: input.providerEventId,
    p_event_type: input.eventType,
    p_event_created_at: input.eventCreatedAt,
    p_payload_sha256: input.payloadSha256,
    p_purchase_id: input.purchaseId,
    p_checkout_session_id: input.checkoutSessionId,
  });
  if (error) throw new Error(`Could not process Checkout expiration: ${error.message}`);
  return mapTransition(data);
}

export async function recordIgnoredPaymentEvent(input: {
  providerEventId: string;
  eventType: string;
  eventCreatedAt: string;
  payloadSha256: string;
  reason: string;
  purchaseId?: string | null;
}): Promise<PaymentTransitionResult> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.rpc('record_ignored_access_payment_event', {
    p_provider_event_id: input.providerEventId,
    p_event_type: input.eventType,
    p_event_created_at: input.eventCreatedAt,
    p_payload_sha256: input.payloadSha256,
    p_reason: input.reason.slice(0, 200),
    p_purchase_id: input.purchaseId ?? null,
  });
  if (error) throw new Error(`Could not record ignored payment event: ${error.message}`);
  return mapTransition(data);
}

/**
 * Persist the verified Stripe receipt in its own database transaction before
 * any state-machine RPC runs. If a later RPC rolls back, the delivery remains
 * visible and can be marked failed for Stripe's retry.
 */
export async function recordPaymentEventReceipt(
  input: PaymentEventReceiptInput,
): Promise<void> {
  const admin = createSupabaseAdminClient();
  const { error } = await admin.from('payment_events').upsert({
    provider_event_id: input.providerEventId,
    event_type: input.eventType,
    livemode: false,
    purchase_id: null,
    payload_sha256: input.payloadSha256,
    processing_status: 'processing',
    event_created_at: input.eventCreatedAt,
  }, {
    onConflict: 'provider_event_id',
    ignoreDuplicates: true,
  });
  if (error) throw new Error(`Could not record payment event receipt: ${error.message}`);

  const { data: receipt, error: receiptError } = await admin
    .from('payment_events')
    .select('event_type, payload_sha256, livemode')
    .eq('provider_event_id', input.providerEventId)
    .single();
  if (receiptError) throw new Error(`Could not verify payment event receipt: ${receiptError.message}`);
  if (
    receipt.event_type !== input.eventType
    || receipt.payload_sha256 !== input.payloadSha256
    || receipt.livemode !== false
  ) {
    throw new Error('Stripe event identity collision');
  }
}

export async function markPaymentEventFailed(input: {
  providerEventId: string;
  errorMessage: string;
}): Promise<void> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.rpc('mark_access_payment_event_failed', {
    p_provider_event_id: input.providerEventId,
    p_last_error: input.errorMessage.slice(0, 500),
  });
  if (error || !Number.isSafeInteger(data) || data < 1) {
    throw new Error(`Could not mark payment event as failed: ${error?.message ?? 'invalid attempt count'}`);
  }
}
