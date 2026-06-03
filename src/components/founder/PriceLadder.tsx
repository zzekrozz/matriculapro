'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ChevronRight, Crown, Sparkles, TrendingUp, Info } from 'lucide-react';

interface PriceStep {
  price: number;
  label: string;
  pitch: string;
  isCurrent?: boolean;
  isFuture?: boolean;
}

const LADDER: PriceStep[] = [
  {
    price: 49,
    label: 'ACCESO FOUNDER ALPHA',
    pitch: 'Acceso temprano a MatriculaPRO en fase Alpha. Incluye módulos actuales y futuras actualizaciones.',
    isCurrent: true,
  },
  {
    price: 89,
    label: 'MVP usable',
    pitch: 'Cuando la ruta principal, checklists y primeros módulos estén más completos.',
    isFuture: true,
  },
  {
    price: 129,
    label: 'Plataforma avanzada',
    pitch: 'Cuando simuladores, fichas, documentos y casos prácticos estén más desarrollados.',
    isFuture: true,
  },
  {
    price: 199,
    label: 'Versión completa',
    pitch: 'Cuando MatriculaPRO tenga todos los módulos, biblioteca, plantillas, casos y actualizaciones principales.',
    isFuture: true,
  },
];

export function PriceLadder() {
  return (
    <section id="precios" className="py-20 lg:py-28" style={{ background: 'var(--color-bg)' }}>
      <div className="max-w-[1100px] mx-auto px-5 lg:px-8">
        <div className="text-center mb-12">
          <div className="text-[10.5px] tracking-[0.22em] uppercase mb-3 text-accent-deep">Fase Alpha</div>
          <h2
            className="font-serif text-ink leading-[1.05] tracking-tight max-w-[760px] mx-auto"
            style={{ fontSize: 'clamp(28px, 3.6vw, 48px)', letterSpacing: '-0.01em' }}
          >
            Acceso Founder Alpha: <span className="italic text-accent">entra antes</span>, paga menos y recibe la evolución completa.
          </h2>
          <p className="mt-4 max-w-[720px] mx-auto text-[14.5px] leading-relaxed text-ink-soft">
            MatriculaPRO todavía está en desarrollo. El precio actual refleja que estás entrando en fase Alpha, ayudando a mejorar el producto y recibiendo las futuras actualizaciones a medida que la plataforma crece.
          </p>
        </div>

        <div className="relative">
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none opacity-30 hidden lg:block"
            viewBox="0 0 1000 240"
            preserveAspectRatio="none"
          >
            <line x1="0" y1="200" x2="250" y2="180" stroke="#C8862E" strokeWidth="1" strokeDasharray="3 4" />
            <line x1="250" y1="180" x2="500" y2="130" stroke="#C8862E" strokeWidth="1" strokeDasharray="3 4" />
            <line x1="500" y1="130" x2="750" y2="80" stroke="#C8862E" strokeWidth="1" strokeDasharray="3 4" />
            <line x1="750" y1="80" x2="1000" y2="40" stroke="#C8862E" strokeWidth="1" strokeDasharray="3 4" />
          </svg>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 relative">
            {LADDER.map((step, i) => (
              <PriceCard key={step.price} step={step} index={i} />
            ))}
          </div>
        </div>

        <div className="mt-8 rounded-[24px] p-5 lg:p-6 border border-line bg-surface max-w-[760px] mx-auto">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-accent-soft text-accent-deep shrink-0">
              <Info size={16} />
            </div>
            <div>
              <div className="text-[11px] tracking-[0.18em] uppercase font-semibold text-accent-deep mb-1">
                ¿Qué significa fase Alpha?
              </div>
              <p className="text-[13px] leading-relaxed text-ink-soft">
                Significa que MatriculaPRO ya puede usarse, pero todavía está en construcción. Algunos módulos seguirán mejorando, se añadirán contenidos y la experiencia puede cambiar. Entras antes para apoyar el desarrollo y obtener el acceso por menos.
              </p>
              <a href="#que-es" className="mt-3 inline-flex items-center gap-1.5 text-[12px] font-medium text-ink hover:text-accent-deep">
                Ver qué incluye ahora <ChevronRight size={12} />
              </a>
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center gap-3">
          <Link
            href="/acceso-founder"
            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full text-[14px] font-medium transition-transform hover:scale-[1.02] bg-ink text-white shadow-soft-md"
          >
            <Crown size={14} className="text-accent" /> Acceder por 49 €
          </Link>
          <Link
            href="/auth/login"
            className="text-[12px] text-muted hover:text-ink transition-colors flex items-center gap-1.5"
          >
            Ya tengo acceso Founder · Iniciar sesión
          </Link>
        </div>

        <p className="mt-6 text-center max-w-[560px] mx-auto text-[13px] text-ink-soft leading-relaxed">
          Precio Alpha para primeros fundadores. Incluye acceso actual y futuras mejoras de la plataforma.
        </p>
      </div>
    </section>
  );
}

function PriceCard({ step, index }: { step: PriceStep; index: number }) {
  const isCurrent = step.isCurrent;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, delay: index * 0.08 }}
      className="rounded-2xl p-5 relative overflow-hidden flex flex-col h-full"
      style={{
        background: isCurrent ? 'var(--color-surface)' : 'transparent',
        border: `1px solid ${isCurrent ? 'var(--color-accent)' : 'rgba(11, 31, 58, 0.1)'}`,
        boxShadow: isCurrent
          ? '0 0 0 4px rgba(200, 134, 46, 0.12), 0 18px 40px rgba(11, 31, 58, 0.06)'
          : 'none',
        transform: isCurrent ? 'translateY(-6px)' : 'none',
      }}
    >
      {isCurrent && (
        <div className="absolute top-3 right-3 inline-flex items-center gap-1 text-[9.5px] tracking-[0.18em] uppercase font-semibold px-2 py-0.5 rounded-full bg-accent text-ink">
          <Sparkles size={9} /> Ahora
        </div>
      )}

      {step.isFuture && (
        <div className="absolute top-3 right-3 inline-flex items-center gap-1 text-[9.5px] tracking-[0.04em] uppercase px-1.5 py-0.5 rounded text-muted">
          <TrendingUp size={9} /> Futuro
        </div>
      )}

      <div className="flex items-baseline gap-1 mb-3 mt-2">
        <span
          className="font-serif text-ink leading-none"
          style={{ fontSize: 48, color: isCurrent ? 'var(--color-ink)' : 'var(--color-muted)' }}
        >
          {step.price}
        </span>
        <span className="text-[20px]" style={{ color: isCurrent ? 'var(--color-accent)' : 'var(--color-muted-soft)' }}>
          €
        </span>
      </div>

      <div
        className="text-[12.5px] tracking-[0.04em] uppercase font-semibold mb-2"
        style={{ color: isCurrent ? 'var(--color-ink)' : 'var(--color-ink-soft)' }}
      >
        {step.label}
      </div>

      <p
        className="text-[12px] leading-relaxed mb-4 flex-1"
        style={{ color: isCurrent ? 'var(--color-ink-soft)' : 'var(--color-muted)' }}
      >
        {step.pitch}
      </p>

      {isCurrent ? (
        <Link
          href="/acceso-founder"
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-full text-[12.5px] font-medium transition-transform hover:scale-[1.02] bg-ink text-white"
        >
          Acceder por 49 € <ChevronRight size={12} />
        </Link>
      ) : (
        <div className="text-[11px] text-muted">Disponible más adelante</div>
      )}
    </motion.div>
  );
}
