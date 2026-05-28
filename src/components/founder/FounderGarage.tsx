'use client';

import { motion } from 'framer-motion';
import { Crown, Lock, Sparkles, ChevronRight, EyeOff } from 'lucide-react';
import { useAccess, formatFounderNumber } from '@/providers/AccessProvider';
import { useFounderModal } from '@/providers/FounderModalProvider';

/**
 * Garaje Fundador · Hall de los primeros usuarios.
 * Se usa en landing pública y dentro del dashboard.
 */

interface SlotData {
  num: number;
  /** Cómo se muestra: name | alias | initials | reserved | you | anonymous */
  display: 'reserved' | 'alias' | 'initials' | 'anonymous' | 'you';
  alias?: string;
}

// Slots mock: primeros 3 reservados, slot 4 = "tu nombre aquí", 5-8 mezcla
const SLOTS_MOCK: SlotData[] = [
  { num: 1, display: 'reserved' },
  { num: 2, display: 'reserved' },
  { num: 3, display: 'reserved' },
  { num: 4, display: 'you' },
  { num: 5, display: 'alias',     alias: 'Iván desde Almería' },
  { num: 6, display: 'initials',  alias: 'J. M. · Madrid' },
  { num: 7, display: 'anonymous' },
  { num: 8, display: 'alias',     alias: 'Carlos · Barcelona' },
];

export function FounderGarage({ variant = 'full' }: { variant?: 'full' | 'compact' }) {
  const { isFounder, founderNumber, founderAlias } = useAccess();
  const { openFounderModal } = useFounderModal();

  // Si el usuario es founder, su slot reemplaza al "you"
  const slots: SlotData[] = SLOTS_MOCK.map(s => {
    if (s.display === 'you' && isFounder && founderNumber !== null) {
      return {
        num: founderNumber,
        display: 'alias',
        alias: founderAlias || 'Tú',
      };
    }
    return s;
  });

  return (
    <section className="rounded-[24px] overflow-hidden relative"
             style={{
               background: 'linear-gradient(135deg, #0B1F3A 0%, #16335E 100%)',
               color: '#fff',
             }}>
      <div className="absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full opacity-20 blur-3xl pointer-events-none"
           style={{ background: 'radial-gradient(circle, #C8862E 0%, transparent 70%)' }} />

      <div className="relative p-7 lg:p-10">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-1.5 mb-3">
              <Crown size={13} className="text-accent" />
              <span className="text-[10.5px] tracking-[0.22em] uppercase font-semibold text-accent">
                Garaje Fundador
              </span>
            </div>
            <h2 className="font-serif italic leading-[1.05] tracking-tight" style={{ fontSize: 'clamp(28px, 3.4vw, 40px)' }}>
              Los <span className="text-accent">primeros</span> en entrar.
            </h2>
            <p className="mt-3 max-w-[520px] text-[14px] leading-relaxed text-muted-soft">
              Los Fundadores son quienes entraron cuando MatriculaPRO todavía estaba en construcción y ayudaron a convertirlo en una herramienta real. Su número se asigna por orden de compra.
            </p>
          </div>

          {!isFounder && (
            <button onClick={openFounderModal}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-[13px] font-medium transition-transform hover:scale-[1.02] bg-accent text-ink whitespace-nowrap shrink-0">
              <Crown size={13} /> Reservar mi sitio
            </button>
          )}
        </div>

        {/* Grid de slots */}
        <div className={variant === 'compact'
            ? "grid grid-cols-2 sm:grid-cols-4 gap-2.5"
            : "grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-6"}>
          {slots.map((slot, i) => (
            <FounderSlot key={`${slot.num}-${i}`} slot={slot} delay={i * 0.04} />
          ))}
        </div>

        {variant === 'full' && (
          <>
            {/* Explicación privacidad */}
            <div className="rounded-xl p-4 mb-4 bg-white/5 border border-white/10">
              <div className="flex items-start gap-2.5">
                <EyeOff size={13} className="shrink-0 mt-0.5 text-accent" />
                <div>
                  <div className="text-[10px] tracking-[0.22em] uppercase mb-1 text-accent">Privacidad</div>
                  <p className="text-[12.5px] leading-relaxed text-muted-soft">
                    Cada Fundador elige cómo aparecer: nombre completo, iniciales, alias o anónimo. Puedes cambiarlo cuando quieras.
                  </p>
                </div>
              </div>
            </div>

            {/* Nota orden */}
            <p className="text-[11px] text-muted text-center">
              Los números Founder se asignan por orden de compra.
            </p>
          </>
        )}
      </div>
    </section>
  );
}

/* ----- Slot individual ----- */
function FounderSlot({ slot, delay }: { slot: SlotData; delay: number }) {
  const { openFounderModal } = useFounderModal();
  const isYou = slot.display === 'you';
  const isReserved = slot.display === 'reserved';

  const content = (() => {
    switch (slot.display) {
      case 'reserved':
        return { label: 'Reservado', icon: Lock };
      case 'anonymous':
        return { label: 'Anónimo', icon: EyeOff };
      case 'initials':
      case 'alias':
        return { label: slot.alias || '—', icon: null };
      case 'you':
        return { label: 'Tu nombre aquí', icon: Sparkles };
    }
  })();

  const Icon = content.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
      transition={{ duration: 0.3, delay }}
      className="rounded-xl p-3.5 relative overflow-hidden transition-all"
      style={{
        background: isYou
          ? 'rgba(200, 134, 46, 0.18)'
          : isReserved
            ? 'rgba(255, 255, 255, 0.03)'
            : 'rgba(255, 255, 255, 0.06)',
        border: `1px solid ${isYou ? 'rgba(200, 134, 46, 0.5)' : 'rgba(255, 255, 255, 0.08)'}`,
        cursor: isYou ? 'pointer' : 'default',
      }}
      onClick={isYou ? openFounderModal : undefined}
    >
      {/* Pulse para "Tu nombre aquí" */}
      {isYou && (
        <motion.div
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute inset-0 rounded-xl pointer-events-none"
          style={{ boxShadow: '0 0 20px rgba(200, 134, 46, 0.5)' }} />
      )}

      <div className="relative">
        <div className="text-[10px] font-mono tracking-wider mb-1"
             style={{ color: isYou ? '#C8862E' : 'rgba(255,255,255,0.5)' }}>
          {formatFounderNumber(slot.num)}
        </div>
        <div className="flex items-center gap-1.5 min-h-[20px]">
          {Icon && <Icon size={11} style={{ color: isYou ? '#C8862E' : 'rgba(255,255,255,0.4)' }} />}
          <span className="text-[12px] font-medium truncate"
                style={{ color: isYou ? '#fff' : isReserved ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.85)' }}>
            {content.label}
          </span>
        </div>
        {isYou && (
          <div className="mt-2 inline-flex items-center gap-1 text-[10px] text-accent">
            Entrar como Founder <ChevronRight size={9} />
          </div>
        )}
      </div>
    </motion.div>
  );
}
