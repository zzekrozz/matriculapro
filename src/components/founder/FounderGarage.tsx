'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Crown, EyeOff, ChevronRight, Loader2, Star, ArrowUpRight } from 'lucide-react';
import { STRIPE_FOUNDERS_URL } from '@/lib/env';
import { useAccess, formatFounderNumber } from '@/providers/AccessProvider';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';

interface GarageEntry {
  founder_number: number;
  display_name: string | null;
  created_at?: string | null;
}

interface FounderGarageProps {
  variant?: 'compact' | 'page';
}

const PAGE_EMPTY_SLOTS = 4;
const COMPACT_EMPTY_SLOTS = 0;

export function FounderGarage({ variant = 'page' }: FounderGarageProps) {
  const { isFounder, founderNumber } = useAccess();
  const [founders, setFounders] = useState<GarageEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadFounders() {
      const supabase = createSupabaseBrowserClient();

      const viewResult = await supabase
        .from('founder_garage_view')
        .select('founder_number, display_name, created_at')
        .order('founder_number', { ascending: true });

      if (!cancelled && !viewResult.error) {
        setFounders((viewResult.data ?? []) as GarageEntry[]);
        setLoading(false);
        return;
      }

      if (viewResult.error) {
        console.warn('[FounderGarage] founder_garage_view unavailable:', viewResult.error.message);
      }

      const fallbackResult = await supabase
        .from('profiles')
        .select('founder_number, display_name, created_at')
        .not('founder_number', 'is', null)
        .order('founder_number', { ascending: true });

      if (!cancelled) {
        if (fallbackResult.error) {
          console.warn('[FounderGarage] fallback to profiles unavailable:', fallbackResult.error.message);
          setFounders([]);
        } else {
          setFounders((fallbackResult.data ?? []) as GarageEntry[]);
        }
        setLoading(false);
      }
    }

    void loadFounders();
    return () => {
      cancelled = true;
    };
  }, []);

  const emptySlotsAfter = variant === 'page' ? PAGE_EMPTY_SLOTS : COMPACT_EMPTY_SLOTS;
  const ownerInData = founders.find(f => f.founder_number === 1) ?? null;
  const restFounders = founders.filter(f => f.founder_number !== 1);
  const maxFounderNumber = founders.length > 0 ? Math.max(...founders.map(f => f.founder_number)) : 1;

  const emptySlots = useMemo(
    () => Array.from({ length: emptySlotsAfter }, (_, i) => maxFounderNumber + i + 1),
    [emptySlotsAfter, maxFounderNumber],
  );

  return (
    <section
      className="rounded-[28px] overflow-hidden relative"
      style={{ background: 'linear-gradient(135deg, #0B1F3A 0%, #16335E 100%)', color: '#fff' }}
    >
      <div
        className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full opacity-15 blur-3xl pointer-events-none"
        style={{ background: 'radial-gradient(circle, #C8862E 0%, transparent 70%)' }}
      />

      <div className="relative p-7 lg:p-10">
        <div className="mb-7 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-1.5 mb-3">
              <Crown size={13} className="text-accent" />
              <span className="text-[10.5px] tracking-[0.22em] uppercase font-semibold text-accent">
                Garaje Fundador
              </span>
            </div>
            <h2
              className="font-serif italic leading-[1.05] tracking-tight mb-3"
              style={{ fontSize: variant === 'page' ? 'clamp(28px, 4vw, 46px)' : 'clamp(22px, 3vw, 32px)' }}
            >
              {variant === 'page'
                ? <>Los primeros usuarios que apoyaron MatriculaPRO <span className="text-accent">desde el inicio.</span></>
                : <>Primeros usuarios Founder <span className="text-accent">ya dentro.</span></>}
            </h2>
            <p className="max-w-[640px] text-[14px] leading-relaxed text-muted-soft">
              {variant === 'page'
                ? 'Cada Founder recibe un número único por orden de entrada. Puede aparecer con nombre, iniciales, alias o de forma anónima.'
                : 'Vista pública del Garaje Fundador. Si la plaza se reserva, aparece con el número y la identidad elegida por cada Founder.'}
            </p>
          </div>

          {variant === 'page' && (
            <a
              href={STRIPE_FOUNDERS_URL}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-[13px] font-medium transition-transform hover:scale-[1.02] bg-accent text-ink whitespace-nowrap shrink-0"
            >
              <Crown size={13} /> Ver precios Founder <ArrowUpRight size={13} />
            </a>
          )}
        </div>

        {loading ? (
          <div className="flex items-center gap-2 mb-6 text-[12px] text-muted-soft">
            <Loader2 size={14} className="animate-spin" /> Cargando Garaje Fundador...
          </div>
        ) : (
          <div
            className={`grid gap-3 mb-6 ${
              variant === 'page'
                ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
                : 'grid-cols-2 sm:grid-cols-4'
            }`}
          >
            <OwnerSlot entry={ownerInData} delay={0} />

            {restFounders.map((entry, index) => (
              <RealSlot
                key={entry.founder_number}
                entry={entry}
                isSelf={isFounder && founderNumber === entry.founder_number}
                delay={(index + 1) * 0.04}
                variant={variant}
              />
            ))}

            {variant === 'page' && emptySlots.map((num, index) => (
              <EmptySlot
                key={`empty-${num}`}
                num={num}
                isNext={index === 0}
                delay={(restFounders.length + index + 1) * 0.04}
              />
            ))}
          </div>
        )}

        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-2">
            <EyeOff size={12} className="text-accent shrink-0 mt-0.5" />
            <p className="text-[11.5px] leading-relaxed text-muted-soft max-w-[560px]">
              Los datos públicos se limitan al número Founder y al nombre visible elegido por cada usuario.
              Si no hay nombre público, se mostrará “Founder anónimo” o el número Founder.
            </p>
          </div>

          {variant === 'compact' && (
            <Link
              href="/founders"
              className="inline-flex items-center gap-1.5 text-[12px] font-medium text-accent hover:text-white transition-colors"
            >
              Ver Garaje Fundador <ChevronRight size={12} />
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}

function OwnerSlot({ entry, delay }: { entry: GarageEntry | null; delay: number }) {
  const label = entry?.display_name?.trim() ? entry.display_name : 'Ivan Imports';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.3, delay }}
      className="rounded-xl p-4 flex flex-col gap-1.5 border"
      style={{ background: 'rgba(200,134,46,0.12)', borderColor: 'rgba(200,134,46,0.4)' }}
    >
      <div className="flex items-center gap-1.5">
        <Star size={9} className="text-accent shrink-0" />
        <span className="text-[9.5px] font-mono tracking-wider text-accent">{formatFounderNumber(1)}</span>
      </div>
      <div className="text-[13px] font-medium text-white leading-tight">{label}</div>
      <div className="text-[10px] text-accent opacity-80">Founder inicial</div>
    </motion.div>
  );
}

