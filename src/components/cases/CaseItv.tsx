'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, ArrowRight, CheckCircle2, FileSearch, Save, Wrench } from 'lucide-react';
import {
  REFORM_LABELS,
  buildRegistrationDecision,
  type ApprovalType,
  type ReformKey,
  type RegistrationCase,
} from '@/domain/registration';
import { useRegistrationCases } from '@/providers/RegistrationCaseProvider';
import { cn } from '@/lib/cn';
import { CaseHeader, CaseTabs, TrustPanel } from './CaseChrome';

const TECHNICAL_LABELS = {
  'eu-coc': 'Homologación UE + COC válido',
  'eu-reduced-sheet': 'Homologación UE + posible ficha reducida',
  'eea-equivalence-review': 'Equivalencia o autorización española',
  'spanish-individual-approval': 'Posible homologación individual española',
  'special-review': 'Revisión técnica especial',
} as const;

export function CaseItv({ registrationCase }: { registrationCase: RegistrationCase }) {
  const { persistent, saveCase } = useRegistrationCases();
  const [working, setWorking] = useState(registrationCase);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    setWorking(registrationCase);
    if (!persistent) {
      setFeedback(null);
      setError(null);
    }
  }, [persistent, registrationCase]);
  const decision = buildRegistrationDecision(working);
  const technicalDocs = decision.requiredDocuments.filter((document) => document.requiredFor.includes('itv'));
  const updateVehicle = <K extends keyof RegistrationCase['vehicle']>(key: K, value: RegistrationCase['vehicle'][K]) => {
    if (!persistent) return;
    setWorking((current) => ({ ...current, vehicle: { ...current.vehicle, [key]: value }, updatedAt: new Date().toISOString() }));
  };
  const save = async () => {
    if (!persistent) return;
    setBusy(true); setFeedback(null); setError(null);
    try { await saveCase(working); setFeedback('Datos técnicos guardados y ruta recalculada.'); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'No se han podido guardar los datos.'); }
    finally { setBusy(false); }
  };

  return (
    <div className="mx-auto max-w-[1280px] px-5 pb-16 pt-6 lg:px-8">
      <CaseHeader registrationCase={working} processKind={decision.processKind} />
      <div className="mt-4"><CaseTabs caseId={working.id} active="itv" /></div>
      {!persistent && <div className="mt-4 rounded-xl border border-accent/25 bg-accent-soft p-3 text-[11px] text-accent-deep" role="status">Modo solo lectura: puedes consultar la ruta y los datos guardados, pero no modificarlos ni recalcularlos.</div>}

      <section className={cn('mt-6 rounded-[22px] border p-5 lg:p-6', decision.technicalPath.blocking ? 'border-warn/25 bg-warn-soft' : 'border-ok/20 bg-ok-soft')}>
        <div className="flex items-start gap-3">
          {decision.technicalPath.blocking ? <AlertTriangle size={20} className="mt-1 shrink-0 text-warn" /> : <CheckCircle2 size={20} className="mt-1 shrink-0 text-ok" />}
          <div>
            <div className="text-[9.5px] uppercase tracking-[0.18em] text-muted">Ruta técnica calculada</div>
            <h2 className="mt-1 font-serif text-[29px] leading-tight text-ink">{TECHNICAL_LABELS[decision.technicalPath.outcome]}</h2>
            <p className="mt-2 max-w-3xl text-[12px] leading-relaxed text-ink-soft">{decision.technicalPath.reason}</p>
            {decision.technicalPath.missingData.length > 0 && <p className="mt-3 text-[11px] font-medium text-warn">Falta: {decision.technicalPath.missingData.join(' · ')}</p>}
          </div>
        </div>
      </section>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.1fr_.9fr]">
        <section className="rounded-[22px] border border-line bg-surface p-5 shadow-soft-sm lg:p-6">
          <div className="flex items-center gap-2"><FileSearch size={17} className="text-accent-deep" /><h3 className="font-serif text-[23px]">Identificación técnica</h3></div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Field label="Campo K" hint="Copia exacta del documento"><input value={working.vehicle.fieldK ?? ''} disabled={!persistent} onChange={(event) => updateVehicle('fieldK', event.target.value || null)} className={inputClass} /></Field>
            <Field label="Número de homologación"><input value={working.vehicle.approvalNumber ?? ''} disabled={!persistent} onChange={(event) => updateVehicle('approvalNumber', event.target.value || null)} className={inputClass} /></Field>
            <Field label="Tipo de homologación"><select value={working.vehicle.approvalType} disabled={!persistent} onChange={(event) => updateVehicle('approvalType', event.target.value as ApprovalType)} className={inputClass}><option value="unknown">Pendiente</option><option value="eu-type">Homologación de tipo UE</option><option value="spanish-type">Nacional española</option><option value="individual-eea">Individual EEE</option><option value="individual-eu">Individual UE</option><option value="individual-spain">Individual española</option><option value="short-series-eea">Serie corta EEE</option><option value="none">No identificada</option></select></Field>
            <Field label="COC disponible"><select value={nullableBool(working.vehicle.cocAvailable)} disabled={!persistent} onChange={(event) => updateVehicle('cocAvailable', parseNullableBool(event.target.value))} className={inputClass}><option value="unknown">Pendiente</option><option value="yes">Sí</option><option value="no">No</option></select></Field>
            <Field label="Documento técnico extranjero"><select value={nullableBool(working.vehicle.foreignTechnicalDocumentAvailable)} disabled={!persistent} onChange={(event) => updateVehicle('foreignTechnicalDocumentAvailable', parseNullableBool(event.target.value))} className={inputClass}><option value="unknown">Pendiente</option><option value="yes">Disponible</option><option value="no">No disponible</option></select></Field>
            <Field label="Certificado de inspección extranjero"><select value={nullableBool(working.vehicle.foreignInspectionCertificateAvailable)} disabled={!persistent} onChange={(event) => updateVehicle('foreignInspectionCertificateAvailable', parseNullableBool(event.target.value))} className={inputClass}><option value="unknown">Pendiente</option><option value="yes">Disponible</option><option value="no">No disponible</option></select></Field>
            {working.vehicle.cocAvailable === true && <label className="flex items-center gap-2 rounded-xl border border-line bg-surface-alt p-3 text-[11px]"><input type="checkbox" checked={working.vehicle.cocValidityConfirmed} disabled={!persistent} onChange={(event) => updateVehicle('cocValidityConfirmed', event.target.checked)} className="accent-[#1F7A4D]" /> Validez del COC contrastada</label>}
            {working.vehicle.cocAvailable === true && <label className="flex items-center gap-2 rounded-xl border border-line bg-surface-alt p-3 text-[11px]"><input type="checkbox" checked={working.vehicle.cocVinMatchConfirmed} disabled={!persistent} onChange={(event) => updateVehicle('cocVinMatchConfirmed', event.target.checked)} className="accent-[#1F7A4D]" /> VIN del COC coincide</label>}
          </div>
          <div className="mt-5 rounded-xl bg-bg p-4 text-[11px] leading-relaxed text-ink-soft">
            <strong className="text-ink">Inspección extranjera:</strong> se registra por separado el documento, su fecha y su vigencia. No se presupone que una ITV extranjera vigente sea siempre el requisito universal para matricular; la estación determina la inspección previa y el posible reconocimiento aplicable.
          </div>
          <button type="button" disabled={busy || !persistent} onClick={() => void save()} className="mt-5 inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-[12px] font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"><Save size={13} /> {busy ? 'Guardando…' : persistent ? 'Guardar y recalcular' : 'Solo lectura'}</button>
          {(feedback || error) && <p className={cn('mt-3 text-[11px]', error ? 'text-danger' : 'text-ok')} role="status">{error ?? feedback}</p>}
        </section>

        <section className="rounded-[22px] border border-line bg-surface p-5 lg:p-6">
          <div className="flex items-center gap-2"><Wrench size={17} className="text-accent-deep" /><h3 className="font-serif text-[23px]">Posibles reformas</h3></div>
          <p className="mt-2 text-[11px] leading-relaxed text-ink-soft">Marca modificaciones conocidas. El resultado sólo señala si procede revisar el Manual; no garantiza un resultado favorable o desfavorable.</p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
            {(Object.keys(REFORM_LABELS) as ReformKey[]).map((key) => (
              <label key={key} className={cn('flex items-center gap-2 rounded-xl border px-3 py-2.5 text-[10.5px]', persistent ? 'cursor-pointer' : 'cursor-not-allowed opacity-60', working.vehicle.reforms[key] ? 'border-warn/30 bg-warn-soft text-warn' : 'border-line bg-surface-alt text-ink-soft')}>
                <input type="checkbox" checked={working.vehicle.reforms[key] === true} disabled={!persistent} onChange={(event) => updateVehicle('reforms', { ...working.vehicle.reforms, [key]: event.target.checked })} className="accent-[#C8862E]" /> {REFORM_LABELS[key]}
              </label>
            ))}
          </div>
        </section>
      </div>

      <section className="mt-5 rounded-[22px] border border-line bg-surface p-5 lg:p-6">
        <div className="flex items-end justify-between gap-3"><div><div className="text-[9.5px] uppercase tracking-[0.18em] text-muted">Para preparar la estación</div><h3 className="mt-1 font-serif text-[23px]">Documentación técnica aplicable</h3></div><Link href={`/app/expedientes/${working.id}/documentos`} className="inline-flex items-center gap-1 text-[11px] font-medium text-accent-deep">{persistent ? 'Gestionar' : 'Ver documentos'} <ArrowRight size={12} /></Link></div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {technicalDocs.map((document) => <div key={document.type} className="rounded-xl bg-bg p-3.5"><div className="text-[11.5px] font-medium text-ink">{document.title}</div><p className="mt-1 text-[10px] leading-relaxed text-muted">{document.reason}</p>{document.conditional && <span className="mt-2 inline-flex text-[8.5px] uppercase tracking-[0.1em] text-accent-deep">Sólo si aplica</span>}</div>)}
        </div>
      </section>

      <div className="mt-5"><TrustPanel title="Fuente y alcance de la ruta ITV" sources={decision.sources.filter((source) => source.id.includes('industry') || source.id.includes('rd-750') || source.id.includes('rd-866'))} scope="Ruta técnica previa a matriculación. La documentación final depende de homologación, vehículo, estación y reformas constatadas." usedData={[`Campo K: ${working.vehicle.fieldK || 'pendiente'}`, `Homologación: ${working.vehicle.approvalType}`, `COC: ${nullableBool(working.vehicle.cocAvailable)}`]} missingData={decision.technicalPath.missingData} /></div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) { return <label><span className="block text-[10.5px] font-medium text-ink">{label}</span>{hint && <span className="mt-0.5 block text-[9.5px] text-muted">{hint}</span>}<span className="mt-1.5 block">{children}</span></label>; }
const inputClass = 'w-full rounded-xl border border-line bg-surface-alt px-3 py-2.5 text-[12px] text-ink outline-none focus:border-accent disabled:cursor-not-allowed disabled:opacity-60';
function nullableBool(value: boolean | null): string { return value === null ? 'unknown' : value ? 'yes' : 'no'; }
function parseNullableBool(value: string): boolean | null { return value === 'unknown' ? null : value === 'yes'; }
