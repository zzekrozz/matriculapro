'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Crown, Play, ChevronRight, CheckCircle2 } from 'lucide-react';

/**
 * /acceso — Pantalla de acceso para visitors sin sesión que intentan entrar a /app.
 * El middleware redirige aquí en lugar de ir directo al login.
 */
export default function AccesoPage() {
  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <div className="w-full max-w-[580px]">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10">
          <Link href="/" className="inline-flex items-baseline gap-1.5">
            <span className="text-[9.5px] tracking-[0.22em] uppercase text-muted">Ivan Imports ·</span>
            <span className="font-serif italic text-3xl text-ink">Matricula</span>
            <span className="text-[12px] font-semibold text-accent">PRO</span>
          </Link>
          <p className="mt-2 text-[12px] text-muted">
            Plataforma interactiva para matricular coches importados en España
          </p>
        </motion.div>

        {/* Card principal */}
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="rounded-[24px] overflow-hidden bg-surface border border-line shadow-soft-md">

          {/* Cabecera */}
          <div className="p-7 lg:p-8 border-b border-line">
            <h1 className="font-serif text-ink leading-[1.05] tracking-tight mb-2" style={{ fontSize: 'clamp(26px, 3.4vw, 36px)' }}>
              Crea tu acceso gratis para explorar MatriculaPRO.
            </h1>
            <p className="text-[13.5px] text-ink-soft leading-relaxed">
              Regístrate en segundos y accede al dashboard, la ruta de matriculación y la demo interactiva.
            </p>
          </div>

          {/* Beneficios del registro gratis */}
          <div className="px-7 lg:px-8 py-5 border-b border-line bg-bg-deep">
            <div className="text-[10px] tracking-[0.22em] uppercase text-accent-deep mb-3">Con acceso Explorador gratuito</div>
            <ul className="space-y-2">
              {[
                'Dashboard con tu progreso y módulos del curso',
                'Ruta de matriculación en modo lectura (9 pasos)',
                'Mapa visual de las 3 fases del proceso',
                'Demo interactiva del Recorrido ITV',
              ].map((b, i) => (
                <li key={i} className="flex items-start gap-2 text-[12.5px] text-ink-soft">
                  <CheckCircle2 size={13} className="shrink-0 mt-0.5 text-accent" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Acciones */}
          <div className="p-7 lg:p-8 flex flex-col gap-3">
            <Link href="/auth/register"
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full text-[14px] font-medium transition-transform hover:scale-[1.01] bg-ink text-white shadow-soft-md">
              Crear acceso gratis <ChevronRight size={14} />
            </Link>

            <Link href="/auth/login"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full text-[13px] bg-bg-deep text-ink-soft hover:bg-line transition-colors border border-line">
              Ya tengo cuenta · Entrar
            </Link>

            <div className="flex items-center gap-3 my-1">
              <div className="flex-1 h-px bg-line" />
              <span className="text-[11px] text-muted">o</span>
              <div className="flex-1 h-px bg-line" />
            </div>

            <a href="/#precios"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full text-[13px] transition-colors border"
              style={{ borderColor: 'rgba(200,134,46,0.4)', color: 'var(--color-accent-deep)', background: 'rgba(200,134,46,0.06)' }}>
              <Crown size={13} /> Acceso Founder Beta · 49 €
            </a>

            <Link href="/demo"
              className="text-center text-[12px] text-muted hover:text-ink transition-colors flex items-center justify-center gap-1.5 mt-1">
              <Play size={11} /> Probar la demo sin cuenta
            </Link>
          </div>
        </motion.div>

        <p className="text-center mt-5 text-[11px] text-muted leading-relaxed">
          Sin spam ni sorpresas. Cuenta gratuita siempre disponible.{' '}
          <Link href="/legal/aviso-formativo" className="hover:underline">Aviso formativo.</Link>
        </p>
      </div>
    </div>
  );
}
