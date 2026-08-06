import type { TaxEpigraph } from '../config/tax-rates-2026';
import type { AutonomousCommunity } from '../types';
import { formatIsoDate, parseStrictIsoDate } from './date-utils';
import {
  HISTORICAL_IEDMT_AUTONOMOUS_RATE_RULES,
  HISTORICAL_IEDMT_COMMON_RATES,
  HISTORICAL_IEDMT_EPIGRAPH_PERIODS,
  HISTORICAL_SPECIAL_TERRITORY_COVERAGE,
} from './historical-tax-config';
import type {
  FiscalExplanationStep,
  FiscalTerritory,
  FiscalWarning,
  HistoricalTaxRateResult,
  HistoricalVehicleTaxClassification,
} from './types';

export interface HistoricalIedmtRateResult extends HistoricalTaxRateResult {
  epigraph: TaxEpigraph | null;
  warnings: FiscalWarning[];
}

const TERRITORY_FOR_SPECIAL_COMMUNITY: Partial<Record<AutonomousCommunity, FiscalTerritory>> = {
  canarias: 'canary-islands',
  ceuta: 'ceuta-melilla',
  melilla: 'ceuta-melilla',
  navarra: 'navarra',
  'pais-vasco': 'basque-country',
};

const HISTORICAL_TERRITORY_SOURCE = 'boe-order-eha-3334-2010-residual-territory';
const AUTONOMOUS_COMPETENCE_SOURCE = 'boe-law-22-2009-art-51';
const JULY_2021_LAW_SOURCE = 'boe-law-11-2021-additional-5';
const JULY_2021_STATISTICS_SOURCE = 'aeat-iedmt-statistics-2021-boundary';

export function resolveHistoricalIedmtRate(input: {
  firstRegistrationDate: string;
  territory: FiscalTerritory;
  currentAutonomousCommunity: AutonomousCommunity;
  classification: HistoricalVehicleTaxClassification;
}): HistoricalIedmtRateResult {
  if (!parseStrictIsoDate(input.firstRegistrationDate)) {
    return blocked('historical-iedmt-invalid-date', 'La fecha de primera matriculación no es válida.');
  }
  if (input.territory !== 'peninsula-balearics-common') {
    const coverage = HISTORICAL_SPECIAL_TERRITORY_COVERAGE[input.territory];
    return blocked(
      coverage.blockerId,
      `${coverage.reason} Solo puede continuarse con tipos introducidos en modo avanzado, claramente sometidos a revisión externa.`,
      coverage.sourceIds,
    );
  }
  const expectedSpecialTerritory = TERRITORY_FOR_SPECIAL_COMMUNITY[input.currentAutonomousCommunity];
  if (expectedSpecialTerritory) {
    const coverage = HISTORICAL_SPECIAL_TERRITORY_COVERAGE[expectedSpecialTerritory as keyof typeof HISTORICAL_SPECIAL_TERRITORY_COVERAGE];
    return blocked(
      'historical-iedmt-territory-community-mismatch',
      `La comunidad ${input.currentAutonomousCommunity} no pertenece al territorio común indicado. ${coverage.reason} No se sustituye por el tipo común.`,
      coverage.sourceIds,
    );
  }
  if (
    input.firstRegistrationDate < HISTORICAL_IEDMT_COMMON_RATES.validFrom
    || input.firstRegistrationDate > HISTORICAL_IEDMT_COMMON_RATES.validTo
  ) {
    return blocked(
      'historical-iedmt-unsupported-period',
      'La estructura histórica automática por CO₂ está versionada desde 2008-01-01 hasta 2026-12-31. La etapa previa por cilindrada requiere revisión.',
    );
  }
  if (input.classification.category !== 'M1' || input.classification.vehicleKind !== 'standard') {
    return blocked(
      'historical-iedmt-unsupported-classification',
      'La resolución histórica automática se limita a M1 ordinarios. Motos, quad, viviendas y otras categorías requieren revisión.',
    );
  }

  const period = HISTORICAL_IEDMT_EPIGRAPH_PERIODS.find((candidate) => (
    input.firstRegistrationDate >= candidate.validFrom
    && input.firstRegistrationDate <= candidate.validTo
  ));
  if (!period) return blocked('historical-iedmt-period-gap', 'No existe una regla histórica continua para esa fecha.');

  let epigraph: 1 | 2 | 3 | 4;
  if (input.classification.singleNonCombustionEngine) {
    epigraph = 1;
  } else if (!input.classification.co2Verified || input.classification.co2GKm === null) {
    return blocked(
      'historical-iedmt-co2-not-user-confirmed',
      'El CO₂ no consta como confirmado por la persona usuaria. Queda pendiente la comprobación documental externa; MatriculaPro no inspecciona el documento de emisiones.',
      [HISTORICAL_TERRITORY_SOURCE],
    );
  } else {
    const co2 = input.classification.co2GKm;
    if (co2 <= period.maximumEpigraph1) epigraph = 1;
    else if (co2 < period.maximumEpigraph2Exclusive) epigraph = 2;
    else if (co2 < period.maximumEpigraph3Exclusive) epigraph = 3;
    else epigraph = 4;
  }

  const communityRules = HISTORICAL_IEDMT_AUTONOMOUS_RATE_RULES
    .filter((rule) => (
      rule.territory === input.currentAutonomousCommunity
      && rule.epigraph === epigraph
    ))
    .sort((left, right) => left.validFrom.localeCompare(right.validFrom));
  const autonomousRule = communityRules.find((rule) => (
    input.firstRegistrationDate >= rule.validFrom
    && input.firstRegistrationDate <= rule.validTo
  ));
  const nextAutonomousRule = autonomousRule
    ? undefined
    : communityRules.find((rule) => input.firstRegistrationDate < rule.validFrom);

  const rateText = autonomousRule?.rate
    ?? HISTORICAL_IEDMT_COMMON_RATES.ratesByEpigraph[epigraph];
  const rate = Number(rateText);
  const warnings = july2021BoundaryWarnings(input.firstRegistrationDate);
  const sourceIds = [
    HISTORICAL_IEDMT_COMMON_RATES.sourceId,
    period.sourceId,
    HISTORICAL_TERRITORY_SOURCE,
    AUTONOMOUS_COMPETENCE_SOURCE,
    ...(autonomousRule?.sourceIds ?? []),
    ...warnings.flatMap((warning) => warning.sourceIds),
  ];
  const resolvedSourceIds = [...new Set(sourceIds)];
  const validFrom = maximumIsoDate(
    period.validFrom,
    HISTORICAL_IEDMT_COMMON_RATES.validFrom,
    autonomousRule?.validFrom,
  );
  const validTo = minimumIsoDate(
    period.validTo,
    HISTORICAL_IEDMT_COMMON_RATES.validTo,
    autonomousRule?.validTo,
    nextAutonomousRule ? previousIsoDate(nextAutonomousRule.validFrom) : undefined,
  );
  const explanation: FiscalExplanationStep[] = [{
    id: 'historical-iedmt-rate',
    title: 'IEDMT histórico para la minoración',
    detail: autonomousRule
      ? `La clasificación histórica corresponde al epígrafe ${epigraph} y al tipo autonómico versionado de ${input.currentAutonomousCommunity}, ${rate * 100} %. El CO₂ es un dato introducido y confirmado por la persona usuaria; MatriculaPro no ha comprobado su soporte documental.`
      : `La clasificación histórica corresponde al epígrafe ${epigraph} y al tipo común ${rate * 100} %, al no existir un tipo autonómico específico aplicable a ese epígrafe y fecha. El CO₂ es un dato introducido y confirmado por la persona usuaria; MatriculaPro no ha comprobado su soporte documental.`,
    input: {
      firstRegistrationDate: input.firstRegistrationDate,
      co2GKm: input.classification.co2GKm,
      territory: input.territory,
      currentAutonomousCommunity: input.currentAutonomousCommunity,
    },
    output: { historicalEpigraph: epigraph, historicalIedmtRateForResidualTax: rate },
    sourceIds: resolvedSourceIds,
  }];
  if (warnings.length > 0) {
    explanation.push({
      id: 'historical-iedmt-july-2021-effective-date',
      title: 'Frontera normativa de julio de 2021',
      detail: input.firstRegistrationDate === '2021-07-10'
        ? 'La Ley 11/2021 se publicó el 10 de julio y entró en vigor el 11. Para el 10 se conservan los umbrales 120/160/200, aunque la estadística anual de la AEAT rotule los nuevos tramos desde el día 10.'
        : 'La Ley 11/2021 ya estaba vigente el 11 de julio. Desde este día se aplican temporalmente los umbrales 144/192/240 hasta el 31 de diciembre de 2021.',
      input: { firstRegistrationDate: input.firstRegistrationDate },
      output: { effectiveThresholdDate: '2021-07-11' },
      sourceIds: [JULY_2021_LAW_SOURCE, JULY_2021_STATISTICS_SOURCE],
    });
  }
  return {
    status: 'resolved',
    epigraph,
    rate,
    rateExact: rateText,
    validFrom,
    validTo,
    sourceIds: resolvedSourceIds,
    sourceArticle: autonomousRule
      ? `${HISTORICAL_IEDMT_COMMON_RATES.sourceArticle}; ${autonomousRule.law}, ${autonomousRule.article}`
      : HISTORICAL_IEDMT_COMMON_RATES.sourceArticle,
    blocker: null,
    explanation,
    warnings,
  };
}

