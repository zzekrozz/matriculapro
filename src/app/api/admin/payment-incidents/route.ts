import { timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  listPaymentIncidents,
  resolvePaymentIncident,
  retryPaymentIncident,
} from '@/server/payments';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const actionSchema = z.object({
  incidentId: z.string().uuid(),
  action: z.enum(['retry', 'resolve', 'refunded', 'ignore']),
  reason: z.string().trim().min(4).max(1_000),
});

function authorized(request: Request): boolean {
  const expected = process.env.PAYMENT_INCIDENT_ADMIN_SECRET?.trim() ?? '';
  const authorization = request.headers.get('authorization') ?? '';
  const supplied = authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : '';
  if (expected.length < 32 || supplied.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(supplied), Buffer.from(expected));
}

export async function GET(request: Request) {
  if (!authorized(request)) return NextResponse.json({ ok: false }, { status: 401 });
  const incidents = await listPaymentIncidents();
  return NextResponse.json({ ok: true, incidents }, {
    headers: { 'Cache-Control': 'private, no-store, max-age=0' },
  });
}

export async function POST(request: Request) {
  if (!authorized(request)) return NextResponse.json({ ok: false }, { status: 401 });
  const parsed = actionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, message: 'Solicitud inválida.' }, { status: 400 });
  try {
    const incident = parsed.data.action === 'retry'
      ? await retryPaymentIncident(parsed.data.incidentId)
      : await resolvePaymentIncident({
          incidentId: parsed.data.incidentId,
          status: parsed.data.action === 'resolve'
            ? 'resolved'
            : parsed.data.action === 'refunded' ? 'refunded' : 'ignored_with_reason',
          reason: parsed.data.reason,
        });
    return NextResponse.json({ ok: true, incident }, {
      headers: { 'Cache-Control': 'private, no-store, max-age=0' },
    });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      message: error instanceof Error ? error.message : 'No se ha podido resolver la incidencia.',
    }, { status: 409, headers: { 'Cache-Control': 'private, no-store, max-age=0' } });
  }
}
