import 'server-only';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { getStripeTestClient } from './stripe-test-client';

interface BillingCustomerRow {
  user_id: string;
  stripe_customer_id: string;
  email_at_creation: string;
  email_current: string;
  country: string | null;
}

export interface BillingCustomer {
  userId: string;
  stripeCustomerId: string;
  emailAtCreation: string;
  emailCurrent: string;
  country: string | null;
}

function mapCustomer(row: BillingCustomerRow): BillingCustomer {
  return {
    userId: row.user_id,
    stripeCustomerId: row.stripe_customer_id,
    emailAtCreation: row.email_at_creation,
    emailCurrent: row.email_current,
    country: row.country,
  };
}

/**
 * Stripe's stable idempotency key prevents two tabs creating two Customers;
 * the database RPC adds the authoritative one-per-user lock and unique keys.
 */
export async function getOrCreateBillingCustomer(input: {
  userId: string;
  email: string;
}): Promise<BillingCustomer> {
  const admin = createSupabaseAdminClient();
  const normalizedEmail = input.email.trim().toLowerCase();
  const { data: existing, error } = await admin
    .from('billing_customers')
    .select('user_id, stripe_customer_id, email_at_creation, email_current, country')
    .eq('user_id', input.userId)
    .maybeSingle();
  if (error) throw new Error(`Could not read billing customer: ${error.message}`);

  if (existing) {
    const stripeCustomer = await getStripeTestClient().customers.retrieve(existing.stripe_customer_id);
    if (!stripeCustomer.deleted) {
      if (stripeCustomer.email?.toLowerCase() !== normalizedEmail) {
        await getStripeTestClient().customers.update(stripeCustomer.id, { email: normalizedEmail });
      }
      const { data, error: claimError } = await admin.rpc('claim_billing_customer', {
        p_user_id: input.userId,
        p_stripe_customer_id: stripeCustomer.id,
        p_email: normalizedEmail,
        p_country: existing.country,
      });
      if (claimError) throw new Error(`Could not refresh billing customer: ${claimError.message}`);
      return mapCustomer(data as BillingCustomerRow);
    }
  }

  const replacementSuffix = existing ? `_replace_${existing.stripe_customer_id}` : '';
  const created = await getStripeTestClient().customers.create({
    email: normalizedEmail,
    metadata: { matriculapro_user_id: input.userId },
  }, {
    idempotencyKey: `mpro_customer_${input.userId.replaceAll('-', '')}${replacementSuffix}`,
  });
  const { data, error: claimError } = await admin.rpc('claim_billing_customer', {
    p_user_id: input.userId,
    p_stripe_customer_id: created.id,
    p_email: normalizedEmail,
    p_country: null,
  });
  if (claimError) throw new Error(`Could not persist billing customer: ${claimError.message}`);
  return mapCustomer(data as BillingCustomerRow);
}
