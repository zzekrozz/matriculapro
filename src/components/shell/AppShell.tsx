'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Route, Calculator, ScrollText, Car, Wrench, Stamp,
  BookOpen, FileText, Mail, Phone, GraduationCap, Sparkles, ChevronRight,
  Menu, X, CheckSquare, Crown, Lock, UserRound, type LucideIcon
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/cn';
import { useAccess, formatFounderNumber } from '@/providers/AccessProvider';
import { useFounderModal } from '@/providers/FounderModalProvider';
import { useAuth } from '@/providers/AuthProvider';
import { LogoutButton } from '@/components/auth/LogoutButton';

interface NavItem {
  href: string;
  icon: LucideIcon;
  label: string;
  code: string;
  badge?: 'hot' | 'premium' | 'demo';
  requiresFounder?: boolean;
  /** Si true, Explorer puede acceder a este item en modo demo */
  explorerDemo?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { href: '/app/dashboard',           icon: LayoutDashboard, label: 'Centro de control', code: '' },
  { href: '/app/ruta',                icon: Route,           label: 'Ruta de matriculación', code: 'M.01' },
  { href: '/app/simulador-576',       icon: Calculator,      label: 'Simulador 576', code: 'M.02', badge: 'hot', requiresFounder: true },
  { href: '/app/ficha-tecnica',       icon: ScrollText,      label: 'Ficha técnica 3D', code: 'M.03', requiresFounder: true },
  { href: '/app/checklist/antes-de-comprar', icon: CheckSquare, label: 'Antes de comprar', code: 'M.04', requiresFounder: true },
  { href: '/app/checklist/pre-itv',   icon: Wrench,          label: 'Checklist pre-ITV', code: 'M.05', requiresFounder: true },
  { href: '/app/recorrido-itv',       icon: Car,             label: 'Recorrido ITV', code: 'M.06', badge: 'hot', explorerDemo: true },
  { href: '/app/checklist/pre-dgt',   icon: Stamp,           label: 'Checklist pre-DGT', code: 'M.07', requiresFounder: true },
  { href: '/app/casos-practicos',     icon: BookOpen,        label: 'Casos prácticos', code: 'M.08', requiresFounder: true },
  { href: '/app/biblioteca',          icon: FileText,        label: 'Biblioteca docs.', code: 'M.09', requiresFounder: true },
  { href: '/app/plantillas-itv',      icon: Mail,            label: 'Plantillas ITV', code: 'M.10', requiresFounder: true },
  { href: '/app/acompanamiento',      icon: Phone,           label: 'Acompañamiento', code: 'M.11', badge: 'premium' },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { level, founderNumber, isFounder, isExplorer } = useAccess();
  const { openFounderModal } = useFounderModal();
  const { user } = useAuth();
  const hasSession = Boolean(user);

