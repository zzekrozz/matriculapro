import { NextResponse, type NextRequest } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import type Stripe from 'stripe';

/**
 * POST /api/stripe/webhook
 *
 * Variables de entorno requeridas en Vercel:
 *   STRIPE_SECRET_KEY         → sk_live_... (Stripe → API keys)
 *   STRIPE_WEBHOOK_SECRET     → whsec_...  (Stripe → Webhooks → Signing secret)
 *   SUPABASE_SERVICE_ROLE_KEY → service_role key (Supabase → Settings → API)
 *
 * Configurar en Stripe Dashboard → Developers → Webhooks:
 *   URL: https://matriculapro.ivanimports.es/api/stripe/webhook
 *   Eventos: checkout.session.completed, payment_intent.succeeded
 *
 * Payment Link → After payment → Redirect to:
 *   https://matriculapro.ivanimports.es/acceso-founder?success=true
 */

export const runtime = 'nodejs';

function extractEmail(event: Stripe.Event): string | null {
  if (event.type === 'checkout.session.completed') {
    const s = event.data.object as Stripe.Checkout.Session;
    return s.customer_details?.email ?? s.customer_email ?? (s.metadata?.email as string) ?? null;
  }
  if (event.type === 'payment_intent.succeeded') {
    const pi = event.data.object as Stripe.PaymentIntent;
    return (pi.metadata?.email as string) ?? null;
  }
  return null;
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    console.error('[STRIPE] missing stripe-signature header');
    return NextResponse.json({ error: 'No signature' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    const stripeClient = getStripe();
    event = stripeClient.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    console.error('[STRIPE] invalid signature:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  console.log('[STRIPE] event received:', event.type, event.id);

  const HANDLED = ['checkout.session.completed', 'payment_intent.succeeded'];
  if (!HANDLED.includes(event.type)) {
    return NextResponse.json({ received: true, processed: false });
  }

  const email = extractEmail(event);
  if (!email) {
    console.error('[STRIPE] missing_email for event:', event.type, event.id);
    return NextResponse.json({ received: true, missing_email: true });
  }

  console.log('[STRIPE] email:', email);

  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase.rpc('activate_founder_by_email', { p_email: email });

    if (error) {
      console.error('[STRIPE] Supabase RPC error:', error.message);
      return NextResponse.json({ received: true, rpc_error: error.message });
    }

    const result = data as {
      ok: boolean;
      pending?: boolean;
      already_founder?: boolean;
      founder_number?: number;
      error?: string;
    };

    if (result.pending) {
      console.log('[STRIPE] pending purchase saved for:', email);
      return NextResponse.json({ received: true, ok: true, pending: true, email });
    }

    if (!result.ok) {
      console.error('[STRIPE] activate failed:', result.error);
      return NextResponse.json({ received: true, ok: false, error: result.error });
    }

    const numStr = result.founder_number != null
      ? `#${String(result.founder_number).padStart(4, '0')}`
      : 'sin número';

    if (result.already_founder) {
      console.log('[STRIPE] already founder:', email, numStr);
    } else {
      console.log('[STRIPE] profile updated:', email, '→ founder', numStr);
    }

    return NextResponse.json({ received: true, ok: true, email, founder_number: result.founder_number });

  } catch (err) {
    console.error('[STRIPE] unexpected error:', err);
    return NextResponse.json({ received: true, internal_error: true });
  }
}
