'use client';

import { useMemo, useState, type ChangeEvent, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Check, Cloud, Info, Save } from 'lucide-react';
import {
  AUTONOMOUS_COMMUNITIES,
  createEmptyRegistrationCase,
  type ApprovalType,
  type BuyerType,
  type ProcessStage,
  type ReformKey,
  type RegistrationCase,
  type SellerType,
  type VehicleCategory,
} from '@/domain/registration';
import { useRegistrationCases } from '@/providers/RegistrationCaseProvider';
import { cn } from '@/lib/cn';

const STEPS = ['Operación', 'Vehículo', 'Procedencia', 'Homologación', 'Usuario', 'Estado y reformas'] as const;

const REFORM_LABELS: Record<ReformKey, string> = {
  suspension: 'Suspensión modificada',
  nonEquivalentWheels: 'Llantas o neumáticos no equivalentes',
  spacers: 'Separadores',
  lighting: 'Alumbrado sustituido',
  towBar: 'Enganche',
  seats: 'Cambio de asientos',
  classification: 'Cambio de clasificación',
  bodywork: 'Cambio de carrocería',
  camperConversion: 'Camperización',
  exhaust: 'Escape',
  powerOrEngine: 'Potencia o motor',
  dimensions: 'Dimensiones',
  exteriorElements: 'Elementos exteriores',
  steeringConversion: 'Conversión de volante',
  structural: 'Modificaciones estructurales',
};