function july2021BoundaryWarnings(date: string): FiscalWarning[] {
  if (date !== '2021-07-10' && date !== '2021-07-11') return [];
  return [{
    id: 'historical-iedmt-july-2021-source-date-conflict',
    message: date === '2021-07-10'
      ? 'Frontera sensible: la norma se publicó el 10/07/2021 pero entró en vigor el 11/07/2021. Se aplican los tramos anteriores el día 10; la estadística AEAT usa un rótulo distinto.'
      : 'Frontera sensible: el 11/07/2021 es el primer día de vigencia legal de los tramos temporales 144/192/240.',
    sourceIds: [JULY_2021_LAW_SOURCE, JULY_2021_STATISTICS_SOURCE],
  }];
}

function maximumIsoDate(...dates: Array<string | undefined>): string {
  return dates.filter((date): date is string => Boolean(date)).sort().at(-1) as string;
}

function minimumIsoDate(...dates: Array<string | undefined>): string {
  return dates.filter((date): date is string => Boolean(date)).sort()[0] as string;
}

function previousIsoDate(value: string): string {
  const parsed = parseStrictIsoDate(value);
  if (!parsed) return value;
  parsed.setUTCDate(parsed.getUTCDate() - 1);
  return formatIsoDate(parsed);
}

function blocked(
  id: string,
  message: string,
  sourceIds: readonly string[] = [],
): HistoricalIedmtRateResult {
  return {
    status: 'blocked',
    epigraph: null,
    rate: null,
    rateExact: null,
    validFrom: null,
    validTo: null,
    sourceIds: [...sourceIds],
    sourceArticle: null,
    blocker: { id, message, sourceIds: [...sourceIds] },
    explanation: [],
    warnings: [],
  };
}