  return (
    <div className="min-h-screen bg-bg overflow-x-hidden">
      {/* TOPBAR mobile */}
      <header className="lg:hidden sticky top-0 z-40 bg-surface border-b border-line min-h-14 px-4 py-2 flex items-center justify-between gap-3">
        <Link href="/app/dashboard" className="flex items-baseline gap-1.5">
          <span className="text-[10px] tracking-[0.22em] uppercase text-muted">Ivan ·</span>
          <span className="font-serif italic text-xl text-ink">Matricula</span>
          <span className="text-[11px] font-semibold text-accent">PRO</span>
        </Link>
        <div className="flex items-center gap-2">
          <AccessBadge level={level} founderNumber={founderNumber} hasSession={hasSession} />
          <button onClick={() => setMobileOpen(v => !v)} className="p-2">
            {mobileOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </header>

      <div className="flex">
        {/* SIDEBAR */}
        <aside
          className={cn(
            'fixed inset-y-0 left-0 z-30 w-[86vw] max-w-[320px] bg-ink text-white transition-transform lg:translate-x-0 lg:static lg:w-[260px] lg:max-w-none lg:flex-shrink-0',
            mobileOpen ? 'translate-x-0' : '-translate-x-full',
            'flex flex-col'
          )}
        >
          {/* Logo + nivel */}
          <div className="px-5 py-5 hidden lg:block border-b border-white/5">
            <div className="flex items-baseline gap-1.5 mb-3">
              <span className="text-[9.5px] tracking-[0.22em] uppercase text-muted">Ivan Imports ·</span>
              <span className="font-serif italic text-2xl text-white">Matricula</span>
              <span className="text-[11px] font-semibold text-accent">PRO</span>
            </div>
            <SidebarLevelBadge
              level={level}
              founderNumber={founderNumber}
              onUpgrade={openFounderModal}
              hasSession={hasSession}
            />
          </div>

          {/* Nav */}
          <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
            <div className="text-[9.5px] tracking-[0.22em] uppercase text-muted px-3 mb-2 mt-1">Curso activo</div>
            {NAV_ITEMS.map(item => {
              const Icon = item.icon;
              const isActive = pathname === item.href || (item.href !== '/app/dashboard' && pathname?.startsWith(item.href));
              // Bloqueado: requiere Founder y no lo es, Y no tiene explorerDemo
              const isLocked = item.requiresFounder && !isFounder;
              // Explorer con demo: puede entrar
              const isExplorerDemoOk = item.explorerDemo && isExplorer;

              if (isLocked) {
                // Item bloqueado → botón que abre el modal Founder
                return (
                  <button key={item.href}
                    onClick={() => { setMobileOpen(false); openFounderModal(); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12.5px] transition-colors text-muted opacity-60 hover:opacity-80 hover:bg-white/5">
                    <Lock size={14} className="shrink-0 text-muted" />
                    <span className="flex-1 truncate text-left">{item.label}</span>
                    {item.code && <span className="text-[9px] font-mono shrink-0 text-muted">{item.code}</span>}
                    <Crown size={9} className="text-accent shrink-0 opacity-70" />
                  </button>
                );
              }

              return (
                <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)}
                  className={cn(
                    'flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12.5px] transition-colors group relative',
                    isActive ? 'bg-accent/15 text-white' : 'text-muted-soft hover:bg-white/5 hover:text-white'
                  )}>
                  <Icon size={14} className={cn('shrink-0', isActive ? 'text-accent' : 'text-muted')} />
                  <span className="flex-1 truncate">{item.label}</span>
                  {item.code && (
                    <span className={cn('text-[9px] font-mono shrink-0', isActive ? 'text-accent' : 'text-muted')}>{item.code}</span>
                  )}
                  {item.badge === 'hot' && <Sparkles size={10} className="text-accent shrink-0" />}
                  {item.badge === 'premium' && <span className="text-[8.5px] font-semibold text-accent shrink-0">PRO</span>}
                  {isExplorerDemoOk && <span className="text-[8px] font-semibold text-accent-deep shrink-0 bg-accent-soft px-1 rounded">DEMO</span>}
                </Link>
              );
            })}

            <div className="text-[9.5px] tracking-[0.22em] uppercase text-muted px-3 mb-2 mt-6">Mis cursos</div>
            <Link href="/app/mis-cursos" onClick={() => setMobileOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12.5px] text-muted-soft hover:bg-white/5 hover:text-white">
              <GraduationCap size={14} className="shrink-0 text-muted" />
              <span>Todos los cursos</span>
              <ChevronRight size={11} className="text-muted ml-auto" />
            </Link>

            {hasSession && (
              <>
                <div className="text-[9.5px] tracking-[0.22em] uppercase text-muted px-3 mb-2 mt-6">Cuenta</div>
                <Link href="/app/account" onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12.5px] text-muted-soft hover:bg-white/5 hover:text-white">
                  <UserRound size={14} className="shrink-0 text-muted" />
                  <span>Mi cuenta</span>
                  <ChevronRight size={11} className="text-muted ml-auto" />
                </Link>
              </>
            )}
          </nav>

          {/* Footer sidebar */}
          <div className="px-3 pb-4 border-t border-white/5 pt-4 space-y-1">
            {user && (
              <div className="px-3 py-1.5 mb-1">
                <div className="text-[10px] text-muted truncate">{user.email}</div>
              </div>
            )}
            {hasSession && <LogoutButton />}
            <Link href="/legal/aviso-formativo" className="text-[10.5px] leading-snug text-muted hover:text-white px-3 block pt-1">
              ⚠ Aviso formativo
            </Link>
          </div>
        </aside>

        {/* Mobile overlay */}
        {mobileOpen && (
          <div className="fixed inset-0 bg-black/40 z-20 lg:hidden" onClick={() => setMobileOpen(false)} />
        )}

        {/* MAIN */}
        <main className="flex-1 min-w-0 min-h-screen">
          {/* Banner Explorer */}
          {hasSession && isExplorer && <ExplorerBanner onUpgrade={openFounderModal} />}
          {children}
        </main>
      </div>
    </div>
  );
}

/* ============================================================
   ExplorerBanner
   ============================================================ */
