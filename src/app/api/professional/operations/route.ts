import { NextResponse } from 'next/server';
import { ProfessionalOperationStatusMutationSchema } from '@/domain/professional/contracts';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { requireServerCapability } from '@/server/access';
import { rateLimitedResponse } from '@/server/security/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function PATCH(request: Request) {
  let userId: string;
  try {
    userId = (await requireServerCapability('use_professional_tools')).userId;
  } catch {
    return NextResponse.json(
      { ok: false, message: 'Necesitas una licencia Profesional activa.' },
      { status: 403, headers: noStoreHeaders() },
    );
  }

  const limited = await rateLimitedResponse(
    request,
    `professional:operations:status:${userId}`,
    { limit: 100, windowSeconds: 3_600 },
  );
  if (limited) return limited;

  const parsed = ProfessionalOperationStatusMutationSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: 'El estado de la operación no es válido.' },
      { status: 400, headers: noStoreHeaders() },
    );
  }

  const supabase = await createSupabaseServerClient();
  const existing = await supabase
    .from('registration_cases')
    .select('id, metadata')
    .eq('id', parsed.data.case_id)
    .eq('user_id', userId)
    .is('deleted_at', null)
    .maybeSingle();
  if (existing.error) {
    return NextResponse.json(
      { ok: false, message: 'No se ha podido verificar la operación.' },
      { status: 503, headers: noStoreHeaders() },
    );
  }
  if (!existing.data) {
    return NextResponse.json(
      { ok: false, message: 'No se ha encontrado esa operación.' },
      { status: 404, headers: noStoreHeaders() },
    );
  }

  const metadata = isObject(existing.data.metadata) ? { ...existing.data.metadata } : {};
  const domainCase = isObject(metadata.domain_case) ? { ...metadata.domain_case } : null;
  if (domainCase) {
    domainCase.status = domainStatus(parsed.data.status);
    domainCase.updatedAt = new Date().toISOString();
    metadata.domain_case = domainCase;
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from('registration_cases')
    .update({
      status: parsed.data.status,
      is_active: parsed.data.status !== 'archived',
      metadata,
    })
    .eq('id', parsed.data.case_id)
    .eq('user_id', userId)
    .is('deleted_at', null)
    .select('id, status, updated_at')
    .maybeSingle();
  if (error) {
    return NextResponse.json(
      { ok: false, message: 'No se ha podido actualizar el estado comercial.' },
      { status: 503, headers: noStoreHeaders() },
    );
  }
  if (!data) {
    return NextResponse.json(
      { ok: false, message: 'No se ha encontrado esa operación.' },
      { status: 404, headers: noStoreHeaders() },
    );
  }

  return NextResponse.json({ ok: true, data }, { headers: noStoreHeaders() });
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function domainStatus(status: string) {
  if (status === 'assessing' || status === 'collecting-data') return 'assessing';
  if (status === 'review-required' || status === 'blocked') return 'blocked';
  if (status === 'completed' || status === 'registered') return 'registered';
  if (status === 'ready' || status === 'in-progress' || status === 'archived') return status;
  return 'draft';
}

function noStoreHeaders() {
  return { 'Cache-Control': 'no-store, private' };
}
