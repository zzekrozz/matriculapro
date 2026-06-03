'use client';

import Link from 'next/link';
import {
  ChevronLeft, Sparkles, Construction,
  Route, Calculator, ScrollText, CheckSquare, Wrench, Stamp,
  BookOpen, FileText, Mail, Phone, GraduationCap, Car,
  type LucideIcon
} from 'lucide-react';

const ICON_MAP: Record<string, LucideIcon> = {
  Route, Calculator, ScrollText, CheckSquare, Wrench, Stamp,
  BookOpen, FileText, Mail, Phone, GraduationCap, Car,
};

interface ComingSoonProps {
  code: string;
  title: string;
  description: string;
  iconName: string;
}

export function ComingSoon({ code, title, description, iconName }: ComingSoonProps) {
  const Icon = ICON_MAP[iconName] ?? FileText;
  return (
    <div className="min-h-screen bg-bg">
      <div className="px-5 lg:px-8 pt-6 pb-12 max-w-[1100px] mx-auto">
        <Link href="/app/dashboard" className="mb-6 inline-flex items-center gap-2 text-[12.5px] text-muted hover:text-ink">
          <ChevronLeft size={14} /> Volver al centro de control
        </Link>

        <div className="mb-6 flex items-center gap-3">
          <span className="text-[10.5px] font-mono text-muted">{code}</span>
          <span className="inline-flex items-center gap-1 text-[9.5px] tracking-[0.18em] uppercase px-1.5 py-0.5 rounded bg-accent-soft text-accent-deep font-semibold">
            <Construction size={9} /> En construcción
          </span>
        </div>

        <h1 className="font-serif text-[40px] lg:text-[56px] leading-[1] tracking-tight text-ink">
          {title}
        </h1>
        <p className="mt-4 text-[14.5px] leading-relaxed text-ink-soft max-w-[640px]">
          {description}
        </p>

        <div className="mt-10 rounded-[24px] p-10 lg:p-14 relative overflow-hidden bg-surface border border-line shadow-soft-md text-center">
          <div className="absolute -top-32 -right-32 w-[400px] h-[400px] rounded-full opacity-15 blur-3xl bg-accent" />
          <div className="relative max-w-[440px] mx-auto">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-ink text-white mx-auto mb-5">
              <Icon size={24} />
            </div>
            <div className="text-[10.5px] tracking-[0.22em] uppercase text-accent-deep mb-2">Módulo en construcción</div>
            <h2 className="font-serif italic text-[28px] leading-[1.1] tracking-tight text-ink">
              Próximamente.
            </h2>
            <p className="mt-3 text-[13.5px] leading-relaxed text-ink-soft">
              Esta pieza está disponible con acceso Founder Alpha. Estamos puliendo la interacción para que sea tan útil como las que ya has probado.
            </p>
            <Link href="/app/recorrido-itv"
              className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-[12.5px] font-medium bg-accent text-ink hover:scale-[1.02] transition-transform">
              <Sparkles size={12} /> Probar Recorrido ITV mientras tanto
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
