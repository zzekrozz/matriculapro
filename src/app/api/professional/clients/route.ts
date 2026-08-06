import { NextResponse } from 'next/server';
import {
  ProfessionalClientCreateSchema,
  ProfessionalClientUpdateSchema,
} from '@/domain/professional/contracts';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { requireServerCapability } from '@/server/access';
import { rateLimitedResponse } from '@/server/security/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CLIENT_SELECT = 'id, reference, display_name, email, phone, tax_identifier, address, notes, status, created_at, updated_at';

export async function POST(request: Request) {
  let userId: string;
  try {
    userId = (await requireServerCapability('use_professional_tools')).userId;
  } catch {
    return professionalOnly();
  }

  const limited = await rateLimitedResponse(
    request,
    `professional:clients:create:${userId}`,
    { limit: 40, windowSeconds: 3_600 },
  );
  if (limited) return limited;

  const parsed = ProfessionalClientCreateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return invalidClient();

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from('professional_clients')
    .insert({ user_id: userId, ...parsed.data })
    .select(CLIENT_SELECT)
    .single();
  if (error) return persistenceError(error.code);

  return NextResponse.json({ ok: true, data }, { status: 201, headers: noStoreHeaders() });
}

export async function PATCH(request: Request) {
  let userId: string;
  try {
    userId = (await requireServerCapability('use_professional_tools')).userId;
  } catch {
    return professionalOnly();
  }

  const limited = await rateLimitedResponse(
    request,
    `professional:clients:update:${userId}`,
    { limit: 80, windowSeconds: 3_600 },
  );
  if (limited) return limited;

  const parsed = ProfessionalClientUpdateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return invalidClient();
  const { id, ...changes } = parsed.data;

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from('professional_clients')
    .update(changes)
    .eq('id', id)
    .eq('user_id', userId)
    .is('deleted_at', null)
    .select(CLIENT_SELECT)
    .maybeSingle();
  if (error) return persistenceError(error.code);
  if (!data) {
    return NextResponse.json(
      { ok: false, message: 'No se ha encontrado ese cliente.' },
      { status: 404, headers: noStoreHeaders() },
    );
  }

  return NextResponse.json({ ok: true, data }, { headers: noStoreHeaders() });
}

function invalidClient() {
  return NextResponse.json(
    { ok: false, message: 'Revisa la ficha del cliente.' },
    { status: 400, headers: noStoreHeaders() },
  );
}

function professionalOnly() {
  return NextResponse.json(
    { ok: false, message: 'Necesitas una licencia Profesional activa.' },
    { status: 403, headers: noStoreHeaders() },
  );
}

function persistenceError(code?: string) {
  const conflict = code === '23505';
  return NextResponse.json(
    {
      ok: false,
      message: conflict
        ? 'Ya existe un cliente con esa referencia.'
        : 'No se ha podido guardar la ficha del cliente.',
    },
    { status: conflict ? 409 : 503, headers: noStoreHeaders() },
  );
}

function noStoreHeaders() {
  return { 'Cache-Control': 'no-store, private' };
}
