'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { CalendarDays, ExternalLink } from 'lucide-react';
import { buildRegistrationDecision } from '@/domain/registration';
import { CaseHeader, CaseNotFound, CaseTabs, PageLoading, formatDate } from '@/components/cases/CaseChrome';
import { useRegistrationCases } from '@/providers/RegistrationCaseProvider';

export default function CaseDatesPage() {
  const params = useParams<{ id: string }>();
  const { getCase, loading } = useRegistrationCases();
  if (loading) return <PageLoading />;
  const registrationCase = getCase(params.id);
  if (!registrationCase) return <CaseNotFound />;
  const decision = buildRegistrationDecision(registrationCase);
  const dates = [
    { label: 'Primera matriculación', value: registrationCase.vehicle.firstRegistrationDate, note: 'Se usa, junto con el kilometraje, para clasificar el vehículo a efectos de IVA.' },
    { label: 'Factura, contrato o entrega', value: registrationCase.purchaseDate, note: 'Fecha de referencia de la operación introducida.' },
    { label: 'Entrada en España', value: registrationCase.firstEntryIntoSpainDate, note: 'Puede ser relevante en rutas de importación o traslado.' },
    { label: 'Entrada en UE-27', value: registrationCase.firstEntryIntoEuDate, note: 'Especialmente relevante para acreditar estatuto en vehículos de Reino Unido.' },
    { label: 'Referencia IVTM', value: registrationCase.ivtmDate, note: 'La liquidación, plazo y beneficio se confirman con el ayuntamiento.' },
    { label: 'Vigencia de inspección extranjera', value: registrationCase.vehicle.foreignInspectionValidUntil, note: 'No sustituye automáticamente la inspección previa a matriculación en España.' },
  ];
  return (
    <div className="mx-auto max-w-[1180px] px-5 pb-16 pt-6 lg:px-8">
      <CaseHeader registrationCase={registrationCase} processKind={decision.processKind} />
      <div className="mt-4"><CaseTabs caseId={registrationCase.id} active="dates" /></div>
      <header className="mt-6"><div className="text-[10px] uppercase tracking-[0.2em] text-accent-deep">Fechas y citas</div><h2 className="mt-1 font-serif text-[32px]">Agenda del expediente</h2><p className="mt-2 max-w-2xl text-[12.5px] leading-relaxed text-ink-soft">Fechas declaradas y puntos de cita. No se inventan plazos universales: confirma disponibilidad y vigencia con la administración o estación competente.</p></header>
      <section className="mt-5 grid gap-3 md:grid-cols-2 lg:grid-cols-3">{dates.map((item) => <article key={item.label} className="rounded-2xl border border-line bg-surface p-4"><div className="flex items-center justify-between gap-3"><CalendarDays size={15} className="text-accent-deep" /><span className="font-mono text-[11px] text-ink">{formatDate(item.value)}</span></div><h3 className="mt-3 text-[12px] font-semibold">{item.label}</h3><p className="mt-1 text-[10.5px] leading-relaxed text-muted">{item.note}</p></article>)}</section>
      <section className="mt-5 grid gap-4 md:grid-cols-2"><a href="https://sede.dgt.gob.es/es/otros-tramites/cita-previa-jefaturas/" target="_blank" rel="noreferrer" className="rounded-2xl border border-line bg-surface p-5 hover:border-accent/40"><span className="flex items-center justify-between text-[12px] font-medium">Cita previa DGT <ExternalLink size={13} /></span><p className="mt-2 text-[10.5px] text-muted">Consulta los canales y la necesidad de cita en la Sede DGT.</p></a><Link href={`/app/expedientes/${registrationCase.id}/itv`} className="rounded-2xl border border-line bg-surface p-5 hover:border-accent/40"><span className="flex items-center justify-between text-[12px] font-medium">Preparar cita ITV <ExternalLink size={13} /></span><p className="mt-2 text-[10.5px] text-muted">Revisa antes la ruta técnica y los documentos calculados.</p></Link></section>
    </div>
  );
}
