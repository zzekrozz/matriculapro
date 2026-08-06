'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  ExternalLink,
  FileQuestion,
  Loader2,
  ShieldAlert,
} from 'lucide-react';
import type { FreeVehicleCheckInput, FreeVehicleCheckResult } from '@/domain/free-check';
import { sourcesForIds } from '@/domain/registration';
import { cn } from '@/lib/cn';

const today = () => new Date().toISOString();

const INITIAL_INPUT: FreeVehicleCheckInput = {
  registrationCountry: 'DE',
  firstRegistrationDate: '',
  mileageKm: 0,
  category: 'M1',
  sellerType: 'foreign-professional',
  hasInvoice: false,
  hasPurchaseContract: false,
  fieldK: '',
  approvalNumber: '',
  cocAvailable: null,
  foreignTechnicalDocumentAvailable: null,
  fuel: '',
  co2GKm: null,
  apparentReforms: false,
  previouslyRegisteredInSpain: false,
  specialUse: 'none',
  engineCc: null,
  powerKw: null,
  massKg: null,
  seats: null,
  checkedAt: today(),
};

const COUNTRY_OPTIONS = [
  ['DE', 'Alemania'], ['FR', 'Francia'], ['IT', 'Italia'], ['BE', 'Bélgica'], ['NL', 'Países Bajos'],
  ['PT', 'Portugal'], ['AT', 'Austria'], ['PL', 'Polonia'], ['SE', 'Suecia'], ['DK', 'Dinamarca'],
  ['IE', 'Irlanda'], ['NO', 'Noruega'], ['IS', 'Islandia'], ['LI', 'Liechtenstein'], ['GB', 'Gran Bretaña'],
  ['CH', 'Suiza'], ['US', 'Estados Unidos'], ['JP', 'Japón'], ['ES', 'España'], ['OTHER', 'Otro país'],
] as const;

interface ApiResult {
  ok: boolean;
  result?: FreeVehicleCheckResult;
  checkId?: string;
  message?: string;
}

