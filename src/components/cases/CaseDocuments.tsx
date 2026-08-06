'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ExternalLink, FileText, Save } from 'lucide-react';
import { buildRegistrationDecision, sourcesForIds, type DocumentStatus, type RegistrationCase, type RequiredDocument } from '@/domain/registration';
import type { CaseDocumentRecord } from '@/lib/registration/case-repository';
import { cn } from '@/lib/cn';
import { createDocumentDraft, useRegistrationCases } from '@/providers/RegistrationCaseProvider';
import { CaseHeader, CaseTabs, TrustPanel } from './CaseChrome';

const STATUS_OPTIONS: Array<[DocumentStatus, string]> = [
  ['not-requested', 'No solicitado'], ['pending', 'Pendiente'], ['received', 'Disponible'],
  ['in-review', 'En revisión del usuario'], ['verified', 'Revisado por el usuario'], ['issue', 'Con incidencia'],
  ['replaced', 'Sustituido'], ['not-applicable', 'No aplicable'],
];

export function CaseDocuments({ registrationCase }: { registrationCase: RegistrationCase }) {
  const decision = buildRegistrationDecision(registrationCase);
  const { getDocument, persistent, updateDocument } = useRegistrationCases();
  const counts = useMemo(() => {
    const statuses = decision.requiredDocuments.map((item) => getDocument(registrationCase.id, item.type)?.status ?? item.status);
    return { total: statuses.length, pending: statuses.filter((status) => ['not-requested', 'pending'].includes(status)).length, reviewed: statuses.filter((status) => status === 'verified').length, issue: statuses.filter((status) => status === 'issue').length };
  }, [decision.requiredDocuments, getDocument, registrationCase.id]);
  return <div className="mx-auto max-w-[1280px] px-5 pb-16 pt-6 lg:px-8"><CaseHeader registrationCase={registrationCase} processKind={decision.processKind} /><div className="mt-4"><CaseTabs caseId={registrationCase.id} active="documents" /></div>
    <header className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><div className="text-[10px] uppercase tracking-[0.2em] text-accent-deep">Control documental</div><h2 className="mt-1 font-serif text-[32px] text-ink">Documentos de este expediente</h2><p className="mt-2 max-w-2xl text-[12.5px] leading-relaxed text-ink-soft">Registra manualmente disponibilidad, datos e incidencias. MatriculaPro no recibe ni almacena archivos y no certifica la autenticidad de un documento.</p></div><Link href="/app/biblioteca" className="inline-flex items-center gap-2 text-[12px] font-medium text-accent-deep">Abrir biblioteca <ExternalLink size={13} /></Link></header>
    <section className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">{[['Dinámicos', counts.total], ['Pendientes', counts.pending], ['Revisados por ti', counts.reviewed], ['Incidencias', counts.issue]].map(([label, value]) => <div key={String(label)} className="rounded-2xl border border-line bg-surface p-4"><div className="font-serif text-[28px] leading-none">{value}</div><div className="mt-1 text-[9.5px] uppercase tracking-[0.15em] text-muted">{label}</div></div>)}</section>
    <div className={cn('mt-5 rounded-xl px-4 py-3 text-[11.5px]', persistent ? 'bg-ok-soft text-ok' : 'bg-accent-soft text-accent-deep')}>{persistent ? 'Solo se guardan estados y metadatos escritos manualmente. No hay carga de archivos, OCR ni análisis automático.' : 'Modo lectura: puedes consultar los estados guardados, pero necesitas una licencia activa para modificarlos.'}</div>
    <section className="mt-5 space-y-3">{decision.requiredDocuments.map((required) => <DocumentEditor key={required.type} registrationCase={registrationCase} required={required} initial={getDocument(registrationCase.id, required.type)} writable={persistent} onSave={updateDocument} />)}</section>
    <div className="mt-5"><TrustPanel title="Fuentes de la lista documental" sources={decision.sources} scope="Lista de preparación según los datos actuales. El organismo competente puede pedir aclaraciones justificadas por el caso." missingData={decision.blockers.flatMap((blocker) => blocker.missingData)} /></div>
  </div>;
}

