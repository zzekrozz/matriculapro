'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { LoginForm } from '@/components/auth/LoginForm';

function LoginContent() {
  const searchParams = useSearchParams();
  const next = searchParams.get('next') ?? '/app/dashboard';

  return (
    <div className="w-full max-w-[440px]">
      <div className="text-center mb-8">
        <Link href="/" className="inline-flex items-baseline gap-1.5">
          <span className="text-[9.5px] tracking-[0.22em] uppercase text-muted">Ivan Imports ·</span>
          <span className="font-serif italic text-2xl text-ink">Matricula</span>
          <span className="text-[11px] font-semibold text-accent">PRO</span>
        </Link>
      </div>

      <div className="rounded-[20px] p-7 lg:p-8 bg-surface border border-line shadow-soft-md">
        <h1 className="font-serif text-ink leading-[1.1] tracking-tight mb-1" style={{ fontSize: 28 }}>
          Bienvenido de vuelta.
        </h1>
        <p className="text-[13px] text-ink-soft mb-6">
          Entra con tu cuenta para acceder a MatriculaPRO.
        </p>
        <LoginForm nextUrl={next} />
      </div>

      <p className="text-center mt-5 text-[11.5px] text-muted leading-relaxed">
        ¿Sin acceso todavía?{' '}
        <Link href="/#precios" className="text-accent-deep hover:underline">
          Acceso Founder Beta · 49 €
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <Suspense fallback={<div className="text-muted text-[13px]">Cargando…</div>}>
        <LoginContent />
      </Suspense>
    </div>
  );
}