export function FreeVehicleChecker() {
  const [input, setInput] = useState<FreeVehicleCheckInput>(INITIAL_INPUT);
  const [otherCountryCode, setOtherCountryCode] = useState('');
  const [result, setResult] = useState<FreeVehicleCheckResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const response = await fetch('/api/free-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...input,
          registrationCountry: input.registrationCountry === 'OTHER'
            ? otherCountryCode.trim().toUpperCase()
            : input.registrationCountry,
          checkedAt: today(),
        }),
      });
      const payload = await response.json() as ApiResult;
      if (!response.ok || !payload.ok || !payload.result) {
        throw new Error(payload.message || 'No se ha podido completar la comprobación.');
      }
      setResult(payload.result);
      window.setTimeout(() => document.getElementById('resultado-comprobacion')?.focus(), 0);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se ha podido completar la comprobación.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-[1180px] px-4 pb-16 pt-6 sm:px-6 lg:px-8">
      <header className="max-w-3xl">
        <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-accent-deep">Herramienta gratuita registrada</div>
        <h1 className="mt-2 font-serif text-[36px] leading-[1.05] text-ink sm:text-[46px]">Comprobación previa a la compra</h1>
        <p className="mt-4 text-[13px] leading-relaxed text-ink-soft sm:text-[14px]">
          Introduce lo que sabes del vehículo. Aplicaremos reglas trazables para detectar documentación pendiente,
          contradicciones y rutas que requieren revisión antes de entregar dinero.
        </p>
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-accent/20 bg-accent-soft p-3 text-[11.5px] leading-relaxed text-accent-deep">
          <ShieldAlert size={14} className="mt-0.5 shrink-0" /> No es una garantía de matriculación ni sustituye la revisión de ITV, AEAT o DGT. No se solicitan archivos.
        </div>
      </header>

      <form onSubmit={submit} className="mt-7 space-y-5" noValidate>
        <FormSection title="Procedencia y compra" description="Datos que determinan la rama fiscal y documental inicial.">
          <SelectField label="País de procedencia" value={input.registrationCountry} onChange={(value) => setInput({ ...input, registrationCountry: value })}>
            {COUNTRY_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </SelectField>
          {input.registrationCountry === 'OTHER' && (
            <InputField
              label="Código ISO del país"
              required
              minLength={2}
              maxLength={3}
              pattern="[A-Za-z]{2,3}"
              value={otherCountryCode}
              onChange={setOtherCountryCode}
              placeholder="Ej. CA"
            />
          )}
          <InputField label="Primera matriculación" type="date" required value={input.firstRegistrationDate} onChange={(value) => setInput({ ...input, firstRegistrationDate: value })} />
          <InputField label="Kilometraje" type="number" required min="0" value={String(input.mileageKm)} onChange={(value) => setInput({ ...input, mileageKm: numberOrZero(value) })} suffix="km" />
          <SelectField label="Tipo de vendedor" value={input.sellerType} onChange={(value) => setInput({ ...input, sellerType: value as FreeVehicleCheckInput['sellerType'] })}>
            <option value="foreign-professional">Profesional extranjero</option><option value="private">Particular</option>
            <option value="spanish-professional">Profesional español</option><option value="already-owned">Ya era mío</option>
            <option value="inheritance">Herencia</option><option value="donation">Donación</option><option value="unknown">No lo sé</option>
          </SelectField>
          <BooleanField label="Existe factura" value={input.hasInvoice} onChange={(value) => setInput({ ...input, hasInvoice: value })} />
          <BooleanField label="Existe contrato" value={input.hasPurchaseContract} onChange={(value) => setInput({ ...input, hasPurchaseContract: value })} />
        </FormSection>

        <FormSection title="Homologación y documentos" description="Los datos se introducen manualmente; esta pantalla no acepta subidas.">
          <InputField label="Campo K" value={input.fieldK} onChange={(value) => setInput({ ...input, fieldK: value })} placeholder="Ej. e1*2007/46*…" />
          <InputField label="Contraseña de homologación" value={input.approvalNumber} onChange={(value) => setInput({ ...input, approvalNumber: value })} />
          <TriStateField label="COC disponible" value={input.cocAvailable} onChange={(value) => setInput({ ...input, cocAvailable: value })} />
          <TriStateField label="Documento técnico extranjero" value={input.foreignTechnicalDocumentAvailable} onChange={(value) => setInput({ ...input, foreignTechnicalDocumentAvailable: value })} />
          <BooleanField label="Matrícula anterior en España" value={input.previouslyRegisteredInSpain} onChange={(value) => setInput({ ...input, previouslyRegisteredInSpain: value })} />
          <BooleanField label="Reformas aparentes" value={input.apparentReforms} onChange={(value) => setInput({ ...input, apparentReforms: value })} />
        </FormSection>

        <FormSection title="Datos técnicos mínimos" description="Si no conoces un dato opcional, déjalo vacío: se reflejará como pendiente.">
          <SelectField label="Categoría" value={input.category} onChange={(value) => setInput({ ...input, category: value as FreeVehicleCheckInput['category'] })}>
            {['M1', 'M2', 'M3', 'N1', 'N2', 'N3', 'L', 'O', 'SPECIAL', 'UNKNOWN'].map((value) => <option key={value}>{value}</option>)}
          </SelectField>
          <InputField label="Combustible" value={input.fuel} onChange={(value) => setInput({ ...input, fuel: value })} placeholder="Gasolina, diésel, eléctrico…" />
          <NullableNumberField label="CO₂" suffix="g/km" value={input.co2GKm} onChange={(value) => setInput({ ...input, co2GKm: value })} />
          <NullableNumberField label="Cilindrada" suffix="cm³" value={input.engineCc} onChange={(value) => setInput({ ...input, engineCc: value })} />
          <NullableNumberField label="Potencia" suffix="kW" value={input.powerKw} onChange={(value) => setInput({ ...input, powerKw: value })} />
          <NullableNumberField label="Masa máxima" suffix="kg" value={input.massKg} onChange={(value) => setInput({ ...input, massKg: value })} />
          <NullableNumberField label="Plazas" value={input.seats} onChange={(value) => setInput({ ...input, seats: value })} />
          <SelectField label="Uso o supuesto especial" value={input.specialUse} onChange={(value) => setInput({ ...input, specialUse: value as FreeVehicleCheckInput['specialUse'] })}>
            <option value="none">Ninguno conocido</option><option value="taxi-rental-driving-school">Taxi, alquiler o autoescuela</option>
            <option value="historical">Histórico</option><option value="relocation">Traslado de residencia</option><option value="other">Otro supuesto especial</option>
          </SelectField>
        </FormSection>

        {error && <div role="alert" className="rounded-xl border border-danger/20 bg-danger-soft p-4 text-[12px] text-danger">{error}</div>}
        <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
          <button type="submit" disabled={busy || !input.firstRegistrationDate || (input.registrationCountry === 'OTHER' && !/^[A-Za-z]{2,3}$/.test(otherCountryCode.trim()))} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-ink px-6 py-3 text-[13px] font-medium text-white disabled:cursor-not-allowed disabled:opacity-45">
            {busy ? <><Loader2 size={15} className="animate-spin" /> Analizando…</> : <><ClipboardCheck size={15} /> Obtener comprobación</>}
          </button>
          <p className="text-[10.5px] leading-relaxed text-muted">Resultado orientativo basado en los datos declarados y reglas con fuentes oficiales.</p>
        </div>
      </form>

      {result && <CheckResult result={result} />}
    </div>
  );
}

