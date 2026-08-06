import 'server-only';
import type Stripe from 'stripe';
import {
  quotePromotionalUpgrade,
  quoteRenewal,
  type LicenseDuration,
  type PaidAccessTier,
  type PurchaseSnapshot,
} from '@/domain/access';
import { LEGAL_DOCUMENT_VERSIONS } from '@/config/legal';
import { getPlanPrice, resolveCheckoutTaxConfiguration } from '@/lib/payments/catalog';
import {
  getStripeTestConfiguration,
  stripePriceIdFor,
  StripeTestConfigurationError,
} from '@/lib/payments/stripe-test-config';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { recordCheckoutLegalAcceptances } from '@/server/access/legal-acceptance';
import {
  bindCheckoutSession,
  bindPurchaseTaxRate,
  cancelPurchaseReservation,
  getPurchaseByUserIdempotency,
  getRenewalSource,
  getUpgradeSource,
  reservePurchase,
} from './access-payment-repository';
import { getStripeTestClient } from './stripe-test-client';
import { getOrCreateBillingCustomer } from './billing-customer';
import { getVerifiedSpanishVatTaxRate } from './spanish-vat';

const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9_-]{16,128}$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface CreateCheckoutRequest {
  tier: PaidAccessTier;
  duration: LicenseDuration;
  countryCode: string;
  idempotencyKey: string;
  purchaseKind: 'new' | 'upgrade' | 'renewal';
  sourceLicenseId?: string | null;
  renewalOfLicenseId?: string | null;
  acceptedContractTerms: true;
  acceptedImmediatePerformance: true;
  acknowledgedWithdrawalRules: true;
}

export interface CheckoutResult {
  purchaseId: string;
  checkoutSessionId: string;
  checkoutUrl: string;
  tier: PaidAccessTier;
  duration: LicenseDuration;
  amountDueCents: number;
  currency: 'EUR';
  upgradeCreditCents: number;
}

function assertCheckoutRequest(request: CreateCheckoutRequest): void {
  if (!['particular', 'professional'].includes(request.tier)) {
    throw new CheckoutRequestError('invalid_tier');
  }
  if (!['one_month', 'six_months', 'twelve_months'].includes(request.duration)) {
    throw new CheckoutRequestError('invalid_duration');
  }
  if (!IDEMPOTENCY_KEY_PATTERN.test(request.idempotencyKey)) {
    throw new CheckoutRequestError('invalid_idempotency_key');
  }
  if (request.sourceLicenseId && !UUID_PATTERN.test(request.sourceLicenseId)) {
    throw new CheckoutRequestError('invalid_source_license_id');
  }
  if (request.renewalOfLicenseId && !UUID_PATTERN.test(request.renewalOfLicenseId)) {
    throw new CheckoutRequestError('invalid_renewal_license_id');
  }
  if (
    !['new', 'upgrade', 'renewal'].includes(request.purchaseKind)
    || (request.purchaseKind === 'new' && (request.sourceLicenseId || request.renewalOfLicenseId))
    || (request.purchaseKind === 'upgrade' && (!request.sourceLicenseId || request.renewalOfLicenseId))
    || (request.purchaseKind === 'renewal' && (!request.renewalOfLicenseId || request.sourceLicenseId))
  ) throw new CheckoutRequestError('invalid_purchase_kind');
  if (
    request.acceptedContractTerms !== true
    || request.acceptedImmediatePerformance !== true
    || request.acknowledgedWithdrawalRules !== true
  ) {
    throw new CheckoutRequestError('legal_acceptances_required');
  }
  resolveCheckoutTaxConfiguration(request.countryCode);
}

async function verifyConfiguredPrice(
  priceId: string,
  expectedTotalCents: number,
): Promise<Stripe.Price> {
  const price = await getStripeTestClient().prices.retrieve(priceId);
  if (
    !price.active
    || price.type !== 'one_time'
    || price.recurring !== null
    || price.unit_amount !== expectedTotalCents
    || price.currency.toUpperCase() !== 'EUR'
    || price.tax_behavior !== 'inclusive'
  ) {
    throw new StripeTestConfigurationError(
      `Stripe Price ${priceId} must be active, one-time, EUR, tax-inclusive and exactly ${expectedTotalCents} cents`,
    );
  }
  return price;
}

