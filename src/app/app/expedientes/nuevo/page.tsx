'use client';

import Link from 'next/link';
import { CaseOnboarding } from '@/components/cases/CaseOnboarding';
import { useAccess } from '@/providers/AccessProvider';

export default function NewCasePage() {
  const { canManageFullCases, loading, readOnly } = useAccess();
  if (loading) return <div className="px-5 py-16 text-center text-sm text-muted">Comprobando la licencia…</div>;
  if (!canManageFullCases) return <div className="mx-auto max-w-2xl px-5 py-16 text-center"><h1 className="font-serif text-3xl text-ink">No puedes crear un expediente ahora</h1><p className="mt-3 text-sm leading-relaxed text-ink-soft">{readOnly ? 'Tus expedientes anteriores siguen visibles, pero necesitas renovar para crear o editar.' : 'Los expedientes completos requieren una licencia Particular o Profesional activa.'}</p><div className="mt-5 flex justify-center gap-2"><Link href="/app/comprobar" className="rounded-full bg-bg-deep px-5 py-2.5 text-sm text-ink">Comprobación gratuita</Link><Link href="/#precios" className="rounded-full bg-ink px-5 py-2.5 text-sm text-white">Ver licencias</Link></div></div>;
  return <CaseOnboarding />;
}

