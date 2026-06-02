import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

/**
 * /entrar?modo=explorer|founder
 *
 * Solo activa modo demo cuando no existe una sesión real.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const modo = searchParams.get('modo') ?? 'explorer';
  const next = searchParams.get('next') ?? '/app/dashboard';

  const sessionProbe = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            sessionProbe.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      return NextResponse.redirect(new URL('/app/dashboard', origin));
    }
  } catch {
    // Si Supabase falla, continuar con el flujo demo sin bloquear.
  }

  const isProd = process.env.NODE_ENV === 'production';
  const level = isProd && modo !== 'explorer' ? 'explorer' : modo;
  const destination = next.startsWith('/') ? `${origin}${next}` : next;
  const response = NextResponse.redirect(destination);

  response.cookies.set('mpro:access-level', level, {
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
    sameSite: 'lax',
    httpOnly: false,
  });

  return response;
}
