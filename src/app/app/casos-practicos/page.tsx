'use client';

import Link from 'next/link';
import { ChevronLeft, ChevronRight, Clock, CheckCircle2, AlertTriangle, BookOpen } from 'lucide-react';
import { PRACTICAL_CASES } from '@/data/practical-cases';
import { useCourse } from '@/providers/CourseProvider';
import { DifficultyBadge } from '@/components/ui/DifficultyBadge';
import { ModuleGate } from '@/components/access/ModuleGate';

export default function CasosPracticosPage() {
  return (
    <ModuleGate
      requiresFounder
      moduleName="Casos prácticos"
      moduleCode="M.08"
      description="5 escenarios reales para poner a prueba lo aprendido: Alemania COC, Francia sin COC, Holanda factura empresa, datos dudosos, posible reforma."
      icon={BookOpen}
    >
      <CasosContent />
    </ModuleGate>
  );
}

function CasosContent() {
  const { completedCases } = useCourse();
  const doneCount = completedCases.length;
  const total = PRACTICAL_CASES.length;
  const progressPct = Math.round((doneCount / total) * 100);

  return (
    <div className="min-h-screen bg-bg">
      <div className="px-5 lg:px-8 pt-6 pb-12 max-w-[1280px] mx-auto">
        <Link href="/app/dashboard" className="mb-4 inline-flex items-center gap-2 text-[12.5px] text-muted hover:text-ink">
          <ChevronLeft size={14} /> Volver al centro de control
        </Link>

        <div className="mb-7 flex items-end justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10.5px] font-mono tracking-wider text-muted">M.08</span>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[10.5px] font-medium tracking-[0.04em] uppercase rounded-full bg-accent-soft text-accent-deep">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-accent" />
                Caso guiado
              </span>
            </div>
            <h1 className="font-serif text-ink leading-[1] tracking-tight" style={{ fontSize: 'clamp(32px, 3.6vw, 48px)' }}>
              Casos <span className="italic text-accent">prácticos</span>
            </h1>
            <p className="mt-3 max-w-[640px] text-[14px] leading-relaxed text-ink-soft">
              5 escenarios reales para poner a prueba lo aprendido. Cada caso plantea una historia con sus documentos, decisiones y consecuencias.
            </p>
          </div>

          <div className="rounded-2xl p-4 min-w-[220px] bg-surface border border-line">
            <div className="text-[10.5px] tracking-[0.18em] uppercase mb-2 text-muted">Casos resueltos</div>
            <div className="flex items-baseline gap-1 mb-2">
              <span className="font-serif text-ink leading-none" style={{ fontSize: 32 }}>{doneCount}</span>
              <span className="text-muted">/ {total} · {progressPct}%</span>
            </div>
            <div className="h-[3px] rounded-full overflow-hidden bg-line-soft">
              <div className="h-full bg-accent transition-all" style={{ width: `${progressPct}%` }} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {PRACTICAL_CASES.map(c => {
            const isDone = completedCases.includes(c.id);
            return (
              <Link key={c.id} href={`/app/casos-practicos/${c.id}`}
                className="block rounded-[18px] p-5 bg-surface border shadow-soft-sm hover:shadow-soft-md hover:-translate-y-0.5 transition-all relative overflow-hidden group"
                style={{ borderColor: isDone ? 'var(--color-ok)' : 'var(--color-line)' }}>
                <div className="absolute top-4 right-4 text-[48px] opacity-20 leading-none select-none pointer-events-none">{c.flag}</div>
                <div className="relative">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="text-[10.5px] font-mono tracking-wider text-muted">CASO {c.n}</span>
                    <DifficultyBadge difficulty={c.difficulty} />
                    {isDone && (
                      <span className="inline-flex items-center gap-1 text-[9.5px] tracking-[0.04em] uppercase px-1.5 py-0.5 rounded font-semibold bg-ok-soft text-ok">
                        <CheckCircle2 size={9} /> Superado
                      </span>
                    )}
                  </div>
                  <h3 className="font-medium text-[17px] text-ink leading-tight mb-1">{c.title}</h3>
                  <div className="text-[11.5px] text-muted mb-3 flex items-center gap-2">
                    <span>{c.origin}</span>
                    <span className="opacity-50">·</span>
                    <span className="flex items-center gap-1"><Clock size={10} /> {c.estimatedMinutes} min</span>
                  </div>
                  <p className="text-[12.5px] text-ink-soft leading-relaxed mb-4">{c.pitch}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-muted">{c.decisions.length} decisiones · {c.documents.length} documentos</span>
                    <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-ink group-hover:text-accent transition-colors">
                      {isDone ? 'Revisar' : 'Empezar'} <ChevronRight size={13} />
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        <div className="mt-8 rounded-xl p-4 flex items-start gap-3 text-[11.5px] leading-relaxed bg-warn-soft text-warn border border-accent-soft">
          <AlertTriangle size={14} className="shrink-0 mt-0.5" />
          <span>Los casos son simulaciones orientativas. Las situaciones reales pueden incluir matices adicionales — ante dudas, consulta con gestoría, ingeniero o asesor fiscal.</span>
        </div>
      </div>
    </div>
  );
}
