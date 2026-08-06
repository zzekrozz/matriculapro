import { createClient } from '@supabase/supabase-js';

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !serviceKey || /your-project|replace/i.test(`${url}${serviceKey}`)) {
    console.warn('FISCAL DATABASE: PENDING. No se han configurado credenciales de Supabase para la comprobación remota.');
    return;
  }

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const checks = [
    ['fiscal_catalog_vehicles', 70_886],
    ['fiscal_catalog_depreciation_bands', 45],
  ] as const;
  let failed = false;
  for (const [table, expected] of checks) {
    const { count, error } = await supabase
      .from(table)
      .select('*', { head: true, count: 'exact' });
    if (error || count !== expected) {
      console.error(`${table}: FAILED (esperado ${expected}, obtenido ${count ?? 'error'}${error ? `, ${error.message}` : ''})`);
      failed = true;
    } else {
      console.log(`${table}: ${count} registros — OK`);
    }
  }

  if (failed) process.exitCode = 1;
  else console.log('FISCAL DATABASE: exact row counts confirmed. Ejecuta pgTAP para RLS/RPC.');
}

void main().catch((error: unknown) => {
  console.error(`FISCAL DATABASE: FAILED — ${error instanceof Error ? error.message : 'error inesperado'}`);
  process.exitCode = 1;
});
