'use client';

import { STRIPE_FOUNDERS_URL } from '@/lib/env';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Crown, EyeOff, ChevronRight, Loader2, Star } from 'lucide-react';
import { useAccess, formatFounderNumber } from '@/providers/AccessProvider';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';

/**
 * Garaje Fundador — mural de los primeros usuarios de MatriculaPRO.
 *
 * Carga los founders desde la vista pública `founder_garage_view` de Supabase
 * (sin emails, sin datos privados). Muestra slots vacíos adicionales para
 * crear sensación de disponibilidad.
 *
 * Reglas:
 * - #0001 siempre aparece como "Reservado · Ivan Imports" (slot fijo)
 * - El resto se carga dinámicamente desde Supabase
 * - Slots vacíos: se muestran N slots adicionales tras el último real
 */

interface GarageEntry {
  founder_number: number;
  display_name: string | null;
}

const EMPTY_SLOTS_AFTER = 5; // Cuántos slots vacíos mostrar tras el último founder real

interface FounderGarageProps {
  variant?: 'full' | 'compact';
}

export function FounderGarage({ variant = 'full' }: FounderGarageProps) {
  const { isFounder, founderNumber } = useAccess();
  const [founders, setFounders] = useState<GarageEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    supabase
      .from('founder_garage_view')
      .select('founder_number, display_name')
      .order('founder_number', { ascending: true })
      .then(({ data, error }) => {
        if (error) console.warn('[FounderGarage] Error cargando fundadores:', error.message);
        setFounders((data ?? []) as GarageEntry[]);
        setLoading(false);
      });
  }, []);

  // Construir la lista de slots a mostrar
  const lastNumber = founders.length > 0
    ? Math.max(...founders.map(f => f.founder_number))
    : 1;

  // Slots vacíos: desde lastNumber+1 hasta lastNumber+EMPTY_SLOTS_AFTER
  const emptySlots: number[] = Array.from(
    { length: EMPTY_SLOTS_AFTER },
    (_, i) => lastNumber + i + 1
  );

  // Slot #0001 siempre fijo (el admin puede o no estar en la DB, lo mostramos siempre)
  const ownerInDb = founders.find(f => f.founder_number === 1);
  const restFounders = founders.filter(f => f.founder_number !== 1);

  return (
    <section className="rounded-[24px] overflow-hidden relative"
             style={{ background: 'linear-gradient(135deg, #0B1F3A 0%, #16335E 100%)', color: '#fff' }}>
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
        {loading ? (
          <div className="flex items-center gap-2 mb-6 text-[12px] text-muted-soft">
            <Loader2 size={14} className="animate-spin" /> Cargando fundadores…
          </div>
        ) : (
          <div className={`grid gap-2.5 mb-6 ${
            variant === 'compact'
              ? 'grid-cols-2 sm:grid-cols-4'
              : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4'
          }`}>
            {/* Slot #0001 fijo */}
            <OwnerSlot entry={ownerInDb ?? null} delay={0} />

            {/* Founders reales desde la DB (excepto #0001) */}
            {restFounders.map((f, i) => (
              <RealSlot
                key={f.founder_number}
                entry={f}
                isSelf={isFounder && founderNumber === f.founder_number}
                delay={(i + 1) * 0.05}
              />
            ))}

            {/* Slots vacíos */}
            {emptySlots.map((num, i) => (
              <EmptySlot
                key={`empty-${num}`}
                num={num}
                isNext={num === lastNumber + 1}
                delay={(restFounders.length + i + 1) * 0.05}
              />
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-2">
            <EyeOff size={12} className="text-accent shrink-0 mt-0.5" />
            <p className="text-[11.5px] leading-relaxed text-muted-soft max-w-[440px]">
              Los números Founder se asignan por orden de compra. Cada fundador elige aparecer con nombre, iniciales, alias o anónimo.
            </p>
          </div>

          {!isFounder && (
            <a href={STRIPE_FOUNDERS_URL}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-[13px] font-medium transition-transform hover:scale-[1.02] bg-accent text-ink whitespace-nowrap shrink-0">
              <Crown size={13} /> Reservar mi sitio · 49 €
            </a>
          )}
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────
   Slot #0001 — siempre el creador/admin
   ──────────────────────────────────────── */
function OwnerSlot({ entry, delay }: { entry: GarageEntry | null; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
      transition={{ duration: 0.3, delay }}
      className="rounded-xl p-3.5 flex flex-col gap-1.5 border"
      style={{ background: 'rgba(200,134,46,0.12)', borderColor: 'rgba(200,134,46,0.4)' }}>
      <div className="flex items-center gap-1.5">
        <Star size={9} className="text-accent shrink-0" />
        <span className="text-[9.5px] font-mono tracking-wider text-accent">
          {formatFounderNumber(1)}
        </span>
      </div>
      <div className="text-[12px] font-medium text-white leading-tight">
        {entry?.display_name ?? 'Ivan Imports'}
      </div>
      <div className="text-[10px] text-accent opacity-70">Fundador inicial</div>
    </motion.div>
  );
}

/* ────────────────────────────────────────
   Slot de founder real desde la DB
   ──────────────────────────────────────── */
function RealSlot({ entry, isSelf, delay }: {
  entry: GarageEntry;
  isSelf: boolean;
  delay: number;
}) {
  const label = entry.display_name
    ?? `Founder ${formatFounderNumber(entry.founder_number)}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
      transition={{ duration: 0.3, delay }}
      className="rounded-xl p-3.5 flex flex-col gap-1.5 border relative"
      style={{
        background: isSelf ? 'rgba(200,134,46,0.18)' : 'rgba(255,255,255,0.06)',
        borderColor: isSelf ? 'rgba(200,134,46,0.5)' : 'rgba(255,255,255,0.08)',
      }}>
      {isSelf && (
        <motion.div
          animate={{ opacity: [0.2, 0.55, 0.2] }}
          transition={{ duration: 2.4, repeat: Infinity }}
          className="absolute inset-0 rounded-xl pointer-events-none"
          style={{ boxShadow: '0 0 18px rgba(200,134,46,0.5)' }} />
      )}
      <div className="relative">
        <div className="flex items-center gap-1.5 mb-1">
          <Crown size={9} className="text-accent shrink-0" />
          <span className="text-[9.5px] font-mono tracking-wider text-accent">
            {formatFounderNumber(entry.founder_number)}
          </span>
        </div>
        <div className="text-[12px] font-medium text-white leading-tight truncate">
          {label}
        </div>
        {isSelf && (
          <div className="mt-1 text-[10px] text-accent">Tú</div>
        )}
      </div>
    </motion.div>
  );
}

/* ────────────────────────────────────────
   Slot vacío / disponible
   ──────────────────────────────────────── */
function EmptySlot({ num, isNext, delay }: { num: number; isNext: boolean; delay: number }) {
  return (
    <motion.a
      href={isNext ? STRIPE_FOUNDERS_URL : undefined}
      initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
      transition={{ duration: 0.3, delay }}
      className="rounded-xl p-3.5 flex flex-col gap-1.5 border"
      style={{
        background: isNext ? 'rgba(200,134,46,0.08)' : 'rgba(255,255,255,0.03)',
        borderColor: isNext ? 'rgba(200,134,46,0.3)' : 'rgba(255,255,255,0.06)',
        cursor: isNext ? 'pointer' : 'default',
      }}>
      <span className="text-[9.5px] font-mono tracking-wider"
            style={{ color: isNext ? 'rgba(200,134,46,0.8)' : 'rgba(255,255,255,0.3)' }}>
        {formatFounderNumber(num)}
      </span>
      <div className="text-[12px] font-medium leading-tight"
           style={{ color: isNext ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.25)' }}>
        {isNext ? 'Tu sitio aquí' : 'Disponible'}
      </div>
      {isNext && (
        <div className="flex items-center gap-1 text-[10px] text-accent">
          Reservar <ChevronRight size={9} />
        </div>
      )}
    </motion.a>
  );
}
