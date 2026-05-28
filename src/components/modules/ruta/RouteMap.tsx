'use client';

import { motion } from 'framer-motion';
import {
  FileCheck2, Receipt, Flag, ChevronRight, ArrowRight,
  type LucideIcon
} from 'lucide-react';
import { RUTA_PHASES, type RutaPhase } from '@/data/ruta-phases';

const ICON_MAP: Record<string, LucideIcon> = {
  FileCheck2, Receipt, Flag,
};

interface RouteMapProps {
  /** IDs de pasos completados (1..9) — para mostrar % por fase */
  completedSteps: string[];
  stepIdToN: Record<string, number>;
  /** Callback al pulsar "Ver pasos" — hace scroll a la fase en cuestión */
  onPhaseClick?: (phaseId: string) => void;
}

export function RouteMap({ completedSteps, stepIdToN, onPhaseClick }: RouteMapProps) {
  return (
    <section className="mb-10">
      {/* Cabecera del mapa */}
      <div className="mb-5">
        <div className="text-[10.5px] tracking-[0.22em] uppercase mb-1.5 text-accent-deep">
          Mapa rápido de matriculación
        </div>
        <h2 className="font-serif text-ink leading-[1.05] tracking-tight" style={{ fontSize: 'clamp(22px, 2.6vw, 32px)' }}>
          El proceso parece complicado, pero <span className="italic text-accent">se divide en 3 fases</span>.
        </h2>
      </div>

      {/* Grid horizontal en desktop, vertical en mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 lg:gap-4 relative">
        {RUTA_PHASES.map((phase, idx) => (
          <PhaseCard
            key={phase.id}
            phase={phase}
            completedInPhase={phase.steps.filter(n =>
              completedSteps.some(stepId => stepIdToN[stepId] === n)
            ).length}
            onClick={() => onPhaseClick?.(phase.id)}
            showConnector={idx < RUTA_PHASES.length - 1}
          />
        ))}
      </div>
    </section>
  );
}

/* ============================================================
   PhaseCard
   ============================================================ */

function PhaseCard({ phase, completedInPhase, onClick, showConnector }: {
  phase: RutaPhase;
  completedInPhase: number;
  onClick: () => void;
  showConnector: boolean;
}) {
  const Icon = ICON_MAP[phase.icon] ?? FileCheck2;
  const total = phase.steps.length;
  const pct = total === 0 ? 0 : Math.round((completedInPhase / total) * 100);

  return (
    <motion.button
      onClick={onClick}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
      className="relative rounded-[20px] p-6 lg:p-7 text-left bg-surface border shadow-soft-sm hover:shadow-soft-md transition-shadow overflow-hidden group flex flex-col"
      style={{
        borderColor: 'var(--color-line)',
        minHeight: 240,
      }}>

      {/* Glow color de fase arriba */}
      <div className="absolute -top-24 -right-12 w-56 h-56 rounded-full opacity-20 blur-3xl pointer-events-none"
           style={{ background: phase.color.main }} />

      {/* Banda de color superior */}
      <div className="absolute top-0 left-0 right-0 h-1" style={{ background: phase.color.main }} />

      <div className="relative">
        {/* Icono + número de fase */}
        <div className="flex items-center justify-between mb-4">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110"
               style={{ background: phase.color.soft, color: phase.color.deep }}>
            <Icon size={20} />
          </div>
          <div className="text-right">
            <div className="font-serif italic leading-none" style={{ fontSize: 28, color: phase.color.deep }}>
              {phase.shortTitle}
            </div>
            <div className="text-[10px] mt-1 tracking-[0.18em] uppercase text-muted">
              {total} pasos · {pct}%
            </div>
          </div>
        </div>

        {/* Título */}
        <h3 className="text-[17px] font-medium text-ink leading-tight mb-1.5" style={{ letterSpacing: '-0.005em' }}>
          {phase.title}
        </h3>

        {/* Pitch */}
        <p className="text-[12.5px] leading-relaxed text-ink-soft mb-4">
          {phase.pitch}
        </p>

        {/* Pasos incluidos como chips */}
        <div className="flex items-center gap-1 mb-4 flex-wrap">
          {phase.steps.map(n => (
            <span key={n}
              className="inline-flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-semibold transition-colors"
              style={{
                background: phase.color.soft,
                color: phase.color.deep,
              }}>
              {n}
            </span>
          ))}
        </div>

        {/* Barra de progreso */}
        <div className="h-[3px] rounded-full overflow-hidden mb-4" style={{ background: 'var(--color-line-soft)' }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="h-full rounded-full"
            style={{ background: phase.color.main }}
          />
        </div>

        {/* CTA */}
        <div className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-ink-soft group-hover:text-ink transition-colors">
          Ver pasos <ChevronRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
        </div>
      </div>

      {/* Conector horizontal (sólo desktop, entre cards) */}
      {showConnector && (
        <div className="hidden lg:block absolute -right-2.5 top-1/2 -translate-y-1/2 z-10 pointer-events-none">
          <div className="w-5 h-5 rounded-full flex items-center justify-center bg-surface border border-line shadow-soft-sm">
            <ArrowRight size={10} className="text-muted" />
          </div>
        </div>
      )}
    </motion.button>
  );
}
