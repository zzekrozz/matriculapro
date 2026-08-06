import type { TaxEpigraph } from '../config/tax-rates-2026';
import type { AutonomousCommunity } from '../types';
import type { FiscalTerritory } from './types';

export interface HistoricalTaxRule {
  validFrom: string;
  validTo: string;
  territory: FiscalTerritory;
  tax: 'vat' | 'iedmt';
  rate: string;
  sourceId: string;
  sourceArticle: string;
  reviewedAt: string;
}

export type VersionedHistoricalIedmtCommunity = Extract<
  AutonomousCommunity,
  | 'andalucia'
  | 'asturias'
  | 'baleares'
  | 'cantabria'
  | 'cataluna'
  | 'murcia'
  | 'comunidad-valenciana'
>;

/**
 * Fila normativa de un tipo autonómico histórico. Cada objeto materializado
 * conserva territorio, vigencia, epígrafe, tipo, ley, artículo, revisión y URL
 * oficial; no se deduce un tipo autonómico a partir de la tabla de 2026.
 */
export interface HistoricalIedmtAutonomousRateRule {
  territory: VersionedHistoricalIedmtCommunity;
  validFrom: string;
  validTo: string;
  epigraph: TaxEpigraph;
  rate: string;
  law: string;
  article: string;
  sourceIds: readonly string[];
  officialSourceUrl: string;
  reviewedAt: string;
}

export interface HistoricalSpecialTerritoryCoverage {
  territory: Exclude<FiscalTerritory, 'peninsula-balearics-common'>;
  automaticStatus: 'blocked-incomplete-series';
  blockerId: string;
  reason: string;
  sourceIds: readonly string[];
  reviewedAt: string;
}

/**
 * Tipos generales de IVA del territorio de aplicación del impuesto.
 * No se extrapolan a Canarias (IGIC), Ceuta/Melilla (IPSI) ni territorios
 * forales. Las fechas proceden de disposiciones oficiales primarias.
 */
export const HISTORICAL_VAT_RULES: readonly HistoricalTaxRule[] = [
  {
    validFrom: '1993-01-01',
    validTo: '1994-12-31',
    territory: 'peninsula-balearics-common',
    tax: 'vat',
    rate: '0.15',
    sourceId: 'boe-law-37-1992-original-art-90',
    sourceArticle: 'Ley 37/1992, artículo 90, texto vigente desde 1993-01-01',
    reviewedAt: '2026-08-05',
  },
  {
    validFrom: '1995-01-01',
    validTo: '2010-06-30',
    territory: 'peninsula-balearics-common',
    tax: 'vat',
    rate: '0.16',
    sourceId: 'boe-law-41-1994-art-78',
    sourceArticle: 'Ley 41/1994, artículo 78, efectos desde 1995-01-01',
    reviewedAt: '2026-08-05',
  },
  {
    validFrom: '2010-07-01',
    validTo: '2012-08-31',
    territory: 'peninsula-balearics-common',
    tax: 'vat',
    rate: '0.18',
    sourceId: 'boe-law-26-2009-art-79',
    sourceArticle: 'Ley 26/2009, artículo 79, efectos desde 2010-07-01',
    reviewedAt: '2026-08-05',
  },
  {
    validFrom: '2012-09-01',
    validTo: '2026-12-31',
    territory: 'peninsula-balearics-common',
    tax: 'vat',
    rate: '0.21',
    sourceId: 'boe-rdl-20-2012-art-23',
    sourceArticle: 'Real Decreto-ley 20/2012, artículo 23, efectos desde 2012-09-01',
    reviewedAt: '2026-08-05',
  },
] as const;

/**
 * El motor histórico automático de IEDMT se limita a M1 ordinarios desde la
 * estructura por CO₂ de 2008. El tipo común sirve de regla de cierre para los
 * epígrafes que una comunidad no haya modificado en una fecha concreta.
 */
