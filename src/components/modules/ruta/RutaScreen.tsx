'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft, ChevronRight, Check, CircleDot, XCircle, Info,
  AlertTriangle, Sparkles, Lock, Crown,
  ShoppingCart, FileText, FileCheck2, Wrench, Receipt, Building2,
  Banknote, ScrollText, KeyRound, MessageCircle,
  type LucideIcon,
} from 'lucide-react';
import { tokens } from '@/lib/tokens';
import { RUTA_STEPS, type RutaStep } from '@/data/ruta-steps';
import { RUTA_PHASES, phaseOfStep, type RutaPhase } from '@/data/ruta-phases';
import { useCourse, type BoughtState } from '@/providers/CourseProvider';
import { useAccess } from '@/providers/AccessProvider';
import { useFounderModal } from '@/providers/FounderModalProvider';
import { RouteMap } from '@/components/modules/ruta/RouteMap';

const ICON_MAP: Record<string, LucideIcon> = {
  ShoppingCart, FileText, FileCheck2, Wrench, Receipt,
  Building2, Banknote, ScrollText, KeyRound,
};

// Mapa id → n
const stepIdToN: Record<string, number> = Object.fromEntries(
  RUTA_STEPS.map(s => [s.id, s.n])
);

export function RutaScreen() {
  const { completedRouteSteps, toggleRouteStep, bought, setBought } = useCourse();
  const { canCompleteSteps, isExplorer } = useAccess();
  const { openFounderModal } = useFounderModal();
  const [expanded, setExpanded] = useState<number | null>(1);

  const completedCount = completedRouteSteps.length;
  const progressPct = Math.round((completedCount / RUTA_STEPS.length) * 100);

  const handlePhaseClick = (phaseId: string) => {
    // Scroll a la sección de la fase
    setTimeout(() => {
      document.getElementById(`phase-${phaseId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };

  return (
    <div className="px-5 lg:px-8 pt-6 pb-12 max-w-[1400px] mx-auto">
      <Link href="/app/dashboard" className="mb-4 inline-flex items-center gap-2 text-[12.5px] text-muted hover:text-ink">
        <ChevronLeft size={14} /> Volver al centro de control
      </Link>

      {/* Header */}
      <div className="mb-7 flex items-end justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10.5px] font-mono tracking-wider text-muted">M.01</span>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[10.5px] font-medium tracking-[0.04em] uppercase rounded-full bg-accent-soft text-accent-deep">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-accent" />
              {completedCount > 0 ? 'En curso' : 'Empieza por aquí'}
            </span>
          </div>
          <h1 className="font-serif text-ink leading-[1] tracking-tight" style={{ fontSize: 'clamp(32px, 3.6vw, 48px)' }}>
            Ruta de <span className="italic text-accent">matriculación</span>
          </h1>
          <p className="mt-3 max-w-[640px] text-[14px] leading-relaxed text-ink-soft">
            Antes de los 9 pasos, un mapa rápido del proceso completo en 3 fases. Después, la ruta detallada agrupada por fase, con todo lo que necesitas en cada paso.
          </p>
        </div>

        {/* Progress card */}
        <div className="rounded-2xl p-4 min-w-[220px] bg-surface border border-line">
          <div className="text-[10.5px] tracking-[0.18em] uppercase mb-2 text-muted">Progreso de la ruta</div>
          <div className="flex items-baseline gap-1 mb-2">
            <span className="font-serif text-ink leading-none" style={{ fontSize: 32 }}>{completedCount}</span>
            <span className="text-muted">/ {RUTA_STEPS.length} pasos · {progressPct}%</span>
          </div>
          <div className="h-[3px] rounded-full overflow-hidden bg-line-soft">
            <motion.div initial={{ width: 0 }} animate={{ width: `${progressPct}%` }}
              className="h-full bg-accent" transition={{ duration: 0.5, ease: 'easeOut' }} />
          </div>
        </div>
      </div>

      {/* MAPA DE 3 FASES */}
      <RouteMap
        completedSteps={completedRouteSteps}
        stepIdToN={stepIdToN}
        onPhaseClick={handlePhaseClick}
      />

      {/* ¿Ya compraste el coche? */}
      <div className="mb-7 rounded-2xl p-5 bg-surface border border-line">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="text-[10px] tracking-[0.22em] uppercase mb-1 text-accent-deep">Punto de partida</div>
            <h3 className="text-[16px] font-medium text-ink">¿Ya has comprado el coche?</h3>
            <p className="text-[12.5px] mt-1 text-ink-soft">Adaptamos los avisos del paso 1 según tu respuesta.</p>
          </div>
          <div className="flex gap-2">
            {([
              { v: 'no', label: 'Todavía no' },
              { v: 'yes', label: 'Sí, ya lo tengo' },
            ] as const).map(opt => {
              const selected = bought === opt.v;
              return (
                <button key={opt.v} onClick={() => setBought(opt.v as BoughtState)}
                  className="px-4 py-2 rounded-full text-[12px] font-medium transition-all"
                  style={{
                    background: selected ? tokens.color.ink : tokens.color.bgDeep,
                    color: selected ? '#fff' : tokens.color.inkSoft,
                    border: `1px solid ${selected ? tokens.color.ink : tokens.color.line}`,
                  }}>
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Lista de pasos agrupados POR FASE */}
      <div className="space-y-8">
        {RUTA_PHASES.map(phase => {
          const stepsInPhase = RUTA_STEPS.filter(s => phase.steps.includes(s.n));
          const completedInPhase = stepsInPhase.filter(s => completedRouteSteps.includes(s.id)).length;
          // Explorer solo puede ver la Fase 1 ('preparar')
          const isPhaseBlocked = isExplorer && phase.id !== 'preparar';
          return (
            <section key={phase.id} id={`phase-${phase.id}`} className="scroll-mt-4">
              <PhaseHeader phase={phase} completedCount={completedInPhase} totalCount={stepsInPhase.length} />

              {isPhaseBlocked ? (
                /* Overlay de fase bloqueada */
                <div className="mt-4 rounded-[18px] overflow-hidden relative border border-line"
                     style={{ borderColor: `${phase.color.main}30` }}>
                  <div className="p-5 lg:p-7 filter blur-[1px] pointer-events-none select-none opacity-40">
                    {stepsInPhase.map(s => (
                      <div key={s.id} className="mb-2 rounded-xl px-4 py-3 bg-surface border border-line">
                        <span className="text-[12px] text-ink-soft font-mono">Paso {s.n} · </span>
                        <span className="text-[13px] text-ink">{s.title}</span>
                      </div>
                    ))}
                  </div>
                  {/* Overlay encima */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center rounded-[18px] p-6 text-center"
                       style={{ background: 'rgba(255,255,255,0.92)' }}>
                    <Lock size={24} className="text-ink mb-3" />
                    <div className="text-[10.5px] tracking-[0.22em] uppercase font-semibold text-accent-deep mb-1">
                      {phase.shortTitle} · Acceso Founder
                    </div>
                    <p className="text-[13px] text-ink-soft mb-4 max-w-[380px]">
                      {phase.id === 'pagos'
                        ? 'La Fase 2 (pagos y tasas) está disponible con acceso Founder Beta.'
                        : 'La Fase 3 (DGT y placas) está disponible con acceso Founder Beta.'}
                    </p>
                    <button onClick={openFounderModal}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-[12.5px] font-medium bg-ink text-white hover:scale-[1.02] transition-transform">
                      <Crown size={12} className="text-accent" /> Desbloquear · 49 €
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 mt-4">
                  {stepsInPhase.map(s => (
                    <RutaStepCard
                      key={s.id}
                      step={s}
                      phase={phase}
                      expanded={expanded === s.n}
                      onToggle={() => setExpanded(expanded === s.n ? null : s.n)}
                      completed={completedRouteSteps.includes(s.id)}
                      onComplete={() => toggleRouteStep(s.id)}
                      bought={bought}
                      canComplete={canCompleteSteps}
                      isExplorer={isExplorer}
                      onUpgradeClick={openFounderModal}
                    />
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>

      {/* Final card */}
      {completedCount === RUTA_STEPS.length && canCompleteSteps && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          className="mt-8 rounded-2xl p-6 relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #0B1F3A 0%, #16335E 100%)', color: '#fff' }}>
          <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full opacity-30 blur-3xl bg-accent" />
          <div className="relative flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 bg-accent text-ink">
              <Sparkles size={22} />
            </div>
            <div>
              <div className="text-[10.5px] tracking-[0.22em] uppercase mb-1 text-accent">Has marcado los 9 pasos</div>
              <div className="font-serif italic text-[22px] leading-[1.1] tracking-tight">¡Trayecto completo!</div>
              <p className="text-[12.5px] mt-1 text-muted-soft">
                Recuerda que esto es la guía formativa. La validación real de cada paso la hacen los organismos correspondientes.
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Legal */}
      <div className="mt-8 rounded-xl p-4 flex items-start gap-3 text-[11.5px] leading-relaxed bg-warn-soft text-warn border border-accent-soft">
        <AlertTriangle size={14} className="shrink-0 mt-0.5" />
        <span>
          Ruta orientativa. Los plazos, tasas y procedimientos pueden variar según comunidad autónoma, estación ITV o jefatura de Tráfico. No sustituye a gestoría, ITV, Agencia Tributaria ni DGT.
        </span>
      </div>
    </div>
  );
}

/* ============================================================
   PhaseHeader
   ============================================================ */

function PhaseHeader({ phase, completedCount, totalCount }: {
  phase: RutaPhase;
  completedCount: number;
  totalCount: number;
}) {
  return (
    <header className="rounded-2xl p-5 flex items-center gap-4 flex-wrap"
            style={{
              background: phase.color.soft,
              border: `1px solid ${phase.color.main}25`,
            }}>
      <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
           style={{ background: phase.color.main, color: '#fff' }}>
        <span className="font-serif italic text-[22px]">{phase.n}</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
          <span className="text-[10px] tracking-[0.22em] uppercase font-semibold" style={{ color: phase.color.deep }}>
            {phase.shortTitle}
          </span>
          <span className="text-[10px] font-mono" style={{ color: phase.color.deep, opacity: 0.6 }}>
            · pasos {phase.steps[0]}-{phase.steps[phase.steps.length - 1]}
          </span>
          <span className="text-[10px] font-mono ml-auto" style={{ color: phase.color.deep, opacity: 0.7 }}>
            {completedCount}/{totalCount}
          </span>
        </div>
        <h2 className="font-serif text-ink leading-[1.1] tracking-tight" style={{ fontSize: 22, color: phase.color.deep }}>
          {phase.title}
        </h2>
        <p className="text-[12.5px] leading-relaxed mt-1" style={{ color: phase.color.deep, opacity: 0.85 }}>
          {phase.message}
        </p>
      </div>
    </header>
  );
}

/* ============================================================
   StepCard
   ============================================================ */

interface StepCardProps {
  step: RutaStep;
  phase: RutaPhase;
  expanded: boolean;
  onToggle: () => void;
  completed: boolean;
  onComplete: () => void;
  bought: BoughtState;
  canComplete: boolean;
  isExplorer: boolean;
  onUpgradeClick: () => void;
}

function RutaStepCard({
  step: s, phase, expanded, onToggle, completed, onComplete, bought,
  canComplete, isExplorer, onUpgradeClick
}: StepCardProps) {
  const Icon = ICON_MAP[s.icon] ?? FileText;
  const showBoughtMsg = s.n === 1 && bought === 'yes' && s.altMsg;

  return (
    <motion.div
      id={`step-${s.id}`}
      layout
      className="rounded-[18px] overflow-hidden bg-surface shadow-soft-sm"
      style={{ border: `1px solid ${completed ? tokens.color.ok : tokens.color.line}` }}
    >
      {/* Header */}
      <button onClick={onToggle} className="w-full text-left px-5 py-4 flex items-center gap-4 group">
        <div className="shrink-0 w-12 h-12 rounded-xl flex items-center justify-center transition-all"
             style={{
               background: completed ? tokens.color.ok : phase.color.soft,
               color: completed ? '#fff' : phase.color.deep,
             }}>
          {completed ? <Check size={20} /> : <Icon size={20} />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
            <span className="text-[10.5px] font-mono tracking-wider text-muted">PASO {s.n}</span>
            {completed && (
              <span className="inline-flex items-center gap-1 text-[9.5px] tracking-[0.04em] uppercase px-1.5 py-0.5 rounded font-semibold bg-ok-soft text-ok">
                <Check size={9} /> Completado
              </span>
            )}
            {!completed && s.state === 'recommended' && (
              <span className="inline-flex items-center gap-1 text-[9.5px] tracking-[0.04em] uppercase px-1.5 py-0.5 rounded font-semibold bg-accent-soft text-accent-deep">
                Recomendado
              </span>
            )}
            {s.delicate && (
              <span className="inline-flex items-center gap-1 text-[9.5px] tracking-[0.04em] uppercase px-1.5 py-0.5 rounded font-semibold bg-danger-soft"
                    style={{ color: tokens.color.danger }}>
                <AlertTriangle size={9} /> Punto delicado
              </span>
            )}
          </div>
          <h3 className="text-[16px] font-medium text-ink leading-snug" style={{ letterSpacing: '-0.005em' }}>{s.title}</h3>
          <p className="text-[12.5px] leading-snug mt-1 text-ink-soft">{s.summary}</p>
        </div>
        <motion.div animate={{ rotate: expanded ? 90 : 0 }} className="shrink-0">
          <ChevronRight size={18} className="text-muted" />
        </motion.div>
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            style={{ overflow: 'hidden' }}
          >
            <div className="px-5 pb-5 pt-1 border-t" style={{ borderColor: tokens.color.line }}>
              {/* Mensaje "ya compraste" */}
              {showBoughtMsg && (
                <div className="mt-4 rounded-lg p-3 text-[12px] flex items-start gap-2 bg-accent-soft text-accent-deep">
                  <Info size={13} className="shrink-0 mt-0.5" />
                  <span>{s.altMsg}</span>
                </div>
              )}

              {/* WHY · POR QUÉ IMPORTA — primero, porque da contexto */}
              {s.why && (
                <div className="mt-4 rounded-lg p-3.5"
                     style={{ background: phase.color.soft, border: `1px solid ${phase.color.main}20` }}>
                  <div className="flex items-center gap-1.5 mb-1.5 text-[10px] tracking-[0.22em] uppercase font-semibold"
                       style={{ color: phase.color.deep }}>
                    <Sparkles size={11} /> Por qué importa este paso
                  </div>
                  <p className="text-[12.5px] leading-relaxed" style={{ color: phase.color.deep }}>
                    {s.why}
                  </p>
                </div>
              )}

              {/* 3 columnas: qué haces, qué necesitas, errores */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
                <div>
                  <div className="text-[10px] tracking-[0.22em] uppercase mb-2 text-accent-deep">Qué estamos haciendo</div>
                  <p className="text-[12.5px] leading-relaxed text-ink-soft">{s.what}</p>
                </div>
                <div>
                  <div className="text-[10px] tracking-[0.22em] uppercase mb-2 text-accent-deep">Documentos o datos</div>
                  <ul className="space-y-1.5">
                    {s.need.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-[12.5px] text-ink-soft">
                        <CircleDot size={10} className="shrink-0 mt-1 text-accent" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <div className="text-[10px] tracking-[0.22em] uppercase mb-2"
                       style={{ color: tokens.color.danger }}>
                    Errores que pueden bloquearte
                  </div>
                  <ul className="space-y-1.5">
                    {s.errors.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-[12.5px] text-ink-soft">
                        <XCircle size={10} className="shrink-0 mt-1" style={{ color: tokens.color.danger }} />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* CONSULT · Cuándo consultar */}
              {s.consult && (
                <div className="mt-4 rounded-lg p-3.5 flex items-start gap-2.5 bg-warn-soft border border-accent-soft">
                  <MessageCircle size={13} className="shrink-0 mt-0.5 text-warn" />
                  <div>
                    <div className="text-[10px] tracking-[0.22em] uppercase mb-1 text-warn font-semibold">
                      Cuándo consultar a ITV / DGT / Hacienda
                    </div>
                    <p className="text-[12px] leading-relaxed text-warn">
                      {s.consult}
                    </p>
                  </div>
                </div>
              )}

              {/* Linked module CTA */}
              {s.linkedModule && (
                <div className="mt-5 rounded-xl p-3.5 flex items-center gap-3"
                     style={{
                       background: s.linkedModule.available ? tokens.color.bgDeep : 'rgba(11,31,58,0.02)',
                       border: `1px ${s.linkedModule.available ? 'solid' : 'dashed'} ${tokens.color.line}`,
                     }}>
                  {s.linkedModule.available ? (
                    <Sparkles size={14} className="shrink-0 text-accent" />
                  ) : (
                    <Lock size={14} className="shrink-0 text-muted" />
                  )}
                  <div className="flex-1 text-[12px] text-ink-soft">
                    {s.linkedModule.available ? (
                      <>Hay un módulo para practicar este paso: <strong className="text-ink">{s.linkedModule.label}</strong></>
                    ) : (
                      <><strong className="text-ink">{s.linkedModule.label}</strong> · próximamente</>
                    )}
                  </div>
                  {s.linkedModule.available && (
                    <Link href={s.linkedModule.href}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium transition-transform hover:scale-[1.02]"
                      style={{ background: tokens.color.ink, color: '#fff' }}>
                      Practicar <ChevronRight size={11} />
                    </Link>
                  )}
                </div>
              )}

              {/* Guía completa placeholder + completar */}
              <div className="mt-5 flex items-center justify-between gap-2 flex-wrap">
                <button
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-[11.5px] transition-colors"
                  style={{
                    background: tokens.color.bgDeep,
                    color: isExplorer ? tokens.color.muted : tokens.color.inkSoft,
                    border: `1px dashed ${tokens.color.line}`,
                    cursor: 'not-allowed',
                  }}
                  disabled
                  title="Disponible próximamente">
                  <Lock size={11} />
                  Ver guía completa del paso · próximamente
                </button>

                {/* COMPLETAR — gated por nivel */}
                {canComplete ? (
                  <button onClick={onComplete}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-[12px] font-medium transition-transform hover:scale-[1.02]"
                    style={{
                      background: completed ? tokens.color.ok : tokens.color.ink,
                      color: '#fff',
                      boxShadow: tokens.shadow.md,
                    }}>
                    {completed ? <><Check size={13} /> Paso completado</> : <><Check size={13} /> Marcar como completado</>}
                  </button>
                ) : (
                  <button onClick={onUpgradeClick}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-[12px] font-medium transition-transform hover:scale-[1.02]"
                    style={{ background: tokens.color.accent, color: tokens.color.ink, boxShadow: tokens.shadow.md }}>
                    <Lock size={12} /> Marcar requiere Founder <Crown size={11} />
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default RutaScreen;
