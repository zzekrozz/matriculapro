export type LegalOwnerConfig = {
  legalFullName: string;
  nif: string;
  tradeName: 'IvanImports';
  legalAddress: string;
  contactEmail: string;
  privacyEmail: string;
  supportEmail: string;
  country: 'España';
};

export const LEGAL_ENVIRONMENT_VARIABLES = {
  legalFullName: 'LEGAL_OWNER_FULL_NAME',
  nif: 'LEGAL_OWNER_NIF',
  tradeName: 'LEGAL_TRADE_NAME',
  legalAddress: 'LEGAL_OWNER_ADDRESS',
  contactEmail: 'LEGAL_CONTACT_EMAIL',
  privacyEmail: 'LEGAL_PRIVACY_EMAIL',
  supportEmail: 'NEXT_PUBLIC_SUPPORT_EMAIL',
  reviewCompleted: 'LEGAL_REVIEW_COMPLETED',
} as const;

const pending = (variable: string) => `[PENDIENTE DE CONFIGURAR: ${variable}]`;

const configuredOrPending = (variable: string): string => {
  const value = process.env[variable]?.trim();
  return value || pending(variable);
};

export const legalOwnerConfig: LegalOwnerConfig = {
  legalFullName: configuredOrPending(LEGAL_ENVIRONMENT_VARIABLES.legalFullName),
  nif: configuredOrPending(LEGAL_ENVIRONMENT_VARIABLES.nif),
  tradeName: 'IvanImports',
  legalAddress: configuredOrPending(LEGAL_ENVIRONMENT_VARIABLES.legalAddress),
  contactEmail: configuredOrPending(LEGAL_ENVIRONMENT_VARIABLES.contactEmail),
  privacyEmail: configuredOrPending(LEGAL_ENVIRONMENT_VARIABLES.privacyEmail),
  supportEmail: configuredOrPending(LEGAL_ENVIRONMENT_VARIABLES.supportEmail),
  country: 'España',
};

export const legalReviewCompleted =
  process.env.LEGAL_REVIEW_COMPLETED?.trim().toLowerCase() === 'true';

export const LEGAL_DOCUMENT_VERSION = '2026-08-v1';
export const LEGAL_DOCUMENT_VERSIONS = {
  terms: LEGAL_DOCUMENT_VERSION,
  privacy: LEGAL_DOCUMENT_VERSION,
  contracting: LEGAL_DOCUMENT_VERSION,
  withdrawal: LEGAL_DOCUMENT_VERSION,
} as const;
export const LEGAL_DOCUMENT_REVIEW_DATE = '5 de agosto de 2026';
export const LEGAL_REVIEW_NOTICE =
  'Borrador pendiente de revisión jurídica profesional. No debe publicarse en producción hasta completar los datos del titular y marcar la revisión legal como finalizada.';

export function isPendingLegalValue(value: string): boolean {
  return value.startsWith('[PENDIENTE DE CONFIGURAR:');
}

export function legalContactHref(email: string): string | undefined {
  return isPendingLegalValue(email) ? undefined : `mailto:${email}`;
}

export function getLegalConfigurationIssues(
  environment: NodeJS.ProcessEnv = process.env,
): string[] {
  const issues: string[] = [];
  const required = [
    LEGAL_ENVIRONMENT_VARIABLES.legalFullName,
    LEGAL_ENVIRONMENT_VARIABLES.nif,
    LEGAL_ENVIRONMENT_VARIABLES.tradeName,
    LEGAL_ENVIRONMENT_VARIABLES.legalAddress,
    LEGAL_ENVIRONMENT_VARIABLES.contactEmail,
    LEGAL_ENVIRONMENT_VARIABLES.privacyEmail,
    LEGAL_ENVIRONMENT_VARIABLES.supportEmail,
  ];

  for (const variable of required) {
    const value = environment[variable]?.trim();
    if (!value) {
      issues.push(`Falta ${variable}.`);
      continue;
    }

    if (/pendiente|placeholder|example|ejemplo|<[^>]+>|12345678[a-z]/i.test(value)) {
      issues.push(`${variable} parece contener un marcador o dato ficticio.`);
    }
  }

  const tradeName = environment.LEGAL_TRADE_NAME?.trim();
  if (tradeName && tradeName !== 'IvanImports') {
    issues.push('LEGAL_TRADE_NAME debe ser exactamente "IvanImports".');
  }

  for (const emailVariable of [
    LEGAL_ENVIRONMENT_VARIABLES.contactEmail,
    LEGAL_ENVIRONMENT_VARIABLES.privacyEmail,
    LEGAL_ENVIRONMENT_VARIABLES.supportEmail,
  ]) {
    const email = environment[emailVariable]?.trim();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      issues.push(`${emailVariable} no tiene formato de email válido.`);
    }
  }

  if (environment.LEGAL_REVIEW_COMPLETED?.trim().toLowerCase() !== 'true') {
    issues.push('LEGAL_REVIEW_COMPLETED no está marcado como true.');
  }

  return issues;
}