export const HISTORICAL_IEDMT_COMMON_RATES = {
  validFrom: '2008-01-01',
  validTo: '2026-12-31',
  ratesByEpigraph: {
    1: '0',
    2: '0.0475',
    3: '0.0975',
    4: '0.1475',
  },
  sourceId: 'boe-law-34-2007-additional-8',
  sourceArticle: 'Ley 34/2007, disposición adicional octava; Ley 38/1992, artículo 70',
  reviewedAt: '2026-08-05',
} as const;

const REVIEWED_AT = '2026-08-05';

function autonomousPeriod(
  metadata: Omit<HistoricalIedmtAutonomousRateRule, 'epigraph' | 'rate'>,
  rates: readonly (readonly [TaxEpigraph, string])[],
): HistoricalIedmtAutonomousRateRule[] {
  return rates.map(([epigraph, rate]) => ({ ...metadata, epigraph, rate }));
}

/**
 * Cronologías autonómicas comprobadas en fuentes normativas primarias.
 * Se incluyen también los epígrafes 5 y 9 cuando la norma los regula, aunque
 * el cálculo histórico automático siga limitado a turismos M1 ordinarios.
 */
export const HISTORICAL_IEDMT_AUTONOMOUS_RATE_RULES: readonly HistoricalIedmtAutonomousRateRule[] = [
  ...autonomousPeriod({
    territory: 'andalucia',
    validFrom: '2010-07-10',
    validTo: '2011-12-31',
    law: 'Decreto-ley 4/2010 y Ley 11/2010 de Andalucía',
    article: 'Artículo 1.Veintidós; artículo 50 del texto refundido',
    sourceIds: ['boja-dl-4-2010-art-1-22', 'boe-andalucia-law-11-2010-art-1-22'],
    officialSourceUrl: 'https://www.boe.es/buscar/doc.php?id=BOJA-b-2010-90059',
    reviewedAt: REVIEWED_AT,
  }, [[4, '0.16'], [5, '0.132'], [9, '0.16']]),
  ...autonomousPeriod({
    territory: 'andalucia',
    validFrom: '2012-01-01',
    validTo: '2021-12-31',
    law: 'Ley 18/2011, del Presupuesto de Andalucía para 2012',
    article: 'Disposición final octava.Catorce; artículo 50 del texto refundido',
    sourceIds: ['boe-andalucia-law-18-2011-final-8-14'],
    officialSourceUrl: 'https://www.boe.es/buscar/doc.php?id=BOE-A-2012-881',
    reviewedAt: REVIEWED_AT,
  }, [[4, '0.169'], [5, '0.138'], [9, '0.169']]),
  ...autonomousPeriod({
    territory: 'andalucia',
    validFrom: '2022-01-01',
    validTo: '2026-12-31',
    law: 'Ley 5/2021, de Tributos Cedidos de Andalucía',
    article: 'Artículo 57',
    sourceIds: ['boe-andalucia-law-5-2021-art-57'],
    officialSourceUrl: 'https://www.boe.es/buscar/act.php?id=BOE-A-2021-17915',
    reviewedAt: REVIEWED_AT,
  }, [[4, '0.1475'], [5, '0.12'], [9, '0.1475']]),
  ...autonomousPeriod({
    territory: 'asturias',
    validFrom: '2010-07-15',
    validTo: '2026-12-31',
    law: 'Ley 5/2010 del Principado de Asturias; continuidad en Decreto Legislativo 2/2014',
    article: 'Artículo 7; texto refundido de tributos cedidos',
    sourceIds: ['boe-asturias-law-5-2010-art-7', 'boe-asturias-dl-2-2014-iedmt'],
    officialSourceUrl: 'https://www.boe.es/buscar/doc.php?id=BOE-A-2010-14629',
    reviewedAt: REVIEWED_AT,
  }, [[4, '0.16'], [9, '0.16']]),
  ...autonomousPeriod({
    territory: 'baleares',
    validFrom: '2012-05-01',
    validTo: '2026-12-31',
    law: 'Decreto-ley 4/2012 de Illes Balears; continuidad en Decreto Legislativo 1/2014',
    article: 'Artículo 4 y disposición transitoria única; artículo 74 del texto refundido',
    sourceIds: ['boib-dl-4-2012-art-4', 'boe-balearics-dl-1-2014-art-74'],
    officialSourceUrl: 'https://www.boe.es/buscar/doc.php?id=BOIB-i-2012-90027',
    reviewedAt: REVIEWED_AT,
  }, [[4, '0.16']]),
  ...autonomousPeriod({
    territory: 'cantabria',
    validFrom: '2011-01-01',
    validTo: '2017-12-31',
    law: 'Ley 11/2010 de Cantabria',
    article: 'Artículo 11.Diez; tipo autonómico del IEDMT',
    sourceIds: ['boe-cantabria-law-11-2010-art-11'],
    officialSourceUrl: 'https://www.boe.es/buscar/doc.php?id=BOE-A-2011-1651',
    reviewedAt: REVIEWED_AT,
  }, [[3, '0.11'], [4, '0.16'], [5, '0.13'], [9, '0.16']]),
  ...autonomousPeriod({
    territory: 'cantabria',
    validFrom: '2018-01-01',
    validTo: '2026-12-31',
    law: 'Ley 9/2017 de Cantabria',
    article: 'Artículo 3.Nueve; artículo 18 del texto refundido',
    sourceIds: ['boe-cantabria-law-9-2017-art-3-9'],
    officialSourceUrl: 'https://www.boe.es/buscar/doc.php?id=BOE-A-2018-856',
    reviewedAt: REVIEWED_AT,
  }, [[3, '0.0975'], [4, '0.15'], [5, '0.12'], [9, '0.15']]),
  ...autonomousPeriod({
    territory: 'cataluna',
    validFrom: '2010-07-01',
    validTo: '2026-12-31',
    law: 'Decreto-ley 3/2010 de Cataluña; continuidad en Decreto Legislativo 1/2024',
    article: 'Artículo 6 y disposición final; artículo 661-1 del libro sexto',
    sourceIds: ['boe-catalonia-dl-3-2010-art-6', 'boe-catalonia-dl-1-2024-art-661-1'],
    officialSourceUrl: 'https://www.boe.es/buscar/doc.php?id=BOE-A-2010-10217',
    reviewedAt: REVIEWED_AT,
  }, [[4, '0.16'], [9, '0.16']]),
  ...autonomousPeriod({
    territory: 'murcia',
    validFrom: '2014-08-03',
    validTo: '2026-12-31',
    law: 'Decreto-ley 2/2014 y Ley 8/2014 de la Región de Murcia',
    article: 'Artículo 1.Cinco; artículo 14 del texto refundido',
    sourceIds: ['borm-murcia-dl-2-2014-art-1-5', 'boe-murcia-law-8-2014-art-1-5'],
    officialSourceUrl: 'https://www.boe.es/buscar/doc.php?id=BORM-s-2014-90385',
    reviewedAt: REVIEWED_AT,
  }, [[4, '0.159'], [9, '0.159']]),
  ...autonomousPeriod({
    territory: 'comunidad-valenciana',
    validFrom: '2017-01-01',
    validTo: '2026-12-31',
    law: 'Ley 13/2016 de la Comunitat Valenciana',
    article: 'Artículo 18; artículo 17 de la Ley 13/1997',
    sourceIds: ['boe-valencia-law-13-2016-art-18'],
    officialSourceUrl: 'https://www.boe.es/buscar/doc.php?id=BOE-A-2017-1291',
    reviewedAt: REVIEWED_AT,
  }, [[4, '0.16'], [9, '0.16']]),
] as const;