function ExplorerBanner({ onUpgrade }: { onUpgrade: () => void }) {
  return (
    <div className="sticky top-0 z-20 px-5 lg:px-8 py-3 flex items-center gap-3 justify-between flex-wrap"
         style={{
           background: 'linear-gradient(135deg, #F5E9D4 0%, #FBEAD0 100%)',
           borderBottom: '1px solid #C8862E',
         }}>
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <span className="inline-flex items-center gap-1 text-[10px] tracking-[0.18em] uppercase font-semibold text-accent-deep shrink-0">
          <Sparkles size={11} /> Modo Explorador
        </span>
        <span className="text-[12px] leading-tight text-accent-deep truncate">
          Estás explorando gratis. Ruta, ITV demo y ficha técnica disponibles.
          Desbloquea todo con <strong>Founder Beta · 49 €</strong>.
        </span>
      </div>
      <button onClick={onUpgrade}
        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[11.5px] font-medium transition-transform hover:scale-[1.02] shrink-0 bg-ink text-white shadow-soft-md">
        <Crown size={11} /> Desbloquear Founder
      </button>
    </div>
  );
}

/* ============================================================
   Badges
   ============================================================ */
function SidebarLevelBadge({ level, founderNumber, onUpgrade, hasSession }: {
  level: ReturnType<typeof useAccess>['level'];
  founderNumber: number | null;
  onUpgrade: () => void;
  hasSession: boolean;
}) {
  if (!hasSession) {
    return (
      <div className="w-full rounded-lg p-2.5 border border-white/10">
        <div className="flex items-center gap-2">
          <Lock size={11} className="text-muted shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-[10.5px] tracking-[0.18em] uppercase text-muted font-semibold">Visitante</div>
            <div className="text-[10.5px] text-muted-soft mt-0.5">Vista demo limitada</div>
          </div>
        </div>
        <div className="mt-3 space-y-2">
          <Link
            href="/acceso-founder"
            className="w-full inline-flex items-center justify-center gap-2 rounded-full px-3.5 py-2 text-[12px] font-medium bg-white text-ink"
          >
            <Crown size={12} className="text-accent-deep" /> Comprar acceso Founder
          </Link>
          <Link
            href="/auth/login"
            className="w-full inline-flex items-center justify-center gap-2 rounded-full px-3.5 py-2 text-[11.5px] text-muted-soft border border-white/10 hover:bg-white/5"
          >
            Iniciar sesión
          </Link>
        </div>
      </div>
    );
  }
  if (level === 'explorer') {
    return (
      <button onClick={onUpgrade}
        className="w-full text-left rounded-lg p-2.5 transition-colors hover:bg-accent/10 border"
        style={{ borderColor: 'rgba(200, 134, 46, 0.3)', background: 'rgba(200, 134, 46, 0.08)' }}>
        <div className="flex items-center gap-2">
          <Sparkles size={12} className="text-accent shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-[10.5px] tracking-[0.18em] uppercase font-semibold text-accent">Explorer</div>
            <div className="text-[10.5px] text-muted-soft mt-0.5">Desbloquear Founder</div>
          </div>
        </div>
      </button>
    );
  }
  if (level === 'founder' || level === 'full') {
    const levelLabel = level === 'full' ? 'Full' : 'Founder';
    return (
      <div className="rounded-lg p-2.5 border"
           style={{ borderColor: 'rgba(200, 134, 46, 0.4)', background: 'rgba(200, 134, 46, 0.12)' }}>
        <div className="flex items-center gap-2">
          <Crown size={12} className="text-accent shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-[10px] tracking-[0.18em] uppercase font-semibold text-accent">{levelLabel}</div>
            <div className="text-[11px] text-white font-mono mt-0.5">
              {founderNumber !== null ? formatFounderNumber(founderNumber) : '—'}
            </div>
          </div>
        </div>
      </div>
    );
  }
  return null;
}

function AccessBadge({ level, founderNumber, hasSession }: {
  level: ReturnType<typeof useAccess>['level'];
  founderNumber: number | null;
  hasSession: boolean;
}) {
  if (!hasSession) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-full bg-bg-deep text-muted">
        Visitante
      </span>
    );
  }
  if (level === 'founder' || level === 'full') {
    const label = level === 'full' ? 'Full' : 'Founder';
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-1 rounded-full bg-accent/15 text-accent-deep">
        <Crown size={10} /> {founderNumber !== null ? `${label} ${formatFounderNumber(founderNumber)}` : label}
      </span>
    );
  }
  if (level === 'explorer') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-full bg-bg-deep text-muted">
        Explorer
      </span>
    );
  }
  return null;
}
