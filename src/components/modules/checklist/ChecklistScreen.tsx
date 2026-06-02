'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft, ChevronRight, Check, AlertTriangle, Lightbulb,
  CheckCircle2, RefreshCw, Sparkles, Info
} from 'lucide-react';
import type { ChecklistDef } from '@/data/checklists';
import { usePersistentState } from '@/lib/usePersistentState';
import { tokens } from '@/lib/tokens';

export function ChecklistScreen({ checklist: c }: { checklist: ChecklistDef }) {
  const [done, setDone, hydrated] = usePersistentState<Record<string, boolean>>(`mpro:checklist:${c.storageKey}`, {});

  const totalItems = c.items.length;
  const doneCount = useMemo(() => Object.values(done).filter(Boolean).length, [done]);
  const progressPct = totalItems === 0 ? 0 : Math.round((doneCount / totalItems) * 100);
  const allCriticalDone = c.items
    .filter(i => i.critical)
    .every(i => done[i.id]);
  const criticalTotal = c.items.filter(i => i.critical).length;
  const criticalDone = c.items.filter(i => i.critical && done[i.id]).length;

  const toggle = (id: string) => setDone(prev => ({ ...prev, [id]: !prev[id] }));
  const reset = () => setDone({});

  return (
    <div className="min-h-screen bg-bg">
      <div className="px-5 lg:px-8 pt-6 pb-12 max-w-[1100px] mx-auto">
        <Link href="/app/dashboard" className="mb-4 inline-flex items-center gap-2 text-[12.5px] text-muted hover:text-ink">
          <ChevronLeft size={14} /> Volver al centro de control
        </Link>

        {/* Header */}
        <div className="mb-7 flex items-end justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10.5px] font-mono tracking-wider text-muted">{c.code}</span>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[10.5px] font-medium tracking-[0.04em] uppercase rounded-full bg-accent-soft text-accent-deep">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-accent" />
                Lista de verificación
              </span>
            </div>
            <h1 className="font-serif text-ink leading-[1] tracking-tight" style={{ fontSize: 'clamp(32px, 3.6vw, 48px)' }}>
              {c.title.replace(c.titleAccent, '')}
              <span className="italic text-accent">{c.titleAccent}</span>
            </h1>
            <p className="mt-3 max-w-[640px] text-[14px] leading-relaxed text-ink-soft">{c.subtitle}</p>
            <p className="mt-2 max-w-[640px] text-[12.5px] leading-relaxed text-muted">{c.intro}</p>
          </div>

          {/* Progress card */}
          <div className="rounded-2xl p-4 min-w-[240px] bg-surface border border-line">
            <div className="text-[10.5px] tracking-[0.18em] uppercase mb-2 text-muted">Progreso</div>
            <div className="flex items-baseline gap-1 mb-2">
              <span className="font-serif text-ink leading-none" style={{ fontSize: 32 }}>{doneCount}</span>
              <span className="text-muted">/ {totalItems} · {progressPct}%</span>
            </div>
            <div className="h-[3px] rounded-full overflow-hidden bg-line-soft mb-2.5">
              <motion.div initial={{ width: 0 }} animate={{ width: `${progressPct}%` }}
                className="h-full bg-accent" transition={{ duration: 0.4 }} />
            </div>
            {criticalTotal > 0 && (
              <div className="text-[10.5px] flex items-center gap-1.5"
                   style={{ color: allCriticalDone ? tokens.color.ok : tokens.color.danger }}>
                <AlertTriangle size={11} />
                <span>Críticos: {criticalDone}/{criticalTotal}</span>
              </div>
            )}
          </div>
        </div>

        {/* Sections */}
        <div className="space-y-4">
          {c.sections.map(section => {
            const items = c.items.filter(i => i.section === section.id);
            const sectionDone = items.filter(i => done[i.id]).length;
            return (
              <section key={section.id} className="rounded-[18px] overflow-hidden bg-surface border border-line shadow-soft-sm">
                <header className="px-5 py-4 border-b border-line bg-surface-alt">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div>
                      <h2 className="text-[15px] font-medium text-ink">{section.title}</h2>
                      {section.description && (
                        <p className="text-[12px] mt-0.5 text-ink-soft">{section.description}</p>
                      )}
                    </div>
                    <span className="text-[11px] font-mono text-muted shrink-0">{sectionDone}/{items.length}</span>
                  </div>
                </header>
                <ul className="divide-y divide-line">
                  {items.map(item => (
                    <ChecklistRow key={item.id}
                      item={item}
                      checked={!!done[item.id]}
                      onToggle={() => toggle(item.id)}
                      hydrated={hydrated} />
                  ))}
                </ul>
              </section>
            );
          })}
        </div>

        {/* Tips */}
        <section className="mt-6 rounded-[18px] p-5 bg-surface border border-line">
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb size={14} className="text-accent" />
            <span className="text-[10.5px] tracking-[0.22em] uppercase text-accent-deep">Consejos</span>
          </div>
          <ul className="space-y-2">
            {c.tips.map((t, i) => (
              <li key={i} className="flex items-start gap-2 text-[12.5px] leading-relaxed text-ink-soft">
                <Sparkles size={11} className="shrink-0 mt-1 text-accent" />
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Completion card */}
        <AnimatePresence>
          {progressPct === 100 && (
            <motion.div
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="mt-6 rounded-2xl p-6 relative overflow-hidden text-white"
              style={{ background: 'linear-gradient(135deg, #0B1F3A 0%, #16335E 100%)' }}>
              <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full opacity-30 blur-3xl bg-accent" />
              <div className="relative grid lg:grid-cols-[auto_1fr_auto] gap-4 items-center">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 bg-accent text-ink">
                  <CheckCircle2 size={22} />
                </div>
                <div>
                  <div className="text-[10.5px] tracking-[0.22em] uppercase mb-1 text-accent">Lista completa</div>
                  <div className="font-serif italic text-[22px] leading-[1.1] tracking-tight">Has revisado los {totalItems} puntos</div>
                </div>
                {c.nextStep && (
                  <Link href={c.nextStep.href}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-[13px] font-medium bg-accent text-ink whitespace-nowrap hover:scale-[1.02] transition-transform">
                    {c.nextStep.label} <ChevronRight size={13} />
                  </Link>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Acciones */}
        <div className="mt-6 flex items-center justify-end gap-2">
          {doneCount > 0 && (
            <button onClick={reset}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-[12px] bg-bg-deep text-ink-soft hover:bg-line transition-colors">
              <RefreshCw size={12} /> Reiniciar lista
            </button>
          )}
        </div>

        {/* Warning */}
        {c.warning && (
          <div className="mt-6 rounded-xl p-4 flex items-start gap-3 text-[11.5px] leading-relaxed bg-warn-soft text-warn border border-accent-soft">
            <AlertTriangle size={14} className="shrink-0 mt-0.5" />
            <span>{c.warning}</span>
          </div>
        )}
      </div>
    </div>
  );
}

/* ----- Row ----- */
function ChecklistRow({ item, checked, onToggle, hydrated }: {
  item: ChecklistDef['items'][number];
  checked: boolean;
  onToggle: () => void;
  hydrated: boolean;
}) {
  return (
    <li className="group">
      <button onClick={onToggle}
        className="w-full text-left px-5 py-3.5 flex items-start gap-3 hover:bg-surface-alt transition-colors">
        <div className="w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all"
          style={{
            borderColor: checked ? tokens.color.ok : (item.critical ? tokens.color.danger : tokens.color.line),
            background: checked ? tokens.color.ok : 'transparent',
            opacity: hydrated ? 1 : 0.5,
          }}>
          {checked && <Check size={12} className="text-white" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2 flex-wrap">
            <span className="text-[13px] leading-snug"
                  style={{
                    color: checked ? tokens.color.muted : tokens.color.ink,
                    textDecoration: checked ? 'line-through' : 'none',
                  }}>
              {item.label}
            </span>
            {item.critical && !checked && (
              <span className="inline-flex items-center gap-0.5 text-[9px] tracking-[0.04em] uppercase font-semibold px-1 py-0 rounded bg-danger-soft text-danger shrink-0">
                <AlertTriangle size={8} /> Crítico
              </span>
            )}
          </div>
          {item.detail && (
            <div className="mt-1 flex items-start gap-1.5 text-[11.5px] leading-relaxed text-ink-soft">
              <Info size={10} className="shrink-0 mt-0.5 text-accent-deep" />
              <span>{item.detail}</span>
            </div>
          )}
        </div>
      </button>
    </li>
  );
}