/**
 * Coberturas que no se automatizan: falta una serie histórica conjunta y
 * continua de IEDMT más impuesto indirecto territorial para la minoración.
 */
export const HISTORICAL_SPECIAL_TERRITORY_COVERAGE: Readonly<
  Record<Exclude<FiscalTerritory, 'peninsula-balearics-common'>, HistoricalSpecialTerritoryCoverage>
> = {
  'canary-islands': {
    territory: 'canary-islands',
    automaticStatus: 'blocked-incomplete-series',
    blockerId: 'historical-canary-series-incomplete',
    reason: 'Canarias requiere reconstruir conjuntamente los tipos históricos de IGIC y los tipos territoriales del IEDMT; esa serie completa no está automatizada.',
    sourceIds: ['boe-law-20-1991-igic', 'boe-law-38-1992-art-70-current'],
    reviewedAt: REVIEWED_AT,
  },
  'ceuta-melilla': {
    territory: 'ceuta-melilla',
    automaticStatus: 'blocked-incomplete-series',
    blockerId: 'historical-ceuta-melilla-series-incomplete',
    reason: 'Ceuta y Melilla requieren reconstruir el IPSI histórico y sus reglas territoriales junto con el IEDMT; un tipo IEDMT cero no permite asumir que los demás impuestos residuales sean cero.',
    sourceIds: ['boe-law-8-1991-ipsi', 'boe-law-38-1992-art-70-current'],
    reviewedAt: REVIEWED_AT,
  },
  navarra: {
    territory: 'navarra',
    automaticStatus: 'blocked-incomplete-series',
    blockerId: 'historical-navarra-series-incomplete',
    reason: 'Navarra puede fijar tipos del IEDMT dentro del Convenio Económico y exige una serie foral histórica propia, todavía no automatizada.',
    sourceIds: ['boe-law-28-1990-navarra-art-35'],
    reviewedAt: REVIEWED_AT,
  },
  'basque-country': {
    territory: 'basque-country',
    automaticStatus: 'blocked-incomplete-series',
    blockerId: 'historical-basque-series-incomplete',
    reason: 'Los Territorios Históricos del País Vasco pueden incrementar los tipos del IEDMT y exigen series forales propias por territorio, todavía no automatizadas.',
    sourceIds: ['boe-law-12-2002-basque-art-33'],
    reviewedAt: REVIEWED_AT,
  },
} as const;

