import { createClient } from '@supabase/supabase-js';

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !serviceKey || /your-project|replace/i.test(`${url}${serviceKey}`)) {
    console.warn('SUPABASE LIVE: PENDING. Configura NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY para verificar staging.');
    return;
  }

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const tables = [
    'profiles',
    'user_licenses',
    'purchases',
    'payment_events',
    'free_vehicle_checks',
    'professional_clients',
    'account_deletion_requests',
    'legal_acceptances',
    'registration_authorizations',
    'transactional_email_outbox',
  ];
  let failed = false;
  for (const table of tables) {
    const { error } = await supabase
      .from(table)
      .select('*', { head: true, count: 'exact' })
      .limit(1);
    if (error) {
      console.error(`SUPABASE ${table}: FAILED — ${error.message}`);
      failed = true;
    } else {
      console.log(`SUPABASE ${table}: reachable`);
    }
  }

  if (failed) process.exitCode = 1;
  else console.log('SUPABASE LIVE: base tables reachable with server-only verification credentials. RLS still requires pgTAP/authenticated-role tests.');
}

void main().catch((error: unknown) => {
  console.error(`SUPABASE LIVE: FAILED — ${error instanceof Error ? error.message : 'error inesperado'}`);
  process.exitCode = 1;
});
