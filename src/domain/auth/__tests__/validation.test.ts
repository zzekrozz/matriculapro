import test from 'node:test';
import assert from 'node:assert/strict';
import {
  newPasswordSchema,
  recoveryRequestSchema,
  registrationSchema,
} from '../validation';
import {
  emailAuthFlow,
  emailOtpDestination,
  isEmailOtpTokenHash,
  parseEmailOtpType,
} from '../../../lib/auth/email-otp';
import { safeInternalPath } from '../../../lib/auth/redirect';

const validRegistration = {
  displayName: '  Ana García  ',
  email: '  ANA@EXAMPLE.COM ',
  password: 'una-clave-larga',
  passwordConfirmation: 'una-clave-larga',
  acceptedTerms: true,
  acceptedPrivacy: true,
  next: '/app/comprobar?from=registro',
};

test('registration validation normalizes identity fields and accepts explicit legal acknowledgements', () => {
  const result = registrationSchema.parse(validRegistration);
  assert.equal(result.displayName, 'Ana García');
  assert.equal(result.email, 'ana@example.com');
  assert.equal(result.next, '/app/comprobar?from=registro');
});

test('registration rejects a missing name, password mismatch, and missing legal acknowledgements', () => {
  const result = registrationSchema.safeParse({
    ...validRegistration,
    displayName: ' ',
    passwordConfirmation: 'otra-clave-larga',
    acceptedTerms: false,
    acceptedPrivacy: false,
  });
  assert.equal(result.success, false);
  if (result.success) return;
  const paths = result.error.issues.map((issue) => issue.path[0]);
  assert.ok(paths.includes('displayName'));
  assert.ok(paths.includes('passwordConfirmation'));
  assert.ok(paths.includes('acceptedTerms'));
  assert.ok(paths.includes('acceptedPrivacy'));
});

test('password validation enforces the published length and confirmation', () => {
  assert.equal(newPasswordSchema.safeParse({
    password: '123456789',
    passwordConfirmation: '123456789',
  }).success, false);
  assert.equal(newPasswordSchema.safeParse({
    password: '1234567890',
    passwordConfirmation: '1234567890',
  }).success, true);
});

test('recovery validation normalizes email without changing the neutral API contract', () => {
  assert.equal(
    recoveryRequestSchema.parse({ email: ' Person@Example.com ' }).email,
    'person@example.com',
  );
});

test('auth redirects keep safe internal destinations including query and hash', () => {
  assert.equal(
    safeInternalPath('/app/planes?duration=12#precios'),
    '/app/planes?duration=12#precios',
  );
  assert.equal(
    safeInternalPath('/restablecer-contrasena'),
    '/restablecer-contrasena',
  );
});

test('auth redirects reject external, protocol-relative, callback and loop destinations', () => {
  for (const candidate of [
    'https://evil.example/phishing',
    '//evil.example/phishing',
    '/entrar?next=/entrar',
    '/registro',
    '/auth/callback?code=secret',
    '/api/auth/login',
  ]) {
    assert.equal(safeInternalPath(candidate), '/app/comprobar');
  }
});

test('email OTP accepts only the supported Supabase email link types', () => {
  assert.equal(parseEmailOtpType('signup'), 'signup');
  assert.equal(parseEmailOtpType('recovery'), 'recovery');
  assert.equal(parseEmailOtpType('email_change'), 'email_change');
  assert.equal(parseEmailOtpType('magiclink'), null);
  assert.equal(parseEmailOtpType('code'), null);
});

test('email OTP destinations are safe and recovery cannot leave the reset flow', () => {
  assert.equal(emailOtpDestination('signup', '/app/planes?duration=12'), '/app/planes?duration=12');
  assert.equal(emailOtpDestination('signup', 'https://evil.example'), '/app/comprobar');
  assert.equal(emailOtpDestination('email_change', undefined), '/app/cuenta');
  assert.equal(emailOtpDestination('recovery', '/app/dashboard'), '/restablecer-contrasena');
  assert.equal(emailAuthFlow('recovery'), 'recovery');
  assert.equal(emailAuthFlow('email_change'), 'email_change');
});

test('email OTP token hashes reject missing, short and whitespace-bearing values', () => {
  assert.equal(isEmailOtpTokenHash('a'.repeat(64)), true);
  assert.equal(isEmailOtpTokenHash('a'.repeat(31)), false);
  assert.equal(isEmailOtpTokenHash(`a${'b'.repeat(62)} `), false);
  assert.equal(isEmailOtpTokenHash(undefined), false);
});
