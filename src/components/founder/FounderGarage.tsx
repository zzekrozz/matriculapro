'use client';

import { motion } from 'framer-motion';
import { Crown, Lock, Sparkles, ChevronRight, EyeOff, Star } from 'lucide-react';
import { useAccess, formatFounderNumber } from '@/providers/AccessProvider';
import { useFounderModal } from '@/providers/FounderModalProvider';

/**
 * Garaje Fundador · Hall de los primeros usuarios de MatriculaPRO.
 * Reutilizable en landing pública y dashboard.
 */

interface SlotData {
  num: number;
  display: 'reserved-owner' | 'available' | 'alias' | 'initials' | 'anonymous' | 'you' | 'user';
  alias?: string;
}

// Slots según spec:
// #0001 reservado para el creador
// #0007 = "Tu nombre aquí"
// #0008-#0010 disponibles
const SLOTS_DEFAULT: SlotData[] = [
  { num: 1,  display: 'reserved-owner' },
  { num: 7,  display: 'you' },
  { num: 8,  display: 'available' },
  { num: 9,  display: 'available' },
  { num: 10, display: 'available' },
];

interface FounderGarageProps {
  variant?: 'full' | 'compact';
}

export function FounderGarage({ variant = 'full' }: FounderGarageProps) {
  const { isFounder, founderNumber, founderAlias } = useAccess();
  const { openFounderModal } = useFounderModal();

  // Si el usuario ya es Founder, reemplaza uno de los slots disponibles con sus datos
  const slots: SlotData[] = SLOTS_DEFAULT.map(s => {
    if (s.display === 'you' && isFounder && founderNumber !== null) {
      return {
        num: founderNumber,
        display: 'user',
        alias: founderAlias || undefined,
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
      {/* Glow ámbar */}
      <div className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full opacity-15 blur-3xl pointer-events-none"
           style={{ background: 'radial-gradient(circle, #C8862E 0%, transparent 70%)' }} />

      <div className="relative p-7 lg:p-10">
        {/* Header */}
        <div className="mb-7">
          <div className="inline-flex items-center gap-1.5 mb-3">
            <Crown size={13} className="text-accent" />
            <span className="text-[10.5px] tracking-[0.22em] uppercase font-semibold text-accent">
              Garaje Fundador
            </span>
          </div>
          <h2 className="font-serif italic leading-[1.05] tracking-tight mb-3"
              style={{ fontSize: 'clamp(24px, 3.2vw, 38px)' }}>
            Gracias a los primeros fundadores que apoyaron MatriculaPRO{' '}
            <span className="text-accent">desde sus cimientos.</span>
          </h2>
          <p className="max-w-[560px] text-[14px] leading-relaxed text-muted-soft">
            Los primeros fundadores no solo entran antes. Ayudan a construir MatriculaPRO desde el principio.
          </p>
        </div>

        {/* Grid de slots */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 mb-6">
          {slots.map((slot, i) => (
            <FounderSlot
              key={`${slot.num}-${slot.display}-${i}`}
              slot={slot}
              delay={i * 0.06}
              onUpgrade={openFounderModal}
            />
          ))}
        </div>

        {/* Footer del garaje */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          {/* Nota privacidad */}
          <div className="flex items-start gap-2">
            <EyeOff size={12} className="text-accent shrink-0 mt-0.5" />
            <p className="text-[11.5px] leading-relaxed text-muted-soft max-w-[440px]">
              Los números Founder se asignarán por orden de entrada. Cada fundador podrá aparecer con nombre, iniciales, alias o anónimo.
            </p>
          </div>

          {!isFounder && (
            <button onClick={openFounderModal}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-[13px] font-medium transition-transform hover:scale-[1.02] bg-accent text-ink whitespace-nowrap shrink-0">
              <Crown size={13} /> Reservar mi sitio · 49 €
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   Slot individual
   ============================================================ */

function FounderSlot({ slot, delay, onUpgrade }: {
  slot: SlotData;
  delay: number;
  onUpgrade: () => void;
}) {
  const isOwner    = slot.display === 'reserved-owner';
  const isYou      = slot.display === 'you';
  const isAvail    = slot.display === 'available';
  const isUser     = slot.display === 'user';

  const bgStyle = (() => {
    if (isOwner)  return 'rgba(200,134,46,0.10)';
    if (isYou)    return 'rgba(200,134,46,0.16)';
    if (isUser)   return 'rgba(200,134,46,0.20)';
    if (isAvail)  return 'rgba(255,255,255,0.04)';
    return 'rgba(255,255,255,0.05)';
  })();

  const borderStyle = (() => {
    if (isOwner || isUser)  return 'rgba(200,134,46,0.45)';
    if (isYou)              return 'rgba(200,134,46,0.6)';
    if (isAvail)            return 'rgba(255,255,255,0.06)';
    return 'rgba(255,255,255,0.08)';
  })();

  const label = (() => {
    if (isOwner) return 'Reservado';
    if (isYou)   return 'Tu nombre aquí';
    if (isAvail) return 'Disponible';
    if (isUser)  return slot.alias || 'Fundador';
    return slot.alias || '—';
  })();

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.3, delay }}
      onClick={isYou ? onUpgrade : undefined}
      className="rounded-xl p-3.5 relative overflow-hidden flex flex-col gap-1.5"
      style={{
        background: bgStyle,
        border: `1px solid ${borderStyle}`,
        cursor: isYou ? 'pointer' : 'default',
      }}>

      {/* Pulso para el slot "Tu nombre aquí" */}
      {isYou && (
        <motion.div
          animate={{ opacity: [0.2, 0.55, 0.2] }}
          transition={{ duration: 2.4, repeat: Infinity }}
          className="absolute inset-0 rounded-xl pointer-events-none"
          style={{ boxShadow: '0 0 22px rgba(200,134,46,0.55)' }} />
      )}

      <div className="relative">
        {/* Número */}
        <div className="flex items-center gap-1.5 mb-1">
          {isOwner && <Star size={9} className="text-accent shrink-0" />}
          {isUser  && <Crown size={9} className="text-accent shrink-0" />}
          <span className="text-[9.5px] font-mono tracking-wider"
                style={{ color: (isOwner || isYou || isUser) ? '#C8862E' : 'rgba(255,255,255,0.4)' }}>
            {formatFounderNumber(slot.num)}
          </span>
        </div>

        {/* Label */}
        <div className="text-[12px] font-medium leading-tight truncate"
             style={{
               color: isYou ? '#fff' : isAvail ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.85)',
             }}>
          {label}
        </div>

        {/* CTA inline si es el slot "you" */}
        {isYou && (
          <div className="mt-2 inline-flex items-center gap-1 text-[10px] text-accent">
            Entrar como fundador <ChevronRight size={9} />
          </div>
        )}
      </div>
    </motion.div>
  );
}
