import type { PurchaseSnapshot, PurchaseStatus } from './types';

export interface VerifiedCheckoutSnapshot {
  id: string;
  livemode: boolean;
  mode: 'payment' | 'subscription' | 'setup';
  paymentStatus: string;
  amountTotalCents: number | null;
  currency: string | null;
  priceId: string | null;
  quantity: number | null;
  paymentIntentId: string | null;
  chargeId: string | null;
  customerId: string | null;
  taxCountry: string | null;
  automaticTaxEnabled: boolean;
  automaticTaxStatus: string | null;
  taxBehavior: string | null;
  subtotalExcludingTaxCents: number | null;
  taxAmountCents: number | null;
  totalIncludingTaxCents: number | null;
  invoiceId: string | null;
  invoiceNumber: string | null;
  invoiceStatus: string | null;
  invoiceCurrency: string | null;
  invoiceCountry: string | null;
  invoicePriceId: string | null;
  invoiceAutomaticTaxEnabled: boolean | null;
  invoiceAutomaticTaxStatus: string | null;
  invoiceTaxBehavior: string | null;
  invoiceSubtotalExcludingTaxCents: number | null;
  invoiceTaxAmountCents: number | null;
  invoiceTotalIncludingTaxCents: number | null;
}

export type CheckoutRejectionReason =
  | 'live_event_not_allowed'
  | 'checkout_session_mismatch'
  | 'checkout_mode_mismatch'
  | 'payment_not_complete'
  | 'amount_mismatch'
  | 'currency_mismatch'
  | 'price_mismatch'
  | 'line_items_mismatch'
  | 'missing_payment_intent'
  | 'customer_mismatch'
  | 'country_mismatch'
  | 'automatic_tax_incomplete'
  | 'tax_behavior_mismatch'
  | 'tax_breakdown_mismatch'
  | 'invoice_missing'
  | 'invoice_mismatch'
  | 'purchase_not_pending';

export interface CheckoutValidation {
  valid: boolean;
  reason: CheckoutRejectionReason | null;
}

export function validateCompletedCheckout(
  purchase: PurchaseSnapshot,
  checkout: VerifiedCheckoutSnapshot,
): CheckoutValidation {
  if (checkout.livemode) return { valid: false, reason: 'live_event_not_allowed' };
  if (purchase.checkoutSessionId !== checkout.id) {
    return { valid: false, reason: 'checkout_session_mismatch' };
  }
  if (checkout.mode !== 'payment') return { valid: false, reason: 'checkout_mode_mismatch' };
  if (checkout.paymentStatus !== 'paid') return { valid: false, reason: 'payment_not_complete' };
  if (checkout.amountTotalCents !== purchase.amountDueCents) {
    return { valid: false, reason: 'amount_mismatch' };
  }
  if (checkout.currency?.toUpperCase() !== purchase.currency) {
    return { valid: false, reason: 'currency_mismatch' };
  }
  if (checkout.priceId !== purchase.expectedPriceId) {
    return { valid: false, reason: 'price_mismatch' };
  }
  if (checkout.quantity !== 1) return { valid: false, reason: 'line_items_mismatch' };
  if (!checkout.paymentIntentId) return { valid: false, reason: 'missing_payment_intent' };
  if (!purchase.stripeCustomerId || checkout.customerId !== purchase.stripeCustomerId) {
    return { valid: false, reason: 'customer_mismatch' };
  }
  if (checkout.taxCountry?.toUpperCase() !== 'ES') {
    return { valid: false, reason: 'country_mismatch' };
  }
  if (!checkout.automaticTaxEnabled || checkout.automaticTaxStatus !== 'complete') {
    return { valid: false, reason: 'automatic_tax_incomplete' };
  }
  if (checkout.taxBehavior !== 'inclusive') {
    return { valid: false, reason: 'tax_behavior_mismatch' };
  }
  if (
    checkout.subtotalExcludingTaxCents !== purchase.amountDueBaseCents
    || checkout.taxAmountCents !== purchase.amountDueVatCents
    || (checkout.taxAmountCents ?? 0) <= 0
    || checkout.totalIncludingTaxCents !== purchase.amountDueCents
    || (checkout.subtotalExcludingTaxCents ?? 0) + (checkout.taxAmountCents ?? 0)
      !== checkout.totalIncludingTaxCents
  ) return { valid: false, reason: 'tax_breakdown_mismatch' };
  if (!checkout.invoiceId || !checkout.invoiceNumber) {
    return { valid: false, reason: 'invoice_missing' };
  }
  if (
    checkout.invoiceStatus !== 'paid'
    || checkout.invoiceCurrency?.toUpperCase() !== purchase.currency
    || checkout.invoiceCountry?.toUpperCase() !== 'ES'
    || checkout.invoicePriceId !== checkout.priceId
    || checkout.invoiceAutomaticTaxEnabled !== true
    || checkout.invoiceAutomaticTaxStatus !== 'complete'
    || checkout.invoiceTaxBehavior !== 'inclusive'
    || checkout.invoiceSubtotalExcludingTaxCents !== checkout.subtotalExcludingTaxCents
    || checkout.invoiceTaxAmountCents !== checkout.taxAmountCents
    || checkout.invoiceTotalIncludingTaxCents !== checkout.totalIncludingTaxCents
  ) return { valid: false, reason: 'invoice_mismatch' };
  if (purchase.status !== 'pending') return { valid: false, reason: 'purchase_not_pending' };
  return { valid: true, reason: null };
}

