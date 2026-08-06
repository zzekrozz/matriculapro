'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, History, Landmark, Save } from 'lucide-react';
import {
  buildRegistrationDecision,
  type RegistrationCase,
} from '@/domain/registration';
import type { Model576Calculation } from '@/domain/registration/fiscal/types';
import type { Model576ApiRequest } from '@/lib/fiscal/calculation-api';
import { Simulator576 } from '@/components/modules/simulador/Simulator576';
import { useFiscalCatalogSearch } from '@/hooks/useFiscalCatalogSearch';
import { useRegistrationCases } from '@/providers/RegistrationCaseProvider';
import { CaseHeader, CaseTabs, TrustPanel, formatMoney } from './CaseChrome';

const ROUTE_LABEL = {
  'model-576': 'Modelo 576',
  'model-06': 'Modelo 06',
  'model-05': 'Modelo 05',
  'special-review': 'Revisión especial',
} as const;

const PURCHASE_ROUTE_LABEL = {
  itp: 'ITP autonómico',
  'spanish-vat-new-vehicle': 'IVA español · medio de transporte nuevo',
  'foreign-professional-invoice-review': 'Factura profesional · revisar régimen de IVA',
  'spanish-professional-invoice': 'Factura de profesional español',
  customs: 'Aduanas e importación',
  'relocation-review': 'Traslado de residencia · revisión fiscal',
  'rehabilitation-review': 'Rehabilitación · revisión fiscal',
  'special-review': 'Revisión especial',
} as const;

interface FiscalDraft {
  input: Model576ApiRequest;
  calculation: Model576Calculation;
}

