'use client';

import Link from 'next/link';
import { ArrowRight, Building2, CheckCircle2, FileText, ShieldCheck, Stamp } from 'lucide-react';
import { buildRegistrationDecision, type RegistrationCase } from '@/domain/registration';
import { useRegistrationCases } from '@/providers/RegistrationCaseProvider';
import { cn } from '@/lib/cn';
import { CaseHeader, CaseTabs, TrustPanel } from './CaseChrome';

export function CaseDgt({ registrationCase }: { registrationCase: RegistrationCase }) {
  const decision = buildRegistrationDecision(registrationCase);
  const { getDocument } = useRegistrationCases();
  const documents = decision.requiredDocuments.filter((document) => document.requiredFor.includes('dgt'));
  const ready = documents.filter((document) => {
    const status = getDocument(registrationCase.id, document.type)?.status ?? document.status;
    return status === 'verified' || status === 'not-applicable';
  }).length;
  const isCompany = registrationCase.buyerType === 'company';

  return (
    <div className="mx-auto max-w-[1280px] px-5 pb-16 pt-6 lg:px-8">
      <CaseHeader registrationCase={registrationCase} processKind={decision.processKind} />
      <div className="mt-4"><CaseTabs caseId={registrationCase.id} active="dgt" /></div>

      <header className="mt-6 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-accent-deep">Preparación DGT</div>
          <h2 className="mt-1 font-serif text-[32px] text-ink">Solicitud según tu expediente</h2>
          <p className="mt-2 max-w-3xl text-[12.5px] leading-relaxed text-ink-soft">Esta lista se genera a partir de titularidad, vendedor, procedencia, ITV y decisión fiscal. COC, ficha reducida o Modelo 576 sólo aparecen cuando la ruta los necesita.</p>
        </div>
        <div className="rounded-2xl border border-line bg-surface px-4 py-3"><div className="font-serif text-[25px] leading-none">{ready}/{documents.length}</div><div className="mt-1 text-[9px] uppercase tracking-[0.12em] text-muted">Listos o no aplicables</div></div>
      </header>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.1fr_.9fr]">
        <section className="rounded-[22px] border border-line bg-surface p-5 shadow-soft-sm lg:p-6">
          <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><FileText size={17} className="text-accent-deep" /><h3 className="font-serif text-[23px]">Documentos calculados</h3></div><Link href={`/app/expedientes/${registrationCase.id}/documentos`} className="inline-flex items-center gap-1 text-[11px] font-medium text-accent-deep">Editar <ArrowRight size={12} /></Link></div>
          <div className="mt-4 space-y-2">
            {documents.map((document) => {
              const status = getDocument(registrationCase.id, document.type)?.status ?? document.status;
              const done = status === 'verified' || status === 'not-applicable';
              return <div key={document.type} className="flex items-start gap-3 rounded-xl bg-bg p-3.5"><span className={cn('mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full', done ? 'bg-ok-soft text-ok' : 'bg-accent-soft text-accent-deep')}>{done ? <CheckCircle2 size={13} /> : <FileText size={12} />}</span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="text-[11.5px] font-medium text-ink">{document.title}</span>{document.conditional && <span className="rounded-full bg-surface px-2 py-0.5 text-[8.5px] uppercase tracking-[0.1em] text-muted">si aplica</span>}</div><p className="mt-1 text-[10px] leading-relaxed text-muted">{document.reason}</p></div><span className="shrink-0 text-[9px] uppercase tracking-[0.1em] text-muted">{statusLabel(status)}</span></div>;
            })}
          </div>
        </section>

        <div className="space-y-5">
          <section className="rounded-[22px] border border-line bg-surface p-5">
            <div className="flex items-center gap-2"><Building2 size={16} className="text-accent-deep" /><h3 className="font-serif text-[22px]">Canal de presentación</h3></div>
            {isCompany ? (
              <div className="mt-4 rounded-xl bg-warn-soft p-4 text-[11.5px] leading-relaxed text-ink-soft"><strong className="text-warn">Persona jurídica:</strong> prepara la presentación electrónica y la representación aplicable. No se presupone la misma vía presencial que para una persona física.</div>
            ) : (
              <div className="mt-4 rounded-xl bg-bg p-4 text-[11.5px] leading-relaxed text-ink-soft"><strong className="text-ink">Persona física:</strong> comprueba en la Sede DGT los canales disponibles, la identificación y si actúa un representante.</div>
            )}
            <a href="https://sede.dgt.gob.es/es/vehiculos/matriculaciones-de-vehiculos/matriculacion-ordinaria/" target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-1 text-[11px] font-medium text-accent-deep">Abrir Sede DGT <ArrowRight size={12} /></a>
          </section>

          <section className="rounded-[22px] border border-line bg-ink p-5 text-white">
            <div className="flex items-center gap-2"><Stamp size={16} className="text-accent" /><h3 className="font-serif text-[22px]">Después de la asignación</h3></div>
            <ol className="mt-4 space-y-3 text-[11px] leading-relaxed text-muted-soft">
              <li className="flex gap-3"><span className="font-mono text-accent">01</span><span>Obtén de DGT el número de matrícula y el permiso o justificante aplicable.</span></li>
              <li className="flex gap-3"><span className="font-mono text-accent">02</span><span>Fabrica las placas después de que DGT asigne el número.</span></li>
              <li className="flex gap-3"><span className="font-mono text-accent">03</span><span>Activa o confirma el seguro antes de circular. Puede haberse preparado o condicionado a la matrícula definitiva con anterioridad.</span></li>
            </ol>
          </section>
        </div>
      </div>

      {decision.blockers.length > 0 && <section className="mt-5 rounded-[22px] border border-warn/25 bg-warn-soft p-5"><div className="flex items-center gap-2 text-warn"><ShieldCheck size={16} /><h3 className="font-serif text-[21px]">Antes de presentar</h3></div><ul className="mt-3 grid gap-2 md:grid-cols-2">{decision.blockers.map((blocker) => <li key={blocker.id} className="rounded-xl bg-white/45 p-3 text-[10.5px] leading-relaxed text-ink-soft"><strong className="text-ink">{blocker.title}:</strong> {blocker.reason}</li>)}</ul></section>}

      <div className="mt-5"><TrustPanel title="Fuente y alcance del paquete DGT" sources={decision.sources.filter((source) => source.id.startsWith('dgt-'))} scope="Preparación documental para matriculación. MatriculaPro no presenta la solicitud en nombre del usuario." usedData={[`Comprador: ${registrationCase.buyerType}`, `Vendedor: ${registrationCase.sellerType}`, `Fiscalidad: ${decision.registrationTaxRoute.outcome}`, `Técnica: ${decision.technicalPath.outcome}`]} missingData={decision.blockers.flatMap((blocker) => blocker.missingData)} /></div>
    </div>
  );
}

function statusLabel(status: string): string { return ({ 'not-requested': 'No solicitado', pending: 'Pendiente', received: 'Recibido', 'in-review': 'En revisión', verified: 'Revisado por ti', issue: 'Incidencia', replaced: 'Sustituido', 'not-applicable': 'No aplica' } as Record<string, string>)[status] ?? status; }
