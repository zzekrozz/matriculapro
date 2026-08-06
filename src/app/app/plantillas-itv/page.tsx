'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, Check, ChevronLeft, ChevronRight, Copy, Info, Mail, Sparkles } from 'lucide-react';
import { EMAIL_TEMPLATES, type EmailTemplate } from '@/data/email-templates';
import { ModuleGate } from '@/components/access/ModuleGate';
import { REFORM_LABELS, type RegistrationCase } from '@/domain/registration';
import { useRegistrationCases } from '@/providers/RegistrationCaseProvider';

export default function PlantillasPage() {
  return (
    <ModuleGate requiredCapability="generate_reports" requiredTier="particular" moduleName="Plantillas inteligentes" moduleCode="M.10" description="7 comunicaciones para COC, ficha reducida, equivalencia, ITV, factura, duplicados y reformas." icon={Mail}>
      <PlantillasContent />
    </ModuleGate>
  );
}

function PlantillasContent() {
  const { activeCase, persistent } = useRegistrationCases();
  const [selectedId, setSelectedId] = useState(EMAIL_TEMPLATES[0].id);
  const [copiedField, setCopiedField] = useState<'subject' | 'body' | 'all' | null>(null);
  const selected = EMAIL_TEMPLATES.find((template) => template.id === selectedId) as EmailTemplate;
  const hydrated = hydrateTemplate(selected, activeCase);
  const copy = async (value: string, field: typeof copiedField) => {
    try { await navigator.clipboard.writeText(value); setCopiedField(field); window.setTimeout(() => setCopiedField(null), 1800); } catch { setCopiedField(null); }
  };
  return (
    <div className="min-h-screen bg-bg">
      <div className="mx-auto max-w-[1280px] px-5 pb-12 pt-6 lg:px-8">
        <Link href="/app/dashboard" className="mb-4 inline-flex items-center gap-2 text-[12px] text-muted hover:text-ink"><ChevronLeft size={14} /> Volver al centro de control</Link>
        <header className="mb-7"><div className="mb-2 flex items-center gap-2"><span className="font-mono text-[10px] text-muted">M.10</span><span className="rounded-full bg-accent-soft px-2 py-0.5 text-[9.5px] font-medium uppercase tracking-[0.1em] text-accent-deep">{persistent ? 'Expediente editable' : 'Solo lectura'}</span></div><h1 className="font-serif text-[40px] leading-none tracking-tight text-ink">Plantillas <span className="italic text-accent">inteligentes</span></h1><p className="mt-3 max-w-[680px] text-[13px] leading-relaxed text-ink-soft">{EMAIL_TEMPLATES.length} comunicaciones rellenadas desde el expediente activo. Los datos desconocidos conservan un marcador <span className="font-mono text-accent-deep">[PENDIENTE]</span> visible.</p></header>
        <div className="grid gap-6 lg:grid-cols-[290px_1fr]">
          <aside className="space-y-2">{EMAIL_TEMPLATES.map((template) => <button key={template.id} type="button" onClick={() => setSelectedId(template.id)} className={`w-full rounded-xl border p-3 text-left transition ${template.id === selectedId ? 'border-ink bg-ink text-white' : 'border-line bg-surface text-ink'}`}><div className={`mb-1 flex items-center gap-2 font-mono text-[9.5px] ${template.id === selectedId ? 'text-accent' : 'text-muted'}`}><Mail size={11} />{template.code}</div><div className="text-[12px] font-medium">{template.title}</div></button>)}</aside>
          <section className="overflow-hidden rounded-[20px] border border-line bg-surface shadow-soft-md">
            <div className="border-b border-line p-6"><div className="font-mono text-[9.5px] text-muted">{selected.code}</div><h2 className="mt-2 font-serif text-[27px] leading-tight">{selected.title}</h2><p className="mt-2 text-[12px] leading-relaxed text-ink-soft">{selected.purpose}</p><div className="mt-4 flex items-start gap-2 rounded-xl bg-accent-soft p-3 text-[11px] leading-relaxed text-accent-deep"><Info size={12} className="mt-0.5 shrink-0" /><span><strong>Cuándo usarla:</strong> {selected.when}</span></div></div>
            <TemplateBlock label="Asunto" value={hydrated.subject} copied={copiedField === 'subject'} onCopy={() => void copy(hydrated.subject, 'subject')} />
            <div className="p-6"><div className="mb-2 flex items-center justify-between"><span className="text-[9.5px] uppercase tracking-[0.2em] text-muted">Cuerpo</span><CopyButton copied={copiedField === 'body'} onClick={() => void copy(hydrated.body, 'body')} /></div><pre className="whitespace-pre-wrap rounded-xl border border-line bg-bg-deep p-4 font-sans text-[12px] leading-relaxed text-ink">{hydrated.body}</pre>{selected.notes && <div className="mt-5 rounded-xl border border-line bg-bg p-4"><div className="mb-2 flex items-center gap-1.5 text-[9.5px] uppercase tracking-[0.18em] text-accent-deep"><Sparkles size={10} /> Notas</div><ul className="space-y-2">{selected.notes.map((note) => <li key={note} className="flex gap-2 text-[11px] text-ink-soft"><ChevronRight size={10} className="mt-0.5 shrink-0 text-accent" />{note}</li>)}</ul></div>}<div className="mt-5 flex justify-end"><button type="button" onClick={() => void copy(`Asunto: ${hydrated.subject}\n\n${hydrated.body}`, 'all')} className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-[12px] font-medium text-white">{copiedField === 'all' ? <><Check size={13} /> Copiado</> : <><Copy size={13} /> Copiar completo</>}</button></div></div>
          </section>
        </div>
        <div className="mt-7 flex items-start gap-3 rounded-xl border border-accent-soft bg-warn-soft p-4 text-[11px] leading-relaxed text-warn"><AlertTriangle size={13} className="mt-0.5 shrink-0" />Revisa destinatario, documentos adjuntos y marcadores antes de enviar. La plantilla no determina por sí sola la vía técnica o fiscal aplicable.</div>
      </div>
    </div>
  );
}

