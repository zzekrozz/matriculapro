import type {
  LicenseEmailDetails,
  PurchaseFinancialDetails,
  PurchaseEmailDetails,
  RefundPurchaseEmailDetails,
  RenderedTransactionalEmail,
  TransactionalEmailInput,
} from './types';
import { LEGAL_DOCUMENT_VERSIONS } from '../../config/legal';

export const TRANSACTIONAL_EMAIL_TEMPLATE_VERSION = '2026-08-v1';

const BRAND = 'MatriculaPro by IvanImports';
const DATE_FORMAT = new Intl.DateTimeFormat('es-ES', {
  dateStyle: 'long',
  timeZone: 'Europe/Madrid',
});
const EURO_FORMAT = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
});

const TIER_LABEL = {
  particular: 'Particular',
  professional: 'Profesional',
} as const;

const DURATION_LABEL = {
  one_month: '1 mes',
  six_months: '6 meses',
  twelve_months: '12 meses',
} as const;

type DetailRow = readonly [label: string, value: string];

interface LayoutInput {
  subject: string;
  preheader: string;
  heading: string;
  paragraphs: readonly string[];
  rows?: readonly DetailRow[];
  actionLabel?: string;
  actionPath?: string;
  siteUrl: string;
  supportEmail?: string;
}

export function renderTransactionalEmail(
  input: TransactionalEmailInput,
): RenderedTransactionalEmail {
  const siteUrl = normalizedSiteUrl(input.siteUrl);

  switch (input.eventType) {
    case 'purchase_confirmed':
      return renderPurchaseConfirmation(input.purchase, siteUrl, input.supportEmail);
    case 'license_activated':
      return renderLicenseActivated(input.license, siteUrl, input.supportEmail);
    case 'license_upgraded':
      return renderLicenseUpgrade(input.purchase, siteUrl, input.supportEmail);
    case 'license_expiring_soon':
      return renderExpiringSoon(input.license, siteUrl, input.supportEmail);
    case 'license_expired':
      return renderExpired(input.license, siteUrl, input.supportEmail);
    case 'purchase_refunded':
      return renderRefund(input.purchase, input.refundedAt, siteUrl, input.supportEmail);
    case 'account_deletion_requested':
      return renderDeletionRequest(input.requestedAt, siteUrl, input.supportEmail);
  }
}

function renderPurchaseConfirmation(
  purchase: PurchaseEmailDetails,
  siteUrl: string,
  supportEmail?: string,
) {
  return layout({
    subject: 'Compra confirmada · MatriculaPro',
    preheader: 'Hemos confirmado tu pago único de MatriculaPro.',
    heading: 'Compra confirmada',
    paragraphs: [
      'Hemos confirmado tu pago. Esta compra es un pago único y no tiene renovación automática.',
      'La activación del acceso se realiza desde el evento de pago verificado por el servidor.',
      'Conserva este correo como resumen contractual. Incluye la versión aceptada y el enlace permanente a la información de desistimiento.',
    ],
    rows: [
      ...purchaseRows(purchase),
      ['Moneda', purchase.currency],
      ['País fiscal', 'España (ES)'],
      ['Condiciones aceptadas', LEGAL_DOCUMENT_VERSIONS.contracting],
      ['Información de desistimiento', new URL('/legal/desistimiento', `${siteUrl}/`).toString()],
    ],
    actionLabel: 'Ver mi licencia',
    actionPath: '/app/cuenta',
    siteUrl,
    supportEmail,
  });
}

function renderLicenseActivated(
  license: LicenseEmailDetails,
  siteUrl: string,
  supportEmail?: string,
) {
  return layout({
    subject: 'Licencia activada · MatriculaPro',
    preheader: `Tu licencia ${TIER_LABEL[license.tier]} ya está activa.`,
    heading: 'Tu licencia ya está activa',
    paragraphs: [
      'Ya puedes utilizar las funciones incluidas en tu nivel durante el periodo indicado.',
      'Los cálculos y rutas dependen de los datos que introduzcas; este correo no valida ningún expediente ni documento.',
    ],
    rows: licenseRows(license),
    actionLabel: 'Entrar en MatriculaPro',
    actionPath: '/app/dashboard',
    siteUrl,
    supportEmail,
  });
}

