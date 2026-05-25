'use client';

import Link from 'next/link';
import {
  LayoutDashboard, Route, Calculator, ScrollText, Car, Wrench, Stamp,
  BookOpen, FileText, Mail, Phone, CheckSquare, Sparkles, Lock, Star,
  ChevronRight, CheckCircle2, type LucideIcon
} from 'lucide-react';
import { MODULES } from '@/data/modules';
import { useCourse } from '@/providers/CourseProvider';
import type { ModuleDef, ModuleState } from '@/lib/types';

const ICONS: Record<string, LucideIcon> = {
  Route, Calculator, ScrollText, Car, Wrench, Stamp,
  BookOpen, FileText, Mail, Phone, CheckSquare, LayoutDashboard,
};

const STATE_LABEL: Record<ModuleState, string> = {
  'pending': 'Pendiente',
  'in-progress': 'En curso',
  'completed': 'Completado',
  'locked': 'Bloqueado',
  'alert': 'Atención',
  'recommended': 'Recomendado',
  'special': 'Destacado',
  'premium': 'Premium',
  'demo': 'Demo',
};

export default function DashboardPage() {
  const { completedModules, completedRouteSteps, completedCases } = useCourse();

  const moduleWithLiveState = (m: ModuleDef): ModuleDef => {
    if (completedModules.includes(m.id)) return { ...m, state: 'completed' };
    // Ruta y Casos reflejan su propio progreso
    if (m.id === 'ruta' && completedRouteSteps.length > 0) {
      return { ...m, state: completedRouteSteps.length === 9 ? 'completed' : 'in-progress' };
    }
    if (m.id === 'casos' && completedCases.length > 0) {
      return { ...m, state: completedCases.length === 5 ? 'completed' : 'in-progress' };
    }
    return m;
  };

  // Progreso global = % de pasos de la ruta completados (refleja el viaje real)
  const routeStepsTotal = 9;
  const routeStepsDone = completedRouteSteps.length;
  const progressPct = Math.round((routeStepsDone / routeStepsTotal) * 100);

  const completedCount = MODULES.filter(m => completedModules.includes(m.id)).length;
  const hotModule = MODULES.find(m => m.hot)!;
  const restModules = MODULES.filter(m => !m.hot);

  // CTA principal: si hay ruta en marcha, "Continuar con la ruta"; si no, módulo hot
  const hasStartedRoute = routeStepsDone > 0;
  const ctaHref = hasStartedRoute ? '/app/ruta' : hotModule.href;
  const ctaLabel = hasStartedRoute
    ? (routeStepsDone === routeStepsTotal ? 'Revisar la Ruta' : 'Continuar con la Ruta')
    : `Empezar por ${hotModule.title}`;

  return (
    <div className="px-5 lg:px-8 pt-6 pb-12 max-w-[1280px] mx-auto">
      {/* HERO CARD */}
      <section className="rounded-[24px] p-8 lg:p-10 relative overflow-hidden mb-8"
        style={{ background: 'linear-gradient(135deg, #0B1F3A 0%, #16335E 60%, #0B1F3A 100%)' }}>
        {/* grid SVG */}
        <svg className="absolute inset-0 w-full h-full opacity-[0.08]" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="dash-grid" width="32" height="32" patternUnits="userSpaceOnUse">
              <path d="M 32 0 L 0 0 0 32" fill="none" stroke="#fff" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#dash-grid)" />
        </svg>
        <div className="absolute -top-32 -right-20 w-[500px] h-[500px] rounded-full opacity-25 blur-3xl"
          style={{ background: 'radial-gradient(circle, #C8862E 0%, transparent 70%)' }} />

        <div className="relative grid lg:grid-cols-[1fr_auto] gap-8 items-center">
          <div>
            <div className="text-[10.5px] tracking-[0.22em] uppercase mb-2 text-accent">Curso activo</div>
            <h1 className="font-serif italic text-white text-[44px] lg:text-[56px] leading-[1] tracking-tight">
              Matricula<span className="text-accent">PRO</span>
            </h1>
            <p className="mt-4 max-w-[480px] text-[14px] leading-relaxed text-muted-soft">
              Tu centro de control. Cada módulo es una pieza interactiva. Pulsa, practica y avanza por la ruta de matriculación.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href={ctaHref}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-[13px] font-medium bg-accent text-ink hover:scale-[1.02] transition-transform">
                {ctaLabel} <ChevronRight size={14} />
              </Link>
              {hasStartedRoute && (
                <Link href={hotModule.href}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-[13px] text-white border border-white/20 hover:bg-white/5">
                  Ir a {hotModule.title}
                </Link>
              )}
            </div>
          </div>

          {/* Progress ring */}
          <div className="relative shrink-0 hidden lg:block">
            <svg width="180" height="180" className="-rotate-90">
              <circle cx="90" cy="90" r="74" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="6" />
              <circle cx="90" cy="90" r="74" fill="none" stroke="#C8862E" strokeWidth="6" strokeLinecap="round"
                strokeDasharray={`${(progressPct / 100) * 465} 465`} />
              {/* Tick marks */}
              {Array.from({ length: 12 }).map((_, i) => {
                const angle = (i / 12) * 2 * Math.PI;
                const x1 = 90 + Math.cos(angle) * 64;
                const y1 = 90 + Math.sin(angle) * 64;
                const x2 = 90 + Math.cos(angle) * 68;
                const y2 = 90 + Math.sin(angle) * 68;
                return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(255,255,255,0.15)" strokeWidth="1" />;
              })}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="font-serif italic text-white text-[52px] leading-none">{progressPct}<span className="text-accent text-[28px]">%</span></div>
              <div className="text-[10px] tracking-[0.18em] uppercase text-muted mt-1">Completado</div>
            </div>
          </div>
        </div>
      </section>

      {/* STATS STRIP */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        {[
          { label: 'Pasos de ruta', value: `${routeStepsDone}/${routeStepsTotal}` },
          { label: 'Casos resueltos', value: `${completedCases.length}/5` },
          { label: 'Módulos', value: `${completedCount}/${MODULES.length}` },
          { label: 'Cupón próximo curso', value: '20%' },
        ].map((s, i) => (
          <div key={i} className="rounded-2xl p-4 bg-surface border border-line">
            <div className="text-[10.5px] tracking-[0.22em] uppercase text-muted mb-1">{s.label}</div>
            <div className="font-serif italic text-ink text-[28px] leading-none">{s.value}</div>
          </div>
        ))}
      </section>

      {/* HOT MODULE — destacado */}
      <section className="mb-4">
        <ModuleCardLarge module={moduleWithLiveState(hotModule)} />
      </section>

      {/* RESTO MÓDULOS */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {restModules.map(m => (
          <ModuleCard key={m.id} module={moduleWithLiveState(m)} />
        ))}
      </section>
    </div>
  );
}

function ModuleCardLarge({ module: m }: { module: ModuleDef }) {
  const Icon = ICONS[m.icon] ?? FileText;
  return (
    <Link href={m.href}
      className="block rounded-3xl p-6 lg:p-8 bg-surface border border-line shadow-soft-md hover:shadow-soft-lg transition-all hover:-translate-y-0.5 relative overflow-hidden group">
      {/* Glow ámbar */}
      <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full opacity-15 blur-3xl bg-accent" />
      <div className="relative grid lg:grid-cols-[auto_1fr_auto] gap-5 items-center">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-ink text-white shrink-0">
          <Icon size={22} />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[10.5px] font-mono text-muted">{m.code}</span>
            <StateBadge state={m.state} />
            {m.hot && (
              <span className="inline-flex items-center gap-1 text-[9.5px] tracking-[0.16em] uppercase px-1.5 py-0.5 rounded bg-accent-soft text-accent-deep font-semibold">
                <Sparkles size={9} /> Hot
              </span>
            )}
          </div>
          <h3 className="font-serif text-ink text-[24px] leading-[1.1] tracking-tight">{m.title}</h3>
          <p className="mt-1.5 text-[13.5px] text-ink-soft leading-relaxed max-w-[520px]">{m.description}</p>
        </div>
        <ChevronRight size={20} className="hidden lg:block text-muted group-hover:text-accent transition-colors" />
      </div>
    </Link>
  );
}

function ModuleCard({ module: m }: { module: ModuleDef }) {
  const Icon = ICONS[m.icon] ?? FileText;
  return (
    <Link href={m.href}
      className="block rounded-2xl p-5 bg-surface border border-line shadow-soft-sm hover:shadow-soft-md hover:-translate-y-0.5 transition-all group min-h-[160px] flex flex-col">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-bg-deep text-ink shrink-0">
          <Icon size={16} />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[9.5px] font-mono text-muted">{m.code}</span>
        </div>
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
          <h3 className="font-medium text-[14px] text-ink leading-tight">{m.title}</h3>
        </div>
        <p className="text-[12px] text-ink-soft leading-relaxed">{m.description}</p>
      </div>
      <div className="mt-3 flex items-center justify-between">
        <StateBadge state={m.state} />
        <ChevronRight size={13} className="text-muted group-hover:text-accent transition-colors" />
      </div>
    </Link>
  );
}

function StateBadge({ state }: { state: ModuleState }) {
  const map: Record<ModuleState, { bg: string; text: string; icon?: LucideIcon }> = {
    'pending':      { bg: 'bg-line-soft',   text: 'text-muted' },
    'in-progress':  { bg: 'bg-accent-soft', text: 'text-accent-deep', icon: Sparkles },
    'completed':    { bg: 'bg-ok-soft',     text: 'text-ok', icon: CheckCircle2 },
    'locked':       { bg: 'bg-line-soft',   text: 'text-muted', icon: Lock },
    'alert':        { bg: 'bg-warn-soft',   text: 'text-warn' },
    'recommended':  { bg: 'bg-accent-soft', text: 'text-accent-deep', icon: Star },
    'special':      { bg: 'bg-accent-soft', text: 'text-accent-deep', icon: Sparkles },
    'premium':      { bg: 'bg-ink',         text: 'text-accent' },
    'demo':         { bg: 'bg-accent-soft', text: 'text-accent-deep' },
  };
  const conf = map[state];
  const Icon = conf.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9.5px] font-semibold tracking-[0.06em] uppercase ${conf.bg} ${conf.text}`}>
      {Icon && <Icon size={10} />}
      {STATE_LABEL[state]}
    </span>
  );
}
