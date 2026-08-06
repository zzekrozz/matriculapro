'use client';

import Link from 'next/link';
import { AlertTriangle, ArrowLeft, ExternalLink, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/cn';
import type {
  CaseMode,
  CaseStatus,
  OfficialSource,
  ProcessKind,
  RegistrationCase,
} from '@/domain/registration';

const CASE_STATUS_LABELS: Record<CaseStatus, string> = {
  draft: 'Borrador',
  assessing: 'En evaluación',
  blocked: 'Bloqueado',
  'in-progress': 'En curso',
  ready: 'Preparado',
  registered: 'Matriculado',
  archived: 'Archivado',
};

const PROCESS_LABELS: Record<ProcessKind, string> = {
  'ordinary-import': 'Matriculación ordinaria',
  relocation: 'Cambio de residencia',
  rehabilitation: 'Rehabilitación / revisión',
  historical: 'Vehículo histórico',
  'special-review': 'Revisión especial',
};

const MODE_LABELS: Record<CaseMode, string> = {
  practice: 'Práctica ficticia',
  case: 'Expediente real',
};

export function CaseHeader({ registrationCase, processKind }: {
  registrationCase: RegistrationCase;
  processKind: ProcessKind;
}) {
  const { vehicle } = registrationCase;
  return (
    <header className="rounded-[24px] overflow-hidden bg-ink text-white shadow-soft-lg">
      <div className="px-5 py-5 lg:px-8 lg:py-7 relative">
        <div className="absolute -right-16 -top-24 h-64 w-64 rounded-full bg-accent/20 blur-3xl" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <Link href="/app/expedientes" className="mb-4 inline-flex items-center gap-1.5 text-[11px] text-muted-soft hover:text-white">
              <ArrowLeft size={13} /> Todos los expedientes
            </Link>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-accent/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-accent">
                {MODE_LABELS[registrationCase.mode]}
              </span>
              <span className="rounded-full border border-white/15 px-2.5 py-1 text-[10px] text-muted-soft">
                {PROCESS_LABELS[processKind]}
              </span>
            </div>
            <h1 className="font-serif text-[34px] leading-none tracking-tight lg:text-[44px]">
              {vehicle.brand || 'Vehículo'} <span className="italic text-accent">{vehicle.model || 'sin identificar'}</span>
            </h1>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[12px] text-muted-soft">
              <span>Procedencia: <strong className="font-medium text-white">{vehicle.registrationCountry || 'Pendiente'}</strong></span>
              <span>Año: <strong className="font-medium text-white">{vehicle.firstRegistrationDate?.slice(0, 4) || 'Pendiente'}</strong></span>
              <span>VIN: <strong className="font-mono font-medium text-white">{maskVin(vehicle.vin)}</strong></span>
            </div>
          </div>
          <div className="shrink-0 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
            <div className="text-[9.5px] uppercase tracking-[0.18em] text-muted">Estado general</div>
            <div className="mt-1 flex items-center gap-2 text-[14px] font-medium">
              <span className={cn('h-2 w-2 rounded-full', registrationCase.status === 'blocked' ? 'bg-danger' : registrationCase.status === 'registered' ? 'bg-ok' : 'bg-accent')} />
              {CASE_STATUS_LABELS[registrationCase.status]}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

export function CaseTabs({ caseId, active }: {
  caseId: string;
  active: 'summary' | 'documents' | 'taxes' | 'itv' | 'dgt' | 'dates';
}) {
  const tabs = [
    { id: 'summary', label: 'Resumen', href: `/app/expedientes/${caseId}` },
    { id: 'documents', label: 'Documentos', href: `/app/expedientes/${caseId}/documentos` },
    { id: 'taxes', label: 'Costes e impuestos', href: `/app/expedientes/${caseId}/impuestos` },
    { id: 'itv', label: 'ITV', href: `/app/expedientes/${caseId}/itv` },
    { id: 'dgt', label: 'DGT', href: `/app/expedientes/${caseId}/dgt` },
    { id: 'dates', label: 'Fechas y citas', href: `/app/expedientes/${caseId}/fechas` },
  ] as const;
  return (
    <nav aria-label="Secciones del expediente" className="-mx-1 flex gap-1 overflow-x-auto px-1 py-1">
      {tabs.map((tab) => (
        <Link
          key={tab.id}
          href={tab.href}
          className={cn(
            'whitespace-nowrap rounded-full px-3.5 py-2 text-[12px] font-medium transition-colors',
            active === tab.id ? 'bg-ink text-white' : 'bg-surface text-ink-soft hover:bg-bg-deep',
          )}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}

export function TrustPanel({
  title = 'Base oficial de esta decisión',
  sources,
  usedData = [],
  missingData = [],
  scope,
}: {
  title?: string;
  sources: OfficialSource[];
  usedData?: string[];
  missingData?: string[];
  scope?: string;
}) {
  return (
    <details className="rounded-2xl border border-line bg-surface p-4">
      <summary className="flex cursor-pointer list-none items-center gap-2 text-[12px] font-medium text-ink">
        <ShieldCheck size={15} className="text-ok" /> {title}
      </summary>
      <div className="mt-4 grid gap-4 text-[12px] text-ink-soft lg:grid-cols-2">
        <div className="space-y-3">
          {scope && <p><strong className="text-ink">Ámbito:</strong> {scope}</p>}
          {usedData.length > 0 && <p><strong className="text-ink">Datos utilizados:</strong> {usedData.join(' · ')}</p>}
          {missingData.length > 0 && (
            <p className="rounded-xl bg-warn-soft p-3 text-warn"><strong>Datos pendientes:</strong> {missingData.join(' · ')}</p>
          )}
          <p>Las fuentes y criterios pueden cambiar. Verifica los datos antes de presentar una autoliquidación o solicitud oficial.</p>
        </div>
        <div className="space-y-2">
          {sources.length === 0 ? (
            <p className="text-muted">No hay una fuente asociada a este resultado.</p>
          ) : sources.map((source) => (
            <a
              key={source.id}
              href={source.url}
              target="_blank"
              rel="noreferrer"
              className="block rounded-xl border border-line-soft p-3 hover:border-accent/40"
            >
              <span className="flex items-start justify-between gap-2 font-medium text-ink">
                {source.title} <ExternalLink size={12} className="mt-0.5 shrink-0 text-muted" />
              </span>
              <span className="mt-1 block text-[10.5px] text-muted">{source.authority} · Revisado {formatDate(source.reviewedAt)}</span>
            </a>
          ))}
        </div>
      </div>
    </details>
  );
}

export function CaseNotFound() {
  return (
    <div className="mx-auto max-w-xl px-5 py-20 text-center">
      <AlertTriangle className="mx-auto text-warn" size={28} />
      <h1 className="mt-4 font-serif text-3xl text-ink">Expediente no encontrado</h1>
      <p className="mt-2 text-sm text-ink-soft">Puede que aún esté cargando, que pertenezca a otra cuenta o que se haya archivado.</p>
      <Link href="/app/expedientes" className="mt-5 inline-flex rounded-full bg-ink px-5 py-2.5 text-sm text-white">Volver a expedientes</Link>
    </div>
  );
}

export function PageLoading({ label = 'Cargando expediente…' }: { label?: string }) {
  return <div className="px-5 py-20 text-center text-sm text-muted" role="status">{label}</div>;
}

export function maskVin(vin: string): string {
  if (!vin) return 'Pendiente';
  if (vin.length <= 8) return `${vin.slice(0, 2)}••••${vin.slice(-2)}`;
  return `${vin.slice(0, 4)}•••••••••${vin.slice(-4)}`;
}

export function formatDate(value: string | null): string {
  if (!value) return 'Pendiente';
  return new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(`${value.slice(0, 10)}T12:00:00`));
}

export function formatMoney(amount: number | null): string {
  if (amount === null) return 'No calculable todavía';
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(amount);
}

export function nextActionHref(caseId: string, category: string): string {
  if (category === 'documents' || category === 'case-data') return `/app/expedientes/${caseId}/documentos`;
  if (category === 'itv') return `/app/expedientes/${caseId}/itv`;
  if (category === 'dgt' || category === 'plates-insurance') return `/app/expedientes/${caseId}/dgt`;
  return `/app/expedientes/${caseId}/impuestos`;
}
