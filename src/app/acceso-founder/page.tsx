'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Crown, CheckCircle2, ChevronRight, UserPlus, LogIn, Loader2, AlertCircle } from 'lucide-react';

function AccesoFounderContent() {
  const searchParams = useSearchParams();
  const success = searchParams.get('success') === 'true';
  const canceled = searchParams.get('canceled') === 'true';

  if (canceled) {
    return (
      <div className="w-full max-w-[480px]">
        <Logo />
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-[24px] p-5 sm:p-8 bg-surface border border-line shadow-soft-md text-center">
          <AlertCircle size={32} className="text-muted mx-auto mb-3" />
          <h2 className="font-serif text-[24px] text-ink mb-2">Pago cancelado</h2>
          <p className="text-[13px] text-ink-soft mb-6 leading-relaxed">
            No se ha realizado ningún cargo. Puedes intentarlo cuando quieras.
          </p>
          <div className="flex flex-col gap-2">
            <a href="/#precios"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full text-[13.5px] font-medium bg-ink text-white hover:scale-[1.01] transition-transform">
              <Crown size={14} className="text-accent" /> Ver acceso Founder Beta
            </a>
            <Link href="/" className="text-[12px] text-center text-muted hover:text-ink transition-colors mt-1">
              Volver a la página principal
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[560px]">
      <Logo />
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        className="rounded-[24px] overflow-hidden bg-surface border border-line shadow-soft-md">

        {/* Cabecera */}
        <div className="p-5 sm:p-7 lg:p-8 text-center relative overflow-hidden"
             style={{ background: 'linear-gradient(135deg, #0B1F3A 0%, #16335E 100%)', color: '#fff' }}>
          <div className="absolute -top-20 -right-20 w-56 h-56 rounded-full opacity-20 blur-3xl bg-accent pointer-events-none" />
          <div className="relative">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 16 }}
              className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center bg-accent text-ink">
              <CheckCircle2 size={26} />
            </motion.div>
            <div className="text-[10px] tracking-[0.22em] uppercase mb-1 text-accent font-semibold">
              {success ? 'Pago completado' : 'Activa tu acceso Founder'}
            </div>
            <h1 className="font-serif italic leading-[1.05] tracking-tight mb-2"
                style={{ fontSize: 'clamp(20px, 2.8vw, 28px)' }}>
              {success ? 'Pago completado. Ahora activa tu acceso.' : 'Activa tu acceso Founder Beta'}
            </h1>
            <p className="text-[13px] leading-relaxed max-w-[400px] mx-auto"
               style={{ color: 'rgba(255,255,255,0.72)' }}>
              Crea tu cuenta o inicia sesión usando <strong className="text-white">exactamente el mismo email</strong> que usaste en Stripe.
            </p>
          </div>
        </div>

        {/* Pasos */}
        <div className="px-5 sm:px-7 lg:px-8 py-5 border-b border-line bg-bg-deep">
          <div className="text-[10px] tracking-[0.22em] uppercase text-accent-deep mb-3 font-semibold">
            Cómo activar tu acceso
          </div>
          <ol className="space-y-2.5">
            {[
              { n: '1', text: 'Usa el mismo email que pusiste en el formulario de pago de Stripe.' },
              { n: '2', text: 'Crea tu cuenta nueva o inicia sesión si ya tienes una.' },
              { n: '3', text: 'El sistema detecta tu pago y activa el acceso Founder automáticamente.' },
            ].map(item => (
              <li key={item.n} className="flex items-start gap-3 text-[12.5px] text-ink-soft">
                <span className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold bg-accent text-ink mt-0.5">
                  {item.n}
                </span>
                <span>{item.text}</span>
              </li>
            ))}
          </ol>
        </div>

        {/* CTAs */}
        <div className="p-5 sm:p-7 lg:p-8 flex flex-col gap-3">
          <Link href="/auth/register?from=acceso-founder"
            className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full text-[14px] font-medium transition-transform hover:scale-[1.01] bg-ink text-white shadow-soft-md">
            <UserPlus size={15} /> Crear cuenta Founder
          </Link>
          <Link href="/auth/login"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full text-[13.5px] bg-bg-deep text-ink-soft hover:bg-line transition-colors border border-line">
            <LogIn size={14} /> Ya tengo cuenta · Iniciar sesión
          </Link>
          <p className="text-center text-[11px] text-muted leading-relaxed pt-1">
            Si ya iniciaste sesión y no ves el badge Founder, espera un momento y recarga la página.
          </p>
        </div>
      </motion.div>

      <p className="text-center mt-5 text-[11px] text-muted">
        <Link href="/" className="hover:underline">Volver a la web</Link>
        {' · '}
        <Link href="/app/dashboard" className="hover:underline">Ir al dashboard</Link>
      </p>
    </div>
  );
}

function Logo() {
  return (
    <div className="text-center mb-8">
      <Link href="/" className="inline-flex items-baseline gap-1.5">
        <span className="text-[9.5px] tracking-[0.22em] uppercase text-muted">Ivan Imports ·</span>
        <span className="font-serif italic text-2xl text-ink">Matricula</span>
        <span className="text-[11px] font-semibold text-accent">PRO</span>
      </Link>
    </div>
  );
}

export default function AccesoFounderPage() {
  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4 py-6 sm:py-10">
      <Suspense fallback={
        <div className="flex items-center gap-3 text-muted text-[13px]">
          <Loader2 size={18} className="animate-spin text-accent" /> Cargando…
        </div>
      }>
        <AccesoFounderContent />
      </Suspense>
    </div>
  );
}
