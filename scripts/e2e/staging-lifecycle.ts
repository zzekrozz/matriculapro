import assert from 'node:assert/strict';

const origin = requiredUrl('STAGING_BASE_URL');
const cookie = process.env.STAGING_E2E_COOKIE?.trim() ?? '';
const adminSecret = process.env.PAYMENT_INCIDENT_ADMIN_SECRET?.trim() ?? '';

async function main() {
  const anonymousApp = await fetch(`${origin}/app/cuenta`, { redirect: 'manual' });
  assert.equal(anonymousApp.status, 307, 'anonymous /app/cuenta must redirect');

  const anonymousApi = await fetch(`${origin}/api/payments/checkout`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}', redirect: 'manual',
  });
  assert.equal(anonymousApi.status, 401, 'anonymous payment API must be unauthorized');

  const anonymousAdmin = await fetch(`${origin}/api/admin/payment-incidents`, { redirect: 'manual' });
  assert.equal(anonymousAdmin.status, 401, 'incident endpoint must reject missing admin secret');

  if (cookie) {
    const account = await fetch(`${origin}/app/cuenta`, { headers: { Cookie: cookie }, redirect: 'manual' });
    assert.equal(account.status, 200, 'synthetic authenticated account must load');
    const login = await fetch(`${origin}/entrar`, { headers: { Cookie: cookie }, redirect: 'manual' });
    assert.equal(login.status, 307, 'authenticated login entry must redirect');
  } else {
    console.warn('SKIP authenticated staging checks: STAGING_E2E_COOKIE is not configured');
  }

  if (adminSecret) {
    const incidents = await fetch(`${origin}/api/admin/payment-incidents`, {
      headers: { Authorization: `Bearer ${adminSecret}` },
    });
    assert.equal(incidents.status, 200, 'authorized incident query must succeed');
  } else {
    console.warn('SKIP incident admin query: PAYMENT_INCIDENT_ADMIN_SECRET is not configured');
  }
  console.log('STAGING_LIFECYCLE_E2E_STATUS=VALID');
}

function requiredUrl(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  const parsed = new URL(value);
  if (parsed.protocol !== 'https:' && parsed.hostname !== 'localhost' && parsed.hostname !== '127.0.0.1') {
    throw new Error(`${name} must use HTTPS outside localhost`);
  }
  return parsed.origin;
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