async function verifyUpgradeCoupon(input: {
  couponId: string | null;
  expectedCreditCents: number;
}): Promise<string> {
  if (!input.couponId) {
    throw new StripeTestConfigurationError(
      'Promotional upgrades require a reviewed Stripe test coupon in STRIPE_COUPON_PARTICULAR_1M_CREDIT or STRIPE_COUPON_PROFESSIONAL_1M_CREDIT',
    );
  }
  const coupon = await getStripeTestClient().coupons.retrieve(input.couponId);
  if (
    !coupon.valid
    || coupon.duration !== 'once'
    || coupon.amount_off !== input.expectedCreditCents
    || coupon.currency?.toUpperCase() !== 'EUR'
    || coupon.percent_off !== null
  ) {
    throw new StripeTestConfigurationError(
      `Stripe test coupon ${input.couponId} must be valid, once-only, EUR and exactly ${input.expectedCreditCents} cents`,
    );
  }
  return coupon.id;
}

function checkoutSessionUrl(session: Stripe.Checkout.Session): string {
  if (!session.url) throw new Error('Stripe Checkout Session has no URL');
  return session.url;
}

async function reuseOpenCheckout(
  purchase: PurchaseSnapshot,
): Promise<CheckoutResult | null> {
  if (purchase.status !== 'pending') {
    throw new CheckoutRequestError(`idempotent_purchase_${purchase.status}`);
  }
  if (!purchase.checkoutSessionId) return null;

  const session = await getStripeTestClient().checkout.sessions.retrieve(
    purchase.checkoutSessionId,
  );
  if (session.status !== 'open') {
    throw new CheckoutRequestError(`checkout_session_${session.status ?? 'unavailable'}`);
  }
  return {
    purchaseId: purchase.id,
    checkoutSessionId: session.id,
    checkoutUrl: checkoutSessionUrl(session),
    tier: purchase.tier,
    duration: purchase.duration,
    amountDueCents: purchase.amountDueCents,
    currency: purchase.currency,
    upgradeCreditCents: purchase.upgradeCreditCents,
  };
}

