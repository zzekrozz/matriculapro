'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import {
  ChevronRight, Check, X, Play, ArrowUpRight, Sparkles, Lock,
  Calculator, ScrollText, Car, Wrench, Stamp, Route, FileText, Phone,
  CheckCircle2, MousePointer2, Zap, MonitorSmartphone,
  Plus, Shield, Clock, Users, type LucideIcon
} from 'lucide-react';
import { tokens } from '@/lib/tokens';
import { PriceLadder } from '@/components/founder/PriceLadder';
import { FeedbackCard } from '@/components/founder/FeedbackCard';

/* ============================================================
   LANDING PÚBLICA · MatriculaPRO by Ivan Imports
   ============================================================ */

/* ============================================================
   NAV TOP
   ============================================================ */
interface CTAProps {
  demoHref: string;
  buyHref: string;
}

const NavBar: React.FC<CTAProps> = ({ demoHref, buyHref }) => {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header className="sticky top-0 z-50 transition-all"
            style={{
              background: scrolled ? 'rgba(244,246,250,0.85)' : 'transparent',
              backdropFilter: scrolled ? 'blur(12px)' : 'none',
              borderBottom: scrolled ? `1px solid ${tokens.color.line}` : '1px solid transparent',
            }}>
      <div className="max-w-[1280px] mx-auto px-4 sm:px-5 lg:px-8 h-[68px] sm:h-[72px] flex items-center justify-between gap-3">
        <a href="#" className="flex items-baseline gap-2">
          <span className="text-[10px] tracking-[0.22em] uppercase" style={{ color: tokens.color.muted }}>Ivan Imports ·</span>
          <span style={{ fontFamily: 'Instrument Serif, serif', fontSize: 26, lineHeight: 1, color: tokens.color.ink, fontStyle: 'italic' }}>Matricula</span>
          <span className="text-[11px] font-semibold tracking-wider" style={{ color: tokens.color.accent }}>PRO</span>
        </a>

        <nav className="hidden lg:flex items-center gap-7 text-[13px]" style={{ color: tokens.color.inkSoft }}>
          <a href="#que-es" className="hover:text-[#0B1F3A]">Qué es</a>
          <a href="#piezas" className="hover:text-[#0B1F3A]">Cómo funciona</a>
          <a href="#precios" className="hover:text-[#0B1F3A]">Precios</a>
          <a href="#acompanamiento" className="hover:text-[#0B1F3A]">Acompañamiento</a>
          <a href="#faq" className="hover:text-[#0B1F3A]">FAQ</a>
        </nav>

        <div className="flex items-center gap-2 shrink-0">
          <Link href="/auth/login"
            className="hidden md:inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-[12px] transition-colors"
            style={{ background: tokens.color.bgDeep, color: tokens.color.inkSoft }}>
            Iniciar sesión
          </Link>
          <Link href={demoHref}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-[12px]"
            style={{ background: tokens.color.bgDeep, color: tokens.color.inkSoft }}>
            <Play size={11} /> Demo gratis
          </Link>
          <Link href={buyHref}
            className="inline-flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-full text-[12px] sm:text-[12.5px] font-medium transition-transform hover:scale-[1.02] whitespace-nowrap"
            style={{ background: tokens.color.ink, color: '#fff', boxShadow: tokens.shadow.md }}>
            Founder Beta · 49 € <ChevronRight size={13} />
          </Link>
        </div>
      </div>
    </header>
  );
};

/* ============================================================
   HERO
   ============================================================ */
const Hero: React.FC<CTAProps> = ({ demoHref, buyHref }) => {
  const { scrollY } = useScroll();
  const heroY = useTransform(scrollY, [0, 400], [0, -50]);

  return (
    <section className="relative overflow-hidden pt-8 pb-16 sm:pt-12 sm:pb-20 lg:pt-20 lg:pb-32" style={{ background: tokens.color.bg }}>
      {/* Decorative grid background */}
      <svg className="absolute inset-0 w-full h-full opacity-[0.4]" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="hero-bg-grid" width="48" height="48" patternUnits="userSpaceOnUse">
            <path d="M 48 0 L 0 0 0 48" fill="none" stroke="#D5DBE5" strokeWidth="0.5"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#hero-bg-grid)"/>
      </svg>
      <div className="absolute top-[-200px] right-[-100px] w-[500px] h-[500px] rounded-full opacity-30 blur-3xl" style={{ background: 'radial-gradient(circle, #C8862E 0%, transparent 70%)' }} />

      <motion.div style={{ y: heroY }} className="relative max-w-[1280px] mx-auto px-4 sm:px-5 lg:px-8">
        <div className="grid lg:grid-cols-[1.1fr_1fr] gap-8 lg:gap-16 items-center">
          {/* LEFT: copy */}
          <div>
            <motion.div
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-4 sm:mb-6"
              style={{ background: tokens.color.accentSoft, border: `1px solid ${tokens.color.accent}` }}>
              <Sparkles size={11} style={{ color: tokens.color.accentDeep }} />
              <span className="text-[10.5px] tracking-[0.18em] uppercase font-semibold" style={{ color: tokens.color.accentDeep }}>
                Acceso Fundador Beta · 49 €
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }}
              style={{ fontFamily: 'Instrument Serif, serif', fontSize: 'clamp(40px, 5.5vw, 72px)', color: tokens.color.ink, letterSpacing: '-0.02em', lineHeight: 1.02 }}>
              Aprende a <span style={{ fontStyle: 'italic', color: tokens.color.accent }}>matricular</span> coches importados <span style={{ fontStyle: 'italic' }}>practicando</span> antes de tocar Hacienda, ITV o DGT.
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }}
              className="mt-5 sm:mt-6 text-[14.5px] sm:text-[15.5px] lg:text-[17px] leading-relaxed max-w-[560px]"
              style={{ color: tokens.color.inkSoft }}>
              MatriculaPRO es una <strong style={{ color: tokens.color.ink }}>plataforma interactiva con simuladores, checklists y recorridos guiados</strong> para entender el proceso de matriculación en España paso a paso. No es un PDF ni un curso barato — es una herramienta práctica que crece contigo.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.3 }}
              className="mt-7 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-wrap max-w-[560px]">
              <Link href={buyHref}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-full text-[14px] font-medium transition-transform hover:scale-[1.02]"
                style={{ background: tokens.color.ink, color: '#fff', boxShadow: tokens.shadow.md }}>
                <Sparkles size={14} /> Acceder a Founder Beta · 49 €
              </Link>
              <Link href="/auth/login"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-full text-[14px] font-medium"
                style={{ background: 'transparent', color: tokens.color.ink, border: `1px solid ${tokens.color.line}` }}>
                Ya tengo cuenta / Iniciar sesion
              </Link>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.36 }}
              className="mt-3 sm:mt-4 inline-flex lg:hidden max-w-[520px] items-start gap-2 rounded-2xl px-3.5 py-2.5 text-[12px] leading-relaxed"
              style={{
                background: 'rgba(255,255,255,0.72)',
                border: `1px solid ${tokens.color.line}`,
                color: tokens.color.inkSoft,
                boxShadow: tokens.shadow.sm,
              }}>
              <MonitorSmartphone size={15} className="shrink-0 mt-0.5" style={{ color: tokens.color.accentDeep }} />
              <span>Mejor experiencia en ordenador o tablet.</span>


            </motion.div>

            {/* Mini trust strip */}
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6, delay: 0.5 }}
              className="mt-6 sm:mt-8 flex flex-wrap items-center gap-3 sm:gap-5 text-[11px] sm:text-[11.5px]" style={{ color: tokens.color.muted }}>
              <div className="flex items-center gap-1.5"><Shield size={12} style={{ color: tokens.color.ok }} /> Pago único</div>
              <div className="flex items-center gap-1.5"><Clock size={12} style={{ color: tokens.color.ok }} /> Acceso inmediato</div>
              <div className="flex items-center gap-1.5"><Sparkles size={12} style={{ color: tokens.color.accent }} /> Actualizaciones gratuitas</div>
            </motion.div>
          </div>

          {/* RIGHT: mockup */}
          <motion.div
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8, delay: 0.2 }}
            className="relative max-w-[540px] w-full mx-auto lg:max-w-none">
            <HeroMockup />
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
};

