import 'server-only';
import { timingSafeEqual } from 'node:crypto';

export const RECOVERY_STATE_COOKIE = 'mpro-recovery-state';
export const RECOVERY_AUTHORIZED_COOKIE = 'mpro-recovery-authorized';

export function recoveryCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge,
  };
}

export function isRecoveryToken(value: string | null | undefined): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{32,128}$/.test(value);
}

export function recoveryTokensMatch(
  first: string | null | undefined,
  second: string | null | undefined,
): boolean {
  if (!isRecoveryToken(first) || !isRecoveryToken(second)) return false;
  const firstBuffer = Buffer.from(first, 'utf8');
  const secondBuffer = Buffer.from(second, 'utf8');
  return firstBuffer.length === secondBuffer.length
    && timingSafeEqual(firstBuffer, secondBuffer);
}
