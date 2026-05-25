'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft, ChevronRight, Clock, FileText, CheckCircle2, XCircle,
  Lightbulb, AlertTriangle, HelpCircle, Sparkles, Trophy, RefreshCw,
  Check
} from 'lucide-react';
import { tokens } from '@/lib/tokens';
import type { PracticalCase, CaseDecision } from '@/data/practical-cases';
import { useCourse } from '@/providers/CourseProvider';
import { DifficultyBadge } from '@/components/ui/DifficultyBadge';

type Phase = 'briefing' | 'decisions' | 'summary';

interface DecisionResult {
  selectedOptionIds: string[];
  isFullyCorrect: boolean;
}

export function CaseRunner({ practicalCase: c }: { practicalCase: PracticalCase }) {
  const [phase, setPhase] = useState<Phase>('briefing');
  const [decisionIdx, setDecisionIdx] = useState(0);
  const [results, setResults] = useState<Record<string, DecisionResult>>({});
  const { markCaseComplete } = useCourse();

  const totalDecisions = c.decisions.length;
  const currentDecision = c.decisions[decisionIdx];

  const totalCorrect = useMemo(
    () => Object.values(results).filter(r => r.isFullyCorrect).length,
    [results]
  );

  const score = useMemo(() => {
    const pct = totalDecisions === 0 ? 0 : Math.round((totalCorrect / totalDecisions) * 100);
    return { pct, correct: totalCorrect, total: totalDecisions };
  }, [totalCorrect, totalDecisions]);

  const finishCase = () => {
    markCaseComplete(c.id);
    setPhase('summary');
  };

  const advance = () => {
    if (decisionIdx < totalDecisions - 1) {
      setDecisionIdx(decisionIdx + 1);
    } else {
      finishCase();
    }
  };

  const restart = () => {
    setResults({});
    setDecisionIdx(0);
    setPhase('briefing');
  };

  return (
    <div className="min-h-screen bg-bg">
      <div className="px-5 lg:px-8 pt-6 pb-12 max-w-[1100px] mx-auto">
        <Link href="/app/casos-practicos" className="mb-4 inline-flex items-center gap-2 text-[12.5px] text-muted hover:text-ink">
          <ChevronLeft size={14} /> Volver a casos prácticos
        </Link>

        {/* Header del caso */}
        <header className="mb-7">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="text-[10.5px] font-mono tracking-wider text-muted">M.08 · CASO {c.n}</span>
            <DifficultyBadge difficulty={c.difficulty} />
            <span className="text-[10.5px] text-muted flex items-center gap-1">
              <Clock size={10} /> ~{c.estimatedMinutes} min
            </span>
            <span className="text-[10.5px] text-muted">· Origen: {c.origin} {c.flag}</span>
          </div>
          <h1 className="font-serif text-ink leading-[1.05] tracking-tight" style={{ fontSize: 'clamp(28px, 3.4vw, 42px)' }}>
            {c.title}
          </h1>
          <p className="mt-2 text-[14px] text-ink-soft leading-relaxed max-w-[640px]">
            {c.pitch}
          </p>
        </header>

        {/* Progreso de decisiones */}
        {phase === 'decisions' && (
          <div className="mb-5 flex items-center gap-3">
            <div className="flex-1 h-[3px] rounded-full overflow-hidden bg-line-soft">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${((decisionIdx) / totalDecisions) * 100}%` }}
                className="h-full bg-accent"
                transition={{ duration: 0.4 }}
              />
            </div>
            <span className="text-[11px] text-muted font-mono whitespace-nowrap">
              {decisionIdx + 1} / {totalDecisions}
            </span>
          </div>
        )}

        <AnimatePresence mode="wait">
          {/* ============ BRIEFING ============ */}
          {phase === 'briefing' && (
            <motion.div key="briefing"
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              {/* Escenario */}
              <section className="rounded-[20px] p-6 lg:p-8 bg-surface border border-line shadow-soft-md mb-5">
                <div className="text-[10px] tracking-[0.22em] uppercase mb-3 text-accent-deep">El escenario</div>
                <div className="space-y-3">
                  {c.scenario.map((p, i) => (
                    <p key={i} className="text-[14px] leading-relaxed text-ink-soft">{p}</p>
                  ))}
                </div>
              </section>

              {/* Documentos */}
              <section className="rounded-[20px] p-6 lg:p-8 bg-surface border border-line shadow-soft-md mb-5">
                <div className="text-[10px] tracking-[0.22em] uppercase mb-3 text-accent-deep">Documentos que tienes</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {c.documents.map(doc => (
                    <DocumentRow key={doc.code} doc={doc} />
                  ))}
                </div>
              </section>

              {/* CTA empezar */}
              <button onClick={() => setPhase('decisions')}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full text-[13.5px] font-medium transition-transform hover:scale-[1.02] shadow-soft-md"
                style={{ background: tokens.color.ink, color: '#fff' }}>
                Empezar el caso <ChevronRight size={14} />
              </button>
            </motion.div>
          )}

          {/* ============ DECISIONES ============ */}
          {phase === 'decisions' && currentDecision && (
            <motion.div key={`decision-${currentDecision.id}`}
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              <DecisionPanel
                decision={currentDecision}
                result={results[currentDecision.id]}
                onAnswer={(selectedIds, isCorrect) => {
                  setResults(prev => ({
                    ...prev,
                    [currentDecision.id]: { selectedOptionIds: selectedIds, isFullyCorrect: isCorrect }
                  }));
                }}
                onContinue={advance}
                isLast={decisionIdx === totalDecisions - 1}
              />
            </motion.div>
          )}

          {/* ============ SUMMARY ============ */}
          {phase === 'summary' && (
            <motion.div key="summary"
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              <ResultSummary
                score={score}
                takeaways={c.takeaways}
                onRestart={restart}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ============================================================
   DocumentRow
   ============================================================ */

function DocumentRow({ doc }: { doc: PracticalCase['documents'][number] }) {
  const variants = {
    ok:      { bg: 'bg-ok-soft',     icon: CheckCircle2, color: 'text-ok',     label: 'OK' },
    missing: { bg: 'bg-danger-soft', icon: XCircle,      color: 'text-danger', label: 'Falta' },
    doubt:   { bg: 'bg-warn-soft',   icon: HelpCircle,   color: 'text-warn',   label: 'Dudoso' },
  } as const;
  const v = variants[doc.status];
  const Icon = v.icon;
  return (
    <div className="rounded-lg p-3 flex items-center gap-2.5 bg-surface-alt border border-line">
      <div className={`w-8 h-8 rounded-md flex items-center justify-center shrink-0 ${v.bg}`}>
        <FileText size={13} className={v.color} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className="font-mono text-[10px] font-semibold text-muted">{doc.code}</span>
          <span className={`inline-flex items-center gap-0.5 text-[9px] tracking-[0.04em] uppercase font-semibold ${v.color}`}>
            <Icon size={9} /> {v.label}
          </span>
        </div>
        <div className="text-[12px] text-ink leading-tight">{doc.label}</div>
      </div>
    </div>
  );
}

/* ============================================================
   DecisionPanel
   ============================================================ */

interface DecisionPanelProps {
  decision: CaseDecision;
  result?: DecisionResult;
  onAnswer: (selectedIds: string[], isCorrect: boolean) => void;
  onContinue: () => void;
  isLast: boolean;
}

function DecisionPanel({ decision, result, onAnswer, onContinue, isLast }: DecisionPanelProps) {
  const [selected, setSelected] = useState<string[]>(result?.selectedOptionIds ?? []);
  const [submitted, setSubmitted] = useState<boolean>(!!result);

  const correctIds = useMemo(
    () => decision.options.filter(o => o.correct).map(o => o.id),
    [decision]
  );

  const toggleSelect = (id: string) => {
    if (submitted) return;
    if (decision.multi) {
      setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    } else {
      setSelected([id]);
    }
  };

  const submit = () => {
    if (selected.length === 0) return;
    const isCorrect = decision.multi
      ? selected.length === correctIds.length && selected.every(id => correctIds.includes(id))
      : selected.length === 1 && correctIds.includes(selected[0]);
    setSubmitted(true);
    onAnswer(selected, isCorrect);
  };

  return (
    <div className="space-y-4">
      {/* Context si lo hay */}
      {decision.context && (
        <div className="rounded-xl p-4 bg-surface-alt border border-line text-[13px] text-ink-soft leading-relaxed">
          {decision.context}
        </div>
      )}

      {/* Pregunta */}
      <section className="rounded-[20px] p-6 lg:p-8 bg-surface border border-line shadow-soft-md">
        <div className="flex items-start gap-3 mb-5">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-ink text-white">
            <HelpCircle size={16} />
          </div>
          <div className="flex-1">
            <div className="text-[10px] tracking-[0.22em] uppercase mb-1 text-accent-deep">
              Decisión {decision.multi ? '(puede haber varias respuestas correctas)' : ''}
            </div>
            <h2 className="font-serif text-ink leading-[1.15] tracking-tight" style={{ fontSize: 22 }}>
              {decision.question}
            </h2>
          </div>
        </div>

        {/* Opciones */}
        <div className="space-y-2.5">
          {decision.options.map(opt => {
            const isSelected = selected.includes(opt.id);
            const isCorrect = opt.correct;
            const shouldShowCorrectness = submitted && (isSelected || isCorrect);
            const variantStyle = (() => {
              if (!submitted) {
                return isSelected
                  ? 'bg-ink-soft/[0.04] border-ink'
                  : 'bg-surface border-line hover:border-ink-soft';
              }
              if (isCorrect) return 'bg-ok-soft border-ok';
              if (isSelected && !isCorrect) return 'bg-danger-soft border-danger';
              return 'bg-surface border-line opacity-60';
            })();

            return (
              <button
                key={opt.id}
                onClick={() => toggleSelect(opt.id)}
                disabled={submitted}
                className={`w-full text-left rounded-xl p-4 border transition-all ${variantStyle} ${!submitted ? 'cursor-pointer' : 'cursor-default'}`}
              >
                <div className="flex items-start gap-3">
                  {/* Marker */}
                  <div className={`w-5 h-5 rounded${decision.multi ? '' : '-full'} border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors`}
                    style={{
                      borderColor: submitted
                        ? (isCorrect ? tokens.color.ok : isSelected ? tokens.color.danger : tokens.color.line)
                        : (isSelected ? tokens.color.ink : tokens.color.line),
                      background: submitted && isCorrect ? tokens.color.ok
                        : submitted && isSelected && !isCorrect ? tokens.color.danger
                        : isSelected ? tokens.color.ink : 'transparent',
                    }}>
                    {(isSelected || (submitted && isCorrect)) && <Check size={11} className="text-white" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="text-[13.5px] leading-snug text-ink">
                      {opt.label}
                    </div>

                    {/* Explicación al revelar */}
                    <AnimatePresence>
                      {shouldShowCorrectness && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.25 }}
                          style={{ overflow: 'hidden' }}
                        >
                          <div className="mt-2 pt-2 border-t text-[12px] leading-relaxed"
                               style={{
                                 borderColor: isCorrect ? 'rgba(31,122,77,0.25)' : 'rgba(168,52,28,0.25)',
                                 color: isCorrect ? tokens.color.ok : tokens.color.danger,
                               }}>
                            <div className="flex items-start gap-1.5">
                              {isCorrect ? <CheckCircle2 size={11} className="shrink-0 mt-0.5" /> : <XCircle size={11} className="shrink-0 mt-0.5" />}
                              <span>{opt.explanation}</span>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Lección */}
        {submitted && (
          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
            className="mt-5 rounded-xl p-4 flex items-start gap-2.5 bg-accent-soft border border-accent">
            <Lightbulb size={14} className="shrink-0 mt-0.5 text-accent-deep" />
            <div>
              <div className="text-[10px] tracking-[0.22em] uppercase mb-1 text-accent-deep">Aprendizaje</div>
              <p className="text-[12.5px] leading-relaxed text-accent-deep">{decision.lesson}</p>
            </div>
          </motion.div>
        )}

        {/* CTA */}
        <div className="mt-6 flex items-center justify-end gap-2">
          {!submitted ? (
            <button onClick={submit} disabled={selected.length === 0}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-[13px] font-medium transition-transform hover:scale-[1.02] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
              style={{ background: tokens.color.ink, color: '#fff', boxShadow: tokens.shadow.md }}>
              Comprobar respuesta <Check size={14} />
            </button>
          ) : (
            <button onClick={onContinue}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-[13px] font-medium transition-transform hover:scale-[1.02]"
              style={{ background: tokens.color.ink, color: '#fff', boxShadow: tokens.shadow.md }}>
              {isLast ? 'Ver resumen' : 'Siguiente decisión'} <ChevronRight size={14} />
            </button>
          )}
        </div>
      </section>
    </div>
  );
}

/* ============================================================
   ResultSummary
   ============================================================ */

interface ResultSummaryProps {
  score: { pct: number; correct: number; total: number };
  takeaways: string[];
  onRestart: () => void;
}

function ResultSummary({ score, takeaways, onRestart }: ResultSummaryProps) {
  const isPerfect = score.pct === 100;
  const isPassing = score.pct >= 60;

  return (
    <div className="space-y-5">
      {/* Result card */}
      <section className="rounded-[24px] p-8 lg:p-10 relative overflow-hidden text-white"
               style={{ background: 'linear-gradient(135deg, #0B1F3A 0%, #16335E 60%, #0B1F3A 100%)' }}>
        <div className="absolute -top-32 -right-20 w-[500px] h-[500px] rounded-full opacity-25 blur-3xl bg-accent" />
        <div className="relative grid lg:grid-cols-[auto_1fr] gap-6 items-center">
          <div className="shrink-0">
            <div className="w-20 h-20 lg:w-24 lg:h-24 rounded-2xl flex items-center justify-center bg-accent text-ink">
              <Trophy size={32} />
            </div>
          </div>
          <div>
            <div className="text-[10.5px] tracking-[0.22em] uppercase mb-1 text-accent">
              {isPerfect ? 'Caso superado · perfecto' : isPassing ? 'Caso superado' : 'Caso revisado'}
            </div>
            <h2 className="font-serif italic leading-[1.1] tracking-tight" style={{ fontSize: 'clamp(28px, 3.6vw, 44px)' }}>
              {score.correct} de {score.total} <span className="text-accent">correctas</span>
            </h2>
            <p className="mt-3 text-[13.5px] leading-relaxed text-muted-soft max-w-[480px]">
              {isPerfect
                ? 'Has tomado todas las decisiones correctas. Tienes claro qué hacer en este escenario.'
                : isPassing
                  ? 'Has aprobado el caso. Revisa las explicaciones de las decisiones donde fallaste — son los puntos que te conviene repasar.'
                  : 'Vuelve a revisar el caso con calma. Las explicaciones de cada decisión son la parte importante: ahí está lo que necesitas aprender.'}
            </p>
          </div>
        </div>
      </section>

      {/* Takeaways */}
      <section className="rounded-[20px] p-6 lg:p-8 bg-surface border border-line shadow-soft-md">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles size={14} className="text-accent" />
          <span className="text-[10.5px] tracking-[0.22em] uppercase text-accent-deep">Lo que te llevas</span>
        </div>
        <ul className="space-y-3">
          {takeaways.map((t, i) => (
            <li key={i} className="flex items-start gap-2.5 text-[13.5px] leading-relaxed text-ink-soft">
              <CheckCircle2 size={14} className="shrink-0 mt-0.5 text-accent" />
              <span>{t}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Acciones */}
      <div className="flex items-center gap-2 flex-wrap">
        <button onClick={onRestart}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-[12.5px] font-medium bg-bg-deep text-ink-soft hover:bg-line transition-colors">
          <RefreshCw size={13} /> Volver a hacer el caso
        </button>
        <Link href="/app/casos-practicos"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-[12.5px] font-medium bg-ink text-white hover:scale-[1.02] transition-transform shadow-soft-md">
          Siguiente caso <ChevronRight size={13} />
        </Link>
      </div>

      {/* Legal */}
      <div className="mt-2 rounded-xl p-4 flex items-start gap-3 text-[11.5px] leading-relaxed bg-warn-soft text-warn border border-accent-soft">
        <AlertTriangle size={14} className="shrink-0 mt-0.5" />
        <span>
          Caso simulado con fines formativos. Las situaciones reales pueden incluir matices adicionales. Ante dudas en tu caso concreto, consulta con gestoría, ingeniero o asesor fiscal.
        </span>
      </div>
    </div>
  );
}