/* Mockup del producto en el hero: representación visual del dashboard */
const HeroMockup = () => (
  <div className="relative">
    {/* Sombra de fondo */}
    <div className="absolute -inset-8 rounded-[40px] blur-3xl opacity-30"
         style={{ background: 'radial-gradient(circle, #C8862E 0%, transparent 60%)' }} />

    {/* "Frame" estilo navegador */}
    <div className="relative rounded-[20px] overflow-hidden" style={{ background: tokens.color.surface, boxShadow: tokens.shadow.xl, border: `1px solid ${tokens.color.line}` }}>
      {/* Top bar */}
      <div className="px-4 py-3 flex items-center gap-2 border-b" style={{ borderColor: tokens.color.line, background: tokens.color.surfaceAlt }}>
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-[#FF5F57]" />
          <div className="w-2.5 h-2.5 rounded-full bg-[#FFBD2E]" />
          <div className="w-2.5 h-2.5 rounded-full bg-[#28CA42]" />
        </div>
        <div className="flex-1 text-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-md text-[10px]" style={{ background: tokens.color.bgDeep, color: tokens.color.muted }}>
            🔒 matriculapro.ivanimports.es / dashboard
          </div>
        </div>
      </div>

      {/* Cuerpo: dashboard simulado */}
      <div className="flex">
        {/* Sidebar mini */}
        <div className="w-[140px] py-4 px-3 space-y-1" style={{ background: '#0B1F3A' }}>
          <div className="text-[8px] tracking-[0.22em] uppercase mb-2" style={{ color: '#5C6B82' }}>Curso</div>
          {[
            { label: 'Centro', active: true },
            { label: 'Ruta', active: false },
            { label: 'Simulador', active: false },
            { label: 'Ficha 3D', active: false },
            { label: 'ITV', active: false },
          ].map((it, i) => (
            <div key={i} className="flex items-center gap-2 px-2 py-1.5 rounded-md text-[10px]"
                 style={{ background: it.active ? 'rgba(200,134,46,0.15)' : 'transparent', color: it.active ? '#fff' : '#B4BECE' }}>
              <div className="w-1 h-1 rounded-full" style={{ background: it.active ? tokens.color.accent : '#5C6B82' }} />
              {it.label}
            </div>
          ))}
        </div>

        {/* Main mock */}
        <div className="flex-1 p-4">
          {/* Hero mini */}
          <div className="rounded-xl p-4 mb-3" style={{ background: 'linear-gradient(135deg, #0B1F3A 0%, #16335E 100%)', color: '#fff' }}>
            <div className="text-[8px] tracking-[0.22em] uppercase mb-1" style={{ color: tokens.color.accent }}>Curso activo</div>
            <div className="flex items-end justify-between">
              <div>
                <div style={{ fontFamily: 'Instrument Serif, serif', fontSize: 22, lineHeight: 1, fontStyle: 'italic' }}>
                  Matricula<span style={{ color: tokens.color.accent }}>PRO</span>
                </div>
              </div>
              {/* Progress ring mini */}
              <div className="relative">
                <svg width="48" height="48" className="-rotate-90">
                  <circle cx="24" cy="24" r="18" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="3" />
                  <circle cx="24" cy="24" r="18" fill="none" stroke={tokens.color.accent} strokeWidth="3" strokeLinecap="round"
                          strokeDasharray="113" strokeDashoffset="68" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center text-[9px]" style={{ color: '#fff', fontWeight: 600 }}>40%</div>
              </div>
            </div>
          </div>

          {/* Module cards */}
          <div className="grid grid-cols-2 gap-2">
            {[
              { code: 'M.02', title: 'Simulador 576', icon: Calculator, state: 'in-progress' },
              { code: 'M.03', title: 'Ficha técnica 3D', icon: ScrollText, state: 'completed' },
              { code: 'M.06', title: 'Recorrido ITV', icon: Car, state: 'pending' },
              { code: 'M.07', title: 'Pre-DGT', icon: Stamp, state: 'recommended' },
            ].map((m, i) => {
              const Icon = m.icon;
              return (
                <div key={i} className="rounded-lg p-2.5" style={{ background: tokens.color.surface, border: `1px solid ${tokens.color.line}` }}>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <div className="w-6 h-6 rounded flex items-center justify-center" style={{ background: tokens.color.bgDeep, color: tokens.color.ink }}>
                      <Icon size={11} />
                    </div>
                    <span className="text-[8px] font-mono" style={{ color: tokens.color.muted }}>{m.code}</span>
                  </div>
                  <div className="text-[10px] font-medium" style={{ color: tokens.color.ink }}>{m.title}</div>
                  <div className="mt-1.5 h-[2px] rounded-full" style={{ background: tokens.color.lineSoft }}>
                    <div className="h-full rounded-full"
                         style={{
                           width: m.state === 'completed' ? '100%' : m.state === 'in-progress' ? '40%' : '0%',
                           background: m.state === 'completed' ? tokens.color.ok : m.state === 'recommended' ? tokens.color.accent : tokens.color.ink
                         }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>

    {/* Pequeña insignia "interactivo" flotante */}
    <motion.div
      animate={{ y: [0, -6, 0] }} transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      className="absolute -bottom-6 -left-6 rounded-2xl p-3 hidden lg:block"
      style={{ background: '#fff', boxShadow: tokens.shadow.lg, border: `1px solid ${tokens.color.line}` }}>
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: tokens.color.accent, color: tokens.color.ink }}>
          <MousePointer2 size={16} />
        </div>
        <div>
          <div className="text-[9.5px] tracking-[0.18em] uppercase" style={{ color: tokens.color.muted }}>No es un PDF</div>
          <div className="text-[12px] font-medium" style={{ color: tokens.color.ink }}>Pulsa, practica, aprende</div>
        </div>
      </div>
    </motion.div>
  </div>
);

/* ============================================================
   SECCIÓN: NO ES UN PDF (qué te llevas)
   ============================================================ */
const NotAPdfSection = () => (
  <section id="que-es" className="py-20 lg:py-28" style={{ background: tokens.color.surface }}>
    <div className="max-w-[1100px] mx-auto px-5 lg:px-8">
      <div className="text-center mb-14">
        <div className="text-[10.5px] tracking-[0.22em] uppercase mb-3" style={{ color: tokens.color.accentDeep }}>El problema</div>
        <h2 className="max-w-[760px] mx-auto" style={{ fontFamily: 'Instrument Serif, serif', fontSize: 'clamp(28px, 3.6vw, 48px)', color: tokens.color.ink, letterSpacing: '-0.01em', lineHeight: 1.1 }}>
          Los cursos de matriculación tradicionales no te <span style={{ fontStyle: 'italic', color: tokens.color.accent }}>preparan</span> — te aturden.
        </h2>
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        {/* CURSO TRADICIONAL */}
        <div className="rounded-3xl p-6 lg:p-8" style={{ background: tokens.color.bgDeep, border: `1px solid ${tokens.color.line}` }}>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full mb-5"
               style={{ background: tokens.color.surface, color: tokens.color.danger, border: `1px solid ${tokens.color.line}` }}>
            <X size={12} />
            <span className="text-[10.5px] tracking-[0.18em] uppercase font-semibold">Curso tradicional</span>
          </div>
          <ul className="space-y-3">
            {[
              'PDFs de 80 páginas que abandonas a la cuarta',
              'Vídeos largos de teoría sin práctica',
              'Te aprendes el proceso pero no sabes aplicarlo',
              'Llegas a ITV o DGT sin haber visto un documento real',
              'Sin saber qué preguntar antes de comprar el coche',
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-2.5 text-[13.5px]" style={{ color: tokens.color.inkSoft }}>
                <X size={13} className="shrink-0 mt-1" style={{ color: tokens.color.danger }} />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* MATRICULAPRO */}
        <div className="rounded-3xl p-6 lg:p-8 relative overflow-hidden"
             style={{ background: 'linear-gradient(135deg, #0B1F3A 0%, #16335E 100%)', color: '#fff', boxShadow: tokens.shadow.lg }}>
          <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full opacity-30 blur-3xl" style={{ background: 'radial-gradient(circle, #C8862E 0%, transparent 70%)' }} />
          <div className="relative">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full mb-5"
                 style={{ background: tokens.color.accent, color: tokens.color.ink }}>
              <Check size={12} />
              <span className="text-[10.5px] tracking-[0.18em] uppercase font-semibold">MatriculaPRO</span>
            </div>
            <ul className="space-y-3">
              {[
                'Simulador real del Modelo 576 con corrección campo a campo',
                'Ficha técnica 3D interactiva: aprende a leer los códigos',
                'Recorrido ITV visual con coche, luces, rodillos y medidor',
                'Checklists antes de ITV y DGT que vas tachando',
                'Casos prácticos por dificultad: Alemania, Francia, Holanda…',
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2.5 text-[13.5px]" style={{ color: '#E4E9F2' }}>
                  <Check size={13} className="shrink-0 mt-1" style={{ color: tokens.color.accent }} />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  </section>
);

/* ============================================================
   SECCIÓN: PIEZAS DEL CURSO (las 7 piezas estrella)
   ============================================================ */

interface Feature {
  id: string;
  code: string;
  title: string;
  desc: string;
  icon: LucideIcon;
  bullets: string[];
  mockType: 'simulador' | 'ficha' | 'itv' | 'checklist' | 'ruta' | 'biblioteca';
  hot?: boolean;
}

const FEATURES: Feature[] = [
  {
    id: 'simulador',
    code: 'M.02',
    title: 'Simulador Modelo 576',
    desc: 'Practica el formulario que vas a presentar en Hacienda. Corrección campo a campo, fichas aleatorias, casos por dificultad.',
    icon: Calculator,
    bullets: ['10 campos oficiales', 'Casos fáciles, medios y alerta', 'Corrección con explicación'],
    mockType: 'simulador',
  },
  {
    id: 'ficha',
    code: 'M.03',
    title: 'Ficha técnica 3D interactiva',
    desc: 'Documento vivo con tilt, glow, flip y campos clicables. Localiza E, B, V.7, P.1, K… sin tener que memorizar.',
    icon: ScrollText,
    bullets: ['Tilt 3D con el ratón', '10 campos europeos', 'Modo misión guiada'],
    mockType: 'ficha',
  },
  {
    id: 'itv',
    code: 'M.06',
    title: 'Recorrido ITV interactivo',
    desc: 'Maqueta de estación ITV con luces, rodillos y medidor de frenos. Te decimos qué te piden, qué haces y qué revisar.',
    icon: Car,
    bullets: ['11 pasos guiados', 'Luces, rodillos, escape', 'Bocadillo del inspector'],
    mockType: 'itv',
    hot: true,
  },
  {
    id: 'pre-itv',
    code: 'M.05',
    title: 'Checklist pre-ITV',
    desc: 'Revisa el coche zona por zona antes de ir. Lista interactiva + coche clicable. Llegar sin sorpresas.',
    icon: Wrench,
    bullets: ['Coche clicable por zonas', 'Documentación + vehículo', 'Cita previa de matriculación'],
    mockType: 'checklist',
  },
  {
    id: 'pre-dgt',
    code: 'M.07',
    title: 'Checklist pre-DGT',
    desc: 'La lista que tienes que cumplir antes de pisar Tráfico. Si falta un papel, no entres todavía.',
    icon: Stamp,
    bullets: ['ITV + Hacienda + Ayto.', 'Tasas pagadas', 'Documentos escaneados'],
    mockType: 'checklist',
  },
  {
    id: 'ruta',
    code: 'M.01',
    title: 'Ruta de matriculación',
    desc: '9 pasos guiados desde antes de comprar hasta tener placas. Adaptable según hayas comprado o no el coche.',
    icon: Route,
    bullets: ['9 pasos en stepper', 'Errores comunes por paso', 'Marcar como completado'],
    mockType: 'ruta',
  },
  {
    id: 'biblioteca',
    code: 'M.09',
    title: 'Biblioteca de documentos',
    desc: 'COC, ficha reducida, 576, IVTM, tasa DGT, permiso… qué es cada uno, dónde se consigue y cuándo se usa.',
    icon: FileText,
    bullets: ['11 documentos clave', 'Ejemplos visuales', 'Fase del proceso'],
    mockType: 'biblioteca',
  },
];

const PiezasSection = () => {
  return (
    <section id="piezas" className="py-20 lg:py-28" style={{ background: tokens.color.bg }}>
      <div className="max-w-[1280px] mx-auto px-5 lg:px-8">
        <div className="max-w-[720px] mb-14">
          <div className="text-[10.5px] tracking-[0.22em] uppercase mb-3" style={{ color: tokens.color.accentDeep }}>Qué hay dentro</div>
          <h2 style={{ fontFamily: 'Instrument Serif, serif', fontSize: 'clamp(28px, 3.6vw, 48px)', color: tokens.color.ink, letterSpacing: '-0.01em', lineHeight: 1.1 }}>
            7 piezas <span style={{ fontStyle: 'italic', color: tokens.color.accent }}>interactivas</span>, no 7 capítulos para leer.
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed" style={{ color: tokens.color.inkSoft }}>
            Cada pieza está pensada para hacer, no para mirar. Pulsas, practicas y avanzas.
          </p>
        </div>

        <div className="space-y-4">
          {FEATURES.map((f, i) => (
            <FeatureRow key={f.id} feature={f} reversed={i % 2 === 1} />
          ))}
        </div>
      </div>
    </section>
  );
};

const FeatureRow: React.FC<{ feature: Feature; reversed: boolean }> = ({ feature, reversed }) => {
  const Icon = feature.icon;
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.6 }}
      className="rounded-[24px] overflow-hidden grid lg:grid-cols-2 gap-0 items-stretch"
      style={{ background: tokens.color.surface, border: `1px solid ${tokens.color.line}`, boxShadow: tokens.shadow.sm }}>
      {/* Texto */}
      <div className={`p-7 lg:p-10 ${reversed ? 'lg:order-2' : ''}`}>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: tokens.color.bgDeep, color: tokens.color.ink }}>
            <Icon size={18} />
          </div>
          <span className="text-[10.5px] font-mono tracking-wider" style={{ color: tokens.color.muted }}>{feature.code}</span>
          {feature.hot && (
            <span className="inline-flex items-center gap-1 text-[9.5px] tracking-[0.16em] uppercase px-1.5 py-0.5 rounded"
                  style={{ background: tokens.color.accentSoft, color: tokens.color.accentDeep }}>
              <Sparkles size={9} /> Hot
            </span>
          )}
        </div>
        <h3 style={{ fontFamily: 'Instrument Serif, serif', fontSize: 'clamp(24px, 3vw, 32px)', color: tokens.color.ink, letterSpacing: '-0.01em', lineHeight: 1.15 }}>
          {feature.title}
        </h3>
        <p className="mt-3 text-[14px] leading-relaxed max-w-[480px]" style={{ color: tokens.color.inkSoft }}>
          {feature.desc}
        </p>
        <ul className="mt-5 space-y-2">
          {feature.bullets.map((b, i) => (
            <li key={i} className="flex items-center gap-2 text-[12.5px]" style={{ color: tokens.color.ink }}>
              <Check size={12} style={{ color: tokens.color.ok }} /> {b}
            </li>
          ))}
        </ul>
      </div>

      {/* Mockup visual de la pieza */}
      <div className={`p-6 lg:p-8 flex items-center justify-center ${reversed ? 'lg:order-1' : ''}`}
           style={{ background: 'linear-gradient(135deg, #ECF0F6 0%, #DDE3ED 100%)' }}>
        <FeatureMockup type={feature.mockType} />
      </div>
    </motion.div>
  );
};

/* Mockups visuales por feature — pequeñas representaciones de cada pieza */
const FeatureMockup: React.FC<{ type: Feature['mockType'] }> = ({ type }) => {
  if (type === 'simulador') {
    return (
      <div className="w-full max-w-[320px] rounded-2xl p-4" style={{ background: tokens.color.surface, boxShadow: tokens.shadow.md, border: `1px solid ${tokens.color.line}` }}>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[9px] font-mono" style={{ color: tokens.color.muted }}>M.02 · DEMO</span>
        </div>
        <div className="text-[14px] font-medium mb-3" style={{ color: tokens.color.ink, fontFamily: 'Instrument Serif, serif' }}>Modelo 576</div>
        {[
          { label: 'Bastidor (E)', value: 'WAUZZZ0000A000001', state: 'correct' },
          { label: '1ª matric. (B)', value: '15/04/2019', state: 'correct' },
          { label: 'CO₂ (V.7)', value: '132', state: 'incorrect' },
        ].map((f, i) => (
          <div key={i} className="mb-2">
            <div className="text-[9px] mb-0.5" style={{ color: tokens.color.inkSoft }}>{f.label}</div>
            <div className="px-2 py-1.5 rounded text-[11px] font-mono flex items-center justify-between"
                 style={{
                   background: f.state === 'correct' ? 'rgba(31,122,77,0.05)' : 'rgba(168,52,28,0.04)',
                   border: `1px solid ${f.state === 'correct' ? tokens.color.ok : tokens.color.danger}`,
                   color: tokens.color.ink,
                 }}>
              {f.value}
              {f.state === 'correct' ? <Check size={11} style={{ color: tokens.color.ok }} /> : <X size={11} style={{ color: tokens.color.danger }} />}
            </div>
          </div>
        ))}
        <button className="w-full mt-2 px-3 py-2 rounded-md text-[11px] font-medium" style={{ background: tokens.color.ink, color: '#fff' }}>
          Comprobar práctica
        </button>
      </div>
    );
  }

  if (type === 'ficha') {
    return (
      <motion.div
        animate={{ rotate: [-2, 2, -2] }} transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        className="w-full max-w-[320px] aspect-[1.55/1] rounded-2xl p-4 relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #FBFAF6 0%, #F4F1E8 100%)',
          boxShadow: '0 30px 60px -20px rgba(11,31,58,0.35)',
          border: `1px solid ${tokens.color.line}`,
        }}>
        <div className="text-[7px] tracking-[0.3em] uppercase mb-1" style={{ color: tokens.color.muted }}>Ficha técnica · Demo</div>
        <div style={{ fontFamily: 'Instrument Serif, serif', fontSize: 18, color: tokens.color.ink, lineHeight: 1 }}>Marca Demo</div>
        <div className="text-[10px] mt-0.5" style={{ color: tokens.color.inkSoft }}>Modelo D · 2.0 TDI</div>
        {/* Sello */}
        <div className="absolute top-3 right-3 w-[44px] h-[44px] rounded-full flex items-center justify-center"
             style={{ border: `1.5px dashed ${tokens.color.accent}`, transform: 'rotate(-8deg)' }}>
          <div className="text-center">
            <div className="text-[6px] tracking-[0.2em] uppercase" style={{ color: tokens.color.accentDeep }}>Origen</div>
            <div className="text-[8px]" style={{ color: tokens.color.accentDeep, fontFamily: 'Instrument Serif, serif', fontStyle: 'italic', fontWeight: 600 }}>Alemania</div>
          </div>
        </div>
        {/* Grid de datos abajo */}
        <div className="absolute bottom-3 left-4 right-4 grid grid-cols-3 gap-3">
          {[
            { k: 'V.7', v: '132', u: 'g/km' },
            { k: 'P.2', v: '110', u: 'kW' },
            { k: 'B', v: '15/04/19', u: '' },
          ].map(d => (
            <div key={d.k} className="border-t pt-1" style={{ borderColor: 'rgba(11,31,58,0.15)' }}>
              <div className="text-[6px] font-mono" style={{ color: tokens.color.accentDeep }}>{d.k}</div>
              <div className="text-[10px]" style={{ color: tokens.color.ink, fontFamily: 'JetBrains Mono, monospace' }}>{d.v}{d.u && <span className="text-[7px] ml-0.5" style={{ color: tokens.color.muted }}>{d.u}</span>}</div>
            </div>
          ))}
        </div>
        {/* Glow */}
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(circle at 60% 30%, rgba(255,251,240,0.5) 0%, transparent 50%)' }} />
      </motion.div>
    );
  }

  if (type === 'itv') {
    return (
      <div className="w-full max-w-[360px] rounded-2xl overflow-hidden" style={{ background: tokens.color.surface, boxShadow: tokens.shadow.md, border: `1px solid ${tokens.color.line}` }}>
        <div className="p-3 border-b" style={{ borderColor: tokens.color.line, background: tokens.color.surfaceAlt }}>
          <div className="text-[8px] tracking-[0.22em] uppercase" style={{ color: tokens.color.muted }}>Estación ITV · Línea 03</div>
        </div>
        <div className="relative aspect-[1.7/1]" style={{ background: 'linear-gradient(180deg, #E8ECF3 0%, #C5CDDA 100%)' }}>
          <svg viewBox="0 0 200 110" className="w-full h-full">
            {/* suelo */}
            <line x1="0" y1="72" x2="200" y2="72" stroke="#D4A33E" strokeWidth="1" strokeDasharray="6 4" />
            {/* coche */}
            <g transform="translate(50, 30)">
              <ellipse cx="55" cy="50" rx="55" ry="4" fill="rgba(11,31,58,0.2)" />
              <path d="M 8 35 L 8 45 L 90 45 L 100 40 L 100 35 Z" fill="#FAFBFD" stroke="#A8B2C2" strokeWidth="0.8" />
              <path d="M 18 35 L 25 22 Q 32 18 50 18 L 75 18 Q 82 18 88 28 L 95 35 Z" fill="#FFFFFF" stroke="#A8B2C2" strokeWidth="0.8" />
              <path d="M 28 30 Q 33 20 45 18 L 60 18 L 58 32 Z" fill="#1A2A40" />
              {/* faro */}
              <ellipse cx="96" cy="38" rx="4" ry="2.5" fill="#FFFEEB" stroke={tokens.color.accentDeep} strokeWidth="0.8" />
              <ellipse cx="96" cy="38" rx="4" ry="2.5" fill="#FFF2A8" opacity="0.7" />
              {/* matrícula */}
              <rect x="80" y="40" width="13" height="3" fill="#fff" stroke="#A8B2C2" strokeWidth="0.4" />
              {/* ruedas */}
              <circle cx="20" cy="45" r="7" fill="#2C2F36" stroke="#0A0C10" strokeWidth="0.5" />
              <circle cx="20" cy="45" r="3" fill="#6E7889" />
              <circle cx="85" cy="45" r="7" fill="#2C2F36" stroke="#0A0C10" strokeWidth="0.5" />
              <circle cx="85" cy="45" r="3" fill="#6E7889" />
            </g>
            {/* glow luces hacia adelante */}
            <ellipse cx="170" cy="68" rx="30" ry="4" fill="#FFF2A8" opacity="0.5" />
            {/* etiqueta */}
            <g transform="translate(146, 25)">
              <rect x="-26" y="-6" width="52" height="12" rx="6" fill={tokens.color.accent} />
              <text x="0" y="2" textAnchor="middle" fontSize="6" fontFamily="Geist, sans-serif" fontWeight="700" fill={tokens.color.ink}>FAROS</text>
              <line x1="0" y1="6" x2="0" y2="14" stroke={tokens.color.accent} strokeWidth="0.8" strokeDasharray="1 1" />
            </g>
          </svg>
        </div>
        <div className="p-3 flex items-center gap-2 border-t" style={{ borderColor: tokens.color.line }}>
          <div className="w-6 h-6 rounded-full flex items-center justify-center text-[9px]" style={{ background: tokens.color.accent, color: tokens.color.ink, fontFamily: 'Instrument Serif, serif', fontStyle: 'italic' }}>5</div>
          <div className="text-[10px] flex-1" style={{ color: tokens.color.inkSoft, fontStyle: 'italic' }}>"Posición… cruce… largas…"</div>
        </div>
      </div>
    );
  }

  if (type === 'checklist') {
    const items = [
      { label: 'ITV de matriculación favorable', done: true },
      { label: 'Ficha técnica española emitida', done: true },
      { label: 'Modelo 576 presentado', done: true },
      { label: 'IVTM pagado', done: false },
      { label: 'Tasa DGT', done: false },
      { label: 'Seguro contratado', done: false },
    ];
    const pct = Math.round((items.filter(i => i.done).length / items.length) * 100);
    return (
      <div className="w-full max-w-[320px] rounded-2xl p-4" style={{ background: tokens.color.surface, boxShadow: tokens.shadow.md, border: `1px solid ${tokens.color.line}` }}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-[9px] tracking-[0.22em] uppercase" style={{ color: tokens.color.muted }}>M.07 · Pre-DGT</div>
            <div className="text-[12px] font-medium mt-0.5" style={{ color: tokens.color.ink }}>Antes de entrar a Tráfico</div>
          </div>
          <div className="text-[14px]" style={{ fontFamily: 'Instrument Serif, serif', color: tokens.color.accentDeep }}>{pct}%</div>
        </div>
        <div className="h-[3px] rounded-full overflow-hidden mb-3" style={{ background: tokens.color.lineSoft }}>
          <div className="h-full" style={{ width: `${pct}%`, background: tokens.color.accent }} />
        </div>
        <ul className="space-y-1.5">
          {items.map((it, i) => (
            <li key={i} className="flex items-center gap-2 text-[11px]" style={{ color: it.done ? tokens.color.ink : tokens.color.muted }}>
              <div className="w-4 h-4 rounded flex items-center justify-center"
                   style={{ background: it.done ? tokens.color.ok : tokens.color.bgDeep, color: '#fff' }}>
                {it.done && <Check size={10} />}
              </div>
              <span className={it.done ? '' : 'opacity-70'}>{it.label}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (type === 'ruta') {
    const steps = [
      { n: 1, label: 'Antes de comprar', done: true },
      { n: 2, label: 'Documentación', done: true },
      { n: 3, label: 'COC', done: true },
      { n: 4, label: 'ITV', done: false, current: true },
      { n: 5, label: '576', done: false },
      { n: 6, label: 'IVTM', done: false },
      { n: 7, label: 'Tasa DGT', done: false },
      { n: 8, label: 'DGT', done: false },
      { n: 9, label: 'Placas', done: false },
    ];
    return (
      <div className="w-full max-w-[340px] rounded-2xl p-4" style={{ background: tokens.color.surface, boxShadow: tokens.shadow.md, border: `1px solid ${tokens.color.line}` }}>
        <div className="text-[9px] tracking-[0.22em] uppercase mb-2" style={{ color: tokens.color.muted }}>M.01 · Ruta de matriculación</div>
        <div className="text-[12px] font-medium mb-3" style={{ color: tokens.color.ink }}>3 de 9 pasos completados</div>
        <div className="space-y-1.5">
          {steps.map(s => (
            <div key={s.n} className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] shrink-0"
                   style={{
                     background: s.done ? tokens.color.ok : s.current ? tokens.color.accent : tokens.color.bgDeep,
                     color: s.done || s.current ? '#fff' : tokens.color.inkSoft,
                     fontWeight: 600,
                   }}>
                {s.done ? <Check size={10} /> : s.n}
              </div>
              <div className="text-[11px]" style={{ color: s.current ? tokens.color.ink : tokens.color.inkSoft, fontWeight: s.current ? 600 : 400 }}>
                {s.label}
                {s.current && <span className="ml-2 text-[9px] px-1.5 py-0.5 rounded" style={{ background: tokens.color.accentSoft, color: tokens.color.accentDeep }}>En curso</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (type === 'biblioteca') {
    const docs = ['COC', 'Ficha reducida', '576', 'IVTM', 'Tasa DGT', 'Permiso'];
    return (
      <div className="grid grid-cols-3 gap-2 max-w-[340px]">
        {docs.map((d, i) => (
          <div key={i} className="rounded-xl p-3 text-center aspect-[3/4] flex flex-col"
               style={{ background: '#FBFAF6', boxShadow: tokens.shadow.sm, border: `1px solid ${tokens.color.line}` }}>
            <FileText size={18} className="mx-auto mb-1.5 shrink-0" style={{ color: tokens.color.accentDeep }} />
            <div className="space-y-0.5 mb-auto">
              <div className="h-[2px] rounded mx-auto" style={{ background: tokens.color.line, width: '80%' }} />
              <div className="h-[2px] rounded mx-auto" style={{ background: tokens.color.line, width: '60%' }} />
              <div className="h-[2px] rounded mx-auto" style={{ background: tokens.color.line, width: '70%' }} />
              <div className="h-[2px] rounded mx-auto" style={{ background: tokens.color.line, width: '50%' }} />
            </div>
            <div className="text-[9px] font-medium mt-2" style={{ color: tokens.color.ink }}>{d}</div>
          </div>
        ))}
      </div>
    );
  }

  return null;
};

/* ============================================================
   SECCIÓN: DEMO
   ============================================================ */
const DemoSection: React.FC<{ demoHref: string }> = ({ demoHref }) => (
  <section id="demo" className="py-20 lg:py-28" style={{ background: tokens.color.surface }}>
    <div className="max-w-[1100px] mx-auto px-5 lg:px-8">
      <div className="rounded-[28px] overflow-hidden grid lg:grid-cols-2 items-stretch"
           style={{ background: 'linear-gradient(135deg, #0B1F3A 0%, #16335E 60%, #0B1F3A 100%)', color: '#fff', boxShadow: tokens.shadow.xl }}>
        <div className="p-8 lg:p-12 relative">
          <div className="absolute -top-20 -left-20 w-72 h-72 rounded-full opacity-30 blur-3xl" style={{ background: 'radial-gradient(circle, #C8862E 0%, transparent 70%)' }} />
          <div className="relative">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full mb-5"
                 style={{ background: 'rgba(200,134,46,0.18)', color: tokens.color.accent }}>
              <Play size={11} />
              <span className="text-[10.5px] tracking-[0.18em] uppercase font-semibold">Demo gratis · sin registro</span>
            </div>
            <h2 style={{ fontFamily: 'Instrument Serif, serif', fontSize: 'clamp(28px, 3.4vw, 42px)', color: '#fff', letterSpacing: '-0.01em', lineHeight: 1.1 }}>
              Prueba el simulador y el recorrido <span style={{ fontStyle: 'italic', color: tokens.color.accent }}>antes</span> de pagar.
            </h2>
            <p className="mt-4 text-[14.5px] leading-relaxed" style={{ color: '#B4BECE' }}>
              No necesitas crear cuenta ni dar la tarjeta. Tocas, pruebas y decides.
            </p>

            <div className="mt-6 space-y-3">
              {[
                'Simulador del 576 con 3 campos activos (bastidor, fecha, V.7)',
                'Ficha técnica 3D con tilt y campos clicables',
                'Primeros 5 pasos del recorrido ITV',
              ].map((b, i) => (
                <div key={i} className="flex items-start gap-2.5 text-[13.5px]" style={{ color: '#E4E9F2' }}>
                  <Check size={14} className="shrink-0 mt-0.5" style={{ color: tokens.color.accent }} />
                  <span>{b}</span>
                </div>
              ))}
            </div>

            <Link href={demoHref}
              className="mt-8 inline-flex items-center gap-2 px-6 py-3 rounded-full text-[14px] font-medium transition-transform hover:scale-[1.02]"
              style={{ background: tokens.color.accent, color: tokens.color.ink }}>
              <Play size={14} /> Empezar demo
            </Link>
          </div>
        </div>

        {/* Mockup demo */}
        <div className="relative p-6 lg:p-10 flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.04)' }}>
          <div className="relative w-full max-w-[400px]">
            {/* Card simulador */}
            <div className="rounded-2xl p-4" style={{ background: '#fff', boxShadow: tokens.shadow.lg }}>
              <div className="flex items-center gap-2 mb-3">
                <span className="inline-flex items-center gap-1 text-[9px] tracking-[0.18em] uppercase px-1.5 py-0.5 rounded"
                      style={{ background: tokens.color.accentSoft, color: tokens.color.accentDeep, fontWeight: 600 }}>
                  Modo demo
                </span>
              </div>
              <div className="text-[15px] font-medium mb-3" style={{ color: tokens.color.ink, fontFamily: 'Instrument Serif, serif' }}>Modelo 576</div>
              <div className="space-y-2">
                {[
                  { label: 'E · Bastidor', v: 'WAUZZZ0000A...', state: 'correct' },
                  { label: 'V.7 · CO₂', v: '132', state: 'correct' },
                  { label: 'Marca', v: '—', locked: true },
                  { label: 'Modelo', v: '—', locked: true },
                ].map((f, i) => (
                  <div key={i} className="px-2 py-1.5 rounded text-[10.5px] flex items-center justify-between font-mono"
                       style={{
                         background: f.locked ? tokens.color.bgDeep
                                   : f.state === 'correct' ? 'rgba(31,122,77,0.05)' : tokens.color.surface,
                         border: `1px solid ${f.locked ? tokens.color.line : f.state === 'correct' ? tokens.color.ok : tokens.color.line}`,
                         color: f.locked ? tokens.color.mutedSoft : tokens.color.ink,
                       }}>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-[8.5px]" style={{ color: tokens.color.muted }}>{f.label}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span>{f.v}</span>
                      {f.locked && <Lock size={9} style={{ color: tokens.color.mutedSoft }} />}
                      {!f.locked && f.state === 'correct' && <Check size={10} style={{ color: tokens.color.ok }} />}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 text-[10px] text-center" style={{ color: tokens.color.muted }}>
                3 de 10 campos en demo
              </div>
            </div>

            {/* Card flotante */}
            <motion.div
              animate={{ y: [0, -4, 0] }} transition={{ duration: 3, repeat: Infinity }}
              className="absolute -top-4 -right-4 rounded-xl px-3 py-2"
              style={{ background: '#fff', boxShadow: tokens.shadow.md }}>
              <div className="flex items-center gap-2 text-[10.5px]" style={{ color: tokens.color.ink, fontWeight: 600 }}>
                <CheckCircle2 size={13} style={{ color: tokens.color.ok }} /> 2/3 correctos
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  </section>
);

/* ============================================================
   SECCIÓN: PRECIOS
   ============================================================ */

interface PricingPlan {
  id: 'demo' | 'completo' | 'acompanado';
  name: string;
  price: string;
  priceOriginal?: string;
  period: string;
  cta: string;
  ctaSecondary?: boolean;
  desc: string;
  badge?: string;
  featured?: boolean;
  premium?: boolean;
  includes: string[];
  excludes?: string[];
}

const PRICING: PricingPlan[] = [
  {
    id: 'demo', name: 'Demo gratis', price: '0', period: 'Sin coste', cta: 'Empezar demo', ctaSecondary: true,
    desc: 'Tocas, pruebas y decides. Sin tarjeta ni registro.',
    includes: [
      'Simulador 576: 3 campos',
      'Ficha técnica 3D',
      'Recorrido ITV: 5 pasos',
      'Vista parcial de checklists',
    ],
    excludes: [
      'Resto del simulador',
      'Casos prácticos',
      'Acompañamiento',
    ],
  },
  {
    id: 'completo',
    name: 'Curso completo',
    price: '89',
    priceOriginal: '129',
    period: 'Precio preventa · pago único',
    cta: 'Comprar curso completo',
    desc: 'Todas las piezas, sin acompañamiento.',
    badge: 'PREVENTA',
    featured: true,
    includes: [
      'Simulador Modelo 576 completo',
      'Ficha técnica 3D + misiones',
      'Recorrido ITV interactivo (11 pasos)',
      'Checklist antes de comprar',
      'Checklist pre-ITV con coche clicable',
      'Checklist pre-DGT',
      'Ruta de matriculación (9 pasos)',
      'Casos prácticos por dificultad',
      'Biblioteca de documentos',
      'Plantillas para ITV',
      'Cupón 20% para futuros cursos',
      'Actualizaciones gratuitas',
    ],
  },
  {
    id: 'acompanado',
    name: 'MatriculaPRO Acompañado',
    price: '499',
    period: 'Pago único · plazas limitadas',
    cta: 'Solicitar acompañamiento',
    desc: 'Curso completo + acompañamiento directo durante 30 días.',
    badge: 'PREMIUM',
    premium: true,
    includes: [
      'Todo lo del curso completo',
      'Dudas por WhatsApp/email · 30 días',
      'Llamada antes de ITV',
      'Llamada antes de Modelo 576',
      'Llamada antes de DGT',
      'Ayuda para ordenar documentación',
      'Revisión orientativa del expediente',
    ],
  },
];

/* ============================================================
   ACOMPAÑAMIENTO SECTION
   ============================================================ */
const AcompanamientoSection: React.FC<{ premiumHref: string }> = ({ premiumHref }) => (
  <section id="acompanamiento" className="py-20 lg:py-28" style={{ background: tokens.color.surface }}>
    <div className="max-w-[1100px] mx-auto px-5 lg:px-8">
      <div className="rounded-[28px] overflow-hidden grid lg:grid-cols-[1.2fr_1fr] items-stretch"
           style={{ background: 'linear-gradient(135deg, #0B1F3A 0%, #16335E 100%)', color: '#fff', boxShadow: tokens.shadow.xl, border: `1px solid rgba(200,134,46,0.3)` }}>
        <div className="p-8 lg:p-12 relative">
          <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full opacity-30 blur-3xl" style={{ background: 'radial-gradient(circle, #C8862E 0%, transparent 70%)' }} />
          <div className="relative">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-5"
                 style={{ background: tokens.color.accent, color: tokens.color.ink }}>
              <Phone size={12} />
              <span className="text-[10.5px] tracking-[0.18em] uppercase font-bold">Servicio premium · plazas limitadas</span>
            </div>
            <h2 style={{ fontFamily: 'Instrument Serif, serif', fontSize: 'clamp(28px, 3.4vw, 44px)', color: '#fff', letterSpacing: '-0.01em', lineHeight: 1.1 }}>
              Haz tu primera matriculación <span style={{ fontStyle: 'italic', color: tokens.color.accent }}>acompañado</span>.
            </h2>
            <p className="mt-4 text-[14.5px] leading-relaxed max-w-[460px]" style={{ color: '#B4BECE' }}>
              Si prefieres aprender haciendo tu primera matriculación con ayuda directa, contrata MatriculaPRO Acompañado. Curso completo + 30 días de acceso directo.
            </p>

            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { icon: Phone, text: 'Llamada antes de ITV' },
                { icon: Phone, text: 'Llamada antes del 576' },
                { icon: Phone, text: 'Llamada antes de DGT' },
                { icon: Check, text: 'Dudas por WhatsApp 30d' },
                { icon: FileText, text: 'Revisión del expediente' },
                { icon: Users, text: 'Atención personal directa' },
              ].map((b, i) => {
                const Icon = b.icon;
                return (
                  <div key={i} className="flex items-center gap-2.5 text-[12.5px]" style={{ color: '#E4E9F2' }}>
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(200,134,46,0.15)', color: tokens.color.accent }}>
                      <Icon size={12} />
                    </div>
                    {b.text}
                  </div>
                );
              })}
            </div>

            <div className="mt-7 flex items-baseline gap-2 mb-4">
              <span style={{ fontFamily: 'Instrument Serif, serif', fontSize: 48, color: '#fff', lineHeight: 1 }}>499</span>
              <span style={{ color: tokens.color.accent, fontSize: 20 }}>€</span>
              <span className="text-[11px] ml-2" style={{ color: '#7A869A' }}>pago único · plazas limitadas</span>
            </div>

            <Link href={premiumHref}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-full text-[13px] font-medium transition-transform hover:scale-[1.02]"
              style={{ background: tokens.color.accent, color: tokens.color.ink }}>
              Solicitar acompañamiento <ArrowUpRight size={14} />
            </Link>

            <p className="mt-5 text-[10.5px] leading-relaxed max-w-[440px]" style={{ color: '#7A869A' }}>
              No sustituye a gestoría, ITV, DGT, Agencia Tributaria, asesor fiscal ni ingeniero. La validación final corresponde siempre al organismo competente.
            </p>
          </div>
        </div>

        {/* Imagen lateral conceptual */}
        <div className="hidden lg:flex items-center justify-center p-10" style={{ background: 'rgba(255,255,255,0.04)' }}>
          <div className="relative">
            <div className="w-48 h-48 rounded-full flex items-center justify-center" style={{ background: 'rgba(200,134,46,0.15)' }}>
              <div className="w-32 h-32 rounded-full flex items-center justify-center" style={{ background: tokens.color.accent }}>
                <Phone size={48} style={{ color: tokens.color.ink }} />
              </div>
            </div>
            {/* Burbujas flotantes */}
            <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 3, repeat: Infinity }}
              className="absolute -top-4 -right-12 rounded-full px-3 py-1.5 text-[10.5px]"
              style={{ background: '#fff', color: tokens.color.ink, boxShadow: tokens.shadow.md, fontStyle: 'italic' }}>
              "¿Cita ITV correcta?"
            </motion.div>
            <motion.div animate={{ y: [0, 8, 0] }} transition={{ duration: 3.5, repeat: Infinity, delay: 0.5 }}
              className="absolute -bottom-4 -left-12 rounded-full px-3 py-1.5 text-[10.5px]"
              style={{ background: '#fff', color: tokens.color.ink, boxShadow: tokens.shadow.md, fontStyle: 'italic' }}>
              "Revisa el 576"
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  </section>
);

const TESTIMONIALS = [
  {
    name: 'M. R.',
    role: 'Comprador particular',
    comment: 'Me ordenó el proceso. Antes tenía información suelta; aquí vi qué preparar antes de mover el coche.',
    outcome: 'Llegó a ITV con la documentación más clara y sin improvisar.',
  },
  {
    name: 'Javier',
    role: 'Importador ocasional',
    comment: 'No me vendió humo. Me ayudó a detectar en qué parte me podía equivocar y qué debía revisar antes de presentar nada.',
    outcome: 'Menos dudas al preparar el Modelo 576.',
  },
  {
    name: 'A. C.',
    role: 'Autónomo',
    comment: 'La parte práctica me dio tranquilidad. Especialmente las checklists y la secuencia real de pasos.',
    outcome: 'Menos fricción previa a ITV y DGT.',
  },
  {
    name: 'R. Vega',
    role: 'Compraventa',
    comment: 'Lo útil es que funciona como herramienta de trabajo, no solo como curso. Te devuelve contexto rápido cuando retomas un expediente.',
    outcome: 'Más control del flujo completo de matriculación.',
  },
];

const SocialProofSection = () => (
  <section className="py-18 lg:py-24" style={{ background: tokens.color.surface }}>
    <div className="max-w-[1180px] mx-auto px-5 lg:px-8">
      <div className="grid lg:grid-cols-[0.9fr_1.1fr] gap-8 lg:gap-10 items-start">
        <div className="lg:sticky lg:top-24">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full mb-4"
               style={{ background: tokens.color.accentSoft, color: tokens.color.accentDeep }}>
            <Users size={12} />
            <span className="text-[10.5px] tracking-[0.18em] uppercase font-semibold">Feedback temprano</span>
          </div>
          <h2 style={{ fontFamily: 'Instrument Serif, serif', fontSize: 'clamp(30px, 3.8vw, 50px)', color: tokens.color.ink, lineHeight: 1.08 }}>
            La prueba social de MatriculaPRO tiene que sentirse <span style={{ fontStyle: 'italic', color: tokens.color.accent }}>útil</span>, no decorativa.
          </h2>
          <p className="mt-4 max-w-[470px] text-[14.5px] leading-relaxed" style={{ color: tokens.color.inkSoft }}>
            Estas primeras impresiones resumen el tipo de valor que buscamos: menos ansiedad, más claridad y mejor preparación antes de tocar Hacienda, ITV o DGT.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href="#precios"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-full text-[13.5px] font-medium transition-transform hover:scale-[1.02]"
              style={{ background: tokens.color.ink, color: '#fff', boxShadow: tokens.shadow.md }}
            >
              Quiero acceder a MatriculaPRO <ChevronRight size={14} />
            </a>
            <Link
              href="/acceso-founder"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-full text-[13px] font-medium"
              style={{ background: 'transparent', color: tokens.color.ink, border: `1px solid ${tokens.color.line}` }}
            >
              Ver acceso Founder Beta <ArrowUpRight size={13} />
            </Link>
          </div>

          <div className="mt-6 max-w-[360px]">
            <FeedbackCard variant="card" />
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          {TESTIMONIALS.map((item, index) => (
            <div
              key={index}
              className="rounded-[24px] p-5 lg:p-6 border min-h-[240px] flex flex-col"
              style={{ background: '#fff', borderColor: tokens.color.line, boxShadow: tokens.shadow.sm }}
            >
              <div className="flex items-center justify-between gap-3 mb-4">
                <div>
                  <div className="text-[14px] font-medium" style={{ color: tokens.color.ink }}>{item.name}</div>
                  <div className="text-[11px] tracking-[0.14em] uppercase mt-1" style={{ color: tokens.color.muted }}>
                    {item.role}
                  </div>
                </div>
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
                     style={{ background: tokens.color.accentSoft, color: tokens.color.accentDeep }}>
                  <CheckCircle2 size={16} />
                </div>
              </div>

              <p className="text-[13.5px] leading-relaxed flex-1" style={{ color: tokens.color.inkSoft }}>
                “{item.comment}”
              </p>

              <div className="mt-5 pt-4 border-t" style={{ borderColor: tokens.color.line }}>
                <div className="text-[10px] tracking-[0.18em] uppercase mb-1" style={{ color: tokens.color.accentDeep }}>
                  Resultado
                </div>
                <div className="text-[12.5px] leading-relaxed" style={{ color: tokens.color.ink }}>
                  {item.outcome}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </section>
);

/* ============================================================
   FAQ
   ============================================================ */

const FAQS = [
  { q: '¿Sustituye a una gestoría o a la propia ITV?', a: 'No. MatriculaPRO es contenido formativo y orientativo. La validación final corresponde siempre a ITV, DGT, Agencia Tributaria u organismo competente. Lo que sí hace es prepararte para no llegar perdido.' },
  { q: 'Compré ya el coche, ¿me sirve?', a: 'Sí. La ruta de matriculación se adapta automáticamente: si ya compraste, te ayuda a ordenar el expediente, detectar puntos críticos y avanzar con cuidado. Lo ideal es comprarlo antes de comprar, pero también vale después.' },
  { q: '¿Cubre homologaciones y reformas?', a: 'No en profundidad. Si tu vehículo tiene reformas, modificaciones, documentación dudosa o datos que no cuadran, te indicamos cuándo parar y consultar con ITV, ingeniero u homologador. No es nuestro terreno.' },
  { q: '¿El simulador del Modelo 576 calcula el impuesto?', a: 'No. Es un simulador educativo para entender qué campos pide y cómo se rellenan. No calcula importes oficiales ni sustituye la presentación real ante la Agencia Tributaria.' },
  { q: '¿Cómo es el pago y el acceso?', a: 'Pago único, sin suscripciones. Tras el pago recibes acceso inmediato y permanente. Las actualizaciones del curso van incluidas.' },
  { q: '¿Tiene devolución?', a: 'Por la naturaleza del contenido digital de acceso inmediato, una vez accedes al curso completo el reembolso no es automático. Si tienes dudas antes de comprar, prueba la demo gratis: es exactamente para eso.' },
];

const FAQSection = () => {
  const [open, setOpen] = useState(0);
  return (
    <section id="faq" className="py-20 lg:py-28" style={{ background: tokens.color.bg }}>
      <div className="max-w-[820px] mx-auto px-5 lg:px-8">
        <div className="text-center mb-10">
          <div className="text-[10.5px] tracking-[0.22em] uppercase mb-3" style={{ color: tokens.color.accentDeep }}>FAQ</div>
          <h2 style={{ fontFamily: 'Instrument Serif, serif', fontSize: 'clamp(28px, 3.4vw, 44px)', color: tokens.color.ink, letterSpacing: '-0.01em', lineHeight: 1.1 }}>
            Preguntas <span style={{ fontStyle: 'italic', color: tokens.color.accent }}>antes</span> de empezar.
          </h2>
        </div>

        <div className="space-y-2">
          {FAQS.map((f, i) => (
            <div key={i} className="rounded-2xl overflow-hidden"
                 style={{ background: tokens.color.surface, border: `1px solid ${tokens.color.line}` }}>
              <button onClick={() => setOpen(open === i ? -1 : i)}
                className="w-full text-left px-5 py-4 flex items-center gap-3">
                <span className="flex-1 text-[14px] font-medium" style={{ color: tokens.color.ink }}>{f.q}</span>
                <div className="w-7 h-7 rounded-full flex items-center justify-center transition-transform"
                     style={{ background: tokens.color.bgDeep, color: tokens.color.ink, transform: open === i ? 'rotate(45deg)' : 'none' }}>
                  <Plus size={14} />
                </div>
              </button>
              <AnimatePresence>
                {open === i && (
                  <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} transition={{ duration: 0.25 }}
                    className="overflow-hidden">
                    <p className="px-5 pb-5 text-[13px] leading-relaxed" style={{ color: tokens.color.inkSoft }}>
                      {f.a}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

/* ============================================================
   CTA FINAL
   ============================================================ */
const FinalCTA: React.FC<CTAProps> = ({ demoHref, buyHref }) => (
  <section className="py-20 lg:py-24" style={{ background: tokens.color.bg }}>
    <div className="max-w-[1000px] mx-auto px-5 lg:px-8">
      <div className="rounded-[28px] p-10 lg:p-16 text-center relative overflow-hidden"
           style={{ background: 'linear-gradient(135deg, #0B1F3A 0%, #16335E 60%, #0B1F3A 100%)', color: '#fff', boxShadow: tokens.shadow.xl }}>
        <div className="absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full opacity-30 blur-3xl" style={{ background: 'radial-gradient(circle, #C8862E 0%, transparent 70%)' }} />
        <svg className="absolute inset-0 w-full h-full opacity-[0.06]" xmlns="http://www.w3.org/2000/svg">
          <defs><pattern id="cta-grid" width="32" height="32" patternUnits="userSpaceOnUse"><path d="M 32 0 L 0 0 0 32" fill="none" stroke="#fff" strokeWidth="0.5"/></pattern></defs>
          <rect width="100%" height="100%" fill="url(#cta-grid)"/>
        </svg>
        <div className="relative">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full mb-5"
               style={{ background: 'rgba(200,134,46,0.18)', color: tokens.color.accent }}>
            <Zap size={11} />
            <span className="text-[10.5px] tracking-[0.18em] uppercase font-semibold">Acceso Fundador Beta · 49 €</span>
          </div>
          <h2 className="max-w-[620px] mx-auto" style={{ fontFamily: 'Instrument Serif, serif', fontSize: 'clamp(32px, 4vw, 52px)', color: '#fff', letterSpacing: '-0.01em', lineHeight: 1.05 }}>
            No entres a Hacienda, ITV o DGT <span style={{ fontStyle: 'italic', color: tokens.color.accent }}>a ciegas</span>.
          </h2>
          <p className="mt-5 max-w-[520px] mx-auto text-[15px] leading-relaxed" style={{ color: '#B4BECE' }}>
            Practica primero. Llega preparado. Aprende haciendo, no leyendo.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3 flex-wrap">
            <a href="#precios"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full text-[14px] font-medium transition-transform hover:scale-[1.02]"
              style={{ background: tokens.color.accent, color: tokens.color.ink, boxShadow: tokens.shadow.md }}>
              Entrar como fundador · 49 € <ChevronRight size={14} />
            </a>
            <Link href={demoHref}
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full text-[14px]"
              style={{ background: 'transparent', color: '#fff', border: `1px solid rgba(255,255,255,0.3)` }}>
              <Play size={13} /> Probar demo primero
            </Link>
          </div>
          <div className="mt-4 flex justify-center">
            <Link href="/auth/login"
              className="text-[12px] inline-flex items-center gap-1.5 transition-colors"
              style={{ color: 'rgba(255,255,255,0.5)' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.85)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.5)')}>
              Ya tengo acceso Founder · Iniciar sesión
            </Link>
          </div>
        </div>
      </div>
    </div>
  </section>
);

/* ============================================================
   FOOTER
   ============================================================ */
const Footer = () => (
  <footer className="pt-16 pb-8" style={{ background: tokens.color.ink, color: '#B4BECE' }}>
    <div className="max-w-[1280px] mx-auto px-5 lg:px-8">
      <div className="grid lg:grid-cols-[2fr_1fr_1fr_1fr] gap-8 mb-10">
        <div>
          <div className="flex items-baseline gap-2 mb-3">
            <span className="text-[10px] tracking-[0.22em] uppercase" style={{ color: '#7A869A' }}>Ivan Imports ·</span>
            <span style={{ fontFamily: 'Instrument Serif, serif', fontSize: 22, color: '#fff', fontStyle: 'italic' }}>Matricula</span>
            <span className="text-[11px] font-semibold" style={{ color: tokens.color.accent }}>PRO</span>
          </div>
          <p className="text-[12.5px] leading-relaxed max-w-[380px]">
            Guía interactiva para aprender a matricular coches importados en España. Contenido formativo. No sustituye a ITV, DGT, Agencia Tributaria, gestoría ni ingeniero.
          </p>
        </div>
        <div>
          <div className="text-[10.5px] tracking-[0.22em] uppercase mb-3" style={{ color: tokens.color.accent }}>Producto</div>
          <ul className="space-y-2 text-[12.5px]">
            <li><a href="#que-es" className="hover:text-white">Qué es</a></li>
            <li><a href="#piezas" className="hover:text-white">Cómo funciona</a></li>
            <li><Link href="/demo" className="hover:text-white">Demo gratis</Link></li>
            <li><a href="#precios" className="hover:text-white">Precios</a></li>
          </ul>
        </div>
        <div>
          <div className="text-[10.5px] tracking-[0.22em] uppercase mb-3" style={{ color: tokens.color.accent }}>Recursos</div>
          <ul className="space-y-2 text-[12.5px]">
            <li><a href="#faq" className="hover:text-white">FAQ</a></li>
            <li><a href="#acompanamiento" className="hover:text-white">Acompañamiento</a></li>
            <li><a href="https://ivanimports.es" className="hover:text-white">Ivan Imports ↗</a></li>
          </ul>
        </div>
        <div>
          <div className="text-[10.5px] tracking-[0.22em] uppercase mb-3" style={{ color: tokens.color.accent }}>Legal</div>
          <ul className="space-y-2 text-[12.5px]">
            <li><a href="#" className="hover:text-white">Aviso legal</a></li>
            <li><a href="#" className="hover:text-white">Política de privacidad</a></li>
            <li><a href="#" className="hover:text-white">Condiciones de venta</a></li>
          </ul>
        </div>
      </div>
      <div className="pt-6 border-t flex items-center justify-between flex-wrap gap-3 text-[11px]"
           style={{ borderColor: 'rgba(255,255,255,0.06)', color: '#5C6B82' }}>
        <span>© Ivan Imports · {new Date().getFullYear()}</span>
        <span>Made with Instrument Serif, Geist & JetBrains Mono</span>
      </div>
    </div>
  </footer>
);

/* ============================================================
   ROOT
   ============================================================ */
interface LandingProps {
  demoHref?: string;
  buyHref?: string;
  premiumHref?: string;
}

export default function Landing({
  demoHref = '/demo',
  buyHref = '/acceso-founder',         // En producción: Stripe Checkout
  premiumHref = '/app/acompanamiento', // En producción: form de solicitud
}: LandingProps) {
  return (
    <div className="overflow-x-hidden" style={{ background: tokens.color.bg, color: tokens.color.ink, fontFamily: '"Geist", system-ui, -apple-system, sans-serif' }}>
      <NavBar demoHref={demoHref} buyHref={buyHref} />
      <Hero demoHref={demoHref} buyHref={buyHref} />
      <NotAPdfSection />
      <PiezasSection />
      <DemoSection demoHref={demoHref} />

      {/* ESCALERA DE PRECIOS */}
      <PriceLadder />

      <AcompanamientoSection premiumHref={premiumHref} />

      <SocialProofSection />

      <FAQSection />
      <FinalCTA demoHref={demoHref} buyHref={buyHref} />
      <Footer />
    </div>
  );
}