function TemplateBlock({ label, value, copied, onCopy }: { label: string; value: string; copied: boolean; onCopy: () => void }) { return <div className="border-b border-line p-6"><div className="mb-2 flex items-center justify-between"><span className="text-[9.5px] uppercase tracking-[0.2em] text-muted">{label}</span><CopyButton copied={copied} onClick={onCopy} /></div><div className="rounded-xl border border-line bg-bg-deep p-3 font-mono text-[12px]">{value}</div></div>; }
function CopyButton({ copied, onClick }: { copied: boolean; onClick: () => void }) { return <button type="button" onClick={onClick} className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[10.5px] font-medium ${copied ? 'bg-ok-soft text-ok' : 'bg-bg-deep text-ink-soft'}`}>{copied ? <><Check size={10} /> Copiado</> : <><Copy size={10} /> Copiar</>}</button>; }
function hydrateTemplate(template: EmailTemplate, registrationCase: RegistrationCase | null): EmailTemplate {
  const vehicle = registrationCase?.vehicle;
  const reforms = vehicle ? (Object.entries(vehicle.reforms) as Array<[keyof typeof vehicle.reforms, boolean | null]>).filter(([, value]) => value === true).map(([key]) => REFORM_LABELS[key]).join(', ') : '';
  const replacements: Record<string, string> = {
    '[MARCA]': vehicle?.brand || '[MARCA PENDIENTE]', '[MODELO]': vehicle?.model || '[MODELO PENDIENTE]', '[VIN]': vehicle?.vin || '[VIN PENDIENTE]',
    '[AÑO]': vehicle?.firstRegistrationDate?.slice(0, 4) || '[AÑO PENDIENTE]', '[PAÍS]': vehicle?.registrationCountry || '[PAÍS PENDIENTE]',
    '[CAMPO K]': vehicle?.fieldK || '[CAMPO K PENDIENTE]', '[COC]': vehicle?.cocAvailable === true ? 'Sí, pendiente de validar' : vehicle?.cocAvailable === false ? 'No disponible' : '[COC PENDIENTE]',
    '[CATEGORÍA]': vehicle?.category && vehicle.category !== 'UNKNOWN' ? vehicle.category : '[CATEGORÍA PENDIENTE]', '[REFORMAS]': reforms || (vehicle ? 'Ninguna declarada; pendiente de comprobación física' : '[REFORMAS PENDIENTES]'),
  };
  const replace = (value: string) => Object.entries(replacements).reduce((result, [token, replacement]) => result.split(token).join(replacement), value);
  return { ...template, subject: replace(template.subject), body: replace(template.body) };
}