function renderLicenseUpgrade(
  purchase: PurchaseEmailDetails,
  siteUrl: string,
  supportEmail?: string,
) {
  return layout({
    subject: 'Ampliación aplicada · MatriculaPro',
    preheader: 'La ampliación de tu licencia se ha aplicado correctamente.',
    heading: 'Ampliación aplicada',
    paragraphs: [
      'Hemos aplicado la ampliación dentro del mismo nivel y el crédito correspondiente a la compra inicial.',
      'La fecha de inicio original se conserva. El nuevo vencimiento se calcula desde esa fecha, no desde el día de la ampliación.',
    ],
    rows: purchaseRows(purchase),
    actionLabel: 'Ver mi licencia',
    actionPath: '/app/cuenta',
    siteUrl,
    supportEmail,
  });
}

function renderExpiringSoon(
  license: LicenseEmailDetails,
  siteUrl: string,
  supportEmail?: string,
) {
  return layout({
    subject: 'Tu licencia vence pronto · MatriculaPro',
    preheader: `Tu licencia vence el ${formatDate(license.expiresAt)}.`,
    heading: 'Tu licencia vence pronto',
    paragraphs: [
      'Te avisamos con antelación para que puedas decidir si necesitas una nueva licencia. No habrá ningún cobro automático.',
      'Tras el vencimiento conservarás el acceso al comprobador gratuito y tus expedientes anteriores quedarán visibles en modo lectura.',
    ],
    rows: licenseRows(license),
    actionLabel: 'Ver opciones de licencia',
    actionPath: '/app/planes',
    siteUrl,
    supportEmail,
  });
}

function renderExpired(
  license: LicenseEmailDetails,
  siteUrl: string,
  supportEmail?: string,
) {
  return layout({
    subject: 'Tu licencia ha vencido · MatriculaPro',
    preheader: `Tu licencia venció el ${formatDate(license.expiresAt)}.`,
    heading: 'Tu licencia ha vencido',
    paragraphs: [
      'No realizaremos ningún cobro: la licencia era de pago único y no se renovaba automáticamente.',
      'Puedes seguir usando el comprobador gratuito. Tus expedientes y cálculos anteriores permanecen visibles en modo lectura, pero no se pueden editar ni recalcular.',
    ],
    rows: licenseRows(license),
    actionLabel: 'Elegir una nueva licencia',
    actionPath: '/app/planes',
    siteUrl,
    supportEmail,
  });
}

function renderRefund(
  purchase: RefundPurchaseEmailDetails,
  refundedAt: string,
  siteUrl: string,
  supportEmail?: string,
) {
  return layout({
    subject: 'Reembolso registrado · MatriculaPro',
    preheader: 'Hemos registrado el reembolso de tu compra de MatriculaPro.',
    heading: 'Reembolso registrado',
    paragraphs: [
      'Hemos registrado el reembolso indicado a continuación. El plazo hasta verlo reflejado depende de Stripe, tu banco y el medio de pago.',
      'Si el acceso asociado ya se había activado, queda invalidado. La cuenta y el comprobador gratuito siguen disponibles.',
    ],
    rows: [
      ...purchaseRows(purchase),
      ['Reembolso registrado', formatDate(refundedAt)],
    ],
    actionLabel: 'Ver mi cuenta',
    actionPath: '/app/cuenta',
    siteUrl,
    supportEmail,
  });
}

