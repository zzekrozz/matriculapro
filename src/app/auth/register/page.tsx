'use client';

import Link from 'next/link';
import { RegisterForm } from '@/components/auth/RegisterForm';

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
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
            Crea tu acceso.
          </h1>
          <p className="text-[13px] text-ink-soft mb-6">
            Es gratis. Entras como Explorador y puedes activar el acceso Founder cuando quieras.
          </p>
          <RegisterForm />
        </div>

        <p className="text-center mt-5 text-[11.5px] text-muted leading-relaxed">
          Al registrarte aceptas el{' '}
          <Link href="/legal/aviso-formativo" className="hover:underline">aviso formativo</Link>.
          MatriculaPRO está en <strong>fase beta</strong>.
        </p>
      </div>
    </div>
  );
}
