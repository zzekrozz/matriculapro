'use client';

import { Lock, Crown, ChevronRight, Sparkles, type LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { useAccess } from '@/providers/AccessProvider';
import { useFounderModal } from '@/providers/FounderModalProvider';

interface ModuleGateProps {
  requiresFounder?: boolean;
  moduleId?: string;
  moduleName: string;
  moduleCode: string;
  description: string;
  icon: LucideIcon;
  children: React.ReactNode;
}

export function ModuleGate({
  requiresFounder = true,
  moduleId,
  moduleName,
  moduleCode,
  description,
  icon: Icon,
  children,
}: ModuleGateProps) {
  const { isFounder, canAccessModule, hydrated } = useAccess();
  const { openFounderModal } = useFounderModal();

  if (!hydrated) return <>{children}</>;
  if (!requiresFounder || isFounder) return <>{children}</>;
  if (moduleId && canAccessModule(moduleId)) return <>{children}</>;

  return (
    <div className="min-h-screen bg-bg">
      <div className="px-5 lg:px-8 pt-6 pb-12 max-w-[1100px] mx-auto">
        <Link href="/app/dashboard" className="mb-5 inline-flex items-center gap-2 text-[12.5px] text-muted hover:text-ink">
          ← Volver al centro de control
        </Link>

        <div className="rounded-[24px] overflow-hidden bg-surface border border-line shadow-soft-md">
          <div className="p-7 lg:p-10 border-b border-line text-center relative">
            <div className="absolute -top-32 -right-20 w-[400px] h-[400px] rounded-full opacity-15 blur-3xl bg-accent pointer-events-none" />
            <div className="relative">
              <div className="relative w-20 h-20 mx-auto mb-5">
                <div className="w-20 h-20 rounded-2xl flex items-center justify-center bg-ink text-white relative z-10">
                  <Lock size={28} />
                </div>
                <div className="absolute inset-0 rounded-2xl bg-accent opacity-25 blur-xl -z-10" />
                <div className="absolute -bottom-2 -right-2 w-9 h-9 rounded-xl flex items-center justify-center bg-accent text-ink shadow-soft-md z-20">
                  <Icon size={14} />
                </div>
              </div>

              <div className="flex items-center justify-center gap-2 mb-2 flex-wrap">
                <span className="text-[10.5px] font-mono tracking-wider text-muted">{moduleCode}</span>
                <span className="inline-flex items-center gap-1 text-[9.5px] tracking-[0.04em] uppercase px-1.5 py-0.5 rounded font-semibold bg-accent-soft text-accent-deep">
                  <Crown size={9} /> Disponible para Founder Beta
                </span>
              </div>

              <h1 className="font-serif text-ink leading-[1.05] tracking-tight mb-3" style={{ fontSize: 'clamp(24px, 3.2vw, 36px)' }}>
                {moduleName}
              </h1>

              <p className="text-[14px] leading-relaxed text-ink-soft max-w-[480px] mx-auto mb-6">
                {description}
              </p>

              <p className="text-[12.5px] text-ink-soft mb-5 max-w-[470px] mx-auto">
                Este módulo forma parte del acceso Founder. Compra el acceso o inicia sesión si ya tienes cuenta.
              </p>

              <div className="flex items-center justify-center gap-2 flex-wrap mb-2">
                <button
                  onClick={openFounderModal}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-[13.5px] font-medium transition-transform hover:scale-[1.02] bg-ink text-white shadow-soft-md"
                >
                  <Crown size={14} className="text-accent" /> Comprar acceso Founder
                </button>
                <Link
                  href="/auth/login"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-[13px] bg-bg-deep text-ink-soft hover:bg-line transition-colors"
                >
                  Iniciar sesión <ChevronRight size={13} />
                </Link>
              </div>
              <p className="text-[10.5px] text-muted">
                Pago único · acceso de por vida
              </p>
            </div>
          </div>

          <div className="p-7 lg:p-10">
            <div className="flex items-center gap-1.5 mb-3 text-[10px] tracking-[0.22em] uppercase text-accent-deep">
              <Sparkles size={11} /> Con acceso Founder desbloqueas
            </div>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {[
                'Simulador 576 con corrección campo a campo',
                'Ficha técnica 3D interactiva',
                'Recorrido ITV completo (11 pasos)',
                'Checklists pre-ITV y pre-DGT',
                'Casos prácticos con 5 escenarios reales',
                'Biblioteca de documentos y plantillas',
              ].map((b, i) => (
                <li key={i} className="flex items-start gap-2 text-[12.5px] text-ink-soft leading-relaxed">
                  <span className="w-1 h-1 rounded-full bg-accent shrink-0 mt-2" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
