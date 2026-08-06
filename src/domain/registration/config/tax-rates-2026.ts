import type { AutonomousCommunity } from '../types';

export type TaxEpigraph = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
type Rates = Partial<Record<TaxEpigraph, number>>;

export interface RegistrationTaxRates2026 {
  version: '2026.1';
  validFrom: string;
  reviewedAt: string;
  sourceId: string;
  scope: string;
  mustReviewAnnually: true;
  general: {
    peninsulaAndBalearics: Rates;
    canaryIslands: Rates;
    ceutaAndMelilla: Rates;
  };
  autonomousOverrides: Partial<Record<AutonomousCommunity, Rates>>;
}

export const TAX_RATES_2026: RegistrationTaxRates2026 = {
  version: '2026.1',
  validFrom: '2026-01-01',
  reviewedAt: '2026-08-05',
  sourceId: 'aeat-registration-tax-rates-2026',
  scope: 'IEDMT. Los epígrafes sólo se seleccionan tras confirmar categoría, emisiones y sujeción.',
  mustReviewAnnually: true,
  general: {
    peninsulaAndBalearics: { 1: 0, 2: 0.0475, 3: 0.0975, 4: 0.1475, 5: 0.12, 6: 0, 7: 0.0475, 8: 0.0975, 9: 0.1475 },
    canaryIslands: { 1: 0, 2: 0.0375, 3: 0.0875, 4: 0.1375, 5: 0.11, 6: 0, 7: 0.0375, 8: 0.0875, 9: 0.1375 },
    ceutaAndMelilla: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 },
  },
  autonomousOverrides: {
    andalucia: { 4: 0.1475, 5: 0.12, 9: 0.1475 },
    asturias: { 4: 0.16, 9: 0.16 },
    baleares: { 4: 0.16 },
    cantabria: { 3: 0.0975, 4: 0.15, 5: 0.12, 9: 0.15 },
    cataluna: { 4: 0.16, 9: 0.16 },
    murcia: { 4: 0.159, 9: 0.159 },
    'comunidad-valenciana': { 4: 0.16, 9: 0.16 },
  },
};

export function getTaxRate2026(community: AutonomousCommunity, epigraph: TaxEpigraph): number | null {
  if (community === 'navarra' || community === 'pais-vasco') return null;
  const override = TAX_RATES_2026.autonomousOverrides[community]?.[epigraph];
  if (override !== undefined) return override;
  if (community === 'canarias') return TAX_RATES_2026.general.canaryIslands[epigraph] ?? null;
  if (community === 'ceuta' || community === 'melilla') {
    return TAX_RATES_2026.general.ceutaAndMelilla[epigraph] ?? null;
  }
  return TAX_RATES_2026.general.peninsulaAndBalearics[epigraph] ?? null;
}
