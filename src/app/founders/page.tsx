'use client';

import Link from 'next/link';
import { Clock3, Crown } from 'lucide-react';
import { tokens } from '@/lib/tokens';

export default function FoundersPage() {
  return (
    <div style={{ background: tokens.color.bg, color: tokens.color.ink, minHeight: '100vh' }}>
      <section className="pt-14 pb-14 lg:pt-20 lg:pb-20">
        <div className="max-w-[1180px] mx-auto px-5 lg:px-8">
          <div className="mb-8">
            <Link href="/" className="inline-flex items-center gap-2 text-[12.5px] text-muted hover:text-ink transition-colors">
              ← Volver a MatriculaPRO
            </Link>
          </div>

          <div
            className="rounded-[30px] p-8 lg:p-12 relative overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #0B1F3A 0%, #16335E 60%, #0B1F3A 100%)', color: '#fff' }}
          >
            <div
              className="absolute -top-28 -right-24 w-[420px] h-[420px] rounded-full opacity-25 blur-3xl"
              style={{ background: 'radial-gradient(circle, #C8862E 0%, transparent 70%)' }}
            />

            <div className="relative max-w-[780px]">
              <div
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-5"
                style={{ background: 'rgba(200,134,46,0.18)', color: tokens.color.accent }}
              >
                <Crown size={12} />
                <span className="text-[10.5px] tracking-[0.18em] uppercase font-semibold">Garaje Founder</span>
              </div>

              <h1 style={{ fontFamily: 'Instrument Serif, serif', fontSize: 'clamp(34px, 5vw, 64px)', lineHeight: 1.02, fontStyle: 'italic' }}>
                Garaje Founder
              </h1>

              <p className="mt-4 text-[18px] leading-relaxed max-w-[640px]" style={{ color: '#D5DDE8' }}>
                Garaje Founder estará disponible próximamente.
              </p>

              <div
                className="mt-6 inline-flex max-w-[620px] items-start gap-3 rounded-[22px] px-4 py-4 text-[13px] leading-relaxed"
                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}
              >
                <Clock3 size={16} className="shrink-0 mt-0.5" style={{ color: tokens.color.accent }} />
                <div>
                  <p className="font-medium text-white">No se muestra todavía mientras terminamos la experiencia Founder.</p>
                  <p style={{ color: '#D5DDE8' }}>
                    Lo activaremos cuando esté lista para mostrarse correctamente, sin placeholders ni estados intermedios.
                  </p>
                </div>
              </div>

              <div className="mt-7">
                <Link
                  href="/#precios"
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-full text-[13px] font-medium"
                  style={{ background: tokens.color.accent, color: tokens.color.ink }}
                >
                  Ver precios Founder
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
