import { NextResponse, type NextRequest } from 'next/server';

/**
 * /entrar?modo=explorer|founder
 *
 * Escribe la cookie mpro:access-level y redirige al dashboard.
 * No requiere cuenta ni Supabase — es el modo mock/local.
 *
 * Uso:
 *   href="/entrar?modo=explorer"   → entra como explorador sin cuenta
 *   href="/entrar?modo=founder"    → activa founder mock (solo dev)
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const modo = searchParams.get('modo') ?? 'explorer';
  const next = searchParams.get('next') ?? '/app/dashboard';

  // Validar nivel — nunca se puede auto-asignar founder en producción
  const isProd = process.env.NODE_ENV === 'production';
  const level = isProd && modo !== 'explorer' ? 'explorer' : modo;

  const destination = next.startsWith('/') ? `${origin}${next}` : next;
  const response = NextResponse.redirect(destination);

  // Cookie de 30 días — misma key que localStorage para coherencia
  response.cookies.set('mpro:access-level', level, {
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
    sameSite: 'lax',
    httpOnly: false, // debe ser legible desde JS (AccessProvider)
  });

  return response;
}
