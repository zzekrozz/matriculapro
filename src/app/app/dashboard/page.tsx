'use client';

import Link from 'next/link';
import { AlertCircle, ArrowRight, BookOpen, CheckCircle2, FileCheck2, FolderPlus, ShieldAlert } from 'lucide-react';
import { buildRegistrationDecision } from '@/domain/registration';
import { MODULES } from '@/data/modules';
import { useRegistrationCases } from '@/providers/RegistrationCaseProvider';
import { useAccess } from '@/providers/AccessProvider';
import { PageLoading, maskVin, nextActionHref } from '@/components/cases/CaseChrome';
import { cn } from '@/lib/cn';

export default function DashboardPage() {
  const { activeCase, loading, persistent, getDocument } = useRegistrationCases();
  const { canViewPaidCases, canManageFullCases } = useAccess();
  if (loading) return <PageLoading label="Preparando tu centro de control…" />;

  if (!canViewPaidCases) return (
    <div className="mx-auto max-w-[920px] px-5 py-12 lg:px-8"><section className="rounded-[26px] bg-ink p-8 text-white lg:p-12"><div className="text-[10px] uppercase tracking-[0.2em] text-accent">Plan Gratis</div><h1 className="mt-2 max-w-2xl font-serif text-[40px] leading-tight">Empieza con una comprobación previa.</h1><p className="mt-4 max-w-xl text-[13px] leading-relaxed text-muted-soft">Analiza documentación y riesgos sin tarjeta. Los expedientes completos, el Modelo 576 y el seguimiento ITV–DGT requieren Particular o Profesional.</p><div className="mt-6 flex flex-wrap gap-3"><Link href="/app/comprobar" className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-3 text-[13px] font-medium text-ink">Comprobar un vehículo <ArrowRight size={14} /></Link><Link href="/#precios" className="inline-flex items-center rounded-full border border-white/20 px-5 py-3 text-[13px] text-white">Ver licencias</Link></div></section></div>
  );

  if (!activeCase) return (
    <div className="mx-auto max-w-[1050px] px-5 py-12 lg:px-8">
      <section className="rounded-[26px] bg-ink p-8 text-white lg:p-12"><div className="text-[10px] uppercase tracking-[0.2em] text-accent">Centro de control</div><h1 className="mt-2 max-w-2xl font-serif text-[42px] leading-tight">Empieza por el vehículo, no por un módulo.</h1><p className="mt-4 max-w-xl text-[13px] leading-relaxed text-muted-soft">Crea un expediente para obtener documentos dinámicos, ruta técnica, fiscalidad, bloqueos y siguiente acción.</p><Link href="/app/expedientes/nuevo" className="mt-6 inline-flex items-center gap-2 rounded-full bg-accent px-5 py-3 text-[13px] font-medium text-ink"><FolderPlus size={15} /> Crear mi expediente</Link></section>
    </div>
  );

  const decision = buildRegistrationDecision(activeCase);
  const docs = decision.requiredDocuments.map((document) => getDocument(activeCase.id, document.type)?.status ?? document.status);
  const reviewed = docs.filter((status) => status === 'verified').length;
  const next = decision.nextAction;
  const learningModules = MODULES.filter((module) => ['casos', 'biblioteca', 'itv-recorrido', 'ruta'].includes(module.id)).slice(0, 4);

  return (
    <div className="mx-auto max-w-[1280px] px-5 pb-14 pt-6 lg:px-8">
      <section className="relative overflow-hidden rounded-[26px] bg-ink p-6 text-white shadow-soft-lg lg:p-9">
        <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-accent/20 blur-3xl" />
        <div className="relative grid gap-7 xl:grid-cols-[1fr_.8fr] xl:items-end">
          <div>
            <div className="flex flex-wrap items-center gap-2"><span className="text-[9.5px] font-semibold uppercase tracking-[0.2em] text-accent">Expediente activo</span><span className="rounded-full border border-white/15 px-2 py-0.5 text-[9px] text-muted-soft">{persistent ? 'Editable' : 'Solo lectura'}</span></div>
            <h1 className="mt-3 font-serif text-[38px] leading-none lg:text-[48px]">{activeCase.vehicle.brand || 'Vehículo'} <span className="italic text-accent">{activeCase.vehicle.model || 'sin identificar'}</span></h1>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[11.5px] text-muted-soft"><span>Origen <strong className="text-white">{activeCase.vehicle.registrationCountry || 'pendiente'}</strong></span><span>Año <strong className="text-white">{activeCase.vehicle.firstRegistrationDate?.slice(0, 4) || 'pendiente'}</strong></span><span>VIN <strong className="font-mono text-white">{maskVin(activeCase.vehicle.vin)}</strong></span></div>
            <div className="mt-6 flex flex-wrap gap-3"><Link href={`/app/expedientes/${activeCase.id}`} className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-[12.5px] font-medium text-ink">Abrir expediente <ArrowRight size={14} /></Link>{canManageFullCases && <Link href="/app/expedientes/nuevo" className="inline-flex items-center gap-2 rounded-full border border-white/20 px-5 py-2.5 text-[12px] text-white">Nuevo vehículo</Link>}</div>
          </div>
          <div className={cn('rounded-2xl border p-5', next?.status === 'blocked' ? 'border-danger/35 bg-danger/10' : 'border-white/10 bg-white/5')}>
            <div className="flex items-center gap-2 text-[9.5px] uppercase tracking-[0.17em] text-accent">{next?.status === 'blocked' ? <AlertCircle size={12} /> : <CheckCircle2 size={12} />} Siguiente acción</div>
            <h2 className="mt-2 font-serif text-[24px] leading-tight">{next?.title ?? 'Revisar cierre del expediente'}</h2><p className="mt-2 text-[11.5px] leading-relaxed text-muted-soft">{next?.description ?? 'No quedan tareas calculadas con los datos actuales.'}</p>
            {next && <Link href={nextActionHref(activeCase.id, next.category)} className="mt-4 inline-flex items-center gap-1.5 text-[11px] font-medium text-accent">Completar ahora <ArrowRight size={12} /></Link>}
          </div>
        </div>
      </section>

      <section className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Bloqueos activos" value={decision.blockers.length} danger={decision.blockers.length > 0} />
        <Metric label="Documentos revisados por ti" value={`${reviewed}/${docs.length}`} />
        <Metric label="Ruta técnica" value={technicalShort(decision.technicalPath.outcome)} small />
        <Metric label="Modelo fiscal" value={taxShort(decision.registrationTaxRoute.outcome)} small />
      </section>

      <section className="mt-5 rounded-[22px] border border-line bg-surface p-5 lg:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3"><div><div className="text-[9.5px] uppercase tracking-[0.18em] text-muted">Progreso operativo</div><h2 className="mt-1 font-serif text-[25px]">Siete áreas, sin porcentaje académico</h2></div><Link href={`/app/expedientes/${activeCase.id}`} className="text-[11px] font-medium text-accent-deep">Ver detalle</Link></div>
        <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-7">{decision.route.map((step) => <div key={step.id} className={cn('rounded-xl border p-3', step.status === 'completed' ? 'border-ok/20 bg-ok-soft' : step.status === 'blocked' ? 'border-danger/20 bg-danger-soft' : step.status === 'current' ? 'border-accent/30 bg-accent-soft' : 'border-line bg-bg')}><div className="flex items-center justify-between"><span className="font-mono text-[9px] text-muted">0{step.order}</span><span className={cn('h-2 w-2 rounded-full', step.status === 'completed' ? 'bg-ok' : step.status === 'blocked' ? 'bg-danger' : step.status === 'current' ? 'bg-accent' : 'bg-muted-soft')} /></div><div className="mt-2 text-[10.5px] font-medium leading-tight text-ink">{step.title}</div><div className="mt-1 text-[8.5px] uppercase tracking-[0.08em] text-muted">{routeStatus(step.status)}</div></div>)}</div>
      </section>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <section className="rounded-[22px] border border-line bg-surface p-5"><div className="flex items-center gap-2"><ShieldAlert size={16} className={decision.blockers.length ? 'text-danger' : 'text-ok'} /><h2 className="font-serif text-[22px]">Bloqueos</h2></div><div className="mt-4 space-y-2">{decision.blockers.length ? decision.blockers.slice(0, 4).map((blocker) => <div key={blocker.id} className="rounded-xl bg-danger-soft p-3 text-[10.5px] leading-relaxed text-ink-soft"><strong className="text-danger">{blocker.title}</strong><p className="mt-1">{blocker.reason}</p></div>) : <div className="rounded-xl bg-ok-soft p-3 text-[11px] text-ok">No hay bloqueos calculados.</div>}</div></section>
        <section className="rounded-[22px] border border-line bg-surface p-5"><div className="flex items-center gap-2"><FileCheck2 size={16} className="text-accent-deep" /><h2 className="font-serif text-[22px]">Documentación</h2></div><div className="mt-4 grid grid-cols-3 gap-2"><MiniMetric label="Necesarios" value={docs.length} /><MiniMetric label="Revisados" value={reviewed} /><MiniMetric label="Incidencias" value={docs.filter((status) => status === 'issue').length} /></div><Link href={`/app/expedientes/${activeCase.id}/documentos`} className="mt-4 inline-flex items-center gap-1 text-[11.5px] font-medium text-accent-deep">Gestionar documentos <ArrowRight size={12} /></Link></section>
      </div>

      <section className="mt-8">
        <div className="flex items-end justify-between gap-3"><div><div className="text-[9.5px] uppercase tracking-[0.18em] text-muted">Centro de aprendizaje</div><h2 className="mt-1 font-serif text-[25px]">Consulta y práctica, como apoyo</h2></div><BookOpen size={18} className="text-muted" /></div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{learningModules.map((module) => <Link key={module.id} href={module.href} className="rounded-2xl border border-line bg-surface p-4 transition hover:-translate-y-0.5 hover:shadow-soft-md"><span className="font-mono text-[9px] text-muted">{module.code}</span><h3 className="mt-2 text-[12.5px] font-semibold text-ink">{module.title}</h3><p className="mt-1 text-[10.5px] leading-relaxed text-ink-soft">{module.description}</p></Link>)}</div>
      </section>

    </div>
  );
}

