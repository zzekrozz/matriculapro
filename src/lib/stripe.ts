import Stripe from 'stripe';

/**
 * Crea y devuelve una instancia de Stripe.
 * Lazy para evitar errores en build time.
 * SOLO usar en código de servidor.
 */
export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY no está configurado.');
  return new Stripe(key, { apiVersion: '2026-05-27.dahlia', typescript: true });
}
