/**
 * env.ts — Variables de entorno centralizadas.
 *
 * Todas las referencias a process.env en componentes deben venir de aquí.
 * Las variables NEXT_PUBLIC_* son seguras en cliente y servidor.
 * Las variables sin prefijo SOLO se pueden leer en servidor.
 *
 * Variables requeridas en Vercel → Settings → Environment Variables:
 *
 * PÚBLICO (cliente + servidor):
 *   NEXT_PUBLIC_SUPABASE_URL          → URL de tu proyecto Supabase
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY     → anon/public key de Supabase
 *   NEXT_PUBLIC_STRIPE_FOUNDERS_URL   → https://buy.stripe.com/cNieVe3Fmfe7fazdfy8N205
 *   NEXT_PUBLIC_SITE_URL              → https://matriculapro-psi.vercel.app
 *
 * PRIVADO (solo servidor — NUNCA exponer al cliente):
 *   SUPABASE_SERVICE_ROLE_KEY         → service_role key de Supabase
 *   STRIPE_SECRET_KEY                 → sk_live_... o sk_test_...
 *   STRIPE_WEBHOOK_SECRET             → whsec_... (Stripe Webhooks → Signing secret)
 *   FEEDBACK_RECIPIENT_EMAIL          → email privado de destino del feedback
 */

// ── Públicas (seguras en cliente) ──────────────────────────────
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

export function getPublicSupabaseHost(): string {
  try {
    return SUPABASE_URL ? new URL(SUPABASE_URL).host : 'missing-supabase-url';
  } catch {
    return 'invalid-supabase-url';
  }
}

/**
 * URL del Payment Link de Stripe para Founder Beta.
 * Viene de NEXT_PUBLIC_STRIPE_FOUNDERS_URL.
 * Fallback al link hardcoded para no romper si la variable falta.
 */
export const STRIPE_FOUNDERS_URL =
  process.env.NEXT_PUBLIC_STRIPE_FOUNDERS_URL ??
  'https://buy.stripe.com/cNieVe3Fmfe7fazdfy8N205';

/** URL base del sitio — usada para construir redirect_url en Stripe */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  'https://matriculapro-psi.vercel.app';

// ── Privadas (solo servidor — lanzar error si faltan en runtime) ──
export function requireServerEnv(name: string): string {
  const val = process.env[name];
  if (!val) throw new Error(`Variable de entorno requerida no configurada: ${name}`);
  return val;
}
