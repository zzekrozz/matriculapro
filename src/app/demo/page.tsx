'use client';

import Link from 'next/link';
import { ChevronRight, Sparkles, Play, Crown } from 'lucide-react';
import RecorridoITV from '@/components/modules/itv/RecorridoITV';

export default function DemoPage() {
  return (
    <div className="min-h-screen bg-bg">
      {/* Mini header demo */}
      <header className="sticky top-0 z-30 bg-surface/85 backdrop-blur border-b border-line">
        <div className="max-w-[1400px] mx-auto px-5 lg:px-8 h-[60px] flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-[12.5px] text-muted hover:text-ink">
            ← Volver a la landing
          </Link>
          <div className="hidden md:flex items-baseline gap-1.5">
            <span className="text-[9.5px] tracking-[0.22em] uppercase text-muted">Ivan ·</span>
            <span className="font-serif italic text-lg text-ink">Matricula</span>
            <span className="text-[10px] font-semibold text-accent">PRO</span>
            <span className="ml-2 inline-flex items-center gap-1 text-[9.5px] tracking-[0.18em] uppercase px-1.5 py-0.5 rounded bg-accent-soft text-accent-deep font-semibold">
              <Sparkles size={9} /> Modo demo
            </span>
          </div>
          <a href="/#precios"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[12px] font-medium bg-ink text-white hover:scale-[1.02] transition-transform">
            <Crown size={11} className="text-accent" /> Founder Alpha · 49&nbsp;€
          </a>
        </div>
      </header>

      {/* Banner contextual demo */}
      <div className="bg-ink text-white">
        <div className="max-w-[1400px] mx-auto px-5 lg:px-8 py-3 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-[12.5px]">
            <Play size={12} className="text-accent" />
            <span className="text-muted-soft">
              Estás probando la demo. Ves los primeros <strong className="text-white">5 pasos</strong> del recorrido ITV.
              El acceso Founder incluye los 11 pasos, el simulador 576, la ficha técnica 3D, checklists y casos prácticos.
            </span>
          </div>
          <a href="/#precios" className="text-[11.5px] inline-flex items-center gap-1 text-accent hover:underline whitespace-nowrap">
            Ver qué incluye el acceso Founder <ChevronRight size={11} />
          </a>
        </div>
      </div>

      {/* Recorrido ITV en modo demo */}
      <RecorridoITV isDemo={true} />

      {/* CTA inferior demo → Founder Alpha */}
      <section className="px-5 lg:px-8 pb-14">
        <div className="max-w-[1400px] mx-auto rounded-[24px] p-8 lg:p-12 relative overflow-hidden"
             style={{ background: 'linear-gradient(135deg, #0B1F3A 0%, #16335E 60%, #0B1F3A 100%)', color: '#fff' }}>
          <div className="absolute -top-32 -right-32 w-[400px] h-[400px] rounded-full opacity-30 blur-3xl bg-accent" />
          <div className="relative grid lg:grid-cols-[1.4fr_auto] gap-6 items-center">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full mb-3 bg-accent/20 text-accent">
                <Crown size={11} />
                <span className="text-[10.5px] tracking-[0.18em] uppercase font-semibold">Acceso Founder Alpha</span>
              </div>
              <h2 className="font-serif text-[32px] lg:text-[40px] leading-[1.05] tracking-tight">
                ¿Te ha convencido lo que viste? <span className="italic text-accent">Sigue practicando.</span>
              </h2>
              <p className="mt-3 max-w-[560px] text-[14px] text-muted-soft leading-relaxed">
                Acceso Founder Alpha: entra por 49 €, accede a los módulos actuales y recibe futuras mejoras mientras MatriculaPRO evoluciona.
              </p>
              <div className="mt-2 flex items-baseline gap-2 text-muted-soft">
                <span className="font-serif italic text-white text-[28px] leading-none">49 €</span>
                <span className="text-[10px]">pago único · actualizaciones incluidas</span>
              </div>
            </div>
            <div className="flex flex-col gap-2 shrink-0">
              <a href="/#precios"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full text-[13.5px] font-medium bg-accent text-ink hover:scale-[1.02] transition-transform">
                <Crown size={14} /> Ver precios Founder
              </a>
              <Link href="/" className="text-[11px] text-center text-muted-soft hover:text-white">
                Ver todo lo que incluye
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
