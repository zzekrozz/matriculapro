'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import {
  BadgeEuro,
  Calculator,
  CalendarDays,
  CarFront,
  CheckSquare,
  CircleDollarSign,
  ClipboardCheck,
  FileText,
  FolderOpen,
  LayoutDashboard,
  Menu,
  Route,
  ScrollText,
  Stamp,
  UserRound,
  Users,
  Wrench,
  X,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { useAccess } from '@/providers/AccessProvider';
import { useAuth } from '@/providers/AuthProvider';
import { useRegistrationCases } from '@/providers/RegistrationCaseProvider';
import { LogoutButton } from '@/components/auth/LogoutButton';

interface NavItem { href: string; icon: LucideIcon; label: string; }
interface NavGroup { title: string; items: NavItem[]; }

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user } = useAuth();
  const access = useAccess();
  const { activeCase } = useRegistrationCases();
  const caseBase = activeCase ? `/app/expedientes/${activeCase.id}` : '/app/expedientes';
  const canViewProfessionalHistory = access.publicBeta || (access.tier === 'professional' && access.canViewPaidCases);
  const groups: NavGroup[] = [
    { title: 'Comprobar', items: [{ href: '/app/comprobar', icon: ClipboardCheck, label: 'Comprobación gratuita' }] },
    ...(access.canViewPaidCases ? [
      { title: 'Expedientes', items: [
        { href: '/app/dashboard', icon: LayoutDashboard, label: 'Centro de control' },
        { href: '/app/expedientes', icon: FolderOpen, label: 'Mis expedientes' },
        ...(activeCase ? [
          { href: caseBase, icon: Route, label: 'Resumen y ruta' },
          { href: `${caseBase}/documentos`, icon: FileText, label: 'Documentos' },
          { href: `${caseBase}/impuestos`, icon: CircleDollarSign, label: 'Costes e impuestos' },
          { href: `${caseBase}/itv`, icon: Wrench, label: 'ITV' },
          { href: `${caseBase}/dgt`, icon: Stamp, label: 'DGT' },
          { href: `${caseBase}/fechas`, icon: CalendarDays, label: 'Fechas y citas' },
        ] : []),
      ] },
      { title: 'Herramientas', items: [
        { href: '/app/simulador-576', icon: Calculator, label: 'Calculadora Modelo 576' },
        { href: '/app/ficha-tecnica', icon: ScrollText, label: 'Ficha técnica guiada' },
        { href: '/app/checklist/antes-de-comprar', icon: CheckSquare, label: 'Checklist de compra' },
        { href: '/app/checklist/pre-itv', icon: Wrench, label: 'Preparación ITV' },
        { href: '/app/checklist/pre-dgt', icon: CheckSquare, label: 'Preparación DGT' },
      ] },
    ] : []),
    ...(canViewProfessionalHistory ? [{ title: 'Profesional', items: access.canUseProfessional ? [
      { href: '/app/profesional', icon: BadgeEuro, label: 'Operaciones y márgenes' },
      { href: '/app/profesional/clientes', icon: Users, label: 'Clientes' },
      { href: '/app/profesional/informes', icon: FileText, label: 'Informes y exportación' },
    ] : [
      { href: '/app/profesional', icon: BadgeEuro, label: 'Historial profesional' },
    ] }] : []),
    { title: 'Cuenta', items: [
      { href: '/app/cuenta', icon: UserRound, label: 'Mi cuenta' },
      ...(!access.publicBeta ? [{ href: '/#precios', icon: BadgeEuro, label: access.isPaid ? 'Renovar o ampliar' : 'Ver licencias' }] : []),
    ] },
  ];

  return <div className="min-h-screen overflow-x-hidden bg-bg">
    <header className="print-shell-hidden sticky top-0 z-40 flex min-h-14 items-center justify-between border-b border-line bg-surface px-4 lg:hidden"><Brand /><div className="flex items-center gap-2"><TierBadge access={access} /><button type="button" onClick={() => setMobileOpen((value) => !value)} className="rounded-lg p-2" aria-label={mobileOpen ? 'Cerrar menú' : 'Abrir menú'} aria-expanded={mobileOpen}>{mobileOpen ? <X size={19} /> : <Menu size={19} />}</button></div></header>
    <div className="flex"><aside className={cn('print-shell-hidden fixed inset-y-0 left-0 z-30 flex w-[86vw] max-w-[310px] flex-col bg-ink text-white transition-transform lg:static lg:w-[274px] lg:shrink-0 lg:translate-x-0', mobileOpen ? 'translate-x-0' : '-translate-x-full')}>
      <div className="hidden border-b border-white/5 px-5 py-5 lg:block"><Brand dark /><div className="mt-4"><AccessSummary /></div></div>
      {activeCase && access.canViewPaidCases && <Link href={caseBase} onClick={() => setMobileOpen(false)} className="mx-3 mt-3 rounded-xl border border-white/10 bg-white/5 p-3 hover:bg-white/[.08]"><div className="text-[8.5px] uppercase tracking-[.18em] text-accent">Expediente activo</div><div className="mt-1 truncate text-[11.5px] font-medium text-white">{activeCase.vehicle.brand || 'Vehículo'} {activeCase.vehicle.model}</div><div className="mt-0.5 text-[9.5px] text-muted">{access.readOnly ? 'Solo lectura' : 'Guardado y editable'}</div></Link>}
      <nav className="flex-1 overflow-y-auto px-3 pb-4 pt-3" aria-label="Navegación de la aplicación">{groups.map((group) => <div key={group.title} className="mt-4 first:mt-0"><div className="mb-1.5 px-3 text-[9px] font-semibold uppercase tracking-[.2em] text-muted">{group.title}</div><div className="space-y-0.5">{group.items.map((item) => { const active = pathname === item.href || (item.href !== '/app/dashboard' && item.href.startsWith('/app/') && pathname.startsWith(`${item.href}/`)); const Icon = item.icon; return <Link key={`${group.title}-${item.href}`} href={item.href} onClick={() => setMobileOpen(false)} className={cn('flex items-center gap-2.5 rounded-lg px-3 py-2 text-[11.5px] transition-colors', active ? 'bg-accent/15 text-white' : 'text-muted-soft hover:bg-white/5 hover:text-white')}><Icon size={13} className={active ? 'text-accent' : 'text-muted'} /><span className="truncate">{item.label}</span></Link>; })}</div></div>)}</nav>
      <div className="border-t border-white/5 px-3 pb-4 pt-3">{user && <div className="truncate px-3 pb-2 text-[9.5px] text-muted">{user.email}</div>}<LogoutButton /><Link href="/legal/aviso-fiscal-tecnico" className="block px-3 pt-2 text-[9.5px] text-muted hover:text-white">Alcance fiscal y técnico</Link></div>
    </aside>
    {mobileOpen && <button type="button" aria-label="Cerrar menú" className="fixed inset-0 z-20 bg-black/40 lg:hidden" onClick={() => setMobileOpen(false)} />}
    <main className="min-h-screen min-w-0 flex-1">{access.publicBeta ? <PublicBetaBanner /> : access.readOnly && <ExpiredBanner expiredAt={access.expiredAt} />}{children}</main>
    </div>
  </div>;
}

