'use client';

import { AlertTriangle, CheckCircle2, ExternalLink, Info, LockKeyhole } from 'lucide-react';
import type { Model576Calculation } from '@/domain/registration/fiscal/types';
import { OFFICIAL_SOURCE_BY_ID } from '@/domain/registration/sources';
import type { FiscalCatalogVehicle } from '@/lib/fiscal/catalog-api';
import { cn } from '@/lib/cn';

const STATUS_LABEL: Record<Model576Calculation['status'], string> = {
  'complete-official-table': 'Cálculo completo con tabla oficial',
  'complete-new-vehicle': 'Cálculo completo con base de IVA',
  'estimated-justified-market-value': 'Cálculo preparado con valoración aportada',
  incomplete: 'Faltan datos para calcular',
  blocked: 'El cálculo está bloqueado',
  'special-review': 'Este caso requiere revisión fiscal especial',
};

const METHOD_LABEL: Record<Model576Calculation['valuationMethod'], string> = {
  'official-table': 'Tabla oficial de Hacienda 2026',
  'new-vehicle-vat-base': 'Base imponible de IVA o equivalente',
  'justified-market-value': 'Valoración de mercado justificada',
};

export function FiscalResultPanel({
  calculation,
  selectedVehicle,
  stale = false,
}: {
  calculation: Model576Calculation;
  selectedVehicle: FiscalCatalogVehicle | null;
  stale?: boolean;
}) {
  const complete = calculation.status.startsWith('complete-') || calculation.status === 'estimated-justified-market-value';
  return (
    <div className="space-y-5">
      <section className={cn('rounded-2xl p-5', complete ? 'bg-ink text-white' : 'border border-warn/20 bg-warn-soft text-ink')}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className={cn('flex items-center gap-2 text-[9.5px] uppercase tracking-[0.18em]', complete ? 'text-accent' : 'text-warn')}>
              {complete ? <CheckCircle2 size={13} /> : <LockKeyhole size={13} />}
              Estado fiscal
            </div>
            <h3 className="mt-2 font-serif text-[26px] leading-tight">{STATUS_LABEL[calculation.status]}</h3>
            <p className={cn('mt-2 max-w-2xl text-[10.5px] leading-relaxed', complete ? 'text-muted-soft' : 'text-ink-soft')}>
              {complete
                ? 'Resultado de preparación trazable. No es una autoliquidación presentada ni una garantía de aceptación administrativa.'
                : 'No se rellenan huecos ni se muestra una cuota como definitiva. Revisa los datos indicados antes de continuar.'}
            </p>
          </div>
          {calculation.box08FinalResult !== null && (
            <div className="text-right">
              <div className={cn('text-[9px] uppercase tracking-[0.16em]', complete ? 'text-muted-soft' : 'text-muted')}>Casilla 08 · resultado</div>
              <div className="mt-1 font-serif text-[38px] leading-none">{money(calculation.box08FinalResult)}</div>
            </div>
          )}
        </div>
        {stale && (
          <div className={cn('mt-4 flex gap-2 rounded-xl p-3 text-[10.5px]', complete ? 'bg-white/10 text-white' : 'bg-white/60 text-warn')}>
            <AlertTriangle size={13} className="mt-0.5 shrink-0" />
            Los datos han cambiado después de este cálculo. Actualízalo antes de revisar las casillas.
          </div>
        )}
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <SummaryItem label="Método" value={METHOD_LABEL[calculation.valuationMethod]} />
        <SummaryItem
          label="Vehículo seleccionado"
          value={selectedVehicle ? `${selectedVehicle.brand} ${selectedVehicle.model} · ${selectedVehicle.version ?? 'sin versión diferenciada'}` : 'No procede o está pendiente'}
        />
        <SummaryItem label="Valor oficial nuevo" value={nullableMoney(calculation.officialVehicleValue)} />
        <SummaryItem label="Porcentaje por antigüedad" value={calculation.depreciationPercentage === null ? 'No procede o pendiente' : percent(calculation.depreciationPercentage)} />
        <SummaryItem label="Valor de mercado" value={nullableMoney(calculation.marketValueAfterDepreciation)} />
        <SummaryItem label="Minoración residual" value={calculation.residualTaxAmountRemoved === null ? 'No procede o pendiente' : `− ${money(calculation.residualTaxAmountRemoved)}`} />
        <SummaryItem label="Base · casilla 01" value={nullableMoney(calculation.box01TaxableBase)} />
        <SummaryItem label="Epígrafe y tipo actual" value={calculation.epigraph === null || calculation.currentIedmtRateForLiquidation === null ? 'Pendiente' : `${calculation.epigraph}.º · ${percent(calculation.currentIedmtRateForLiquidation)}`} />
        <SummaryItem label="Cuota · casilla 04" value={nullableMoney(calculation.box04TaxQuota)} />
      </section>

      {(calculation.blockers.length > 0 || calculation.missingData.length > 0 || calculation.warnings.length > 0) && (
        <section className="grid gap-3 lg:grid-cols-3">
          <IssueList title="Bloqueos" tone="danger" items={calculation.blockers.map((item) => item.message)} />
          <IssueList title="Datos pendientes" tone="warn" items={calculation.missingData.map((item) => `${item.label}: ${item.reason}`)} />
          <IssueList title="Advertencias" tone="info" items={calculation.warnings.map((item) => item.message)} />
        </section>
      )}

      {calculation.usedInvoiceComparison && (
        <section className="rounded-2xl border border-line bg-surface-alt p-4">
          <h4 className="text-[11.5px] font-semibold text-ink">Factura frente a valoración fiscal</h4>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <SummaryItem label="Precio pagado" value={money(calculation.usedInvoiceComparison.invoicePrice)} compact />
            <SummaryItem label="Valor utilizado" value={money(calculation.usedInvoiceComparison.officialOrJustifiedMarketValue)} compact />
            <SummaryItem label="Diferencia" value={`${money(calculation.usedInvoiceComparison.absoluteDifference)}${calculation.usedInvoiceComparison.percentageDifference === null ? '' : ` · ${percent(calculation.usedInvoiceComparison.percentageDifference)}`}`} compact />
          </div>
          <p className="mt-3 text-[10px] leading-relaxed text-ink-soft">{calculation.usedInvoiceComparison.explanation}</p>
          <p className="mt-2 text-[9.5px] text-muted">El precio pagado no sustituye por sí solo al valor de mercado utilizado en el Modelo 576.</p>
        </section>
      )}

      <section>
        <div className="mb-3">
          <div className="text-[9.5px] uppercase tracking-[0.18em] text-accent-deep">Asistente campo por campo</div>
          <h3 className="mt-1 font-serif text-[24px] text-ink">Casillas 01 a 08</h3>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {calculation.boxGuidance.map((guidance) => (
            <details key={guidance.box} className="group rounded-2xl border border-line bg-surface p-4 open:border-accent/40">
              <summary className="cursor-pointer list-none">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-[9px] uppercase tracking-[0.16em] text-muted">Casilla {guidance.box}</div>
                    <h4 className="mt-1 text-[12px] font-semibold text-ink">{guidance.title}</h4>
                  </div>
                  <div className="text-right text-[13px] font-semibold text-ink">{guidanceValue(guidance.value)}</div>
                </div>
              </summary>
              <div className="mt-4 space-y-3 border-t border-line-soft pt-3 text-[10px] leading-relaxed text-ink-soft">
                <div><strong className="text-ink">¿De dónde sale?</strong><br />{guidance.origin}</div>
                <div><strong className="text-ink">Fórmula</strong><br /><span className="font-mono">{guidance.formula ?? 'No procede o pendiente de datos.'}</span></div>
                {guidance.warnings.length > 0 && <IssueList title="Advertencias" tone="warn" items={guidance.warnings} compact />}
                <SourceLinks sourceIds={guidance.sourceIds} />
              </div>
            </details>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-line bg-surface p-4">
        <div className="flex items-center gap-2"><Info size={14} className="text-accent-deep" /><h3 className="text-[12px] font-semibold text-ink">Explicación del cálculo</h3></div>
        <div className="mt-3 space-y-2">
          {calculation.explanation.map((step, index) => (
            <details key={step.id} className="rounded-xl bg-bg p-3" open={index === 0}>
              <summary className="cursor-pointer text-[11px] font-medium text-ink">{index + 1}. {step.title}</summary>
              <div className="mt-2 text-[10px] leading-relaxed text-ink-soft">
                <p>{step.detail}</p>
                {step.formula && <div className="mt-2 rounded-lg bg-surface px-3 py-2 font-mono text-[9.5px] text-ink">{step.formula}</div>}
                <div className="mt-2"><SourceLinks sourceIds={step.sourceIds} /></div>
              </div>
            </details>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-line bg-bg p-4">
        <h3 className="text-[11.5px] font-semibold text-ink">Fuentes y versión</h3>
        <div className="mt-2"><SourceLinks sourceIds={calculation.sourceIds} /></div>
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[9px] text-muted">
          <span>Catálogo: {calculation.catalogVersion ?? 'No aplicado'}</span>
          <span>Calculado: {dateTime(calculation.calculatedAt)}</span>
          <span>Importes redondeados a céntimos al presentar cada casilla monetaria.</span>
        </div>
      </section>
    </div>
  );
}

function SummaryItem({ label, value, compact = false }: { label: string; value: string; compact?: boolean }) {
  return <div className={cn('rounded-xl border border-line bg-surface', compact ? 'p-3' : 'p-4')}><div className="text-[9px] uppercase tracking-[0.14em] text-muted">{label}</div><div className={cn('mt-1.5 font-medium text-ink', compact ? 'text-[11px]' : 'text-[12px]')}>{value}</div></div>;
}

function IssueList({ title, tone, items, compact = false }: { title: string; tone: 'danger' | 'warn' | 'info'; items: string[]; compact?: boolean }) {
  if (items.length === 0) return null;
  const style = tone === 'danger' ? 'border-danger/20 bg-danger-soft text-danger' : tone === 'warn' ? 'border-warn/20 bg-warn-soft text-warn' : 'border-line bg-bg text-ink-soft';
  return <div className={cn('rounded-xl border', style, compact ? 'p-3' : 'p-4')}><div className="text-[10.5px] font-semibold">{title}</div><ul className="mt-2 space-y-1.5 text-[9.5px] leading-relaxed">{items.map((item) => <li key={item} className="flex gap-2"><span aria-hidden>•</span><span>{item}</span></li>)}</ul></div>;
}

function SourceLinks({ sourceIds }: { sourceIds: string[] }) {
  const ids = [...new Set(sourceIds)];
  if (ids.length === 0) return <span className="text-[9px] text-muted">Sin fuente aplicable en este bloque.</span>;
  return <div className="flex flex-wrap gap-2">{ids.map((id) => {
    const source = OFFICIAL_SOURCE_BY_ID[id];
    const fallback = fiscalSourceFallback(id);
    return source ? <a key={id} href={source.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full border border-line bg-surface px-2 py-1 text-[9px] text-accent-deep hover:border-accent"><ExternalLink size={9} />{source.authority} · {source.title}</a> : fallback ? <a key={id} href={fallback.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full border border-line bg-surface px-2 py-1 text-[9px] text-accent-deep hover:border-accent"><ExternalLink size={9} />{fallback.label}</a> : <span key={id} className="rounded-full border border-line bg-surface px-2 py-1 font-mono text-[8.5px] text-muted">Dato aportado · {id}</span>;
  })}</div>;
}

function fiscalSourceFallback(id: string): { label: string; url: string } | null {
  if (id.startsWith('boe-order-hac-1501-2025')) return { label: 'BOE · Orden HAC/1501/2025', url: 'https://www.boe.es/diario_boe/txt.php?id=BOE-A-2025-26357' };
  if (id.startsWith('boe-law-37-1992')) return { label: 'BOE · Ley 37/1992', url: 'https://www.boe.es/eli/es/l/1992/12/28/37/con' };
  if (id.startsWith('boe-law-38-1992')) return { label: 'BOE · Ley 38/1992', url: 'https://www.boe.es/eli/es/l/1992/12/28/38/con' };
  if (id.startsWith('aeat-model-576')) return { label: 'AEAT · Modelo 576', url: 'https://sede.agenciatributaria.gob.es/Sede/vehiculos-embarcaciones/primera-matriculacion-medios-transporte/modelo-576.html' };
  return null;
}

function guidanceValue(value: number | string | null): string {
  if (value === null) return 'Pendiente / no aplicable';
  return typeof value === 'number' ? money(value) : value;
}

function nullableMoney(value: number | null): string {
  return value === null ? 'No procede o pendiente' : money(value);
}

function money(value: number): string {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(value);
}

function percent(value: number): string {
  return new Intl.NumberFormat('es-ES', { style: 'percent', minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(value);
}

function dateTime(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('es-ES', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}
