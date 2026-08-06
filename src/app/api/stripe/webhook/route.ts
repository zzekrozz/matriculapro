import { NextResponse, type NextRequest } from 'next/server';
import { handleStripeTestWebhook } from '@/server/payments';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const result = await handleStripeTestWebhook(rawBody, request.headers.get('stripe-signature'));
    return NextResponse.json({ received: result.received, processed: result.processed, duplicate: result.duplicate, reason: result.reason }, { status: result.httpStatus, headers: { 'Cache-Control': 'no-store' } });
  } catch {
    // A 500 asks Stripe to retry transient configuration/database failures.
    return NextResponse.json({ received: false, processed: false, reason: 'processing_unavailable' }, { status: 500, headers: { 'Cache-Control': 'no-store' } });
  }
}