export function CaseOnboarding() {
  const router = useRouter();
  const { persistent, saveCase } = useRegistrationCases();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<RegistrationCase>(() => createEmptyRegistrationCase({
    id: crypto.randomUUID(),
    userId: null,
    mode: 'case',
  }));

  const progress = ((step + 1) / STEPS.length) * 100;
  const title = useMemo(() => {
    const identity = [draft.vehicle.brand, draft.vehicle.model].filter(Boolean).join(' ');
    return identity ? `${identity} · ${draft.vehicle.registrationCountry || 'procedencia pendiente'}` : 'Nuevo expediente';
  }, [draft.vehicle.brand, draft.vehicle.model, draft.vehicle.registrationCountry]);

  const update = <K extends keyof RegistrationCase>(key: K, value: RegistrationCase[K]) => {
    setDraft((current) => ({ ...current, [key]: value, updatedAt: new Date().toISOString() }));
  };
  const updateVehicle = <K extends keyof RegistrationCase['vehicle']>(key: K, value: RegistrationCase['vehicle'][K]) => {
    setDraft((current) => ({ ...current, vehicle: { ...current.vehicle, [key]: value }, updatedAt: new Date().toISOString() }));
  };

  const persistDraft = async (finish = false) => {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const saved = await saveCase({
        ...draft,
        title,
        status: finish ? 'assessing' : 'draft',
      });
      setDraft(saved);
      if (finish) router.push(`/app/expedientes/${saved.id}`);
      else setMessage('Borrador guardado en tu cuenta.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se ha podido guardar el borrador.');
    } finally {
      setSaving(false);
    }
  };

  const next = async () => {
    await persistDraft(false);
    setStep((current) => Math.min(current + 1, STEPS.length - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="mx-auto max-w-[1020px] px-5 pb-16 pt-6 lg:px-8">
      <div className="rounded-[24px] bg-ink px-5 py-6 text-white lg:px-8">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-accent">Alta progresiva</div>
            <h1 className="mt-2 font-serif text-[34px] leading-tight">Crea el expediente del vehículo</h1>
            <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-muted-soft">Introduce sólo lo que puedas acreditar. Los datos desconocidos quedan pendientes y el motor evitará conclusiones automáticas.</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[11px] text-muted-soft">
            <Cloud size={13} className="mr-1.5 inline text-accent" />
            {persistent ? 'Persistencia privada en Supabase' : 'Solo lectura · licencia no editable'}
          </div>
        </div>
        <div className="mt-6 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-accent transition-all" style={{ width: `${progress}%` }} /></div>
      </div>

      <div className="mt-4 flex gap-2 overflow-x-auto pb-1" aria-label="Progreso del formulario">
        {STEPS.map((label, index) => (
          <button
            key={label}
            type="button"
            onClick={() => setStep(index)}
            className={cn('flex shrink-0 items-center gap-2 rounded-full px-3 py-2 text-[11px]', index === step ? 'bg-accent-soft font-semibold text-accent-deep' : index < step ? 'bg-ok-soft text-ok' : 'bg-surface text-muted')}
          >
            <span className="flex h-4 w-4 items-center justify-center rounded-full border border-current text-[9px]">{index < step ? <Check size={10} /> : index + 1}</span>{label}
          </button>
        ))}
      </div>

      <form onSubmit={(event) => event.preventDefault()} className="mt-4 rounded-[24px] border border-line bg-surface p-5 shadow-soft-sm lg:p-8">
        <StepHeading index={step} title={STEPS[step]} />

        {step === 0 && (
          <div className="grid gap-5 md:grid-cols-2">
            <SelectField label="Situación de la operación" value={draft.operation} onChange={(value) => update('operation', value as RegistrationCase['operation'])} options={[
              ['purchase', 'Lo estoy comprando / ya lo he comprado'], ['already-owned', 'Ya era de mi propiedad'], ['relocation', 'Cambio de residencia'], ['inheritance', 'Herencia'], ['donation', 'Donación'],
            ]} />
            <SelectField label="Tipo de vendedor" value={draft.sellerType} onChange={(value) => update('sellerType', value as SellerType)} options={[
              ['unknown', 'Pendiente de confirmar'], ['private', 'Particular'], ['foreign-professional', 'Profesional extranjero'], ['spanish-professional', 'Profesional español que lo importó'], ['already-owned', 'No hay vendedor'], ['inheritance', 'Herencia'], ['donation', 'Donación'],
            ]} />
            <TextField label="País del vendedor" hint="Código ISO, por ejemplo DE o NL" value={draft.sellerCountry ?? ''} onChange={(value) => update('sellerCountry', upperCode(value))} maxLength={2} />
            <TextField label="Fecha de factura, contrato o entrega" type="date" value={draft.purchaseDate ?? ''} onChange={(value) => update('purchaseDate', value || null)} />
            <TextField label="Precio" type="number" min="0" step="0.01" value={numberValue(draft.purchasePrice)} onChange={(value) => update('purchasePrice', nullableNumber(value))} />
            <TextField label="Moneda" value={draft.purchaseCurrency} maxLength={3} onChange={(value) => update('purchaseCurrency', value.toUpperCase())} />
            {draft.sellerType === 'foreign-professional' && <TextField label="N.º IVA del vendedor" value={draft.invoiceVatNumber ?? ''} onChange={(value) => update('invoiceVatNumber', value || null)} />}
            {draft.sellerType === 'foreign-professional' && <TextField label="Régimen de IVA indicado en factura" hint="Déjalo pendiente si la factura no es clara" value={draft.invoiceVatScheme ?? ''} onChange={(value) => update('invoiceVatScheme', value || null)} />}
          </div>
        )}

        {step === 1 && (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            <TextField label="Marca" value={draft.vehicle.brand} onChange={(value) => updateVehicle('brand', value)} />
            <TextField label="Modelo" value={draft.vehicle.model} onChange={(value) => updateVehicle('model', value)} />
            <TextField label="VIN" hint="17 caracteres, sin I, O ni Q" value={draft.vehicle.vin} maxLength={17} onChange={(value) => updateVehicle('vin', value.toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, ''))} />
            <TextField label="Primera matriculación" type="date" value={draft.vehicle.firstRegistrationDate ?? ''} onChange={(value) => updateVehicle('firstRegistrationDate', value || null)} />
            <TextField label="Kilometraje" type="number" min="0" step="1" value={numberValue(draft.vehicle.mileageKm)} onChange={(value) => updateVehicle('mileageKm', nullableNumber(value))} />
            <SelectField label="Categoría" value={draft.vehicle.category} onChange={(value) => updateVehicle('category', value as VehicleCategory)} options={['UNKNOWN', 'M1', 'M2', 'M3', 'N1', 'N2', 'N3', 'L', 'O', 'SPECIAL'].map((value) => [value, value === 'UNKNOWN' ? 'Pendiente' : value])} />
            <TextField label="Combustible" value={draft.vehicle.fuel ?? ''} onChange={(value) => updateVehicle('fuel', value || null)} />
            <TextField label="CO₂ (g/km)" type="number" min="0" step="1" value={numberValue(draft.vehicle.co2GKm)} onChange={(value) => updateVehicle('co2GKm', nullableNumber(value))} />
            <SelectField label="Fuente del CO₂" value={draft.vehicle.co2Source} onChange={(value) => updateVehicle('co2Source', value as RegistrationCase['vehicle']['co2Source'])} options={[
              ['unknown', 'Pendiente'], ['spanish-itv', 'Ficha ITV española'], ['coc', 'COC'], ['manufacturer-certificate', 'Certificado del fabricante'], ['foreign-official-document', 'Documento oficial extranjero'], ['manual-unverified', 'Introducido sin verificar'],
            ]} />
            <TextField label="Cilindrada (cm³)" type="number" min="0" step="1" value={numberValue(draft.vehicle.engineCc)} onChange={(value) => updateVehicle('engineCc', nullableNumber(value))} />
            <TextField label="Potencia (kW)" type="number" min="0" step="0.1" value={numberValue(draft.vehicle.powerKw)} onChange={(value) => updateVehicle('powerKw', nullableNumber(value))} />
            <TextField label="Masa (kg)" type="number" min="0" step="1" value={numberValue(draft.vehicle.massKg)} onChange={(value) => updateVehicle('massKg', nullableNumber(value))} />
            <TextField label="N.º de plazas" type="number" min="1" step="1" value={numberValue(draft.vehicle.seats)} onChange={(value) => updateVehicle('seats', nullableNumber(value))} />
            <ToggleField label="CO₂ contrastado en documento" value={draft.vehicle.co2Verified} onChange={(value) => updateVehicle('co2Verified', value)} />
          </div>
        )}

        {step === 2 && (
          <div className="grid gap-5 md:grid-cols-2">
            <TextField label="País de matriculación" hint="Código ISO: DE, FR, NL, NO, GB…" value={draft.vehicle.registrationCountry} maxLength={2} onChange={(value) => updateVehicle('registrationCountry', upperCode(value) ?? '')} />
            <TextField label="País de fabricación" hint="Si se conoce" value={draft.vehicle.manufacturingCountry ?? ''} maxLength={2} onChange={(value) => updateVehicle('manufacturingCountry', upperCode(value))} />
            <TextField label="Matrícula extranjera" value={draft.vehicle.foreignRegistration ?? ''} onChange={(value) => updateVehicle('foreignRegistration', value || null)} />
            <SelectField label="Baja para exportación" value={nullableBooleanValue(draft.vehicle.exportDeregistered)} onChange={(value) => updateVehicle('exportDeregistered', parseNullableBoolean(value))} options={booleanOptions} />
            <SelectField label="Forma de traslado" value={draft.vehicle.transportMethod} onChange={(value) => updateVehicle('transportMethod', value as RegistrationCase['vehicle']['transportMethod'])} options={[
              ['unknown', 'Pendiente'], ['driven', 'Circulando legalmente'], ['trailer', 'Remolque'], ['carrier', 'Transportista'], ['temporary-plates', 'Placas temporales o exportación'],
            ]} />
            <SelectField label="Documento de inspección técnica extranjero" value={nullableBooleanValue(draft.vehicle.foreignTechnicalDocumentAvailable)} onChange={(value) => updateVehicle('foreignTechnicalDocumentAvailable', parseNullableBoolean(value))} options={booleanOptions} />
            <SelectField label="Certificado de inspección extranjera" value={nullableBooleanValue(draft.vehicle.foreignInspectionCertificateAvailable)} onChange={(value) => updateVehicle('foreignInspectionCertificateAvailable', parseNullableBoolean(value))} options={booleanOptions} />
            <TextField label="Vigencia de inspección extranjera" type="date" value={draft.vehicle.foreignInspectionValidUntil ?? ''} onChange={(value) => updateVehicle('foreignInspectionValidUntil', value || null)} />
          </div>
        )}

        {step === 3 && (
          <div className="grid gap-5 md:grid-cols-2">
            <TextField label="Campo K" hint="Cópialo exactamente del documento técnico" value={draft.vehicle.fieldK ?? ''} onChange={(value) => updateVehicle('fieldK', value || null)} />
            <TextField label="N.º de homologación" value={draft.vehicle.approvalNumber ?? ''} onChange={(value) => updateVehicle('approvalNumber', value || null)} />
            <SelectField label="Tipo de homologación" value={draft.vehicle.approvalType} onChange={(value) => updateVehicle('approvalType', value as ApprovalType)} options={[
              ['unknown', 'Pendiente de identificar'], ['eu-type', 'Homologación de tipo UE'], ['spanish-type', 'Homologación nacional española'], ['individual-eea', 'Individual concedida en EEE'], ['individual-eu', 'Individual UE'], ['individual-spain', 'Individual española'], ['short-series-eea', 'Serie corta EEE'], ['none', 'No se identifica homologación válida'],
            ]} />
            <SelectField label="COC disponible" value={nullableBooleanValue(draft.vehicle.cocAvailable)} onChange={(value) => updateVehicle('cocAvailable', parseNullableBoolean(value))} options={booleanOptions} />
            {draft.vehicle.cocAvailable === true && <ToggleField label="Validez del COC comprobada" value={draft.vehicle.cocValidityConfirmed} onChange={(value) => updateVehicle('cocValidityConfirmed', value)} />}
            {draft.vehicle.cocAvailable === true && <ToggleField label="VIN del COC coincide" value={draft.vehicle.cocVinMatchConfirmed} onChange={(value) => updateVehicle('cocVinMatchConfirmed', value)} />}
            <div className="md:col-span-2 rounded-xl bg-accent-soft p-4 text-[12px] leading-relaxed text-accent-deep"><Info size={15} className="mr-1.5 inline" />El COC no es universal. Con homologación europea identificable y sin COC puede ser viable una ficha reducida; homologaciones individuales o ausencia de homologación exigen otra comprobación.</div>
          </div>
        )}

        {step === 4 && (
          <div className="grid gap-5 md:grid-cols-2">
            <SelectField label="Perfil" value={draft.buyerType} onChange={(value) => update('buyerType', value as BuyerType)} options={[
              ['individual', 'Particular'], ['self-employed', 'Autónomo'], ['company', 'Empresa'],
            ]} />
            <SelectField label="Comunidad autónoma" value={draft.autonomousCommunity ?? ''} onChange={(value) => update('autonomousCommunity', (value || null) as RegistrationCase['autonomousCommunity'])} options={[['', 'Pendiente'], ...AUTONOMOUS_COMMUNITIES.map((community): [string, string] => [community.value, community.label])]} />
            <TextField label="Municipio" hint="Para orientar el IVTM; no se aplica un importe nacional" value={draft.municipality ?? ''} onChange={(value) => update('municipality', value || null)} />
            <TextField label="Potencia fiscal" type="number" min="0" step="0.01" value={numberValue(draft.fiscalHorsepower)} onChange={(value) => update('fiscalHorsepower', nullableNumber(value))} />
            <TextField label="Fecha relevante para IVTM" type="date" value={draft.ivtmDate ?? ''} onChange={(value) => update('ivtmDate', value || null)} />
            <SelectField label="Posible beneficio municipal" value={draft.municipalBenefitKind} onChange={(value) => update('municipalBenefitKind', value as RegistrationCase['municipalBenefitKind'])} options={[
              ['unknown', 'Pendiente'], ['none', 'Ninguno conocido'], ['exemption', 'Posible exención'], ['discount', 'Posible bonificación'],
            ]} />
          </div>
        )}

        {step === 5 && (
          <div className="space-y-6">
            <div className="grid gap-5 md:grid-cols-2">
              <SelectField label="Estado del proceso" value={draft.processStage} onChange={(value) => update('processStage', value as ProcessStage)} options={[
                ['not-purchased', 'Aún no comprado'], ['purchased', 'Comprado'], ['transported', 'Transportado'], ['itv-requested', 'ITV solicitada'], ['itv-passed', 'ITV superada'], ['taxes-started', 'Impuestos iniciados'], ['dgt-started', 'DGT iniciada'], ['registered', 'Matriculado'],
              ]} />
              <SelectField label="Vehículo matriculado antes en España" value={draft.vehicle.previouslyRegisteredInSpain ? 'yes' : 'no'} onChange={(value) => updateVehicle('previouslyRegisteredInSpain', value === 'yes')} options={[['no', 'No'], ['yes', 'Sí / no estoy seguro']]} />
            </div>
            <fieldset>
              <legend className="text-[12px] font-semibold text-ink">Detector de posibles reformas</legend>
              <p className="mt-1 text-[11px] text-muted">Marca lo que exista. Una modificación no recibe automáticamente un veredicto: abre una revisión contra el Manual de Reformas.</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {(Object.keys(REFORM_LABELS) as ReformKey[]).map((key) => (
                  <label key={key} className={cn('flex cursor-pointer items-start gap-2 rounded-xl border p-3 text-[11.5px]', draft.vehicle.reforms[key] ? 'border-warn/30 bg-warn-soft text-warn' : 'border-line bg-surface-alt text-ink-soft')}>
                    <input type="checkbox" className="mt-0.5 accent-[#C8862E]" checked={draft.vehicle.reforms[key] === true} onChange={(event) => updateVehicle('reforms', { ...draft.vehicle.reforms, [key]: event.target.checked })} />
                    {REFORM_LABELS[key]}
                  </label>
                ))}
              </div>
            </fieldset>
          </div>
        )}

        {(message || error) && <div className={cn('mt-6 rounded-xl p-3 text-[12px]', error ? 'bg-danger-soft text-danger' : 'bg-ok-soft text-ok')} role="status">{error ?? message}</div>}

        <div className="mt-8 flex flex-col-reverse gap-3 border-t border-line-soft pt-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-2">
            <button type="button" disabled={step === 0 || saving} onClick={() => setStep((current) => Math.max(0, current - 1))} className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2.5 text-[12px] text-ink disabled:opacity-40"><ArrowLeft size={13} /> Anterior</button>
            <button type="button" disabled={saving} onClick={() => void persistDraft(false)} className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2.5 text-[12px] text-ink disabled:opacity-40"><Save size={13} /> {saving ? 'Guardando…' : 'Guardar borrador'}</button>
          </div>
          {step < STEPS.length - 1 ? (
            <button type="button" disabled={saving} onClick={() => void next()} className="inline-flex items-center justify-center gap-2 rounded-full bg-ink px-5 py-2.5 text-[12.5px] font-medium text-white disabled:opacity-50">Guardar y continuar <ArrowRight size={14} /></button>
          ) : (
            <button type="button" disabled={saving} onClick={() => void persistDraft(true)} className="inline-flex items-center justify-center gap-2 rounded-full bg-accent px-5 py-2.5 text-[12.5px] font-medium text-ink disabled:opacity-50">Calcular mi ruta <ArrowRight size={14} /></button>
          )}
        </div>
      </form>
    </div>
  );
}

