import { createBrowserClient } from '@supabase/ssr';

/**
 * Cliente Supabase para usar en Client Components ('use client').
 * Llama a esta función dentro del componente, no fuera.
 */
export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
