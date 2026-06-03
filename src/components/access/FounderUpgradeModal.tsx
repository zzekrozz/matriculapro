'use client';

import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, ShieldCheck, Heart, Crown, ChevronRight, FlaskConical } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';

interface FounderUpgradeModalProps {
  open: boolean;
  onClose: () => void;
}

export function FounderUpgradeModal({ open, onClose }: FounderUpgradeModalProps) {
  const { user } = useAuth();

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[70] flex items-center justify-center p-4 overflow-y-auto"
          style={{ background: 'rgba(11, 31, 58, 0.7)', backdropFilter: 'blur(6px)' }}
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.94, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.96, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
            className="bg-surface rounded-[24px] max-w-[640px] w-full shadow-soft-xl border border-line relative overflow-hidden"
          >
            {process.env.NODE_ENV !== 'production' && (
              <div className="px-5 py-2 flex items-center justify-between gap-2 bg-accent-soft border-b border-accent">
                <div className="flex items-center gap-1.5 text-[10.5px] tracking-[0.15em] uppercase font-semibold text-accent-deep">
                  <FlaskConical size={11} /> Dev mode · modal informativo
                </div>
              </div>
            )}

            <button
              onClick={onClose}
              aria-label="Cerrar"
              className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full flex items-center justify-center text-muted hover:bg-bg-deep"
            >
              <X size={14} />
            </button>

            <div className="p-7 lg:p-9">
              <div className="flex items-center gap-1.5 mb-3">
                <Crown size={13} className="text-accent" />
                <span className="text-[10.5px] tracking-[0.22em] uppercase font-semibold text-accent-deep">
                  Acceso Founder Alpha · 49 €
                </span>
              </div>

              <h2
                className="font-serif text-ink leading-[1.05] tracking-tight mb-3"
                style={{ fontSize: 'clamp(26px, 3.2vw, 36px)' }}
              >
                Entra antes y sigue la evolución de MatriculaPRO desde dentro.
              </h2>

              <p className="text-[14px] leading-relaxed text-ink-soft mb-5">
                MatriculaPRO está en fase Alpha. Los primeros usuarios entran antes, acceden a los módulos actuales y reciben las mejoras futuras mientras el producto evoluciona.
              </p>

              <div className="rounded-2xl p-5 mb-5 bg-bg-deep border border-line">
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="font-serif text-ink leading-none" style={{ fontSize: 52 }}>49</span>
                  <span className="text-accent text-[22px]">€</span>
                  <span className="text-[12px] text-muted ml-2">pago único · actualizaciones incluidas</span>
                </div>
                <p className="text-[12.5px] text-ink-soft italic">
                  Entras ahora con precio Alpha y mantienes tu acceso mientras la plataforma sigue creciendo.
                </p>
              </div>

              <p className="text-[12.5px] text-ink-soft mb-5 max-w-[500px]">
                Este módulo forma parte del acceso Founder. Revisa primero la sección de precios o inicia sesión si ya tienes cuenta.
              </p>

              <ul className="space-y-2.5 mb-6">
                {[
                  { icon: Sparkles, text: 'Acceso completo a la ruta, simulador 576, ficha técnica 3D, recorrido ITV, checklists, casos prácticos, biblioteca y plantillas.' },
                  { icon: ShieldCheck, text: 'Acceso Founder Alpha: entras por 49 €, accedes a los módulos actuales y recibes futuras mejoras mientras MatriculaPRO evoluciona.' },
                  { icon: Crown, text: 'Tu número Founder correlativo y tu plaza temprana dentro de MatriculaPRO.' },
                  { icon: Heart, text: 'Tu feedback durante la fase Alpha ayuda a mejorar el producto real.' },
                ].map(({ icon: Icon, text }, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-[13px] leading-relaxed text-ink-soft">
                    <Icon size={14} className="shrink-0 mt-0.5 text-accent" />
                    <span>{text}</span>
                  </li>
                ))}
              </ul>

              <Link
                href="/#precios"
                onClick={onClose}
                className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full text-[14px] font-medium transition-transform hover:scale-[1.01] bg-ink text-white shadow-soft-md"
              >
                <Crown size={14} className="text-accent" />
                Ver precios Founder <ChevronRight size={14} />
              </Link>

              {!user && (
                <Link
                  href="/auth/login"
                  onClick={onClose}
                  className="mt-3 w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full text-[13px] font-medium bg-bg-deep text-ink hover:bg-line transition-colors"
                >
                  Iniciar sesión
                </Link>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