function DocumentEditor({ registrationCase, required, initial, writable, onSave }: { registrationCase: RegistrationCase; required: RequiredDocument; initial: CaseDocumentRecord | null; writable: boolean; onSave: (document: CaseDocumentRecord) => Promise<CaseDocumentRecord> }) {
  const [draft, setDraft] = useState(() => initial ?? createDocumentDraft(registrationCase.id, required.type, required.status));
  const [open, setOpen] = useState(Boolean(initial));
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { if (initial) setDraft(initial); }, [initial]);
  const save = async () => { setBusy(true); setFeedback(null); setError(null); try { const saved = await onSave({ ...draft, fileName: null, storagePath: null }); setDraft(saved); setFeedback('Estado documental actualizado.'); } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se ha podido guardar.'); } finally { setBusy(false); } };
  const sources = sourcesForIds(required.sourceIds);
  return <article className="overflow-hidden rounded-2xl border border-line bg-surface shadow-soft-sm"><button type="button" onClick={() => setOpen((value) => !value)} className="flex w-full items-start gap-3 p-4 text-left lg:p-5"><span className={cn('mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', statusStyle(draft.status))}><FileText size={16} /></span><span className="min-w-0 flex-1"><span className="flex flex-wrap items-center gap-2"><strong className="text-[13px] text-ink">{required.title}</strong>{required.conditional && <span className="rounded-full bg-bg-deep px-2 py-0.5 text-[9px] uppercase tracking-[0.1em] text-muted">Condicional</span>}</span><span className="mt-1 block text-[11px] leading-relaxed text-ink-soft">{required.reason}</span><span className="mt-2 block text-[9.5px] uppercase tracking-[0.1em] text-muted">Se usa en: {required.requiredFor.map(useLabel).join(' · ')}</span></span><span className={cn('shrink-0 rounded-full px-2.5 py-1 text-[9.5px] font-semibold', statusStyle(draft.status))}>{statusLabel(draft.status)}</span></button>
    {open && <div className="border-t border-line-soft bg-surface-alt p-4 lg:p-5"><fieldset disabled={!writable || busy} className="grid gap-4 disabled:opacity-70 md:grid-cols-2 lg:grid-cols-4"><DocField label="Estado"><select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as DocumentStatus })} className={inputClass}>{STATUS_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></DocField><DocField label="Fecha del documento"><input type="date" value={draft.documentDate ?? ''} onChange={(event) => setDraft({ ...draft, documentDate: event.target.value || null })} className={inputClass} /></DocField><DocField label="Emisor declarado"><input value={draft.issuer ?? ''} onChange={(event) => setDraft({ ...draft, issuer: event.target.value || null })} className={inputClass} /></DocField><DocField label="Número o referencia"><input value={draft.documentNumber ?? ''} onChange={(event) => setDraft({ ...draft, documentNumber: event.target.value || null })} className={inputClass} /></DocField><DocField label="Observaciones" wide><textarea rows={3} value={draft.notes} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} className={inputClass} /></DocField><DocField label="Incidencia" wide><textarea rows={3} value={draft.incident} onChange={(event) => setDraft({ ...draft, incident: event.target.value })} className={inputClass} /></DocField></fieldset>
      <div className="mt-4 flex flex-wrap items-center gap-3"><label className="inline-flex items-center gap-2 text-[11px] text-ink-soft"><input type="checkbox" disabled={!writable || busy} checked={draft.manuallyVerified} onChange={(event) => setDraft({ ...draft, manuallyVerified: event.target.checked, status: event.target.checked ? 'verified' : 'in-review' })} className="accent-[#1F7A4D]" /> He revisado manualmente estos datos; no implica validación oficial.</label><button type="button" disabled={!writable || busy} onClick={() => void save()} className="ml-auto inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-[11px] font-medium text-white disabled:opacity-45"><Save size={12} /> {busy ? 'Guardando…' : 'Guardar estado'}</button></div>
      {(feedback || error) && <p className={cn('mt-3 text-[11px]', error ? 'text-danger' : 'text-ok')} role="status">{error ?? feedback}</p>}{sources.length > 0 && <p className="mt-3 border-t border-line-soft pt-3 text-[10px] text-muted">Referencia: {sources.map((source) => `${source.authority} (${source.reviewedAt})`).join(' · ')}</p>}</div>}
  </article>;
}

function DocField({ label, wide, children }: { label: string; wide?: boolean; children: React.ReactNode }) { return <label className={wide ? 'md:col-span-2' : ''}><span className="mb-1.5 block text-[10.5px] font-medium text-ink">{label}</span>{children}</label>; }
const inputClass = 'w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-[12px] text-ink outline-none focus:border-accent';
function statusStyle(status: DocumentStatus) { if (status === 'verified') return 'bg-ok-soft text-ok'; if (status === 'issue') return 'bg-danger-soft text-danger'; if (status === 'not-applicable') return 'bg-bg-deep text-muted'; return 'bg-accent-soft text-accent-deep'; }
function statusLabel(status: DocumentStatus) { return STATUS_OPTIONS.find(([value]) => value === status)?.[1] ?? status; }
function useLabel(value: RequiredDocument['requiredFor'][number]) { return ({ ownership: 'titularidad', itv: 'ITV', 'purchase-tax': 'adquisición', 'registration-tax': 'IEDMT', ivtm: 'IVTM', dgt: 'DGT', insurance: 'seguro' })[value]; }

