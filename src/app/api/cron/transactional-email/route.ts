import { createHash, timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import {
  getTransactionalEmailConfiguration,
  processTransactionalEmailBatch,
  TransactionalEmailConfigurationError,
} from '@/server/email';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: Request) {
  return handleCron(request);
}

export async function POST(request: Request) {
  return handleCron(request);
}

async function handleCron(request: Request) {
  let configuredSecret: string;
  try {
    configuredSecret = getTransactionalEmailConfiguration().cronSecret;
  } catch (cause) {
    if (cause instanceof TransactionalEmailConfigurationError) {
      return json({ ok: false, message: 'Servicio no configurado.' }, 503);
    }
    return json({ ok: false, message: 'Servicio no disponible.' }, 503);
  }

  const suppliedSecret = bearerToken(request.headers.get('authorization'));
  if (!suppliedSecret || !constantTimeEqual(suppliedSecret, configuredSecret)) {
    return json({ ok: false, message: 'No autorizado.' }, 401);
  }

  try {
    const result = await processTransactionalEmailBatch();
    return json({ ok: true, ...result }, 200);
  } catch {
    return json({ ok: false, message: 'No se ha podido procesar la cola.' }, 503);
  }
}

function bearerToken(value: string | null): string | null {
  const match = value?.match(/^Bearer ([^\s]+)$/i);
  return match?.[1] ?? null;
}

function constantTimeEqual(left: string, right: string): boolean {
  const leftDigest = createHash('sha256').update(left, 'utf8').digest();
  const rightDigest = createHash('sha256').update(right, 'utf8').digest();
  return timingSafeEqual(leftDigest, rightDigest);
}

function json(body: Record<string, unknown>, status: number) {
  return NextResponse.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  });
}