function RealSlot({
  entry,
  isSelf,
  delay,
  variant,
}: {
  entry: GarageEntry;
  isSelf: boolean;
  delay: number;
  variant: 'compact' | 'page';
}) {
  const rawName = entry.display_name?.trim();
  const label = rawName
    ? rawName
    : variant === 'page'
      ? 'Founder anónimo'
      : `Founder ${formatFounderNumber(entry.founder_number)}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.3, delay }}
      className="rounded-xl p-4 flex flex-col gap-1.5 border relative"
      style={{
        background: isSelf ? 'rgba(200,134,46,0.18)' : 'rgba(255,255,255,0.06)',
        borderColor: isSelf ? 'rgba(200,134,46,0.5)' : 'rgba(255,255,255,0.08)',
      }}
    >
      {isSelf && (
        <motion.div
          animate={{ opacity: [0.2, 0.55, 0.2] }}
          transition={{ duration: 2.4, repeat: Infinity }}
          className="absolute inset-0 rounded-xl pointer-events-none"
          style={{ boxShadow: '0 0 18px rgba(200,134,46,0.45)' }}
        />
      )}
      <div className="relative">
        <div className="flex items-center gap-1.5 mb-1">
          <Crown size={9} className="text-accent shrink-0" />
          <span className="text-[9.5px] font-mono tracking-wider text-accent">
            {formatFounderNumber(entry.founder_number)}
          </span>
        </div>
        <div className="text-[13px] font-medium text-white leading-tight">{label}</div>
        {isSelf && <div className="mt-1 text-[10px] text-accent">Tu plaza</div>}
      </div>
    </motion.div>
  );
}

function EmptySlot({ num, isNext, delay }: { num: number; isNext: boolean; delay: number }) {
  return (
    <motion.a
      href={STRIPE_FOUNDERS_URL}
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.3, delay }}
      className="rounded-xl p-4 flex flex-col gap-1.5 border"
      style={{
        background: isNext ? 'rgba(200,134,46,0.08)' : 'rgba(255,255,255,0.03)',
        borderColor: isNext ? 'rgba(200,134,46,0.3)' : 'rgba(255,255,255,0.08)',
      }}
    >
      <span className="text-[9.5px] font-mono tracking-wider text-accent/80">{formatFounderNumber(num)}</span>
      <div className="text-[13px] font-medium text-white/80 leading-tight">
        {isNext ? 'Plaza Founder disponible' : 'Disponible para nuevo Founder'}
      </div>
      <div className="flex items-center gap-1 text-[10px] text-accent">
        Ver acceso <ChevronRight size={9} />
      </div>
    </motion.a>
  );
}
