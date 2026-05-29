'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Sparkles, ShieldCheck, Heart, Mail,
  CheckCircle2, ChevronRight, FlaskConical, Crown
} from 'lucide-react';
import { useAccess, formatFounderNumber } from '@/providers/AccessProvider';

interface FounderUpgradeModalProps {
  open: boolean;
  onClose: () => void;
}

type Phase = 'pitch' | 'mock-payment' | 'welcome';

export function FounderUpgradeModal({ open, onClose }: FounderUpgradeModalProps) {
  const [phase, setPhase] = useState<Phase>('pitch');
  const [aliasInput, setAliasInput] = useState('');
  const [assignedNumber, setAssignedNumber] = useState<number | null>(null);
  const { activateFounder } = useAccess();

  const handleActivate = () => {
    setPhase('mock-payment');
    // Simulamos un pequeño delay como si fuera el flujo real de Stripe
    setTimeout(() => {
      const num = activateFounder({ alias: aliasInput.trim() || undefined });
      setAssignedNumber(num);
      setPhase('welcome');
    }, 1200);
  };

  const handleClose = () => {
    onClose();
    // Reset al cerrar para que se vuelva a abrir en pitch la próxima vez
    setTimeout(() => {
      setPhase('pitch');
      setAliasInput('');
      setAssignedNumber(null);
    }, 300);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[70] flex items-center justify-center p-4 overflow-y-auto"
          style={{ background: 'rgba(11, 31, 58, 0.7)', backdropFilter: 'blur(6px)' }}
          onClick={phase === 'pitch' ? handleClose : undefined}>

          <motion.div
            initial={{ scale: 0.94, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.96, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            onClick={e => e.stopPropagation()}
            className="bg-surface rounded-[24px] max-w-[640px] w-full max-h-[90vh] overflow-y-auto shadow-soft-xl border border-line relative">

            {/* Banner DEV — siempre visible para dejar claro que es mock */}
            <div className="px-5 py-2 flex items-center justify-between gap-2 bg-accent-soft border-b border-accent">
              <div className="flex items-center gap-1.5 text-[10.5px] tracking-[0.15em] uppercase font-semibold text-accent-deep">
                <FlaskConical size={11} />
                Flujo simulado · No es pago real todavía
              </div>
              {phase === 'pitch' && (
                <button onClick={handleClose} aria-label="Cerrar"
                  className="w-7 h-7 rounded-full flex items-center justify-center text-accent-deep hover:bg-accent/20 transition-colors">
                  <X size={13} />
                </button>
              )}
            </div>

            <AnimatePresence mode="wait">
              {phase === 'pitch' && (
                <motion.div key="pitch"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="p-7 lg:p-9">

                  <div className="flex items-center gap-1.5 mb-3">
                    <Crown size={13} className="text-accent" />
                    <span className="text-[10.5px] tracking-[0.22em] uppercase font-semibold text-accent-deep">
                      Acceso Fundador Beta
                    </span>
                  </div>

                  <h2 className="font-serif text-ink leading-[1.05] tracking-tight mb-3" style={{ fontSize: 'clamp(28px, 3.4vw, 38px)' }}>
                    Entras <span className="italic text-accent">temprano</span> y mantienes el acceso aunque MatriculaPRO suba a 199 €.
                  </h2>

                  <p className="text-[14px] leading-relaxed text-ink-soft mb-5">
                    MatriculaPRO está en beta. Algunas piezas ya funcionan, otras están en desarrollo y otras se están puliendo con feedback real. Los fundadores que entran ahora <strong className="text-ink">conservan el acceso de por vida</strong> a todo lo que se construya después.
                  </p>

                  {/* Precio */}
                  <div className="rounded-2xl p-5 mb-5 bg-bg-deep border border-line">
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="font-serif text-ink leading-none" style={{ fontSize: 52 }}>49</span>
                      <span className="text-accent text-[22px]">€</span>
                      <span className="text-[12px] text-muted ml-2">pago único · acceso de por vida</span>
                    </div>
                    <p className="text-[12.5px] leading-relaxed text-ink-soft italic">
                      49 € no porque valga poco, sino porque estás entrando antes.
                    </p>
                  </div>

                  {/* Beneficios */}
                  <ul className="space-y-2.5 mb-6">
                    {[
                      { icon: Sparkles, text: 'Acceso Founder a todo lo disponible en la beta: ruta, simulador 576, ficha técnica 3D, recorrido ITV, checklists, casos prácticos, biblioteca, plantillas.' },
                      { icon: ShieldCheck, text: 'Acceso de por vida, también a futuras versiones (89 €, 129 €, 199 € — siempre incluido sin pagar más).' },
                      { icon: Crown, text: 'Tu número de Fundador correlativo y un sitio en el Garaje Fundador.' },
                      { icon: Heart, text: 'Leeré personalmente tu feedback durante la beta para priorizar mejoras reales.' },
                    ].map(({ icon: Icon, text }, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-[13px] leading-relaxed text-ink-soft">
                        <Icon size={14} className="shrink-0 mt-0.5 text-accent" />
                        <span>{text}</span>
                      </li>
                    ))}
                  </ul>

                  {/* Alias opcional */}
                  <div className="mb-5">
                    <label className="block text-[10.5px] tracking-[0.18em] uppercase text-muted mb-1.5">
                      Alias para el Garaje Fundador (opcional)
                    </label>
                    <input
                      value={aliasInput}
                      onChange={e => setAliasInput(e.target.value)}
                      placeholder="ej: Iván desde Almería"
                      maxLength={32}
                      className="w-full px-3 py-2.5 rounded-lg text-[13px] outline-none bg-surface border border-line focus:border-ink transition-colors" />
                    <p className="text-[10.5px] mt-1 text-muted">
                      Puedes elegir más tarde aparecer con nombre, iniciales, alias o anónimo.
                    </p>
                  </div>

                  {/* CTA */}
                  <button onClick={handleActivate}
                    className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full text-[14px] font-medium transition-transform hover:scale-[1.01] bg-ink text-white shadow-soft-md">
                    Entrar como Founder por 49 € <ChevronRight size={14} />
                  </button>
                  <p className="mt-3 text-center text-[10.5px] text-muted">
                    Más adelante este botón disparará el pago real. Hoy simula el flujo para que puedas probar la UX completa.
                  </p>
                </motion.div>
              )}

              {phase === 'mock-payment' && (
                <motion.div key="mock-payment"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="p-10 text-center">
                  <div className="w-14 h-14 rounded-full mx-auto mb-4 bg-bg-deep flex items-center justify-center">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      className="w-7 h-7 rounded-full border-2 border-line border-t-accent" />
                  </div>
                  <h3 className="font-serif text-ink text-[22px] leading-[1.1] mb-1">Activando tu acceso…</h3>
                  <p className="text-[12.5px] text-muted">Simulación. En producción aquí va Stripe Checkout.</p>
                </motion.div>
              )}

              {phase === 'welcome' && assignedNumber !== null && (
                <motion.div key="welcome"
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="p-7 lg:p-9 text-center">

                  {/* Crown grande con halo */}
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

                  <h2 className="font-serif text-ink leading-[1.05] tracking-tight mb-2" style={{ fontSize: 'clamp(28px, 3.4vw, 38px)' }}>
                    Eres <span className="italic text-accent">Founder {formatFounderNumber(assignedNumber)}</span>
                  </h2>

                  <p className="text-[14px] leading-relaxed text-ink-soft mb-6 max-w-[440px] mx-auto">
                    Tu sitio en el Garaje Fundador está reservado. A partir de ahora puedes practicar, guardar progreso y usar todas las herramientas.
                  </p>

                  {/* Resumen lo que se desbloquea */}
                  <div className="rounded-2xl p-5 mb-6 bg-bg-deep border border-line text-left">
                    <div className="text-[10.5px] tracking-[0.22em] uppercase text-accent-deep mb-2">Lo que se desbloquea</div>
                    <ul className="space-y-1.5">
                      {[
                        'Marcar pasos de la ruta como completados',
                        'Simulador 576, ficha técnica 3D, recorrido ITV completo',
                        'Casos prácticos, checklists, biblioteca y plantillas',
                        'Progreso guardado, badge Founder en sidebar',
                      ].map((t, i) => (
                        <li key={i} className="flex items-start gap-2 text-[12.5px] text-ink-soft leading-relaxed">
                          <CheckCircle2 size={11} className="shrink-0 mt-0.5 text-accent" />
                          <span>{t}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <button onClick={handleClose}
                    className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full text-[14px] font-medium transition-transform hover:scale-[1.01] bg-ink text-white shadow-soft-md">
                    Empezar a usar MatriculaPRO <ChevronRight size={14} />
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

/** Hook helper para controlar el modal desde cualquier lugar */
export function useFounderUpgrade() {
  return {
    open: false, // gestionado externamente
  };
}
