'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft, ChevronRight, Check, CircleDot, XCircle, Info,
  AlertTriangle, Sparkles, Lock,
  ShoppingCart, FileText, FileCheck2, Wrench, Receipt, Building2,
  Banknote, ScrollText, KeyRound,
  type LucideIcon,
} from 'lucide-react';
import { tokens } from '@/lib/tokens';
import { RUTA_STEPS, type RutaStep } from '@/data/ruta-steps';
import { useCourse, type BoughtState } from '@/providers/CourseProvider';

const ICON_MAP: Record<string, LucideIcon> = {
  ShoppingCart, FileText, FileCheck2, Wrench, Receipt,
  Building2, Banknote, ScrollText, KeyRound,
};

export function RutaScreen() {
  const { completedRouteSteps, toggleRouteStep, bought, setBought } = useCourse();
  const [expanded, setExpanded] = useState<number | null>(1);

  const completedCount = completedRouteSteps.length;
  const progressPct = Math.round((completedCount / RUTA_STEPS.length) * 100);

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
            9 pasos guiados desde antes de comprar hasta tener placas y seguro. Cada paso te dice qué haces, qué necesitas y los errores comunes. Marca los pasos a medida que avances — se guardan automáticamente.
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

      {/* Stepper visual (sólo desktop) */}
      <div className="hidden lg:flex items-center gap-1 mb-8 px-2 py-3 rounded-2xl overflow-x-auto bg-surface border border-line">
        {RUTA_STEPS.map((s, idx) => {
          const Icon = ICON_MAP[s.icon] ?? FileText;
          const isDone = completedRouteSteps.includes(s.id);
          const isActive = expanded === s.n;
          const prevDone = idx > 0 && completedRouteSteps.includes(RUTA_STEPS[idx - 1].id);
          return (
            <React.Fragment key={s.id}>
              <button onClick={() => {
                setExpanded(s.n);
                // Scroll a la tarjeta
                setTimeout(() => {
                  document.getElementById(`step-${s.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 50);
              }}
                className="group flex flex-col items-center gap-1.5 px-3 py-1.5 rounded-xl shrink-0 transition-colors"
                style={{ background: isActive ? tokens.color.bgDeep : 'transparent' }}>
                <div className="w-9 h-9 rounded-full flex items-center justify-center transition-all"
                  style={{
                    background: isDone ? tokens.color.ok : isActive ? tokens.color.ink : tokens.color.bgDeep,
                    color: isDone || isActive ? '#fff' : tokens.color.inkSoft,
                    boxShadow: isActive ? `0 0 0 4px ${tokens.color.accent}33` : 'none',
                  }}>
                  {isDone ? <Check size={15} /> : <Icon size={15} />}
                </div>
                <span className="text-[10px] font-mono tracking-wider text-muted">P.{s.n}</span>
              </button>
              {idx < RUTA_STEPS.length - 1 && (
                <div className="h-[2px] w-6 shrink-0"
                     style={{ background: (isDone && prevDone) || isDone ? tokens.color.ok : tokens.color.lineSoft }} />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Lista de pasos como acordeón */}
      <div className="space-y-3">
        {RUTA_STEPS.map(s => (
          <RutaStepCard
            key={s.id}
            step={s}
            expanded={expanded === s.n}
            onToggle={() => setExpanded(expanded === s.n ? null : s.n)}
            completed={completedRouteSteps.includes(s.id)}
            onComplete={() => toggleRouteStep(s.id)}
            bought={bought}
          />
        ))}
      </div>

      {/* Final card */}
      {completedCount === RUTA_STEPS.length && (
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
   STEP CARD
   ============================================================ */

interface StepCardProps {
  step: RutaStep;
  expanded: boolean;
  onToggle: () => void;
  completed: boolean;
  onComplete: () => void;
  bought: BoughtState;
}

function RutaStepCard({ step: s, expanded, onToggle, completed, onComplete, bought }: StepCardProps) {
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
               background: completed ? tokens.color.ok : tokens.color.bgDeep,
               color: completed ? '#fff' : tokens.color.ink,
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

              {/* 3 columnas */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
                <div>
                  <div className="text-[10px] tracking-[0.22em] uppercase mb-2 text-accent-deep">Qué haces aquí</div>
                  <p className="text-[12.5px] leading-relaxed text-ink-soft">{s.what}</p>
                </div>
                <div>
                  <div className="text-[10px] tracking-[0.22em] uppercase mb-2 text-accent-deep">Qué necesitas</div>
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
                    Errores comunes
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

              {/* Acciones */}
              <div className="mt-5 flex items-center justify-end gap-2 flex-wrap">
                <button onClick={onComplete}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-[12px] font-medium transition-transform hover:scale-[1.02]"
                  style={{
                    background: completed ? tokens.color.ok : tokens.color.ink,
                    color: '#fff',
                    boxShadow: tokens.shadow.md,
                  }}>
                  {completed ? <><Check size={13} /> Paso completado</> : <><Check size={13} /> Marcar como completado</>}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default RutaScreen;