export async function createCheckoutForCurrentUser(
  request: CreateCheckoutRequest,
  now: Date = new Date(),
): Promise<CheckoutResult> {
  assertCheckoutRequest(request);
  const configuration = getStripeTestConfiguration();
  const supabase = await createSupabaseServerClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  const user = authData.user;
  if (authError || !user?.id || !user.email || !user.email_confirmed_at) {
    throw new CheckoutRequestError('verified_authentication_required');
  }

  const price = getPlanPrice(request.tier, request.duration);
  const stripePriceId = stripePriceIdFor(configuration, request.tier, request.duration);
  await Promise.all([
    verifyConfiguredPrice(stripePriceId, price.totalCents),
    getVerifiedSpanishVatTaxRate(configuration.taxRateId),
  ]);

  const requestedSourceLicenseId = request.sourceLicenseId ?? null;
  const requestedRenewalLicenseId = request.renewalOfLicenseId ?? null;
  const billingCustomer = await getOrCreateBillingCustomer({ userId: user.id, email: user.email });
  let purchase = await getPurchaseByUserIdempotency({
    userId: user.id,
    idempotencyKey: request.idempotencyKey,
  });
  if (purchase && (
    purchase.tier !== request.tier
    || purchase.duration !== request.duration
    || purchase.expectedPriceId !== stripePriceId
    || purchase.expectedBaseCents !== price.baseCents
    || purchase.expectedVatCents !== price.vatCents
    || purchase.expectedTotalCents !== price.totalCents
    || purchase.sourceLicenseId !== requestedSourceLicenseId
    || purchase.renewalOfLicenseId !== requestedRenewalLicenseId
    || purchase.purchaseKind !== request.purchaseKind
    || purchase.stripeCustomerId !== billingCustomer.stripeCustomerId
  )) {
    throw new CheckoutRequestError('idempotency_key_reused_with_different_terms');
  }

  if (purchase) {
    await recordCheckoutLegalAcceptances({
      userId: user.id,
      purchaseId: purchase.id,
      contractTermsVersion: LEGAL_DOCUMENT_VERSIONS.contracting,
      withdrawalVersion: LEGAL_DOCUMENT_VERSIONS.withdrawal,
    });
    const existingCheckout = await reuseOpenCheckout(purchase);
    if (existingCheckout) return existingCheckout;
  }

  let sourceLicenseId = purchase?.sourceLicenseId ?? null;
  let upgradeCreditCents = purchase?.upgradeCreditCents ?? 0;
  let couponId: string | null = null;
  if (requestedSourceLicenseId) {
    if (!purchase) {
      const source = await getUpgradeSource({
        userId: user.id,
        licenseId: requestedSourceLicenseId,
      });
      const quote = quotePromotionalUpgrade({
        sourceLicense: source.license,
        initialPurchase: source.initialPurchase,
        eligibility: source.eligibility,
        targetTier: request.tier,
        targetDuration: request.duration,
        targetPrice: price,
        now,
      });
      if (!quote.eligible) throw new CheckoutRequestError(`upgrade_${quote.reason}`);
      sourceLicenseId = quote.sourceLicenseId;
      upgradeCreditCents = quote.creditCents;
    }
    couponId = await verifyUpgradeCoupon({
      couponId: configuration.upgradeCreditCouponIds[request.tier],
      expectedCreditCents: upgradeCreditCents,
    });
  }

  if (requestedRenewalLicenseId && !purchase) {
    const renewalSource = await getRenewalSource({
      userId: user.id,
      licenseId: requestedRenewalLicenseId,
    });
    const quote = quoteRenewal({
      currentLicense: renewalSource,
      tier: request.tier,
      duration: request.duration,
      now,
    });
    if (!quote.eligible) throw new CheckoutRequestError(`renewal_${quote.reason}`);
  }

  const amountDueCents = price.totalCents - upgradeCreditCents;
  if (purchase && purchase.amountDueCents !== amountDueCents) {
    throw new CheckoutRequestError('idempotency_key_reused_with_different_amount');
  }
  purchase ??= await reservePurchase({
      userId: user.id,
      idempotencyKey: request.idempotencyKey,
      tier: request.tier,
      duration: request.duration,
      price,
      expectedPriceId: stripePriceId,
      upgradeCreditCents,
      amountDueCents,
      sourceLicenseId,
      renewalOfLicenseId: requestedRenewalLicenseId,
      purchaseKind: request.purchaseKind,
      stripeCustomerId: billingCustomer.stripeCustomerId,
    });
  purchase = await bindPurchaseTaxRate(purchase.id, configuration.taxRateId);

  await recordCheckoutLegalAcceptances({
    userId: user.id,
    purchaseId: purchase.id,
    contractTermsVersion: LEGAL_DOCUMENT_VERSIONS.contracting,
    withdrawalVersion: LEGAL_DOCUMENT_VERSIONS.withdrawal,
  });

  const existingCheckout = await reuseOpenCheckout(purchase);
  if (existingCheckout) return existingCheckout;

  // If Stripe's response is lost after it creates the Session, leave the
  // reservation pending. A retry with the same purchase-derived key recovers
  // that exact Session instead of risking a paid but cancelled DB purchase.
  const session = await getStripeTestClient().checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    customer: billingCustomer.stripeCustomerId,
    customer_update: { address: 'auto', name: 'auto' },
    billing_address_collection: 'required',
    tax_id_collection: { enabled: true },
    invoice_creation: {
      enabled: true,
      invoice_data: { metadata: { purchase_id: purchase.id } },
    },
    client_reference_id: purchase.id,
    line_items: [{
      price: stripePriceId,
      quantity: 1,
      tax_rates: [configuration.taxRateId],
    }],
    discounts: couponId ? [{ coupon: couponId }] : undefined,
    success_url: `${configuration.appBaseUrl}/app/cuenta?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${configuration.appBaseUrl}/app/cuenta?checkout=cancelled`,
    metadata: {
      purchase_id: purchase.id,
      access_tier: purchase.tier,
      license_duration: purchase.duration,
      purchase_kind: purchase.purchaseKind,
      tax_rate_id: configuration.taxRateId,
    },
    payment_intent_data: {
      metadata: { purchase_id: purchase.id },
    },
  }, {
    idempotencyKey: `mpro_checkout_${purchase.id}`,
  });

  try {
    await bindCheckoutSession(purchase.id, session.id);
  } catch (error) {
    let sessionWasExpired = false;
    try {
      await getStripeTestClient().checkout.sessions.expire(session.id);
      sessionWasExpired = true;
    } catch {
      // Keep the pending purchase recoverable with the same idempotency key.
    }
    if (sessionWasExpired) {
      await cancelPurchaseReservation(purchase.id, 'stripe_checkout_binding_failed');
    }
    throw error;
  }

  return {
    purchaseId: purchase.id,
    checkoutSessionId: session.id,
    checkoutUrl: checkoutSessionUrl(session),
    tier: purchase.tier,
    duration: purchase.duration,
    amountDueCents,
    currency: purchase.currency,
    upgradeCreditCents,
  };
}

export class CheckoutRequestError extends Error {
  readonly code = 'checkout_request_rejected';

  constructor(readonly reason: string) {
    super(`Checkout request rejected: ${reason}`);
    this.name = 'CheckoutRequestError';
  }
}