function renderDeletionRequest(
  requestedAt: string,
  siteUrl: string,
  supportEmail?: string,
) {
  return layout({
    subject: 'Solicitud de supresión recibida · MatriculaPro',
    preheader: 'Hemos recibido tu solicitud de supresión de cuenta.',
    heading: 'Solicitud recibida',
    paragraphs: [
      'Hemos registrado tu solicitud y revisaremos qué datos pueden eliminarse y cuáles deben conservarse temporalmente por obligaciones legales o contractuales.',
      'La cuenta no se elimina de forma automática al enviar la solicitud. Te informaremos cuando la revisión haya finalizado.',
    ],
    rows: [
      ['Fecha de solicitud', formatDate(requestedAt)],
      ['Estado', 'Recibida, pendiente de revisión'],
    ],
    actionLabel: 'Consultar privacidad',
    actionPath: '/legal/privacidad',
    siteUrl,
    supportEmail,
  });
}

function licenseRows(license: LicenseEmailDetails): DetailRow[] {
  return [
    ['Nivel', TIER_LABEL[license.tier]],
    ['Duración', DURATION_LABEL[license.duration]],
    ['Inicio', formatDate(license.startsAt)],
    ['Vencimiento', formatDate(license.expiresAt)],
  ];
}

function purchaseRows(
  purchase: PurchaseFinancialDetails & {
    startsAt?: string | null;
    expiresAt?: string | null;
  },
): DetailRow[] {
  assertPurchaseAmounts(purchase);
  const rows: DetailRow[] = [
    ['Identificador de compra', purchase.purchaseId],
    ['Nivel', TIER_LABEL[purchase.tier]],
    ['Duración', DURATION_LABEL[purchase.duration]],
  ];
  if (purchase.startsAt && purchase.expiresAt) {
    rows.push(
      ['Inicio', formatDate(purchase.startsAt)],
      ['Vencimiento', formatDate(purchase.expiresAt)],
    );
  }
  rows.push(['Precio de la licencia (IVA incluido)', formatMoney(purchase.listPriceTotalCents)]);
  if (purchase.upgradeCreditCents > 0) {
    rows.push(['Crédito de ampliación', `−${formatMoney(purchase.upgradeCreditCents)}`]);
  }
  rows.push(
    ['Base imponible pagada', formatMoney(purchase.amountPaidBaseCents)],
    [`IVA pagado (${formatVatRate(purchase.vatRateBasisPoints)})`, formatMoney(purchase.amountPaidVatCents)],
    ['Total pagado', formatMoney(purchase.amountPaidTotalCents)],
  );
  return rows;
}

