'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Check, ChevronRight } from 'lucide-react';
import type { LicenseDuration, PaidAccessTier } from '@/domain/access';
import { formatEuroCents, PAYMENT_DISCLOSURES, PLAN_PRICES } from '@/lib/payments/catalog';

const durations: LicenseDuration[] = ['one_month', 'six_months', 'twelve_months'];

const durationContent: Record<
  PaidAccessTier,
  Record<LicenseDuration, { label: string; description: string; badge?: string }>
> = {
  particular: {
    one_month: {
      label: '1 mes',
      description: 'Para una importación puntual cuando ya tienes candidatos claros.',
    },
    six_months: {
      label: '6 meses',
      description: 'Para comparar con tranquilidad y completar todo el proceso.',
      badge: 'Recomendado',
    },
    twelve_months: {
      label: '12 meses',
      description: 'Para analizar oportunidades durante todo el año.',
      badge: 'Mejor precio mensual',
    },
  },
  professional: {
    one_month: {
      label: '1 mes',
      description: 'Para probar el flujo profesional en una operación real.',
    },
    six_months: {
      label: '6 meses',
      description: 'Para profesionales que importan de forma habitual.',
      badge: 'Recomendado',
    },
    twelve_months: {
      label: '12 meses',
      description: 'Para controlar operaciones durante todo el año.',
      badge: 'Mejor precio mensual',
    },
  },
};

export function LandingPricing() {
  const [tier, setTier] = useState<PaidAccessTier>('particular');

  return (
    <div>
      <div className="mx-auto flex w-fit rounded-full border border-line bg-white p-1" aria-label="Selecciona tipo de licencia">
        {(['particular', 'professional'] as PaidAccessTier[]).map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={tier === option}
            onClick={() => setTier(option)}
            className={`rounded-full px-5 py-2.5 text-[13px] font-semibold transition-colors ${tier === option ? 'bg-ink text-white' : 'text-ink-soft hover:text-ink'}`}
          >
            {option === 'particular' ? 'Particular' : 'Profesional'}
          </button>
        ))}
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-3">
        {durations.map((duration) => {
          const content = durationContent[tier][duration];
          const price = PLAN_PRICES[tier][duration];
          const highlighted = duration === 'six_months';

          return (
            <article
              key={duration}
              className={`relative flex min-h-[360px] flex-col rounded-[26px] border bg-white p-6 ${highlighted ? 'border-accent shadow-xl' : 'border-line shadow-sm'}`}
            >
              {content.badge && (
                <span className="absolute right-5 top-5 rounded-full bg-accent-soft px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-accent-deep">
                  {content.badge}
                </span>
              )}
              <p className="text-[13px] font-semibold text-ink">{content.label}</p>
              <p className="mt-5 font-serif text-[46px] leading-none text-ink">
                {formatEuroCents(price.totalCents).replace(',00', '')}
              </p>
              <p className="mt-4 min-h-[50px] text-[13px] leading-6 text-ink-soft">{content.description}</p>
              <ul className="mt-5 space-y-2 border-t border-line pt-5 text-[12px] text-ink-soft">
                {PAYMENT_DISCLOSURES.map((disclosure) => (
                  <li key={disclosure} className="flex items-center gap-2">
                    <Check size={13} className="text-ok" aria-hidden="true" /> {disclosure}
                  </li>
                ))}
                <li className="flex items-center gap-2">
                  <Check size={13} className="text-ok" aria-hidden="true" /> Expedientes sin contador comercial
                </li>
              </ul>
              <Link
                href="/registro?next=/app/planes"
                className={`mt-auto inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-[13px] font-semibold ${highlighted ? 'bg-ink text-white' : 'border border-line text-ink'}`}
              >
                Crear cuenta y elegir plan <ChevronRight size={14} aria-hidden="true" />
              </Link>
            </article>
          );
        })}
      </div>

      <p className="mx-auto mt-6 max-w-3xl text-center text-[12px] leading-6 text-muted">
        En licencias de un mes puedes ampliar durante los primeros 15 días a seis o doce meses del mismo nivel y descontar el 100 % de lo ya pagado. El checkout vuelve a validar plan, precio, impuestos y elegibilidad en el servidor.
      </p>
    </div>
  );
}
