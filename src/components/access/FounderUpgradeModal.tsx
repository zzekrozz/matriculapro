'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Sparkles, ShieldCheck, Heart, Mail,
  CheckCircle2, ChevronRight, FlaskConical, Crown
} from 'lucide-react';
import { useAccess, formatFounderNumber } from '@/providers/AccessProvider';
import { STRIPE_FOUNDERS_URL } from '@/lib/env';

/**
 * Modal Founder Beta.
 *
 * FLUJO EN PRODUCCIÓN:
 *   pitch → pulsar CTA → redirige a Stripe Payment Link → Stripe procesa pago
 *   → webhook activa founder en Supabase → usuario vuelve a /founder/bienvenida
 *   → crea cuenta con mismo email → sistema detecta founder_number asignado
 *
 * FLUJO EN DESARROLLO (NODE_ENV !== 'production'):
 *   pitch → spinner mock → pantalla de bienvenida mock
 *   (útil para probar la UX sin pagar)
 *
 * NO hay fase de auth antes del pago — el usuario paga primero, luego se registra.
 */
type Phase = 'pitch' | 'payment' | 'welcome';

interface FounderUpgradeModalProps {
  open: boolean;
  onClose: () => void;
}

export function FounderUpgradeModal({ open, onClose }: FounderUpgradeModalProps) {
  const router = useRouter();
  const { activateFounder, founderNumber: existingNumber } = useAccess();

  const [phase, setPhase] = useState<Phase>('pitch');
  const [aliasInput, setAliasInput] = useState('');
  const [assignedNumber, setAssignedNumber] = useState<number | null>(null);

  const reset = () => {
    setTimeout(() => {
      setPhase('pitch');
      setAliasInput('');
      setAssignedNumber(null);
    }, 300);
  };

  /** Ir al dashboard — siempre /app/dashboard, nunca a la landing */
  const goToDashboard = () => {
    onClose();
    reset();
    router.push('/app/dashboard');
  };

  const handleDismiss = () => {
    if (phase === 'payment') return; // no cerrar mientras simula pago
    onClose();
    reset();
  };

  /** CTA principal: en prod → Stripe; en dev → mock */
  const handleBuy = () => {
    if (process.env.NODE_ENV === 'production') {
      // Redirigir directamente a Stripe — sin pedir login antes
      // Stripe redirige de vuelta a /founder/bienvenida tras el pago
      window.location.href = STRIPE_FOUNDERS_URL;
      return;
    }
    // Desarrollo: flujo mock para probar la UX
    setPhase('payment');
    setTimeout(() => {
      const num = activateFounder({ alias: aliasInput.trim() || undefined });
      setAssignedNumber(num);
      setPhase('welcome');
    }, 1200);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[70] flex items-center justify-center p-4 overflow-y-auto"
          style={{ background: 'rgba(11, 31, 58, 0.7)', backdropFilter: 'blur(6px)' }}
          onClick={handleDismiss}>

          <motion.div
            initial={{ scale: 0.94, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.96, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            onClick={e => e.stopPropagation()}
            className="bg-surface rounded-[24px] max-w-[640px] w-full max-h-[90vh] overflow-y-auto shadow-soft-xl border border-line relative">

            {/* Banner DEV */}
            {process.env.NODE_ENV !== 'production' && (
              <div className="px-5 py-2 flex items-center justify-between gap-2 bg-accent-soft border-b border-accent">
                <div className="flex items-center gap-1.5 text-[10.5px] tracking-[0.15em] uppercase font-semibold text-accent-deep">
                  <FlaskConical size={11} /> Dev mode · flujo simulado
                </div>
                {phase !== 'payment' && (
                  <button onClick={handleDismiss} aria-label="Cerrar"
                    className="w-7 h-7 rounded-full flex items-center justify-center text-accent-deep hover:bg-accent/20">
                    <X size={13} />
                  </button>
                )}
              </div>
            )}

            {/* Botón cerrar en producción */}
            {process.env.NODE_ENV === 'production' && phase !== 'payment' && (
              <button onClick={handleDismiss} aria-label="Cerrar"
                className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full flex items-center justify-center text-muted hover:bg-bg-deep">
                <X size={14} />
              </button>
            )}

            <AnimatePresence mode="wait">
              {/* ── PITCH ── */}
              {phase === 'pitch' && (
                <motion.div key="pitch"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="p-7 lg:p-9">

                  <div className="flex items-center gap-1.5 mb-3">
                    <Crown size={13} className="text-accent" />
                    <span className="text-[10.5px] tracking-[0.22em] uppercase font-semibold text-accent-deep">
                      Acceso Fundador Beta · 49 €
                    </span>
                  </div>

                  <h2 className="font-serif text-ink leading-[1.05] tracking-tight mb-3"
                      style={{ fontSize: 'clamp(26px, 3.2vw, 36px)' }}>
                    Entras <span className="italic text-accent">temprano</span> y mantienes el acceso aunque MatriculaPRO suba a 199 €.
                  </h2>

                  <p className="text-[14px] leading-relaxed text-ink-soft mb-5">
                    MatriculaPRO está en beta. Los fundadores que entran ahora conservan el{' '}
                    <strong className="text-ink">acceso de por vida</strong> a todo lo que se construya después.
                  </p>

                  {/* Precio */}
                  <div className="rounded-2xl p-5 mb-5 bg-bg-deep border border-line">
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="font-serif text-ink leading-none" style={{ fontSize: 52 }}>49</span>
                      <span className="text-accent text-[22px]">€</span>
                      <span className="text-[12px] text-muted ml-2">pago único · acceso de por vida</span>
                    </div>
                    <p className="text-[12.5px] text-ink-soft italic">
                      49 € no porque valga poco, sino porque estás entrando antes.
                    </p>
                  </div>

                  {/* Beneficios */}
                  <ul className="space-y-2.5 mb-6">
                    {[
                      { icon: Sparkles,    text: 'Acceso completo: ruta, simulador 576, ficha técnica 3D, recorrido ITV, checklists, casos prácticos, biblioteca, plantillas.' },
                      { icon: ShieldCheck, text: 'Acceso de por vida. Si el precio sube a 89 €, 129 € o 199 €, tú ya estás dentro.' },
                      { icon: Crown,       text: 'Tu número Founder correlativo y tu sitio en el Garaje Fundador.' },
                      { icon: Heart,       text: 'Leeré personalmente tu feedback durante la beta.' },
                    ].map(({ icon: Icon, text }, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-[13px] leading-relaxed text-ink-soft">
                        <Icon size={14} className="shrink-0 mt-0.5 text-accent" />
                        <span>{text}</span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA de compra — directo a Stripe sin pedir login */}
                  <button onClick={handleBuy}
                    className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full text-[14px] font-medium transition-transform hover:scale-[1.01] bg-ink text-white shadow-soft-md">
                    <Crown size={14} className="text-accent" />
                    {process.env.NODE_ENV === 'production'
                      ? 'Pagar con Stripe · 49 €'
                      : 'Entrar como Founder · 49 €'}{' '}
                    <ChevronRight size={14} />
                  </button>

                  <p className="mt-3 text-center text-[11px] text-muted leading-relaxed">
                    {process.env.NODE_ENV === 'production'
                      ? 'Pago seguro con Stripe · Crea tu cuenta después con el mismo email'
                      : 'Modo dev — simula el flujo sin pago real'}
                  </p>
                </motion.div>
              )}

              {/* ── PAYMENT (solo dev) ── */}
              {phase === 'payment' && (
                <motion.div key="payment"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="p-10 text-center">
                  <div className="w-14 h-14 rounded-full mx-auto mb-4 bg-bg-deep flex items-center justify-center">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      className="w-7 h-7 rounded-full border-2 border-line border-t-accent" />
                  </div>
                  <h3 className="font-serif text-ink text-[22px] leading-[1.1] mb-1">Activando acceso…</h3>
                  <p className="text-[12.5px] text-muted">Simulación dev.</p>
                </motion.div>
              )}

              {/* ── WELCOME (solo dev) ── */}
              {phase === 'welcome' && (
                <motion.div key="welcome"
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  className="p-7 lg:p-9 text-center">

                  <div className="relative w-24 h-24 mx-auto mb-5">
                    <motion.div
                      initial={{ scale: 0 }} animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 200, damping: 14 }}
                      className="w-24 h-24 rounded-2xl flex items-center justify-center bg-accent text-ink">
                      <Crown size={36} />
                    </motion.div>
                    <div className="absolute inset-0 rounded-2xl bg-accent opacity-30 blur-xl -z-10" />
                  </div>

                  <div className="text-[10.5px] tracking-[0.22em] uppercase font-semibold text-accent-deep mb-2">
                    Bienvenido a MatriculaPRO
                  </div>
                  <h2 className="font-serif text-ink leading-[1.05] tracking-tight mb-2"
                      style={{ fontSize: 'clamp(26px, 3.2vw, 36px)' }}>
                    Eres{' '}
                    <span className="italic text-accent">
                      Founder {formatFounderNumber(assignedNumber ?? existingNumber ?? 2)}
                    </span>
                  </h2>
                  <p className="text-[14px] leading-relaxed text-ink-soft mb-6 max-w-[440px] mx-auto">
                    Acceso activo. Puedes practicar, guardar progreso y usar todas las herramientas.
                  </p>

                  <div className="rounded-2xl p-5 mb-6 bg-bg-deep border border-line text-left">
                    <div className="text-[10.5px] tracking-[0.22em] uppercase text-accent-deep mb-2">
                      Lo que se desbloquea
                    </div>
                    <ul className="space-y-1.5">
                      {[
                        'Marcar pasos de la ruta como completados',
                        'Simulador 576, ficha técnica 3D, recorrido ITV completo',
                        'Casos prácticos, checklists, biblioteca y plantillas',
                        'Progreso guardado · Badge Founder en sidebar',
                      ].map((t, i) => (
                        <li key={i} className="flex items-start gap-2 text-[12.5px] text-ink-soft">
                          <CheckCircle2 size={11} className="shrink-0 mt-0.5 text-accent" />
                          <span>{t}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* SIEMPRE al dashboard, nunca a la landing */}
                  <button onClick={goToDashboard}
                    className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full text-[14px] font-medium transition-transform hover:scale-[1.01] bg-ink text-white shadow-soft-md">
                    Ir al dashboard <ChevronRight size={14} />
                  </button>

                  <p className="mt-4 text-[10.5px] text-muted flex items-center justify-center gap-1">
                    <Mail size={10} /> Leeré personalmente tu feedback durante la beta.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
