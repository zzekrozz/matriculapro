'use client';

import { motion } from 'framer-motion';
import { ChevronRight, Crown, Sparkles, TrendingUp } from 'lucide-react';
import { useFounderModal } from '@/providers/FounderModalProvider';

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
    label: 'Acceso Fundador Beta',
    pitch: 'Entras temprano, acceso de por vida, producto en evolución.',
    isCurrent: true,
  },
  {
    price: 89,
    label: 'MVP usable',
    pitch: 'Ruta completa, herramientas principales y primeros vídeos.',
    isFuture: true,
  },
  {
    price: 129,
    label: 'Casi completo',
    pitch: 'Simulador 576 realista, ficha técnica española, documentos y casos.',
    isFuture: true,
  },
  {
    price: 199,
    label: 'Versión completa',
    pitch: 'Plataforma terminada con simuladores, checklists, vídeos, biblioteca y actualizaciones.',
    isFuture: true,
  },
];


export function PriceLadder() {
  const { openFounderModal } = useFounderModal();
  // El provider ya decide: producción → Stripe, dev → modal mock

  return (
    <section id="precios" className="py-20 lg:py-28" style={{ background: 'var(--color-bg)' }}>
      <div className="max-w-[1100px] mx-auto px-5 lg:px-8">
        <div className="text-center mb-12">
          <div className="text-[10.5px] tracking-[0.22em] uppercase mb-3 text-accent-deep">Roadmap de precio</div>
          <h2 className="font-serif text-ink leading-[1.05] tracking-tight max-w-[720px] mx-auto"
              style={{ fontSize: 'clamp(28px, 3.6vw, 48px)', letterSpacing: '-0.01em' }}>
            Entras ahora como <span className="italic text-accent">Fundador</span> y mantienes el acceso aunque el precio suba.
          </h2>
          <p className="mt-4 max-w-[580px] mx-auto text-[14.5px] leading-relaxed text-ink-soft">
            MatriculaPRO está en beta. El precio refleja la fase del producto, no su valor. Los Fundadores conservan acceso de por vida a todas las versiones futuras sin pagar más.
          </p>
        </div>

        {/* Escalera */}
        <div className="relative">
          {/* Línea ascendente decorativa */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-30 hidden lg:block"
               viewBox="0 0 1000 240" preserveAspectRatio="none">
            <line x1="0" y1="200" x2="250" y2="180" stroke="#C8862E" strokeWidth="1" strokeDasharray="3 4" />
            <line x1="250" y1="180" x2="500" y2="130" stroke="#C8862E" strokeWidth="1" strokeDasharray="3 4" />
            <line x1="500" y1="130" x2="750" y2="80" stroke="#C8862E" strokeWidth="1" strokeDasharray="3 4" />
            <line x1="750" y1="80" x2="1000" y2="40" stroke="#C8862E" strokeWidth="1" strokeDasharray="3 4" />
          </svg>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 relative">
            {LADDER.map((step, i) => (
              <PriceCard key={step.price} step={step} index={i} onUpgrade={openFounderModal} />
            ))}
          </div>
        </div>

        {/* CTA principal */}
        <div className="mt-10 flex items-center justify-center gap-3 flex-wrap">
          <button onClick={openFounderModal}
            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full text-[14px] font-medium transition-transform hover:scale-[1.02] bg-ink text-white shadow-soft-md">
            <Crown size={14} className="text-accent" /> Entrar como Founder por 49&nbsp;€
          </button>
        </div>

        {/* Frase clave */}
        <p className="mt-6 text-center max-w-[480px] mx-auto text-[13px] italic text-ink-soft leading-relaxed">
          "49 € no porque valga poco, sino porque estás entrando antes."
        </p>
      </div>
    </section>
  );
}

function PriceCard({ step, index, onUpgrade }: {
  step: PriceStep;
  index: number;
  onUpgrade: () => void;
}) {
  const isCurrent = step.isCurrent;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
      transition={{ duration: 0.4, delay: index * 0.08 }}
      className="rounded-2xl p-5 relative overflow-hidden flex flex-col h-full"
      style={{
        background: isCurrent ? 'var(--color-surface)' : 'transparent',
        border: `1px solid ${isCurrent ? 'var(--color-accent)' : 'rgba(11, 31, 58, 0.1)'}`,
        boxShadow: isCurrent
          ? '0 0 0 4px rgba(200, 134, 46, 0.12), 0 18px 40px rgba(11, 31, 58, 0.06)'
          : 'none',
        transform: isCurrent ? 'translateY(-6px)' : 'none',
      }}>

      {isCurrent && (
        <div className="absolute top-3 right-3 inline-flex items-center gap-1 text-[9.5px] tracking-[0.18em] uppercase font-semibold px-2 py-0.5 rounded-full bg-accent text-ink">
          <Sparkles size={9} /> Disponible
        </div>
      )}

      {step.isFuture && (
        <div className="absolute top-3 right-3 inline-flex items-center gap-1 text-[9.5px] tracking-[0.04em] uppercase px-1.5 py-0.5 rounded text-muted">
          <TrendingUp size={9} /> Futuro
        </div>
      )}

      <div className="flex items-baseline gap-1 mb-3 mt-2">
        <span className="font-serif text-ink leading-none"
              style={{ fontSize: 48, color: isCurrent ? 'var(--color-ink)' : 'var(--color-muted)' }}>
          {step.price}
        </span>
        <span className="text-[20px]" style={{ color: isCurrent ? 'var(--color-accent)' : 'var(--color-muted-soft)' }}>€</span>
      </div>

      <div className="text-[12.5px] tracking-[0.04em] uppercase font-semibold mb-2"
           style={{ color: isCurrent ? 'var(--color-ink)' : 'var(--color-ink-soft)' }}>
        {step.label}
      </div>

      <p className="text-[12px] leading-relaxed mb-4 flex-1"
         style={{ color: isCurrent ? 'var(--color-ink-soft)' : 'var(--color-muted)' }}>
        {step.pitch}
      </p>

      {isCurrent ? (
        <button onClick={onUpgrade}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-full text-[12.5px] font-medium transition-transform hover:scale-[1.02] bg-ink text-white">
          Entrar ahora <ChevronRight size={12} />
        </button>
      ) : (
        <div className="text-[11px] text-muted">
          Disponible más adelante
        </div>
      )}
    </motion.div>
  );
}
