'use client';

import Link from 'next/link';
import {
  AlertCircle, ArrowRight, CheckCircle2, CircleDashed, FileCheck2,
  FileWarning, Printer, ReceiptText, ShieldAlert,
} from 'lucide-react';
import { buildRegistrationDecision, sourcesForIds, type RegistrationCase } from '@/domain/registration';
import { useRegistrationCases } from '@/providers/RegistrationCaseProvider';
import { cn } from '@/lib/cn';
import {
  CaseHeader, CaseTabs, TrustPanel, formatMoney, nextActionHref,
} from './CaseChrome';

export function CaseOverview({ registrationCase }: { registrationCase: RegistrationCase }) {
  const decision = buildRegistrationDecision(registrationCase);
  const { getDocument } = useRegistrationCases();
  const documentStates = decision.requiredDocuments.map((required) => getDocument(registrationCase.id, required.type)?.status ?? required.status);
  const docCounts = {
    required: decision.requiredDocuments.filter((document) => !document.conditional).length,
    received: documentStates.filter((status) => ['received', 'in-review', 'verified'].includes(status)).length,
    reviewed: documentStates.filter((status) => status === 'verified').length,
    issue: documentStates.filter((status) => status === 'issue').length,
    notApplicable: documentStates.filter((status) => status === 'not-applicable').length,
  };
  const next = decision.nextAction;
  const sourceIds = next?.sourceIds ?? [];

  return (
    <div className="print-report mx-auto max-w-[1280px] px-5 pb-14 pt-6 lg:px-8">
      <CaseHeader registrationCase={registrationCase} processKind={decision.processKind} />
      <div className="mt-4"><CaseTabs caseId={registrationCase.id} active="summary" /></div>
      <div className="print-shell-hidden mt-4 flex justify-end">
        <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-2 text-[11.5px] font-medium text-ink shadow-soft-sm">
          <Printer size={13} /> Guardar informe personal en PDF
        </button>
      </div>

      {!decision.supportedScope && (
        <section className="mt-5 flex gap-3 rounded-2xl border border-warn/25 bg-warn-soft p-4 text-warn">
          <ShieldAlert size={19} className="mt-0.5 shrink-0" />
          <div>
            <h2 className="text-[13px] font-semibold">Este expediente necesita revisión especial</h2>
            <p className="mt-1 text-[12px] leading-relaxed">La herramienta ha detectado un dato fuera del ámbito ordinario fiable. Mantiene la ruta abierta, pero no dará una conclusión automática hasta resolver los bloqueos.</p>
          </div>
        </section>
      )}

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
        <section className="rounded-[22px] border border-line bg-surface p-5 shadow-soft-sm lg:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[9.5px] font-semibold uppercase tracking-[0.2em] text-accent-deep">Siguiente acción</div>
              <h2 className="mt-2 font-serif text-[27px] leading-tight text-ink">{next?.title ?? 'Expediente operativo completo'}</h2>
            </div>
            <span className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl', next?.status === 'blocked' ? 'bg-danger-soft text-danger' : 'bg-accent-soft text-accent-deep')}>
              {next?.status === 'blocked' ? <AlertCircle size={20} /> : <ArrowRight size={20} />}
            </span>
          </div>
          <p className="mt-3 max-w-2xl text-[13px] leading-relaxed text-ink-soft">
            {next?.description ?? 'No quedan tareas calculadas. Revisa los justificantes y confirma el cierre antes de circular.'}
          </p>
          {next && (
            <Link href={nextActionHref(registrationCase.id, next.category)} className="mt-5 inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-[12.5px] font-medium text-white hover:bg-ink/90">
              Completar esta acción <ArrowRight size={14} />
            </Link>
          )}
          {next && (
            <div className="mt-5 border-t border-line-soft pt-4 text-[11px] text-muted">
              Motivo calculado con los datos actuales · {decision.sources.filter((source) => sourceIds.includes(source.id)).map((source) => source.authority).join(' · ') || 'Revisión del expediente'}
            </div>
          )}
        </section>

        <section className="rounded-[22px] border border-line bg-surface p-5 shadow-soft-sm lg:p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-[22px] text-ink">Bloqueos activos</h2>
            <span className={cn('rounded-full px-2.5 py-1 text-[11px] font-semibold', decision.blockers.length ? 'bg-danger-soft text-danger' : 'bg-ok-soft text-ok')}>
              {decision.blockers.length}
            </span>
          </div>
          <div className="mt-4 space-y-3">
            {decision.blockers.length === 0 ? (
              <div className="flex items-start gap-2.5 rounded-xl bg-ok-soft p-3 text-[12px] text-ok">
                <CheckCircle2 size={16} className="mt-0.5 shrink-0" /> No hay bloqueos calculados con los datos actuales.
              </div>
            ) : decision.blockers.slice(0, 4).map((blocker) => (
              <div key={blocker.id} className="rounded-xl border border-danger/15 bg-danger-soft/45 p-3">
                <div className="flex gap-2 text-[12px] font-medium text-danger"><AlertCircle size={14} className="mt-0.5 shrink-0" /> {blocker.title}</div>
                <p className="mt-1 pl-[22px] text-[11px] leading-relaxed text-ink-soft">{blocker.reason}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section id="ruta" className="mt-5 scroll-mt-6 rounded-[22px] border border-line bg-surface p-5 shadow-soft-sm lg:p-6">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-2">
          <div>
            <div className="text-[9.5px] uppercase tracking-[0.2em] text-muted">Progreso operativo</div>
            <h2 className="mt-1 font-serif text-[25px] text-ink">La ruta de este vehículo</h2>
          </div>
          <Link href="/app/ruta" className="text-[11.5px] font-medium text-accent-deep hover:underline">Abrir explicación general</Link>
        </div>
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-7">
          {decision.route.map((step) => (
            <div key={step.id} className={cn(
              'rounded-2xl border p-3.5',
              step.status === 'completed' && 'border-ok/20 bg-ok-soft/60',
              step.status === 'blocked' && 'border-danger/20 bg-danger-soft/55',
              step.status === 'current' && 'border-accent/35 bg-accent-soft/65',
              ['pending', 'not-applicable'].includes(step.status) && 'border-line bg-surface-alt',
            )}>
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-[9.5px] text-muted">0{step.order}</span>
                {step.status === 'completed' ? <CheckCircle2 size={14} className="text-ok" /> : step.status === 'blocked' ? <AlertCircle size={14} className="text-danger" /> : <CircleDashed size={14} className={step.status === 'current' ? 'text-accent-deep' : 'text-muted'} />}
              </div>
              <h3 className="mt-3 text-[12px] font-semibold leading-tight text-ink">{step.title}</h3>
              <p className="mt-1.5 text-[10.5px] leading-relaxed text-ink-soft">{step.description}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <section className="rounded-[22px] border border-line bg-surface p-5 shadow-soft-sm">
          <div className="flex items-center gap-2"><FileCheck2 size={17} className="text-accent-deep" /><h2 className="font-serif text-[22px] text-ink">Documentación</h2></div>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
            {[
              ['Necesarios', docCounts.required], ['Recibidos', docCounts.received], ['Revisados por ti', docCounts.reviewed], ['Incidencias', docCounts.issue], ['No aplican', docCounts.notApplicable],
            ].map(([label, value]) => (
              <div key={String(label)} className="rounded-xl bg-bg p-3">
                <div className="font-serif text-[24px] leading-none text-ink">{value}</div>
                <div className="mt-1 text-[9.5px] uppercase tracking-[0.1em] text-muted">{label}</div>
              </div>
            ))}
          </div>
          <Link href={`/app/expedientes/${registrationCase.id}/documentos`} className="mt-4 inline-flex items-center gap-1.5 text-[12px] font-medium text-accent-deep">Gestionar documentos <ArrowRight size={13} /></Link>
        </section>

        <section className="rounded-[22px] border border-line bg-surface p-5 shadow-soft-sm">
          <div className="flex items-center gap-2"><ReceiptText size={17} className="text-accent-deep" /><h2 className="font-serif text-[22px] text-ink">Costes</h2></div>
          <div className="mt-4 space-y-2">
            {decision.estimatedCosts.map((cost) => (
              <div key={cost.id} className="flex items-center justify-between gap-4 rounded-xl bg-bg px-3.5 py-3">
                <div className="min-w-0">
                  <div className="truncate text-[12px] font-medium text-ink">{cost.title}</div>
                  <div className="mt-0.5 text-[10px] uppercase tracking-[0.1em] text-muted">{cost.kind === 'known' ? 'Conocido' : cost.kind === 'estimated' ? 'Estimado' : cost.kind === 'variable' ? 'Variable' : 'No calculable'}</div>
                </div>
                <div className="shrink-0 text-[12px] font-semibold text-ink">{formatMoney(cost.amount)}</div>
              </div>
            ))}
          </div>
          <Link href={`/app/expedientes/${registrationCase.id}/impuestos`} className="mt-4 inline-flex items-center gap-1.5 text-[12px] font-medium text-accent-deep">Revisar fiscalidad <ArrowRight size={13} /></Link>
        </section>
      </div>

      {decision.warnings.length > 0 && (
        <section className="mt-5 rounded-[22px] border border-line bg-surface p-5">
          <div className="flex items-center gap-2"><FileWarning size={17} className="text-warn" /><h2 className="font-serif text-[22px]">Avisos activados por este expediente</h2></div>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {decision.warnings.map((warning) => <div key={warning.id} className="rounded-xl bg-warn-soft p-3 text-[12px] text-warn"><strong>{warning.title}</strong><p className="mt-1 text-ink-soft">{warning.detail}</p></div>)}
          </div>
        </section>
      )}

      <div className="mt-5">
        <TrustPanel
          sources={decision.sources}
          scope="Preparación de matriculación en España. No presenta trámites ni sustituye la validación de DGT, AEAT, ITV o administración competente."
          usedData={[
            `${registrationCase.vehicle.category} · ${registrationCase.vehicle.registrationCountry || 'procedencia pendiente'}`,
            `${registrationCase.sellerType} · ${decision.vatVehicleStatus.outcome}`,
            `${decision.technicalPath.outcome} · ${decision.registrationTaxRoute.outcome}`,
          ]}
          missingData={Array.from(new Set(decision.blockers.flatMap((blocker) => blocker.missingData)))}
        />
      </div>
    </div>
  );
}