function CheckResult({ result }: { result: FreeVehicleCheckResult }) {
  const sources = useMemo(() => sourcesForIds(result.sourceIds), [result.sourceIds]);
  const risk = {
    low: { label: 'Bajo', className: 'bg-ok-soft text-ok', icon: CheckCircle2 },
    medium: { label: 'Medio', className: 'bg-warn-soft text-warn', icon: AlertTriangle },
    high: { label: 'Alto', className: 'bg-danger-soft text-danger', icon: ShieldAlert },
    blocked: { label: 'Bloqueado', className: 'bg-danger text-white', icon: ShieldAlert },
  }[result.riskLevel];
  const RiskIcon = risk.icon;
  return (
    <section id="resultado-comprobacion" tabIndex={-1} className="mt-10 scroll-mt-6 outline-none" aria-labelledby="resultado-title">
      <div className="rounded-[24px] bg-ink p-6 text-white sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div><div className="text-[9.5px] uppercase tracking-[0.2em] text-accent">Resultado guardado</div><h2 id="resultado-title" className="mt-2 font-serif text-[31px]">Nivel de riesgo detectado</h2></div>
          <div className={cn('inline-flex items-center gap-2 rounded-full px-4 py-2 text-[12px] font-semibold', risk.className)}><RiskIcon size={14} /> {risk.label}</div>
        </div>
        <p className="mt-4 max-w-3xl text-[11.5px] leading-relaxed text-muted-soft">El nivel es determinista: cada factor aparece por separado y cualquier bloqueo se mantiene visible. No expresa una probabilidad de matriculación.</p>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <ResultFact label="IVA" value={vatLabel(result.vatStatus)} detail={result.vatReason} />
          <ResultFact label="Procedencia" value={originLabel(result.originZone)} detail={result.originReason} />
          <ResultFact label="Ruta técnica preliminar" value={technicalLabel(result.technicalPath)} detail={result.technicalReason} />
        </div>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <ResultList title="Factores de riesgo" icon={ShieldAlert} empty="No se han detectado factores relevantes con estos datos.">
          {result.factors.map((factor) => <li key={factor.id} className="rounded-xl bg-bg p-3"><div className="flex items-start gap-2"><span className={cn('mt-1 h-2 w-2 shrink-0 rounded-full', factor.blocking ? 'bg-danger' : 'bg-accent')} /><div><strong className="text-[11.5px] text-ink">{factor.label}</strong><p className="mt-1 text-[10.5px] leading-relaxed text-ink-soft">{factor.detail}</p></div></div></li>)}
        </ResultList>
        <ResultList title="Documentos que conviene pedir" icon={ClipboardCheck}>{result.recommendedDocuments.map((item) => <li key={item}>{item}</li>)}</ResultList>
        <ResultList title="Preguntas para el vendedor" icon={FileQuestion}>{result.sellerQuestions.map((item) => <li key={item}>{item}</li>)}</ResultList>
        <ResultList title="Contradicciones" icon={AlertTriangle} empty="No se han detectado contradicciones directas.">{result.contradictions.map((item) => <li key={item}>{item}</li>)}</ResultList>
        <ResultList title="Riesgos principales" icon={ShieldAlert} empty="No aparecen riesgos principales adicionales.">{result.mainRisks.map((item) => <li key={item}>{item}</li>)}</ResultList>
      </div>

      <section className="mt-5 rounded-[20px] border border-line bg-surface p-5 sm:p-6">
        <h3 className="font-serif text-[22px] text-ink">Conclusiones de la comprobación</h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryFact label="Homologación europea" value={result.europeanTypeApprovalPossible ? 'Posible' : 'No acreditada'} />
          <SummaryFact label="Revisión técnica" value={result.technicalReviewPossible ? 'Puede ser necesaria' : 'Ruta ordinaria posible'} />
          <SummaryFact label="Reformas" value={result.reformsReviewPossible ? 'Revisar modificaciones' : 'No declaradas'} />
          <SummaryFact label="Tipo de caso" value={result.caseKind === 'ordinary' ? 'Ordinario preliminar' : 'Especial'} />
        </div>
      </section>

      <section className="mt-5 rounded-[20px] border border-line bg-surface p-5 sm:p-6">
        <h3 className="font-serif text-[22px] text-ink">Fuentes generales consultables</h3>
        <p className="mt-1 text-[10.5px] text-muted">Actualización del resultado: {new Date(result.updatedAt).toLocaleDateString('es-ES')}.</p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">{sources.map((source) => <a key={source.id} href={source.url} target="_blank" rel="noreferrer" className="flex items-start justify-between gap-3 rounded-xl bg-bg p-3 text-[10.5px] text-ink-soft hover:text-ink"><span><strong className="block text-ink">{source.authority}</strong>{source.title}</span><ExternalLink size={11} className="shrink-0" /></a>)}</div>
      </section>

      <section className="mt-5 rounded-[20px] border border-accent/25 bg-accent-soft p-5 sm:p-6">
        <h3 className="font-serif text-[23px] text-ink">¿Necesitas completar el expediente?</h3>
        <p className="mt-2 max-w-2xl text-[11.5px] leading-relaxed text-ink-soft">Con acceso completo podrás consultar el valor oficial, calcular el impuesto, preparar las casillas y seguir ITV, fiscalidad y DGT. Los riesgos críticos mostrados arriba no se ocultan por el plan.</p>
        <Link href="/#precios" className="mt-4 inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-[11.5px] font-medium text-white">Comparar Particular y Profesional <ArrowRight size={12} /></Link>
      </section>
    </section>
  );
}