export function CaseTaxes({ registrationCase }: { registrationCase: RegistrationCase }) {
  const {
    persistent,
    saveCase,
    saveFiscalCalculation,
    getLatestTaxCalculation,
    getTaxCalculationHistory,
  } = useRegistrationCases();
  const [working, setWorking] = useState(registrationCase);
  const [fiscalDraft, setFiscalDraft] = useState<FiscalDraft | null>(null);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    setWorking(registrationCase);
    if (!persistent) {
      setFiscalDraft(null);
      setFeedback(null);
      setError(null);
    }
  }, [persistent, registrationCase]);
  const decision = useMemo(() => buildRegistrationDecision(working), [working]);
  const activeCatalogQuery = useMemo(() => `${working.vehicle.brand} ${working.vehicle.model}`.trim(), [working.vehicle.brand, working.vehicle.model]);
  const { response: activeCatalog } = useFiscalCatalogSearch(activeCatalogQuery, 1);
  const latest = getLatestTaxCalculation(registrationCase.id);
  const history = getTaxCalculationHistory(registrationCase.id);
  const savedCatalogVersion = latest?.fiscalCalculation?.catalogVersion;
  const catalogOutdated = Boolean(
    savedCatalogVersion
    && activeCatalog.status === 'ready'
    && activeCatalog.catalogVersion
    && savedCatalogVersion !== activeCatalog.catalogVersion,
  );

  const update = <K extends keyof RegistrationCase>(key: K, value: RegistrationCase[K]) => {
    if (!persistent) return;
    setWorking((current) => ({ ...current, [key]: value, updatedAt: new Date().toISOString() }));
  };

  const saveFiscalVersion = async () => {
    if (!persistent || !fiscalDraft) return;
    setBusy(true);
    setFeedback(null);
    setError(null);
    try {
      const { input, calculation } = fiscalDraft;
      const updatedCase: RegistrationCase = {
        ...working,
        taxableBase: calculation.box01TaxableBase,
        marketValue: calculation.marketValueAfterDepreciation,
        autonomousCommunity: input.currentAutonomousCommunity,
        vehicle: {
          ...working.vehicle,
          category: input.vehicle.category,
          co2GKm: input.vehicle.co2GKm,
          co2Verified: input.vehicle.co2Verified,
        },
        updatedAt: new Date().toISOString(),
      };
      const savedCase = await saveCase(updatedCase);
      setWorking(savedCase);
      await saveFiscalCalculation(savedCase.id, input, calculation);
      setFeedback('Nueva versión fiscal guardada en el historial del expediente.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se ha podido guardar la versión fiscal.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-[1280px] px-5 pb-16 pt-6 lg:px-8">
      <CaseHeader registrationCase={working} processKind={decision.processKind} />
      <div className="mt-4"><CaseTabs caseId={working.id} active="taxes" /></div>
      {!persistent && <div className="mt-4 rounded-xl border border-accent/25 bg-accent-soft p-3 text-[11px] text-accent-deep" role="status">Modo solo lectura: puedes consultar decisiones e historial fiscal, pero no editar datos, calcular ni guardar nuevas versiones.</div>}

      <header className="mt-6">
        <div className="text-[10px] uppercase tracking-[0.2em] text-accent-deep">Costes e impuestos</div>
        <h2 className="mt-1 font-serif text-[32px] text-ink">Decisiones separadas y trazables</h2>
        <p className="mt-2 max-w-3xl text-[12.5px] leading-relaxed text-ink-soft">
          La tributación de la compra no es el impuesto de matriculación. El sistema decide cada rama por separado y deja el IVTM en su ámbito municipal.
        </p>
      </header>

      <section className="mt-5 grid gap-4 md:grid-cols-3">
        <DecisionCard eyebrow="Adquisición" value={PURCHASE_ROUTE_LABEL[decision.purchaseTaxRoute.outcome]} reason={decision.purchaseTaxRoute.reason} blocked={decision.purchaseTaxRoute.blocking} />
        <DecisionCard eyebrow="IEDMT" value={ROUTE_LABEL[decision.registrationTaxRoute.outcome]} reason={decision.registrationTaxRoute.reason} blocked={decision.registrationTaxRoute.blocking} />
        <DecisionCard eyebrow="IVTM" value={ivtmLabel(working.ivtmStatus)} reason={working.municipality ? `Gestión municipal en ${working.municipality}; cuantía y beneficios dependen de la ordenanza.` : 'Falta indicar municipio. No existe un importe nacional único.'} blocked={!working.municipality} />
      </section>

      {catalogOutdated && (
        <div role="alert" className="mt-5 flex items-start gap-2 rounded-xl border border-warn/20 bg-warn-soft p-4 text-[10.5px] leading-relaxed text-warn">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          <span>Existe una versión fiscal más reciente. Recalcula antes de presentar.</span>
        </div>
      )}

      <div className="mt-5">
        <Simulator576
          mode="case"
          caseId={working.id}
          vehicle={working.vehicle}
          registrationTaxRoute={decision.registrationTaxRoute.outcome}
          initialCalculation={latest ?? undefined}
          readOnly={!persistent}
          onFiscalCalculationChange={persistent ? (calculation, input) => setFiscalDraft({ calculation, input }) : undefined}
        />
      </div>

      <section className="mt-5 rounded-[22px] border border-line bg-surface p-5 shadow-soft-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2"><History size={15} className="text-accent-deep" /><h3 className="font-serif text-[22px] text-ink">Historial fiscal</h3></div>
            <p className="mt-2 max-w-2xl text-[10.5px] leading-relaxed text-ink-soft">
              Cada guardado crea una versión nueva con entradas, resultados intermedios, catálogo, fuentes, estado y confirmación. No se sobrescribe el cálculo anterior.
            </p>
          </div>
          <button type="button" disabled={busy || !persistent || !fiscalDraft} onClick={() => void saveFiscalVersion()} className="inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2.5 text-[11px] font-medium text-white disabled:cursor-not-allowed disabled:opacity-40">
            <Save size={13} /> {busy ? 'Guardando…' : persistent ? 'Guardar nueva versión' : 'Solo lectura'}
          </button>
        </div>
        {(feedback || error) && <p className={`mt-3 text-[10.5px] ${error ? 'text-danger' : 'text-ok'}`} role="status">{error ?? feedback}</p>}
        {history.length === 0 ? (
          <div className="mt-4 rounded-xl bg-bg p-4 text-[10.5px] text-muted">Todavía no hay cálculos guardados para este expediente.</div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-[10px]">
              <thead className="text-muted"><tr><th className="pb-2 font-medium">Fecha</th><th className="pb-2 font-medium">Estado</th><th className="pb-2 font-medium">Método</th><th className="pb-2 font-medium">Catálogo</th><th className="pb-2 font-medium">Casilla 01</th><th className="pb-2 font-medium">Casilla 08</th><th className="pb-2 font-medium">Revisión</th></tr></thead>
              <tbody>
                {history.map((item) => (
                  <tr key={item.id} className="border-t border-line-soft">
                    <td className="py-2.5 text-ink">{dateTime(item.calculatedAt)}</td>
                    <td className="py-2.5 text-ink-soft">{fiscalStatus(item.fiscalCalculation?.status)}</td>
                    <td className="py-2.5 text-ink-soft">{valuationLabel(item.fiscalCalculation?.valuationMethod)}</td>
                    <td className="py-2.5 font-mono text-[9px] text-muted">{item.fiscalCalculation?.catalogVersion ?? 'No aplicado'}</td>
                    <td className="py-2.5 text-ink">{formatMoney(item.fiscalCalculation?.box01TaxableBase ?? item.taxableBase)}</td>
                    <td className="py-2.5 text-ink">{formatMoney(item.fiscalCalculation?.box08FinalResult ?? item.estimatedQuota)}</td>
                    <td className="py-2.5 text-ink-soft">{item.reviewedByUser ? `Confirmada ${item.confirmedAt ? dateTime(item.confirmedAt) : ''}` : 'Pendiente'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mt-5 grid gap-5 lg:grid-cols-[1fr_1fr]">
        <div className="rounded-[22px] border border-line bg-surface p-5">
          <div className="flex items-center gap-2"><Landmark size={16} className="text-accent-deep" /><h3 className="font-serif text-[22px]">IVTM municipal</h3></div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <TaxField label="Municipio"><input value={working.municipality ?? ''} disabled={!persistent} onChange={(event) => update('municipality', event.target.value || null)} className={inputClass} /></TaxField>
            <TaxField label="Potencia fiscal"><input type="number" min="0" step="0.01" value={valueOf(working.fiscalHorsepower)} disabled={!persistent} onChange={(event) => update('fiscalHorsepower', nullableNumber(event.target.value))} className={inputClass} /></TaxField>
            <TaxField label="Estado"><select value={working.ivtmStatus} disabled={!persistent} onChange={(event) => update('ivtmStatus', event.target.value as RegistrationCase['ivtmStatus'])} className={inputClass}><option value="pending">Pendiente</option><option value="requested">Liquidación solicitada</option><option value="paid">Pagado</option><option value="exempt-or-discounted">Exento o bonificado</option><option value="municipal-review">Revisión municipal</option></select></TaxField>
            <TaxField label="Beneficio municipal"><select value={working.municipalBenefitKind} disabled={!persistent} onChange={(event) => update('municipalBenefitKind', event.target.value as RegistrationCase['municipalBenefitKind'])} className={inputClass}><option value="unknown">Pendiente</option><option value="none">Ninguno</option><option value="exemption">Posible exención</option><option value="discount">Posible bonificación</option></select></TaxField>
          </div>
        </div>
        <div className="rounded-[22px] border border-line bg-surface p-5">
          <h3 className="font-serif text-[22px]">Otros costes del expediente</h3>
          <div className="mt-4 space-y-2">
            {decision.estimatedCosts.filter((cost) => cost.id !== 'registration-tax').map((cost) => <div key={cost.id} className="flex items-start justify-between gap-4 rounded-xl bg-bg p-3"><div><div className="text-[11.5px] font-medium text-ink">{cost.title}</div><div className="mt-1 text-[10px] leading-relaxed text-muted">{cost.explanation}</div></div><span className="shrink-0 text-[10px] uppercase tracking-[0.1em] text-muted">{cost.kind === 'variable' ? 'Variable' : cost.kind}</span></div>)}
          </div>
        </div>
      </section>

      <div className="mt-5"><TrustPanel title="Fuentes fiscales y fecha de revisión" sources={decision.sources.filter((source) => /AEAT|Boletín Oficial/.test(source.authority))} scope="Preparación de la tributación de adquisición, IEDMT e IVTM; no sustituye el justificante oficial ni la autoliquidación." usedData={[`Categoría ${working.vehicle.category}`, `CO₂ ${working.vehicle.co2GKm ?? 'pendiente'}`, `Comunidad ${working.autonomousCommunity ?? 'pendiente'}`]} missingData={[...decision.purchaseTaxRoute.missingData, ...decision.registrationTaxRoute.missingData]} /></div>
    </div>
  );
}

function DecisionCard({ eyebrow, value, reason, blocked }: { eyebrow: string; value: string; reason: string; blocked: boolean }) {
  return <article className="rounded-[20px] border border-line bg-surface p-5"><div className="flex items-center justify-between gap-3"><span className="text-[9.5px] uppercase tracking-[0.18em] text-muted">{eyebrow}</span>{blocked ? <AlertTriangle size={15} className="text-warn" /> : <CheckCircle2 size={15} className="text-ok" />}</div><h3 className="mt-3 font-serif text-[21px] leading-tight text-ink">{value}</h3><p className="mt-2 text-[10.5px] leading-relaxed text-ink-soft">{reason}</p></article>;
}

function TaxField({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="text-[10.5px] font-medium text-ink">{label}</span><span className="mt-1.5 block">{children}</span></label>;
}

function fiscalStatus(value: Model576Calculation['status'] | undefined): string {
  if (!value) return 'Estimación anterior';
  return ({
    'complete-official-table': 'Completo · tabla oficial',
    'complete-new-vehicle': 'Completo · vehículo nuevo',
    'estimated-justified-market-value': 'Valoración aportada',
    incomplete: 'Incompleto',
    blocked: 'Bloqueado',
    'special-review': 'Revisión especial',
  })[value];
}

function valuationLabel(value: Model576Calculation['valuationMethod'] | undefined): string {
  if (!value) return 'Anterior';
  return ({ 'official-table': 'Tabla oficial', 'new-vehicle-vat-base': 'Base IVA', 'justified-market-value': 'Valoración justificada' })[value];
}

function dateTime(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('es-ES', { dateStyle: 'short', timeStyle: 'short' }).format(date);
}

function nullableNumber(value: string): number | null { return value.trim() === '' ? null : Number(value); }
function valueOf(value: number | null): string { return value === null ? '' : String(value); }
function ivtmLabel(value: RegistrationCase['ivtmStatus']): string { return ({ pending: 'Pendiente', requested: 'Liquidación solicitada', paid: 'Pagado', 'exempt-or-discounted': 'Exento o bonificado', 'municipal-review': 'Revisión municipal' })[value]; }
const inputClass = 'w-full rounded-xl border border-line bg-surface-alt px-3 py-2.5 text-[12px] text-ink outline-none focus:border-accent disabled:cursor-not-allowed disabled:opacity-60';
