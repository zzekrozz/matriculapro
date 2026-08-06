'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Check, ChevronLeft, ChevronRight, Loader2, Search } from 'lucide-react';
import { useFiscalCatalogSearch } from '@/hooks/useFiscalCatalogSearch';
import type { FiscalCatalogVehicle } from '@/lib/fiscal/catalog-api';
import { cn } from '@/lib/cn';

interface CaseVehicleIdentity {
  brand: string;
  model: string;
  version: string | null;
  fuelType: string | null;
  engineCapacityCc: number | null;
  powerKw: number | null;
  co2Gkm: number | null;
  firstRegistrationDate: string;
}

export function FiscalCatalogPicker({
  caseVehicle,
  selected,
  disabled = false,
  onSelect,
}: {
  caseVehicle: CaseVehicleIdentity;
  selected: FiscalCatalogVehicle | null;
  disabled?: boolean;
  onSelect: (vehicle: FiscalCatalogVehicle | null, catalogVersion: string | null) => void;
}) {
  const initialQuery = [caseVehicle.brand, caseVehicle.model].filter(Boolean).join(' ');
  const [query, setQuery] = useState(initialQuery);
  const [page, setPage] = useState(1);
  const { response, results, loading, error } = useFiscalCatalogSearch(query, page);

  useEffect(() => setPage(1), [query]);
  useEffect(() => {
    if (!selected) setQuery(initialQuery);
  }, [initialQuery, selected]);

  const selectedDifferences = useMemo(
    () => selected ? buildComparison(caseVehicle, selected) : [],
    [caseVehicle, selected],
  );

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="fiscal-catalog-search" className="text-[10.5px] font-medium text-ink">
          Marca, modelo o versión
        </label>
        <div className="relative mt-1.5">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            id="fiscal-catalog-search"
            value={query}
            disabled={disabled}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Ej.: BMW 320d Touring"
            autoComplete="off"
            className="w-full rounded-xl border border-line bg-surface-alt py-2.5 pl-9 pr-3 text-[12px] text-ink outline-none focus:border-accent disabled:opacity-60"
          />
          {loading && <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-accent-deep" />}
        </div>
        <p className="mt-1.5 text-[9.5px] leading-relaxed text-muted">
          Búsqueda literal con 350 ms de espera. No se elige automáticamente la primera coincidencia ni se sustituye por una versión parecida.
        </p>
      </div>

      {(error || response.message) && query.trim().length >= 2 && (
        <div className="flex gap-2 rounded-xl border border-warn/20 bg-warn-soft p-3 text-[10.5px] leading-relaxed text-warn">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          <span>{error ?? response.message}</span>
        </div>
      )}

      {response.status === 'ready' && (
        <>
          <div className="flex items-center justify-between gap-3 text-[9.5px] text-muted">
            <span>{response.total.toLocaleString('es-ES')} coincidencias · página {response.page} de {Math.max(1, response.totalPages)}</span>
            <span className="font-mono">{response.catalogVersion}</span>
          </div>

          {results.length === 0 ? (
            <div className="rounded-xl border border-line bg-bg p-4 text-[11px] leading-relaxed text-ink-soft">
              No hay una fila literal para esta búsqueda. Prueba términos del documento o utiliza la valoración de mercado justificada; no se propondrá una “versión más cercana”.
            </div>
          ) : (
            <div className="space-y-2">
              {results.map((vehicle) => {
                const isSelected = selected?.id === vehicle.id;
                return (
                  <article
                    key={vehicle.id}
                    className={cn(
                      'rounded-xl border p-3 transition-colors',
                      isSelected ? 'border-accent bg-accent-soft/50' : 'border-line bg-surface hover:border-accent/50',
                    )}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="text-[12px] font-semibold text-ink">
                          {vehicle.brand} {vehicle.model}
                        </div>
                        <div className="mt-0.5 text-[11px] text-ink-soft">{vehicle.version ?? 'Versión no diferenciada en la fila'}</div>
                        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[9.5px] text-muted">
                          <span>{periodLabel(vehicle)}</span>
                          <span>{vehicle.fuelType ?? 'Combustible no publicado'}</span>
                          <span>{numberUnit(vehicle.engineCapacityCc, 'cm³')}</span>
                          <span>{numberUnit(vehicle.powerKw, 'kW')}</span>
                          <span>{numberUnit(vehicle.co2Gkm, 'g/km CO₂')}</span>
                        </div>
                        <div className="mt-2 text-[10px] text-ink-soft">
                          Valor oficial nuevo: <strong>{money(vehicle.newVehicleOfficialValue)}</strong> · fila {vehicle.officialRowReference}
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled={disabled}
                        onClick={() => onSelect(isSelected ? null : vehicle, response.catalogVersion)}
                        className={cn(
                          'inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full px-3 py-2 text-[10.5px] font-medium disabled:opacity-50',
                          isSelected ? 'bg-ok text-white' : 'bg-ink text-white',
                        )}
                      >
                        {isSelected && <Check size={12} />}
                        {isSelected ? 'Versión confirmada' : 'Seleccionar esta versión exacta'}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {response.totalPages > 1 && (
            <div className="flex items-center justify-end gap-2">
              <button type="button" disabled={page <= 1 || loading} onClick={() => setPage((value) => Math.max(1, value - 1))} className="rounded-lg border border-line p-2 text-ink disabled:opacity-30" aria-label="Página anterior"><ChevronLeft size={14} /></button>
              <button type="button" disabled={page >= response.totalPages || loading} onClick={() => setPage((value) => value + 1)} className="rounded-lg border border-line p-2 text-ink disabled:opacity-30" aria-label="Página siguiente"><ChevronRight size={14} /></button>
            </div>
          )}
        </>
      )}

      {selected && (
        <div className="rounded-xl border border-line bg-bg p-4">
          <div className="flex items-center gap-2">
            <Check size={14} className="text-ok" />
            <h4 className="text-[11.5px] font-semibold text-ink">Comparación antes de calcular</h4>
          </div>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-[10px]">
              <thead className="text-muted"><tr><th className="pb-2 font-medium">Dato</th><th className="pb-2 font-medium">Expediente</th><th className="pb-2 font-medium">Fila oficial</th><th className="pb-2 font-medium">Lectura</th></tr></thead>
              <tbody>
                {selectedDifferences.map((item) => (
                  <tr key={item.label} className="border-t border-line-soft">
                    <td className="py-2 text-ink-soft">{item.label}</td>
                    <td className="py-2 text-ink">{item.caseValue}</td>
                    <td className="py-2 text-ink">{item.officialValue}</td>
                    <td className={cn('py-2', item.matches ? 'text-ok' : 'text-warn')}>{item.matches ? 'Coincide' : 'Revisar'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-[9.5px] leading-relaxed text-muted">
            La confirmación identifica una fila concreta, pero el servidor vuelve a comprobar identidad y periodo comercial. Una discrepancia bloqueante impide tratarla como coincidencia exacta.
          </p>
        </div>
      )}
    </div>
  );
}

function buildComparison(caseVehicle: CaseVehicleIdentity, official: FiscalCatalogVehicle) {
  const firstYear = caseVehicle.firstRegistrationDate ? Number(caseVehicle.firstRegistrationDate.slice(0, 4)) : null;
  const withinPeriod = firstYear === null || (
    (official.commercialStartYear === null || firstYear >= official.commercialStartYear)
    && (official.commercialEndYear === null || firstYear <= official.commercialEndYear)
  );
  return [
    comparison('Marca', caseVehicle.brand, official.brand, sameText(caseVehicle.brand, official.brand)),
    comparison('Modelo', caseVehicle.model, official.model, sameText(caseVehicle.model, official.model)),
    comparison('Versión', printable(caseVehicle.version), printable(official.version), nullableSameText(caseVehicle.version, official.version)),
    comparison('Combustible', printable(caseVehicle.fuelType), printable(official.fuelType), nullableSameText(caseVehicle.fuelType, official.fuelType)),
    comparison('Cilindrada', numberUnit(caseVehicle.engineCapacityCc, 'cm³'), numberUnit(official.engineCapacityCc, 'cm³'), nullableSameNumber(caseVehicle.engineCapacityCc, official.engineCapacityCc)),
    comparison('Potencia', numberUnit(caseVehicle.powerKw, 'kW'), numberUnit(official.powerKw, 'kW'), nullableSameNumber(caseVehicle.powerKw, official.powerKw)),
    comparison('CO₂', numberUnit(caseVehicle.co2Gkm, 'g/km'), numberUnit(official.co2Gkm, 'g/km'), nullableSameNumber(caseVehicle.co2Gkm, official.co2Gkm)),
    comparison('Periodo comercial', firstYear === null ? 'Fecha pendiente' : String(firstYear), periodLabel(official), withinPeriod),
  ];
}

function comparison(label: string, caseValue: string, officialValue: string, matches: boolean) {
  return { label, caseValue, officialValue, matches };
}

function sameText(left: string, right: string): boolean {
  return normalize(left) === normalize(right);
}

function nullableSameText(left: string | null, right: string | null): boolean {
  return !left || !right || sameText(left, right);
}

function nullableSameNumber(left: number | null, right: number | null): boolean {
  return left === null || right === null || left === right;
}

function normalize(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es').replace(/[^a-z0-9]+/g, ' ').trim();
}

function printable(value: string | null): string {
  return value || 'No consta';
}

function numberUnit(value: number | null, unit: string): string {
  return value === null ? 'No consta' : `${value.toLocaleString('es-ES')} ${unit}`;
}

function periodLabel(vehicle: FiscalCatalogVehicle): string {
  if (vehicle.commercialStartYear === null && vehicle.commercialEndYear === null) return 'Periodo no publicado';
  return `${vehicle.commercialStartYear ?? '…'}–${vehicle.commercialEndYear ?? '…'}`;
}

function money(value: number): string {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(value);
}