function Metric({ label, value, danger, small }: { label: string; value: string | number; danger?: boolean; small?: boolean }) { return <div className="rounded-2xl border border-line bg-surface p-4"><div className={cn('font-serif leading-none', small ? 'text-[21px]' : 'text-[28px]', danger ? 'text-danger' : 'text-ink')}>{value}</div><div className="mt-1.5 text-[9.5px] uppercase tracking-[0.13em] text-muted">{label}</div></div>; }
function MiniMetric({ label, value }: { label: string; value: number }) { return <div className="rounded-xl bg-bg p-3"><div className="font-serif text-[23px] leading-none">{value}</div><div className="mt-1 text-[8.5px] uppercase tracking-[0.1em] text-muted">{label}</div></div>; }
function technicalShort(value: string): string { return ({ 'eu-coc': 'COC UE', 'eu-reduced-sheet': 'Ficha reducida', 'eea-equivalence-review': 'Equivalencia', 'spanish-individual-approval': 'Individual', 'special-review': 'Revisión' } as Record<string, string>)[value] ?? value; }
function taxShort(value: string): string { return ({ 'model-576': '576', 'model-06': '06', 'model-05': '05', 'special-review': 'Revisión' } as Record<string, string>)[value] ?? value; }
function routeStatus(value: string): string { return ({ completed: 'Completado', blocked: 'Bloqueado', current: 'Actual', pending: 'Pendiente', 'not-applicable': 'No aplica' } as Record<string, string>)[value] ?? value; }
