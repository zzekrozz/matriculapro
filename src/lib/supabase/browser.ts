import { createBrowserClient } from '@supabase/ssr';

export function isSupabaseBrowserConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!url || !anonKey) return false;

  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

/**
 * Cliente Supabase para usar en Client Components ('use client').
 * Llama a esta función dentro del componente, no fuera.
 */
export function createSupabaseBrowserClient() {
  if (!isSupabaseBrowserConfigured()) {
    throw new Error('Supabase no está configurado en este entorno.');
  }

  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
