import { NextResponse, type NextRequest } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import type Stripe from 'stripe';

/**
 * POST /api/stripe/webhook
 *
 * Variables de entorno requeridas en Vercel (Settings → Environment Variables):
 *   STRIPE_SECRET_KEY         → sk_live_... (o sk_test_... en dev)
 *   STRIPE_WEBHOOK_SECRET     → whsec_...  (Stripe Dashboard → Webhooks → Signing secret)
 *   SUPABASE_SERVICE_ROLE_KEY → service_role de Supabase — NUNCA exponer al cliente
 *
 * Configurar en Stripe Dashboard → Developers → Webhooks:
 *   URL del endpoint: {NEXT_PUBLIC_SITE_URL}/api/stripe/webhook
 *   Ej: https://matriculapro-psi.vercel.app/api/stripe/webhook
 *   Eventos a escuchar: checkout.session.completed, payment_intent.succeeded
 *
 * Payment Link → After payment → Redirect to:
 *   {NEXT_PUBLIC_SITE_URL}/founder/bienvenida
 *
 * Desarrollo local con Stripe CLI:
 *   stripe listen --forward-to localhost:3000/api/stripe/webhook
 */

export const runtime = 'nodejs';

/** Extrae el email del comprador de las distintas ubicaciones posibles en el evento Stripe */
function extractEmail(event: Stripe.Event): string | null {
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    return (
      session.customer_details?.email ??
      session.customer_email ??
      (session.metadata?.email as string | undefined) ??
      null
    );
  }
  if (event.type === 'payment_intent.succeeded') {
    const pi = event.data.object as Stripe.PaymentIntent;
    return (
      (pi.metadata?.email as string | undefined) ??
      null
    );
  }
  return null;
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    console.error('[Stripe Webhook] Falta header stripe-signature');
    return NextResponse.json({ error: 'No signature' }, { status: 400 });
  }

  // Verificar firma
  let event: Stripe.Event;
  try {
    const stripeClient = getStripe();
    event = stripeClient.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  } catch (err) {
    console.error('[Stripe Webhook] Firma inválida:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const HANDLED_EVENTS = ['checkout.session.completed', 'payment_intent.succeeded'];
  console.log(`[Stripe Webhook] Evento: ${event.type}`);

  if (!HANDLED_EVENTS.includes(event.type)) {
    return NextResponse.json({ received: true, processed: false });
  }

  // Extraer email
  const email = extractEmail(event);

  if (!email) {
    console.error('[Stripe Webhook] missing_email — evento:', event.type, 'id:', event.id);
    // Devolver 200: Stripe no debe reintentar si el problema es que no hay email
    return NextResponse.json({ received: true, missing_email: true });
  }

  console.log(`[Stripe Webhook] Activando Founder para: ${email}`);

  try {
    const supabase = createSupabaseAdminClient();

    const { data, error } = await supabase.rpc('activate_founder_by_email', {
      p_email: email,
    });

    if (error) {
      console.error('[Stripe Webhook] Error Supabase RPC:', error.message);
      // 200 para que Stripe no reintente (el error es en nuestra lógica, no de red)
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
      console.log(`[Stripe Webhook] ⏳ ${email} — sin cuenta aún. Guardado en pending_founder_purchases.`);
      return NextResponse.json({ received: true, ok: true, pending: true, email });
    }

    if (result.already_founder) {
      console.log(`[Stripe Webhook] ✅ ${email} ya era Founder #${String(result.founder_number).padStart(4, '0')}`);
    } else {
      console.log(`[Stripe Webhook] ✅ ${email} → Founder #${String(result.founder_number).padStart(4, '0')}`);
    }

    return NextResponse.json({
      received: true,
      ok: true,
      email,
      founder_number: result.founder_number,
    });

  } catch (err) {
    console.error('[Stripe Webhook] Error inesperado:', err);
    return NextResponse.json({ received: true, internal_error: true });
  }
}
