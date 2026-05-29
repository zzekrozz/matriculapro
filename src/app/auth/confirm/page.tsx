'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';

function ConfirmContent() {
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading');
  const searchParams = useSearchParams();
  const hasError = searchParams.get('error');

  useEffect(() => {
    if (hasError) {
      setStatus('error');
      return;
    }

    // Si llegamos aquí sin error, puede ser que:
    // a) El callback route ya procesó el code y redirigió (caso normal)
    // b) Llegamos con token_hash (flujo email OTP antiguo)
    // En cualquier caso comprobamos si ya hay sesión activa
    const supabase = createSupabaseBrowserClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setStatus('ok');
        setTimeout(() => { window.location.href = '/app/dashboard'; }, 2000);
      } else {
        setStatus('error');
      }
    });
  }, [hasError]);

  return (
    <div className="w-full max-w-[400px] text-center">
      <Link href="/" className="inline-flex items-baseline gap-1.5 mb-8">
        <span className="text-[9.5px] tracking-[0.22em] uppercase text-muted">Ivan Imports ·</span>
        <span className="font-serif italic text-2xl text-ink">Matricula</span>
        <span className="text-[11px] font-semibold text-accent">PRO</span>
      </Link>

      {status === 'loading' && (
        <div className="rounded-[20px] p-8 bg-surface border border-line shadow-soft-md">
          <Loader2 size={32} className="animate-spin text-accent mx-auto mb-3" />
          <p className="text-[14px] text-ink-soft">Verificando tu cuenta…</p>
        </div>
      )}

      {status === 'ok' && (
        <div className="rounded-[20px] p-8 bg-surface border border-ok shadow-soft-md">
          <CheckCircle2 size={36} className="text-ok mx-auto mb-3" />
          <h1 className="font-serif text-[24px] text-ink mb-2">¡Cuenta confirmada!</h1>
          <p className="text-[13px] text-ink-soft">
            Redirigiendo al dashboard en un momento…
          </p>
        </div>
      )}

      {status === 'error' && (
        <div className="rounded-[20px] p-8 bg-surface border border-line shadow-soft-md">
          <XCircle size={36} className="text-danger mx-auto mb-3" />
          <h1 className="font-serif text-[24px] text-ink mb-2">El enlace no es válido</h1>
          <p className="text-[13px] text-ink-soft mb-5">
            El enlace puede haber caducado o ya se usó. Puedes iniciar sesión directamente si ya confirmaste tu cuenta.
          </p>
          <div className="flex flex-col gap-2">
            <Link href="/auth/login"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full text-[13px] font-medium bg-ink text-white hover:scale-[1.01] transition-transform">
              Iniciar sesión
            </Link>
            <Link href="/auth/register"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full text-[13px] bg-bg-deep text-ink-soft hover:bg-line transition-colors">
              Crear cuenta nueva
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ConfirmPage() {
  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <Suspense fallback={
        <div className="rounded-[20px] p-8 bg-surface border border-line">
          <Loader2 size={28} className="animate-spin text-accent mx-auto" />
        </div>
      }>
        <ConfirmContent />
      </Suspense>
    </div>
  );
}
