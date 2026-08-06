import assert from 'node:assert/strict';
import test from 'node:test';
import {
  renderTransactionalEmail,
  type LicenseEmailDetails,
  type PurchaseEmailDetails,
  type TransactionalEmailInput,
} from '..';

const siteUrl = 'http://localhost:3000';
const license: LicenseEmailDetails = {
  tier: 'particular',
  duration: 'six_months',
  startsAt: '2026-08-05T10:00:00.000Z',
  expiresAt: '2027-02-05T10:00:00.000Z',
};
const purchase: PurchaseEmailDetails = {
  ...license,
  purchaseId: '10000000-0000-4000-8000-000000000001',
  currency: 'EUR',
  listPriceTotalCents: 17_900,
  upgradeCreditCents: 7_900,
  amountPaidBaseCents: 8_264,
  amountPaidVatCents: 1_736,
  amountPaidTotalCents: 10_000,
  vatRateBasisPoints: 2_100,
};

const inputs: TransactionalEmailInput[] = [
  { eventType: 'purchase_confirmed', purchase, siteUrl },
  { eventType: 'license_activated', license, siteUrl },
  { eventType: 'license_upgraded', purchase, siteUrl },
  { eventType: 'license_expiring_soon', license, siteUrl },
  { eventType: 'license_expired', license, siteUrl },
  {
    eventType: 'purchase_refunded',
    purchase,
    refundedAt: '2026-08-06T10:00:00.000Z',
    siteUrl,
  },
  {
    eventType: 'account_deletion_requested',
    requestedAt: '2026-08-06T10:00:00.000Z',
    siteUrl,
  },
];

test('renders every required product template without tracking resources', () => {
  for (const input of inputs) {
    const rendered = renderTransactionalEmail(input);
    assert.match(rendered.subject, /MatriculaPro/);
    assert.match(rendered.text, /MatriculaPro by IvanImports/);
    assert.match(rendered.html, /Sin píxeles de seguimiento ni recursos remotos/);
    assert.doesNotMatch(rendered.html, /<img\b|tracking|googletagmanager|facebook\.net/i);
    assert.doesNotMatch(rendered.text, /documentaci[oó]n (?:ha sido )?validada/i);
  }
});

test('purchase and upgrade templates show duration, expiry, paid base, VAT and total', () => {
  for (const eventType of ['purchase_confirmed', 'license_upgraded'] as const) {
    const rendered = renderTransactionalEmail({ eventType, purchase, siteUrl });
    assert.match(rendered.text, /Duración: 6 meses/);
    assert.match(rendered.text, /Vencimiento: 5 de febrero de 2027/);
    assert.match(rendered.text, /Base imponible pagada: 82,64/);
    assert.match(rendered.text, /IVA pagado \(21 %\): 17,36/);
    assert.match(rendered.text, /Total pagado: 100,00/);
    assert.match(rendered.text, /Crédito de ampliación: −79,00/);
  }
});

test('rejects inconsistent monetary details before an email can be sent', () => {
  assert.throws(
    () => renderTransactionalEmail({
      eventType: 'purchase_confirmed',
      purchase: { ...purchase, amountPaidVatCents: 1_700 },
      siteUrl,
    }),
    /VAT breakdown is inconsistent/,
  );
});

test('renders an out-of-order refund even when no licence was activated', () => {
  const rendered = renderTransactionalEmail({
    eventType: 'purchase_refunded',
    purchase: { ...purchase, startsAt: null, expiresAt: null },
    refundedAt: '2026-08-06T10:00:00.000Z',
    siteUrl,
  });
  assert.match(rendered.text, /Duración: 6 meses/);
  assert.match(rendered.text, /Total pagado: 100,00/);
  assert.doesNotMatch(rendered.text, /Vencimiento:/);
  assert.match(rendered.text, /Si el acceso asociado ya se había activado/);
});

test('rejects an insecure non-local site URL', () => {
  assert.throws(
    () => renderTransactionalEmail({
      eventType: 'license_expired',
      license,
      siteUrl: 'http://matriculapro.invalid',
    }),
    /must use HTTPS/,
  );
});