export type TrustedPaymentEvent =
  | {
      id: string;
      kind: 'checkout_paid';
      checkout: VerifiedCheckoutSnapshot;
    }
  | {
      id: string;
      kind: 'refund' | 'dispute';
      paymentIntentId: string;
    };

export interface PaymentReducerState {
  purchase: PurchaseSnapshot;
  processedEventIds: readonly string[];
  accessAction: 'none' | 'activate' | 'refund' | 'revoke';
}

export interface PaymentReducerResult extends PaymentReducerState {
  duplicate: boolean;
  accepted: boolean;
  reason: string | null;
}

/**
 * Pure mirror of the database transition rules. Production still persists the
 * transition atomically through service-role-only RPCs.
 */
export function reduceTrustedPaymentEvent(
  state: PaymentReducerState,
  event: TrustedPaymentEvent,
): PaymentReducerResult {
  if (state.processedEventIds.includes(event.id)) {
    return { ...state, accessAction: 'none', duplicate: true, accepted: true, reason: null };
  }

  const processedEventIds = [...state.processedEventIds, event.id];
  if (event.kind === 'checkout_paid') {
    if (state.purchase.status === 'paid') {
      return {
        ...state,
        processedEventIds,
        accessAction: 'none',
        duplicate: false,
        accepted: true,
        reason: null,
      };
    }
    if (state.purchase.status === 'refunded' || state.purchase.status === 'disputed') {
      return {
        ...state,
        processedEventIds,
        accessAction: 'none',
        duplicate: false,
        accepted: false,
        reason: 'payment_arrived_after_reversal',
      };
    }
    const validation = validateCompletedCheckout(state.purchase, event.checkout);
    if (!validation.valid) {
      return {
        ...state,
        processedEventIds,
        accessAction: 'none',
        duplicate: false,
        accepted: false,
        reason: validation.reason,
      };
    }
    return {
      purchase: {
        ...state.purchase,
        status: 'paid',
        paymentIntentId: event.checkout.paymentIntentId,
      },
      processedEventIds,
      accessAction: 'activate',
      duplicate: false,
      accepted: true,
      reason: null,
    };
  }

  if (state.purchase.paymentIntentId && state.purchase.paymentIntentId !== event.paymentIntentId) {
    return {
      ...state,
      processedEventIds,
      accessAction: 'none',
      duplicate: false,
      accepted: false,
      reason: 'payment_intent_mismatch',
    };
  }

  if (state.purchase.status === 'refunded' || state.purchase.status === 'disputed') {
    return {
      ...state,
      processedEventIds,
      accessAction: 'none',
      duplicate: true,
      accepted: true,
      reason: 'purchase_already_reversed',
    };
  }

  const status: PurchaseStatus = event.kind === 'refund' ? 'refunded' : 'disputed';
  return {
    purchase: { ...state.purchase, status },
    processedEventIds,
    accessAction: event.kind === 'refund' ? 'refund' : 'revoke',
    duplicate: false,
    accepted: true,
    reason: null,
  };
}
