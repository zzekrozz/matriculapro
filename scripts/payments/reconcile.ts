import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

async function main() {
const argumentsSet = new Set(process.argv.slice(2));
const dryRun = argumentsSet.has('--dry-run') || !argumentsSet.has('--apply');
const allowProduction = argumentsSet.has('--allow-production');
const target = (process.env.MATRICULAPRO_DEPLOY_TARGET ?? 'development').toLowerCase();
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!dryRun) {
  console.error('BLOCKED: este reconciliador solo admite --dry-run; cualquier mutación debe usar los RPC transaccionales del webhook.');
  process.exitCode = 1;
} else if (target === 'production' && !allowProduction) {
  console.error('BLOCKED: para consultar producción hace falta --allow-production explícito.');
  process.exitCode = 1;
} else if (!url || !serviceKey || url.includes('your-project-ref') || serviceKey === 'replace-server-only') {
  console.log('PAYMENTS_RECONCILE=PENDING');
  console.log('Modo: dry-run, sin mutaciones. Configura NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY para consultar staging.');
} else {
  const supabase = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: reversals, error: reversalError } = await supabase
    .from('pending_payment_reversals')
    .select('stripe_event_id, reversal_kind, processing_status, purchase_id, stripe_payment_intent_id, stripe_charge_id, occurred_at, reason_code')
    .in('processing_status', ['pending_match', 'matched', 'requires_review'])
    .order('occurred_at', { ascending: true })
    .limit(500);
  if (reversalError) throw new Error(`No se pudieron consultar las reversiones: ${reversalError.message}`);

  const { data: incompatible, error: purchaseError } = await supabase
    .from('purchases')
    .select('id, status, stripe_payment_intent_id, resulting_license_id, refund_status, dispute_status, failure_reason')
    .or('and(status.eq.refunded,resulting_license_id.not.is.null),and(status.eq.disputed,resulting_license_id.is.null,dispute_status.eq.won)')
    .limit(500);
  if (purchaseError) throw new Error(`No se pudieron comprobar las compras: ${purchaseError.message}`);

  const { count: appliedCount, error: appliedError } = await supabase
    .from('pending_payment_reversals')
    .select('id', { count: 'exact', head: true })
    .eq('processing_status', 'applied');
  if (appliedError) throw new Error(`No se pudieron contar las reversiones aplicadas: ${appliedError.message}`);
  const { count: incidentCount, error: incidentError } = await supabase
    .from('payment_incidents')
    .select('id', { count: 'exact', head: true })
    .in('status', ['open', 'retrying']);
  if (incidentError) throw new Error(`No se pudieron contar las incidencias: ${incidentError.message}`);

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  let stripeVerified = 0;
  let stripeErrors = 0;
  if (stripeKey?.startsWith('sk_test_')) {
    const stripe = new Stripe(stripeKey);
    const paymentIntentIds = [...new Set((reversals ?? [])
      .map((row) => row.stripe_payment_intent_id)
      .filter((value): value is string => typeof value === 'string'))].slice(0, 25);
    for (const paymentIntentId of paymentIntentIds) {
      try {
        const intent = await stripe.paymentIntents.retrieve(paymentIntentId);
        if (intent.livemode) throw new Error('live PaymentIntent is forbidden');
        stripeVerified += 1;
      } catch {
        stripeErrors += 1;
      }
    }
  }

  console.log('PAYMENTS_RECONCILE=DRY_RUN');
  console.log(`Reversiones pendientes/revisión: ${reversals?.length ?? 0}`);
  console.log(`Compras incompatibles a revisar: ${incompatible?.length ?? 0}`);
  for (const row of reversals ?? []) {
    console.log(JSON.stringify({ type: 'pending_reversal', ...row }));
  }
  for (const row of incompatible ?? []) {
    console.log(JSON.stringify({ type: 'incompatible_purchase', ...row }));
  }
  console.log(JSON.stringify({
    summary: {
      pending: reversals?.filter((row) => row.processing_status !== 'requires_review').length ?? 0,
      applied: appliedCount ?? 0,
      ambiguous: reversals?.filter((row) => row.processing_status === 'requires_review').length ?? 0,
      incidents: incidentCount ?? 0,
      errors: stripeErrors,
      stripeVerified,
    },
  }));
  console.log('No se ha modificado ninguna fila.');
}
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'Falló la conciliación de pagos.');
  process.exitCode = 1;
});