function Brand({ dark = false }: { dark?: boolean }) { return <Link href="/app/comprobar" className="flex items-baseline gap-1.5"><span className="text-[8.5px] uppercase tracking-[.18em] text-muted">IvanImports ·</span><span className={cn('font-serif text-[21px] italic', dark ? 'text-white' : 'text-ink')}>Matricula</span><span className="text-[9px] font-semibold text-accent">PRO</span></Link>; }
function TierBadge({ access }: { access: ReturnType<typeof useAccess> }) { const label = access.publicBeta ? 'Beta' : access.mode === 'read_only' ? 'Solo lectura' : access.tier === 'professional' ? 'Profesional' : access.tier === 'particular' ? 'Particular' : 'Gratis'; return <span className="rounded-full bg-bg-deep px-2.5 py-1 text-[9px] font-medium text-ink-soft">{label}</span>; }
function AccessSummary() { const access = useAccess(); return <div className="rounded-xl border border-white/10 bg-white/5 p-3"><div className="text-[9px] font-semibold uppercase tracking-[.16em] text-accent">{access.publicBeta ? 'MatriculaPro Beta' : access.tier === 'professional' ? 'Profesional' : access.tier === 'particular' ? 'Particular' : 'Gratis'}</div><p className="mt-1 text-[9.5px] text-muted-soft">{access.publicBeta ? 'Herramientas abiertas durante el desarrollo' : access.mode === 'full' && access.license?.expiresAt ? `Activo hasta ${formatDate(access.license.expiresAt)}` : access.mode === 'read_only' ? 'Expedientes en solo lectura' : 'Comprobación previa incluida'}</p></div>; }
function PublicBetaBanner() { return <div className="print-shell-hidden border-b border-accent/25 bg-accent-soft px-5 py-2.5 text-[11px] text-accent-deep lg:px-8"><strong>MatriculaPro Beta.</strong> Estamos desarrollando y mejorando la plataforma; durante esta fase puedes utilizar todas las herramientas con tu cuenta.</div>; }
function ExpiredBanner({ expiredAt }: { expiredAt: string | null }) { return <div className="print-shell-hidden sticky top-0 z-20 flex flex-wrap items-center justify-between gap-2 border-b border-accent/25 bg-accent-soft px-5 py-2.5 text-[11px] text-accent-deep lg:px-8"><span><strong>Tu acceso completo finalizó{expiredAt ? ` el ${formatDate(expiredAt)}` : ''}.</strong> Tus expedientes siguen disponibles en modo lectura.</span><Link href="/#precios" className="rounded-full bg-ink px-3 py-1.5 text-[10.5px] font-medium text-white">Renovar acceso</Link></div>; }
function formatDate(value: string) { return new Intl.DateTimeFormat('es-ES', { dateStyle: 'medium' }).format(new Date(value)); }
