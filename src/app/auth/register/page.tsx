'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { RegisterForm } from '@/components/auth/RegisterForm';
import { Loader2 } from 'lucide-react';

function RegisterContent() {
  const searchParams = useSearchParams();
  const isFounderContext =
    searchParams.get('founder') === '1' ||
    searchParams.get('from') === 'acceso-founder';

  return (
    <div className="w-full max-w-[460px]">
      <div className="text-center mb-6 sm:mb-8">
        <Link href="/" className="inline-flex items-baseline gap-1.5">
          <span className="text-[9.5px] tracking-[0.22em] uppercase text-muted">Ivan Imports ·</span>
          <span className="font-serif italic text-2xl text-ink">Matricula</span>
          <span className="text-[11px] font-semibold text-accent">PRO</span>
        </Link>
      </div>

      <div className="rounded-[20px] p-5 sm:p-7 lg:p-8 bg-surface border border-line shadow-soft-md">
        {isFounderContext ? (
          <>
            <h1 className="font-serif text-ink leading-[1.1] tracking-tight mb-1" style={{ fontSize: 28 }}>
              Crea tu cuenta Founder.
            </h1>
            <p className="text-[13px] text-ink-soft mb-6">
              Usa el mismo email con el que pagaste en Stripe. El acceso Founder se activa automáticamente.
            </p>
          </>
        ) : (
          <>
            <h1 className="font-serif text-ink leading-[1.1] tracking-tight mb-1" style={{ fontSize: 28 }}>
              Crea tu acceso.
            </h1>
            <p className="text-[13px] text-ink-soft mb-6">
              Explora MatriculaPRO en modo demo.{' '}
              <Link href="/#precios" className="text-accent-deep hover:underline">Acceso Founder · 49 €</Link>{' '}
              para acceso completo.
            </p>
          </>
        )}
        <RegisterForm isFounderContext={isFounderContext} />
      </div>

      <p className="text-center mt-4 sm:mt-5 text-[11.5px] text-muted leading-relaxed px-2">
        {isFounderContext ? (
          <>
            ¿Ya tienes cuenta?{' '}
            <Link href="/auth/login" className="text-accent-deep hover:underline">Iniciar sesión</Link>
          </>
        ) : (
          <>
            Al registrarte aceptas el{' '}
            <Link href="/legal/aviso-formativo" className="hover:underline">aviso formativo</Link>.
          </>
        )}
      </p>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4 py-6 sm:py-10">
      <Suspense fallback={
        <div className="flex items-center gap-2 text-muted text-[13px]">
          <Loader2 size={16} className="animate-spin" /> Cargando…
        </div>
      }>
        <RegisterContent />
      </Suspense>
    </div>
  );
}
