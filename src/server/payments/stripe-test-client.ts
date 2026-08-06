import 'server-only';
import Stripe from 'stripe';
import { getStripeTestConfiguration } from '@/lib/payments/stripe-test-config';

let client: Stripe | null = null;
let clientKey: string | null = null;

export function getStripeTestClient(): Stripe {
  const configuration = getStripeTestConfiguration();
  if (!client || clientKey !== configuration.secretKey) {
    client = new Stripe(configuration.secretKey, {
      apiVersion: '2026-05-27.dahlia',
      typescript: true,
    });
    clientKey = configuration.secretKey;
  }
  return client;
}