function StepHeading({ index, title }: { index: number; title: string }) {
  return <div className="mb-6"><div className="text-[9.5px] uppercase tracking-[0.2em] text-muted">Paso {index + 1} de {STEPS.length}</div><h2 className="mt-1 font-serif text-[28px] text-ink">{title}</h2></div>;
}

function FieldShell({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return <label className="block"><span className="text-[11.5px] font-medium text-ink">{label}</span>{hint && <span className="mt-0.5 block text-[10px] text-muted">{hint}</span>}<span className="mt-2 block">{children}</span></label>;
}

function TextField({ label, hint, value, onChange, type = 'text', ...inputProps }: {
  label: string; hint?: string; value: string; onChange: (value: string) => void; type?: string;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'>) {
  return <FieldShell label={label} hint={hint}><input {...inputProps} type={type} value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-xl border border-line bg-surface-alt px-3.5 py-3 text-[13px] text-ink outline-none transition focus:border-accent" /></FieldShell>;
}

function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: (readonly [string, string])[] }) {
  return <FieldShell label={label}><select value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-xl border border-line bg-surface-alt px-3.5 py-3 text-[13px] text-ink outline-none focus:border-accent">{options.map(([optionValue, optionLabel]) => <option key={optionValue} value={optionValue}>{optionLabel}</option>)}</select></FieldShell>;
}

function ToggleField({ label, value, onChange }: { label: string; value: boolean; onChange: (value: boolean) => void }) {
  return <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-line bg-surface-alt p-3.5"><span className="text-[11.5px] font-medium text-ink">{label}</span><input type="checkbox" checked={value} onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(event.target.checked)} className="h-4 w-4 accent-[#C8862E]" /></label>;
}

const booleanOptions: (readonly [string, string])[] = [['unknown', 'Pendiente'], ['yes', 'Sí'], ['no', 'No']];
function nullableBooleanValue(value: boolean | null): string { return value === null ? 'unknown' : value ? 'yes' : 'no'; }
function parseNullableBoolean(value: string): boolean | null { return value === 'unknown' ? null : value === 'yes'; }
function nullableNumber(value: string): number | null { return value.trim() === '' ? null : Number(value); }
function numberValue(value: number | null): string { return value === null ? '' : String(value); }
function upperCode(value: string): string | null { const normalized = value.trim().toUpperCase(); return normalized || null; }
