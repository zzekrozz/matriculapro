'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle, Check, CheckCircle2, ChevronLeft, ChevronRight,
  FileText, Info, Lightbulb, RefreshCw, Save, Sparkles, UserRound,
} from 'lucide-react';
import { buildRegistrationDecision, type DocumentType } from '@/domain/registration';
import type { ChecklistDef, ChecklistItem } from '@/data/checklists';
import type { CaseChecklistRecord } from '@/lib/registration/case-repository';
import { useRegistrationCases } from '@/providers/RegistrationCaseProvider';
import { cn } from '@/lib/cn';

export function ChecklistScreen({ checklist }: { checklist: ChecklistDef }) {
  const {
    activeCase, loading, persistent, getChecklistItem, updateChecklistItem,
  } = useRegistrationCases();
  const c = useMemo(() => activeCase ? dynamicChecklist(checklist, activeCase) : checklist, [activeCase, checklist]);
  const records = useMemo(() => activeCase ? c.items.map((item, index) => (
    getChecklistItem(activeCase.id, c.storageKey, item.id) ?? createRecord(activeCase.id, c.storageKey, item, index)
  )) : [], [activeCase, c, getChecklistItem]);
  const doneCount = records.filter((record) => record.status === 'confirmed' || record.status === 'not-applicable').length;
  const criticalRecords = records.filter((record) => record.isCritical);
  const criticalDone = criticalRecords.filter((record) => record.status === 'confirmed' || record.status === 'not-applicable').length;
  const allCriticalDone = criticalDone === criticalRecords.length;

  if (loading) return <div className="px-5 py-20 text-center text-sm text-muted">Cargando checklist…</div>;
  if (!activeCase) return <div className="mx-auto max-w-xl px-5 py-20 text-center"><h1 className="font-serif text-3xl">Crea un expediente primero</h1><p className="mt-2 text-sm text-ink-soft">Las checklists operativas se guardan por vehículo.</p><Link href="/app/expedientes/nuevo" className="mt-5 inline-flex rounded-full bg-ink px-5 py-2.5 text-sm text-white">Crear expediente</Link></div>;

  const reset = async () => {
    if (!persistent) return;
    await Promise.all(records.map((record) => updateChecklistItem({ ...record, status: 'pending', confirmedAt: null })));
  };
  const documentOptions = buildRegistrationDecision(activeCase).requiredDocuments.map((document) => ({ value: document.type, label: document.title }));

  return (
    <div className="min-h-screen bg-bg">
      <div className="mx-auto max-w-[1100px] px-5 pb-12 pt-6 lg:px-8">
        <Link href={`/app/expedientes/${activeCase.id}`} className="mb-4 inline-flex items-center gap-2 text-[12px] text-muted hover:text-ink"><ChevronLeft size={14} /> Volver al expediente</Link>
        <header className="mb-7 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="mb-2 flex items-center gap-2"><span className="font-mono text-[10px] text-muted">{c.code}</span><span className="rounded-full bg-accent-soft px-2 py-0.5 text-[9.5px] font-medium uppercase tracking-[0.1em] text-accent-deep">{persistent ? 'Expediente editable' : 'Solo lectura'}</span></div>
            <h1 className="font-serif text-[38px] leading-none tracking-tight text-ink">{c.title.replace(c.titleAccent, '')}<span className="italic text-accent">{c.titleAccent}</span></h1>
            <p className="mt-3 max-w-[680px] text-[13px] leading-relaxed text-ink-soft">{c.subtitle}</p>
            <p className="mt-2 max-w-[680px] text-[11.5px] leading-relaxed text-muted">Vehículo: <strong className="text-ink">{activeCase.vehicle.brand} {activeCase.vehicle.model}</strong>. {c.intro}</p>
          </div>
          <div className="min-w-[240px] rounded-2xl border border-line bg-surface p-4"><div className="text-[9.5px] uppercase tracking-[0.16em] text-muted">Confirmaciones operativas</div><div className="mt-2 flex items-baseline gap-1"><span className="font-serif text-[30px] leading-none">{doneCount}</span><span className="text-[11px] text-muted">/ {records.length}</span></div><div className={cn('mt-2 flex items-center gap-1.5 text-[10px]', allCriticalDone ? 'text-ok' : 'text-danger')}><AlertTriangle size={11} /> Críticos: {criticalDone}/{criticalRecords.length}</div></div>
        </header>

        <div className="space-y-4">
          {c.sections.map((section) => {
            const items = c.items.filter((item) => item.section === section.id);
            return (
              <section key={section.id} className="overflow-hidden rounded-[18px] border border-line bg-surface shadow-soft-sm">
                <header className="border-b border-line bg-surface-alt px-5 py-4"><h2 className="text-[14px] font-medium text-ink">{section.title}</h2>{section.description && <p className="mt-0.5 text-[11px] text-ink-soft">{section.description}</p>}</header>
                <div className="divide-y divide-line">
                  {items.map((item) => {
                    const record = records.find((candidate) => candidate.itemKey === item.id) as CaseChecklistRecord;
                    return <ChecklistRow key={item.id} item={item} record={record} documentOptions={documentOptions} readOnly={!persistent} onSave={updateChecklistItem} />;
                  })}
                </div>
              </section>
            );
          })}
        </div>

        <section className="mt-6 rounded-[18px] border border-line bg-surface p-5"><div className="mb-3 flex items-center gap-2"><Lightbulb size={14} className="text-accent" /><span className="text-[10px] uppercase tracking-[0.2em] text-accent-deep">Criterios de uso</span></div><ul className="space-y-2">{c.tips.map((tip) => <li key={tip} className="flex items-start gap-2 text-[11.5px] leading-relaxed text-ink-soft"><Sparkles size={10} className="mt-1 shrink-0 text-accent" />{tip}</li>)}</ul></section>

        {doneCount === records.length && records.length > 0 && <div className="mt-6 rounded-2xl bg-ink p-5 text-white"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-ink"><CheckCircle2 size={18} /></span><div><div className="text-[9.5px] uppercase tracking-[0.18em] text-accent">Lista revisada</div><div className="mt-0.5 font-serif text-[20px]">Todas las filas tienen una decisión registrada</div></div>{c.nextStep && <Link href={c.nextStep.href.replace('/app/ruta', `/app/expedientes/${activeCase.id}`)} className="ml-auto hidden items-center gap-1 rounded-full bg-accent px-4 py-2 text-[11px] font-medium text-ink sm:inline-flex">{c.nextStep.label}<ChevronRight size={11} /></Link>}</div></div>}
        <div className="mt-5 flex justify-end">{persistent && doneCount > 0 && <button type="button" onClick={() => void reset()} className="inline-flex items-center gap-2 rounded-full bg-bg-deep px-4 py-2 text-[11px] text-ink-soft"><RefreshCw size={11} /> Reiniciar estados</button>}</div>
        {c.warning && <div className="mt-5 flex items-start gap-3 rounded-xl border border-accent-soft bg-warn-soft p-4 text-[11px] leading-relaxed text-warn"><AlertTriangle size={13} className="mt-0.5 shrink-0" />{c.warning}</div>}
      </div>
    </div>
  );
}

function ChecklistRow({ item, record, documentOptions, readOnly, onSave }: {
  item: ChecklistItem;
  record: CaseChecklistRecord;
  documentOptions: Array<{ value: DocumentType; label: string }>;
  readOnly: boolean;
  onSave: (record: CaseChecklistRecord) => Promise<CaseChecklistRecord>;
}) {
  const [draft, setDraft] = useState(record);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  useEffect(() => {
    setDraft(record);
    if (readOnly) setFeedback(null);
  }, [readOnly, record]);
  const save = async (next = draft) => {
    if (readOnly) return;
    setBusy(true); setFeedback(null);
    try { const saved = await onSave(next); setDraft(saved); setFeedback('Guardado'); }
    catch (cause) { setFeedback(cause instanceof Error ? cause.message : 'Error al guardar'); }
    finally { setBusy(false); }
  };
  const toggle = () => {
    if (readOnly) return;
    const next: CaseChecklistRecord = { ...draft, status: draft.status === 'confirmed' ? 'pending' : 'confirmed', confirmedAt: draft.status === 'confirmed' ? null : new Date().toISOString() };
    setDraft(next); void save(next);
  };
  return (
    <article>
      <div className="flex items-start gap-3 px-5 py-4">
        <button type="button" disabled={readOnly} onClick={toggle} className={cn('mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 disabled:cursor-not-allowed disabled:opacity-60', draft.status === 'confirmed' ? 'border-ok bg-ok text-white' : item.critical ? 'border-danger' : 'border-line')} aria-label={draft.status === 'confirmed' ? 'Marcar pendiente' : 'Confirmar'}>{draft.status === 'confirmed' && <Check size={12} />}</button>
        <button type="button" onClick={() => setOpen((value) => !value)} className="min-w-0 flex-1 text-left"><div className="flex flex-wrap items-center gap-2"><span className={cn('text-[12.5px] leading-snug', draft.status === 'confirmed' ? 'text-muted line-through' : 'text-ink')}>{item.label}</span>{item.critical && draft.status !== 'confirmed' && <span className="rounded bg-danger-soft px-1.5 py-0.5 text-[8px] font-semibold uppercase text-danger">Crítico</span>}{draft.status === 'issue' && <span className="rounded bg-danger-soft px-1.5 py-0.5 text-[8px] font-semibold uppercase text-danger">Incidencia</span>}</div>{item.detail && <div className="mt-1 flex items-start gap-1.5 text-[10.5px] leading-relaxed text-ink-soft"><Info size={9} className="mt-0.5 shrink-0 text-accent-deep" />{item.detail}</div>}</button>
        <button type="button" onClick={() => setOpen((value) => !value)} className="text-[9.5px] text-accent-deep">{open ? 'Cerrar' : 'Datos'}</button>
      </div>
      {open && <div className="border-t border-line-soft bg-surface-alt px-5 py-4"><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"><Field icon={FileText} label="Estado"><select value={draft.status} disabled={readOnly} onChange={(event) => setDraft({ ...draft, status: event.target.value as CaseChecklistRecord['status'] })} className={inputClass}><option value="pending">Pendiente</option><option value="confirmed">Confirmado</option><option value="issue">Incidencia</option><option value="not-applicable">No aplicable</option></select></Field><Field icon={UserRound} label="Responsable"><input value={draft.responsible} disabled={readOnly} onChange={(event) => setDraft({ ...draft, responsible: event.target.value })} className={inputClass} placeholder="Nombre o rol" /></Field><Field icon={FileText} label="Documento vinculado"><select value={draft.linkedDocumentType ?? ''} disabled={readOnly} onChange={(event) => setDraft({ ...draft, linkedDocumentType: (event.target.value || null) as DocumentType | null })} className={inputClass}><option value="">Sin vincular</option>{documentOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></Field><label className="sm:col-span-2 lg:col-span-3"><span className="mb-1.5 block text-[9.5px] font-medium text-ink">Nota o evidencia</span><textarea rows={2} value={draft.confirmationNote} disabled={readOnly} onChange={(event) => setDraft({ ...draft, confirmationNote: event.target.value })} className={inputClass} /></label></div><div className="mt-3 flex items-center justify-end gap-3">{feedback && <span className="text-[9.5px] text-muted" role="status">{feedback}</span>}<button type="button" disabled={busy || readOnly} onClick={() => void save()} className="inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-[10.5px] font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"><Save size={11} /> {busy ? 'Guardando…' : readOnly ? 'Solo lectura' : 'Guardar detalle'}</button></div></div>}
    </article>
  );
}

function Field({ icon: Icon, label, children }: { icon: typeof FileText; label: string; children: React.ReactNode }) { return <label><span className="mb-1.5 flex items-center gap-1 text-[9.5px] font-medium text-ink"><Icon size={9} />{label}</span>{children}</label>; }
const inputClass = 'w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-[10.5px] text-ink outline-none focus:border-accent disabled:cursor-not-allowed disabled:opacity-60';
function createRecord(caseId: string, checklistKey: string, item: ChecklistItem, index: number): CaseChecklistRecord { return { caseId, checklistKey, itemKey: item.id, label: item.label, description: item.detail ?? '', status: 'pending', isCritical: Boolean(item.critical), confirmationNote: '', confirmedAt: null, responsible: '', requiresPhoto: false, photoConfirmed: false, linkedDocumentType: null, sortOrder: index }; }
function dynamicChecklist(checklist: ChecklistDef, registrationCase: Parameters<typeof buildRegistrationDecision>[0]): ChecklistDef {
  if (checklist.storageKey !== 'pre-dgt') return checklist;
  const decision = buildRegistrationDecision(registrationCase);
  const dgtDocs = decision.requiredDocuments.filter((document) => document.requiredFor.includes('dgt'));
  return {
    ...checklist,
    intro: 'Lista generada desde el expediente activo. Sólo aparecen los justificantes que corresponden a su procedencia, vendedor, ruta técnica y decisión fiscal.',
    sections: [
      { id: 'identity', title: 'Identidad y representación' },
      { id: 'vehicle', title: 'Vehículo y titularidad' },
      { id: 'tax', title: 'Justificación fiscal' },
      { id: 'submission', title: 'Presentación y cierre' },
    ],
    items: [
      ...dgtDocs.map((document, index): ChecklistItem => ({ id: `doc-${document.type}`, section: document.type === 'identity' || document.type === 'representation' ? 'identity' : document.requiredFor.includes('registration-tax') || document.requiredFor.includes('purchase-tax') || document.type === 'ivtm-proof' ? 'tax' : 'vehicle', label: document.title, detail: document.reason, critical: !document.conditional })),
      { id: 'submission-channel', section: 'submission', label: registrationCase.buyerType === 'company' ? 'Presentación electrónica y representación de la persona jurídica confirmadas' : 'Canal disponible y cita, si corresponde, confirmados en Sede DGT', critical: true },
      { id: 'plate-order', section: 'submission', label: 'Las placas se encargarán sólo después de que DGT asigne la matrícula', critical: true },
      { id: 'insurance-before-driving', section: 'submission', label: 'Seguro preparado y activación prevista antes de circular', critical: true },
    ],
    nextStep: { href: `/app/expedientes/${registrationCase.id}/dgt`, label: 'Abrir preparación DGT' },
  };
}