function layout(input: LayoutInput): RenderedTransactionalEmail {
  const actionUrl = input.actionPath
    ? new URL(input.actionPath, `${input.siteUrl}/`).toString()
    : undefined;
  const supportLine = input.supportEmail
    ? `Si necesitas ayuda, escribe a ${input.supportEmail}.`
    : 'Si necesitas ayuda, utiliza el canal de soporte configurado en MatriculaPro.';
  const rows = input.rows ?? [];
  const textRows = rows.map(([label, value]) => `${label}: ${value}`).join('\n');
  const text = [
    input.heading,
    '',
    ...input.paragraphs.flatMap((paragraph) => [paragraph, '']),
    textRows,
    textRows ? '' : undefined,
    actionUrl && input.actionLabel ? `${input.actionLabel}: ${actionUrl}` : undefined,
    actionUrl ? '' : undefined,
    supportLine,
    '',
    `${BRAND} · Email transaccional · ${TRANSACTIONAL_EMAIL_TEMPLATE_VERSION}`,
  ].filter((line): line is string => line !== undefined).join('\n');

  const htmlRows = rows.length
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;border-collapse:collapse">${rows.map(([label, value]) => `<tr><th scope="row" style="padding:10px 0;border-bottom:1px solid #e4e0d8;text-align:left;vertical-align:top;font:600 14px/1.4 Arial,sans-serif;color:#514b43">${escapeHtml(label)}</th><td style="padding:10px 0;border-bottom:1px solid #e4e0d8;text-align:right;vertical-align:top;font:400 14px/1.4 Arial,sans-serif;color:#1d1a17">${escapeHtml(value)}</td></tr>`).join('')}</table>`
    : '';
  const action = actionUrl && input.actionLabel
    ? `<p style="margin:28px 0"><a href="${escapeHtml(actionUrl)}" style="display:inline-block;padding:12px 20px;border-radius:999px;background:#1d1a17;color:#ffffff;text-decoration:none;font:600 14px/1 Arial,sans-serif">${escapeHtml(input.actionLabel)}</a></p>`
    : '';
  const supportHtml = input.supportEmail
    ? `Si necesitas ayuda, escribe a <a href="mailto:${escapeHtml(input.supportEmail)}" style="color:#805b36">${escapeHtml(input.supportEmail)}</a>.`
    : escapeHtml(supportLine);

  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(input.subject)}</title></head><body style="margin:0;background:#f5f2ec;color:#1d1a17"><span style="display:none!important;max-height:0;max-width:0;overflow:hidden;opacity:0">${escapeHtml(input.preheader)}</span><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f2ec"><tr><td align="center" style="padding:28px 12px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:620px;background:#ffffff;border:1px solid #e4e0d8;border-radius:20px"><tr><td style="padding:32px"><p style="margin:0 0 22px;font:600 12px/1.4 Arial,sans-serif;letter-spacing:.08em;text-transform:uppercase;color:#805b36">${BRAND}</p><h1 style="margin:0 0 18px;font:600 28px/1.2 Georgia,serif;color:#1d1a17">${escapeHtml(input.heading)}</h1>${input.paragraphs.map((paragraph) => `<p style="margin:0 0 14px;font:400 15px/1.65 Arial,sans-serif;color:#514b43">${escapeHtml(paragraph)}</p>`).join('')}${htmlRows}${action}<p style="margin:24px 0 0;font:400 13px/1.6 Arial,sans-serif;color:#6d665e">${supportHtml}</p><p style="margin:24px 0 0;padding-top:18px;border-top:1px solid #e4e0d8;font:400 11px/1.5 Arial,sans-serif;color:#8a837b">Email transaccional · ${TRANSACTIONAL_EMAIL_TEMPLATE_VERSION}. Sin píxeles de seguimiento ni recursos remotos.</p></td></tr></table></td></tr></table></body></html>`;

  return { subject: input.subject, html, text };
}

function normalizedSiteUrl(value: string): string {
  const parsed = new URL(value);
  if (parsed.protocol !== 'https:' && parsed.hostname !== 'localhost') {
    throw new Error('Transactional email site URL must use HTTPS outside localhost');
  }
  parsed.pathname = '/';
  parsed.search = '';
  parsed.hash = '';
  return parsed.toString().replace(/\/$/, '');
}

function assertPurchaseAmounts(purchase: PurchaseFinancialDetails) {
  const amounts = [
    purchase.listPriceTotalCents,
    purchase.upgradeCreditCents,
    purchase.amountPaidBaseCents,
    purchase.amountPaidVatCents,
    purchase.amountPaidTotalCents,
    purchase.vatRateBasisPoints,
  ];
  if (amounts.some((amount) => !Number.isSafeInteger(amount) || amount < 0)) {
    throw new Error('Transactional email received an invalid monetary amount');
  }
  if (purchase.currency !== 'EUR') {
    throw new Error('Transactional email received an unsupported currency');
  }
  if (purchase.amountPaidBaseCents + purchase.amountPaidVatCents !== purchase.amountPaidTotalCents) {
    throw new Error('Transactional email VAT breakdown is inconsistent');
  }
  if (purchase.listPriceTotalCents - purchase.upgradeCreditCents !== purchase.amountPaidTotalCents) {
    throw new Error('Transactional email payment total is inconsistent');
  }
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error('Transactional email received an invalid date');
  return DATE_FORMAT.format(date);
}

function formatMoney(cents: number): string {
  return EURO_FORMAT.format(cents / 100);
}

function formatVatRate(basisPoints: number): string {
  return `${new Intl.NumberFormat('es-ES', { maximumFractionDigits: 2 }).format(basisPoints / 100)} %`;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;',
  })[character] ?? character);
}
