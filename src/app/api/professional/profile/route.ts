import { NextResponse } from 'next/server';
import { ProfessionalProfileMutationSchema } from '@/domain/professional/contracts';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { requireServerCapability } from '@/server/access';
import { rateLimitedResponse } from '@/server/security/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function PUT(request: Request) {
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
    `professional:profile:write:${userId}`,
    { limit: 30, windowSeconds: 3_600 },
  );
  if (limited) return limited;

  const parsed = ProfessionalProfileMutationSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: 'Revisa los datos profesionales. El logotipo debe ser una URL HTTPS.' },
      { status: 400, headers: noStoreHeaders() },
    );
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from('professional_profiles')
    .upsert({ user_id: userId, ...parsed.data }, { onConflict: 'user_id' })
    .select('business_display_name, tax_identifier, business_address, contact_email, contact_phone, logo_url, report_footer')
    .single();
  if (error) {
    return NextResponse.json(
      { ok: false, message: 'No se ha podido guardar el perfil profesional.' },
      { status: 503, headers: noStoreHeaders() },
    );
  }

  return NextResponse.json({ ok: true, data }, { headers: noStoreHeaders() });
}

function noStoreHeaders() {
  return { 'Cache-Control': 'no-store, private' };
}