function FormSection({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return <fieldset className="rounded-[20px] border border-line bg-surface p-4 sm:p-6"><legend className="sr-only">{title}</legend><div className="mb-5"><h2 className="font-serif text-[23px] text-ink">{title}</h2><p className="mt-1 text-[10.5px] text-muted">{description}</p></div><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{children}</div></fieldset>;
}

function InputField({ label, value, onChange, suffix, ...props }: { label: string; value: string; onChange: (value: string) => void; suffix?: string } & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'>) {
  return <label><span className="mb-1.5 block text-[10px] font-medium text-ink">{label}</span><div className="relative"><input {...props} value={value} onChange={(event) => onChange(event.target.value)} className="min-h-11 w-full rounded-xl border border-line bg-bg px-3 py-2.5 text-[16px] text-ink outline-none focus:border-accent sm:text-[12px]" />{suffix && <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[9.5px] text-muted">{suffix}</span>}</div></label>;
}

function NullableNumberField({ label, value, onChange, suffix }: { label: string; value: number | null; onChange: (value: number | null) => void; suffix?: string }) {
  return <InputField label={label} type="number" min="0" value={value === null ? '' : String(value)} onChange={(value) => onChange(value.trim() === '' ? null : Number(value))} suffix={suffix} />;
}

function SelectField({ label, value, onChange, children }: { label: string; value: string; onChange: (value: string) => void; children: React.ReactNode }) {
  return <label><span className="mb-1.5 block text-[10px] font-medium text-ink">{label}</span><select value={value} onChange={(event) => onChange(event.target.value)} className="min-h-11 w-full rounded-xl border border-line bg-bg px-3 py-2.5 text-[16px] text-ink outline-none focus:border-accent sm:text-[12px]">{children}</select></label>;
}

function BooleanField({ label, value, onChange }: { label: string; value: boolean; onChange: (value: boolean) => void }) {
  return <label className="flex min-h-11 items-center gap-3 rounded-xl border border-line bg-bg px-3 py-2.5 text-[11px] text-ink"><input type="checkbox" checked={value} onChange={(event) => onChange(event.target.checked)} className="h-4 w-4 accent-[#C8862E]" /><span>{label}</span></label>;
}

function TriStateField({ label, value, onChange }: { label: string; value: boolean | null; onChange: (value: boolean | null) => void }) {
  return <SelectField label={label} value={value === null ? 'unknown' : value ? 'yes' : 'no'} onChange={(next) => onChange(next === 'unknown' ? null : next === 'yes')}><option value="unknown">No lo sé</option><option value="yes">Sí</option><option value="no">No</option></SelectField>;
}

function ResultFact({ label, value, detail }: { label: string; value: string; detail: string }) { return <div className="rounded-2xl border border-white/10 bg-white/5 p-4"><div className="text-[9px] uppercase tracking-[0.15em] text-accent">{label}</div><div className="mt-1 font-serif text-[20px]">{value}</div><p className="mt-2 text-[9.5px] leading-relaxed text-muted-soft">{detail}</p></div>; }
function SummaryFact({ label, value }: { label: string; value: string }) { return <div className="rounded-xl bg-bg p-4"><div className="text-[9px] uppercase tracking-[0.14em] text-muted">{label}</div><div className="mt-1 text-[12px] font-medium text-ink">{value}</div></div>; }

function ResultList({ title, icon: Icon, empty, children }: { title: string; icon: typeof AlertTriangle; empty?: string; children: React.ReactNode }) {
  const items = Array.isArray(children) ? children : [children];
  const emptyList = items.every((item) => item === null || item === undefined || item === false);
  return <section className="rounded-[20px] border border-line bg-surface p-5"><div className="flex items-center gap-2"><Icon size={15} className="text-accent-deep" /><h3 className="font-serif text-[21px] text-ink">{title}</h3></div>{emptyList && empty ? <p className="mt-4 rounded-xl bg-ok-soft p-3 text-[11px] text-ok">{empty}</p> : <ul className="mt-4 space-y-2 text-[11px] leading-relaxed text-ink-soft">{children}</ul>}</section>;
}

function numberOrZero(value: string): number { const number = Number(value); return Number.isFinite(number) && number >= 0 ? number : 0; }
function vatLabel(value: FreeVehicleCheckResult['vatStatus']) { return ({ new: 'Nuevo a efectos de IVA', used: 'Usado a efectos de IVA', undetermined: 'Pendiente de datos' } as const)[value]; }
function originLabel(value: FreeVehicleCheckResult['originZone']) { return ({ spain: 'España / revisar trámite', eu: 'Unión Europea', eea: 'EEE no UE', 'uk-post-brexit': 'Reino Unido pos-Brexit', 'third-country': 'Tercer país', unknown: 'Sin determinar' } as const)[value]; }
function technicalLabel(value: FreeVehicleCheckResult['technicalPath']) { return ({ 'eu-coc': 'COC europeo', 'eu-reduced-sheet': 'Ficha reducida', 'eea-equivalence-review': 'Revisión de equivalencia', 'spanish-individual-approval': 'Homologación individual', 'special-review': 'Revisión especial' } as const)[value]; }
