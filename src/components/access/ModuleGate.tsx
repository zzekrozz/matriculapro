'use client';

import Link from 'next/link';
import { ChevronRight, Lock, type LucideIcon } from 'lucide-react';
import type { AccessCapability, PaidAccessTier } from '@/domain/access';
import { useAccess } from '@/providers/AccessProvider';

interface ModuleGateProps {
  requiredTier?: PaidAccessTier;
  requiredCapability: AccessCapability;
  moduleId?: string;
  moduleName: string;
  moduleCode: string;
  description: string;
  icon: LucideIcon;
  children: React.ReactNode;
}

export function ModuleGate({ requiredTier = 'particular', requiredCapability, moduleName, moduleCode, description, icon: Icon, children }: ModuleGateProps) {
  const access = useAccess();
  if (!access.hydrated) return <div className="min-h-screen bg-bg px-4 py-12"><div className="mx-auto max-w-[900px] rounded-2xl border border-line bg-surface p-6 text-[12px] text-muted" aria-busy="true">Comprobando la licencia…</div></div>;
  const capabilityAllowed: Record<AccessCapability, boolean> = {
    use_free_checker: access.canUseFreeChecker,
    view_historical_paid_data: access.canViewHistoricalPaidData,
    create_full_cases: access.canCreateFullCases,
    edit_full_cases: access.canEditFullCases,
    run_fiscal_calculations: access.canRunFiscalCalculations,
    use_advanced_simulators: access.canUseAdvancedSimulators,
    generate_reports: access.canGenerateReports,
    export_data: access.canExport,
    use_professional_tools: access.canUseProfessionalTools,
    view_paid_cases: access.canViewHistoricalPaidData,
    create_paid_cases: access.canCreateFullCases,
    edit_paid_cases: access.canEditFullCases,
    recalculate_paid_cases: access.canRunFiscalCalculations,
    use_fiscal_catalog: access.canRunFiscalCalculations,
  };
  const tierAllowed = requiredTier === 'professional' ? access.tier === 'professional' : true;
  const allowed = tierAllowed && capabilityAllowed[requiredCapability];
  if (allowed) return <>{children}</>;
  const accessMessage = access.readOnly
    ? 'Tu licencia ha vencido. Los expedientes anteriores siguen disponibles en modo lectura, pero esta herramienta interactiva requiere renovar.'
    : 'El comprobador gratuito sigue disponible. Para esta función necesitas una licencia de pago activa; el servidor comprueba el plan antes de guardar o calcular.';
  return <div className="min-h-screen bg-bg px-4 py-10"><section className="mx-auto max-w-[760px] rounded-[24px] border border-line bg-surface p-6 text-center shadow-soft-md sm:p-10"><span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-ink text-white"><Lock size={24} /></span><div className="mt-5 text-[9.5px] font-mono uppercase tracking-[.16em] text-muted">{moduleCode} · Plan {requiredTier === 'professional' ? 'Profesional' : 'Particular o Profesional'}</div><h1 className="mt-2 font-serif text-[32px] text-ink">{moduleName}</h1><p className="mx-auto mt-3 max-w-xl text-[13px] leading-relaxed text-ink-soft">{description}</p><p className="mx-auto mt-4 max-w-xl text-[11px] leading-relaxed text-muted">{accessMessage}</p><div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row"><Link href="/#precios" className="inline-flex items-center justify-center gap-2 rounded-full bg-ink px-6 py-3 text-[12.5px] font-medium text-white"><Icon size={14} /> Ver licencias</Link><Link href={access.readOnly ? '/app/expedientes' : '/app/comprobar'} className="inline-flex items-center justify-center gap-1 rounded-full bg-bg-deep px-6 py-3 text-[12px] text-ink">{access.readOnly ? 'Ver expedientes anteriores' : 'Ir a la comprobación gratuita'} <ChevronRight size={12} /></Link></div></section></div>;
}
