import { safeInternalPath } from './redirect';

export const EMAIL_OTP_TYPES = ['signup', 'recovery', 'email_change'] as const;

export type EmailOtpType = (typeof EMAIL_OTP_TYPES)[number];
export type EmailAuthFlow = 'confirmation' | 'recovery' | 'email_change';

export function parseEmailOtpType(value: string | null | undefined): EmailOtpType | null {
  return EMAIL_OTP_TYPES.find((type) => type === value) ?? null;
}

export function isEmailOtpTokenHash(value: string | null | undefined): value is string {
  return typeof value === 'string'
    && value.length >= 32
    && value.length <= 2048
    && !/\s/.test(value);
}

export function emailAuthFlow(type: string | null | undefined): EmailAuthFlow {
  if (type === 'recovery') return 'recovery';
  if (type === 'email_change') return 'email_change';
  return 'confirmation';
}

export function emailOtpDestination(
  type: EmailOtpType,
  requestedPath: string | null | undefined,
): string {
  if (type === 'recovery') return '/restablecer-contrasena';
  const fallback = type === 'email_change' ? '/app/cuenta' : '/app/comprobar';
  return safeInternalPath(requestedPath, fallback);
}
