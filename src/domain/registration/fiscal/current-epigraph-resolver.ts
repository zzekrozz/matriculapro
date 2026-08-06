import type { TaxEpigraph } from '../config/tax-rates-2026';
import type { CurrentEpigraphInput, CurrentEpigraphResult, FiscalBlocker } from './types';

const SOURCE_IDS = ['boe-law-38-1992-art-70-current', 'aeat-model-576-instructions-box-03'] as const;

export function resolveCurrentEpigraph(input: CurrentEpigraphInput): CurrentEpigraphResult {
  if (input.registrationTaxRoute !== 'model-576') {
    return blocked(
      'route-is-not-model-576',
      `El router fiscal ha determinado ${input.registrationTaxRoute}; no se calcula un epígrafe del Modelo 576.`,
    );
  }

  if (input.vehicleKind === 'quad') return resolved(4, 'Los vehículos tipo quad pertenecen al epígrafe 4.º.');

  if (input.vehicleKind === 'motorcycle' || input.category === 'L') {
    const power = input.motorcyclePowerKw;
    const mass = input.motorcycleMassKg;
    if (power !== null && power !== undefined && mass !== null && mass !== undefined && mass > 0) {
      const powerMassRatio = power / mass;
      if (power >= 74 && powerMassRatio >= 0.66) {
        return resolved(9, 'La motocicleta alcanza 74 kW y una relación potencia/masa igual o superior a 0,66; corresponde el epígrafe 9.º.');
      }
    }
    if (!input.co2Verified || input.co2GKm === null) {
      return specialReview(
        9,
        'El CO₂ no consta como confirmado por la persona usuaria. La ley prevé el epígrafe 9.º para este supuesto, pero queda pendiente una comprobación documental externa; MatriculaPro no inspecciona el documento.',
      );
    }
    const co2 = input.co2GKm;
    if (co2 <= 100) return resolved(6, 'CO₂ introducido y confirmado por la persona usuaria, no superior a 100 g/km: epígrafe 6.º.');
    if (co2 <= 120) return resolved(7, 'CO₂ introducido y confirmado por la persona usuaria, superior a 100 y no superior a 120 g/km: epígrafe 7.º.');
    if (co2 < 140) return resolved(8, 'CO₂ introducido y confirmado por la persona usuaria, superior a 120 e inferior a 140 g/km: epígrafe 8.º.');
    return resolved(9, 'CO₂ introducido y confirmado por la persona usuaria, igual o superior a 140 g/km: epígrafe 9.º.');
  }

  if ((input.category === 'N2' || input.category === 'N3') && input.vehicleKind === 'motorhome') {
    return resolved(4, 'Los N2/N3 acondicionados como vivienda se incluyen expresamente en el epígrafe 4.º.');
  }

  if (input.category === 'N1') {
    return blocked(
      'n1-not-m1-table',
      'No se aplica la tabla M1 a un N1. Debe resolverse antes su sujeción, configuración y posible Modelo 06.',
    );
  }
  if (input.category !== 'M1') {
    return blocked(
      'unsupported-current-category',
      'La categoría no está automatizada para liquidación 576; requiere confirmar si corresponde epígrafe 5.º u otra ruta.',
    );
  }

  if (input.singleNonCombustionEngine) {
    return resolved(1, 'Vehículo con un solo motor no térmico, no quad: epígrafe 1.º.');
  }
  if (!input.co2Verified || input.co2GKm === null) {
    return specialReview(
      4,
      'El CO₂ no consta como confirmado por la persona usuaria. La ley contempla el epígrafe 4.º cuando falta la medición exigible, pero el cálculo queda pendiente de comprobación documental externa; MatriculaPro no inspecciona el documento.',
    );
  }
  if (input.co2GKm <= 120) return resolved(1, 'CO₂ introducido y confirmado por la persona usuaria, no superior a 120 g/km: epígrafe 1.º.');
  if (input.co2GKm < 160) return resolved(2, 'CO₂ introducido y confirmado por la persona usuaria, superior a 120 e inferior a 160 g/km: epígrafe 2.º.');
  if (input.co2GKm < 200) return resolved(3, 'CO₂ introducido y confirmado por la persona usuaria, igual o superior a 160 e inferior a 200 g/km: epígrafe 3.º.');
  return resolved(4, 'CO₂ introducido y confirmado por la persona usuaria, igual o superior a 200 g/km: epígrafe 4.º.');
}

function resolved(epigraph: TaxEpigraph, detail: string): CurrentEpigraphResult {
  return {
    status: 'resolved',
    epigraph,
    blockers: [],
    warnings: [],
    sourceIds: [...SOURCE_IDS],
    explanation: [{
      id: 'current-tax-epigraph',
      title: `Epígrafe actual ${epigraph}.º`,
      detail,
      output: { epigraph },
      sourceIds: [...SOURCE_IDS],
    }],
  };
}

function blocked(id: string, message: string): CurrentEpigraphResult {
  const blocker: FiscalBlocker = { id, message, sourceIds: [...SOURCE_IDS] };
  return {
    status: 'blocked',
    epigraph: null,
    blockers: [blocker],
    warnings: [],
    sourceIds: [...SOURCE_IDS],
    explanation: [],
  };
}

function specialReview(epigraph: TaxEpigraph, message: string): CurrentEpigraphResult {
  return {
    status: 'special-review',
    epigraph,
    blockers: [{ id: 'epigraph-requires-special-review', message, sourceIds: [...SOURCE_IDS] }],
    warnings: [{ id: 'statutory-fallback-not-auto-filed', message, sourceIds: [...SOURCE_IDS] }],
    sourceIds: [...SOURCE_IDS],
    explanation: [],
  };
}
