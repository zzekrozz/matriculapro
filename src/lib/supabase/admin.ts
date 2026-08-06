import 'server-only';
import { createClient } from '@supabase/supabase-js';

/**
 * Cliente Supabase con service_role key.
 * Bypasa RLS — usar SOLO en código de servidor (API Routes, webhooks).
 *
 * NUNCA importar desde Client Components ni exponer al navegador.
 * La SUPABASE_SERVICE_ROLE_KEY debe existir solo en variables de servidor de Vercel.
 */
export function createSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      'Faltan variables de entorno: NEXT_PUBLIC_SUPABASE_URL y/o SUPABASE_SERVICE_ROLE_KEY'
    );
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