export const HISTORICAL_IEDMT_EPIGRAPH_PERIODS = [
  {
    validFrom: '2008-01-01',
    validTo: '2021-07-10',
    maximumEpigraph1: 120,
    minimumEpigraph2Exclusive: 120,
    maximumEpigraph2Exclusive: 160,
    minimumEpigraph3Inclusive: 160,
    maximumEpigraph3Exclusive: 200,
    minimumEpigraph4Inclusive: 200,
    sourceId: 'boe-law-34-2007-additional-8',
  },
  {
    validFrom: '2021-07-11',
    validTo: '2021-12-31',
    maximumEpigraph1: 144,
    minimumEpigraph2Exclusive: 144,
    maximumEpigraph2Exclusive: 192,
    minimumEpigraph3Inclusive: 192,
    maximumEpigraph3Exclusive: 240,
    minimumEpigraph4Inclusive: 240,
    sourceId: 'boe-law-11-2021-additional-5',
  },
  {
    validFrom: '2022-01-01',
    validTo: '2026-12-31',
    maximumEpigraph1: 120,
    minimumEpigraph2Exclusive: 120,
    maximumEpigraph2Exclusive: 160,
    minimumEpigraph3Inclusive: 160,
    maximumEpigraph3Exclusive: 200,
    minimumEpigraph4Inclusive: 200,
    sourceId: 'boe-law-38-1992-art-70-current',
  },
] as const;

export const RESIDUAL_TAX_FORMULA_SOURCE = {
  id: 'boe-law-38-1992-art-69-residual-tax',
  sourceArticle: 'Ley 38/1992, artículo 69.b',
  reviewedAt: '2026-08-05',
} as const;
