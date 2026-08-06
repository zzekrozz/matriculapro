'use client';

import Link from 'next/link';
import { ArrowRight, CarFront, Cloud, FilePlus2, FolderOpen } from 'lucide-react';
import { buildRegistrationDecision } from '@/domain/registration';
import { useRegistrationCases } from '@/providers/RegistrationCaseProvider';
import { PageLoading, maskVin } from '@/components/cases/CaseChrome';
import { useAccess } from '@/providers/AccessProvider';

export default function CasesPage() {
  const { cases, loading, error, persistent, setActiveCaseId } = useRegistrationCases();
  const { canViewPaidCases } = useAccess();
  if (loading) return <PageLoading label="Cargando tus expedientes…" />;
  if (!canViewPaidCases) return <div className="mx-auto max-w-2xl px-5 py-16 text-center"><h1 className="font-serif text-3xl">Expedientes completos</h1><p className="mt-3 text-sm text-ink-soft">Esta función está disponible con Particular o Profesional.</p><Link href="/app/comprobar" className="mt-5 inline-flex rounded-full bg-ink px-5 py-2.5 text-sm text-white">Volver a la comprobación gratuita</Link></div>;

  return (
    <div className="mx-auto max-w-[1180px] px-5 pb-16 pt-7 lg:px-8">
      <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-[0.22em] text-accent-deep">Mi expediente</div>
          <h1 className="mt-1 font-serif text-[38px] leading-tight text-ink">Vehículos y trámites</h1>
          <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-ink-soft">Cada expediente mantiene su ruta, documentos, riesgos y siguiente acción. Los casos reales se aíslan por usuario mediante RLS.</p>
        </div>
        {persistent && <Link href="/app/expedientes/nuevo" className="inline-flex items-center justify-center gap-2 rounded-full bg-ink px-5 py-3 text-[13px] font-medium text-white"><FilePlus2 size={15} /> Nuevo expediente</Link>}
      </header>

      <div className="mt-5 flex items-center gap-2 rounded-xl border border-line bg-surface px-4 py-3 text-[11px] text-ink-soft">
        <Cloud size={14} className={persistent ? 'text-ok' : 'text-accent-deep'} />
        {persistent ? 'Expedientes guardados y editables.' : 'Tu licencia finalizó: los expedientes permanecen disponibles en modo lectura.'}
      </div>
      {error && <div className="mt-4 rounded-xl bg-danger-soft p-4 text-[12px] text-danger">{error}</div>}

      {cases.length === 0 ? (
        <section className="mt-8 rounded-[24px] border border-dashed border-line bg-surface p-10 text-center">
          <FolderOpen className="mx-auto text-muted" size={28} />
          <h2 className="mt-4 font-serif text-2xl text-ink">Todavía no hay expedientes</h2>
          <p className="mt-2 text-sm text-ink-soft">Crea el primero y conserva como pendientes los datos que aún no puedas acreditar.</p>
          <Link href="/app/expedientes/nuevo" className="mt-5 inline-flex rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-ink">Crear expediente</Link>
        </section>
      ) : (
        <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {cases.map((registrationCase) => {
            const decision = buildRegistrationDecision(registrationCase);
            return (
              <Link
                key={registrationCase.id}
                href={`/app/expedientes/${registrationCase.id}`}
                onClick={() => setActiveCaseId(registrationCase.id)}
                className="group rounded-[22px] border border-line bg-surface p-5 shadow-soft-sm transition hover:-translate-y-0.5 hover:shadow-soft-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-bg-deep text-ink"><CarFront size={19} /></span>
                  <span className="rounded-full bg-accent-soft px-2.5 py-1 text-[9.5px] font-semibold uppercase tracking-[0.12em] text-accent-deep">Guardado</span>
                </div>
                <h2 className="mt-5 font-serif text-[23px] leading-tight text-ink">{registrationCase.vehicle.brand || 'Vehículo'} <span className="italic">{registrationCase.vehicle.model || 'sin identificar'}</span></h2>
                <p className="mt-1 font-mono text-[10px] text-muted">{maskVin(registrationCase.vehicle.vin)} · {registrationCase.vehicle.registrationCountry || 'Origen pendiente'}</p>
                <div className="mt-5 grid grid-cols-2 gap-2">
                  <div className="rounded-xl bg-bg p-3"><div className="font-serif text-xl text-ink">{decision.blockers.length}</div><div className="text-[9px] uppercase tracking-[0.12em] text-muted">Bloqueos</div></div>
                  <div className="rounded-xl bg-bg p-3"><div className="font-serif text-xl text-ink">{decision.requiredDocuments.length}</div><div className="text-[9px] uppercase tracking-[0.12em] text-muted">Documentos</div></div>
                </div>
                <div className="mt-4 flex items-center justify-between gap-3 text-[11.5px] font-medium text-accent-deep"><span className="truncate">{decision.nextAction?.title ?? 'Revisar expediente'}</span><ArrowRight size={14} className="shrink-0 transition group-hover:translate-x-1" /></div>
              </Link>
            );
          })}
        </section>
      )}
    </div>
  );
}
