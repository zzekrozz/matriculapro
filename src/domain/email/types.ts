import type {
  LicenseDuration,
  PaidAccessTier,
} from '@/domain/access/types';

export type TransactionalEmailEventType =
  | 'purchase_confirmed'
  | 'license_activated'
  | 'license_upgraded'
  | 'license_expiring_soon'
  | 'license_expired'
  | 'purchase_refunded'
  | 'account_deletion_requested';

export interface TransactionalEmailBase {
  eventType: TransactionalEmailEventType;
  siteUrl: string;
  supportEmail?: string;
}

export interface LicenseEmailDetails {
  tier: PaidAccessTier;
  duration: LicenseDuration;
  startsAt: string;
  expiresAt: string;
}

export interface PurchaseFinancialDetails {
  tier: PaidAccessTier;
  duration: LicenseDuration;
  purchaseId: string;
  currency: 'EUR';
  listPriceTotalCents: number;
  upgradeCreditCents: number;
  amountPaidBaseCents: number;
  amountPaidVatCents: number;
  amountPaidTotalCents: number;
  vatRateBasisPoints: number;
}

export interface PurchaseEmailDetails extends PurchaseFinancialDetails {
  startsAt: string;
  expiresAt: string;
}

export interface RefundPurchaseEmailDetails extends PurchaseFinancialDetails {
  startsAt: string | null;
  expiresAt: string | null;
}

export type TransactionalEmailInput =
  | (TransactionalEmailBase & {
      eventType: 'purchase_confirmed' | 'license_upgraded';
      purchase: PurchaseEmailDetails;
    })
  | (TransactionalEmailBase & {
      eventType: 'license_activated' | 'license_expiring_soon' | 'license_expired';
      license: LicenseEmailDetails;
    })
  | (TransactionalEmailBase & {
      eventType: 'purchase_refunded';
      purchase: RefundPurchaseEmailDetails;
      refundedAt: string;
    })
  | (TransactionalEmailBase & {
      eventType: 'account_deletion_requested';
      requestedAt: string;
    });

export interface RenderedTransactionalEmail {
  subject: string;
  html: string;
  text: string;
}
