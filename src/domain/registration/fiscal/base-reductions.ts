import { ExactDecimal, type DecimalInput } from './decimal';
import type { BaseReductionResult, FiscalBlocker, ReductionClaims, ReductionKind } from './types';

const SOURCE_IDS = [
  'boe-law-38-1992-art-66-4-5',
  'aeat-model-576-instructions-box-02',
] as const;

export interface BaseReductionContext {
  vehicleKind: 'standard' | 'quad' | 'motorcycle' | 'motorhome' | 'other';
}

export function applyModel576BaseReduction(
  taxableBase: DecimalInput,
  claims: ReductionClaims | undefined,
  context: BaseReductionContext,
): BaseReductionResult {
  let base: ExactDecimal;
  try {
    base = ExactDecimal.from(taxableBase);
  } catch {
    return blocked([{ id: 'invalid-reduction-base', message: 'La base imponible no es un decimal válido.', sourceIds: [...SOURCE_IDS] }]);
  }
  if (base.compare(0) < 0) {
    return blocked([{ id: 'invalid-reduction-base', message: 'La base imponible no puede ser negativa.', sourceIds: [...SOURCE_IDS] }]);
  }

  const largeFamilyClaimed = claims?.largeFamily?.claimed === true;
  const motorhomeClaimed = claims?.motorhome?.claimed === true;
  if (!largeFamilyClaimed && !motorhomeClaimed) {
    return {
      status: 'not-applicable',
      kind: null,
      factor: null,
      reducedBase: null,
      reducedBaseExact: null,
      blockers: [],
      sourceIds: [...SOURCE_IDS],
      explanation: [{
        id: 'no-base-reduction',
        title: 'Sin base imponible reducida',
        detail: 'No se ha declarado una reducción compatible; la cuota se calcula sobre la casilla 01.',
        sourceIds: [...SOURCE_IDS],
      }],
    };
  }

  const blockers: FiscalBlocker[] = [];
  if (largeFamilyClaimed) {
    const largeFamily = claims?.largeFamily;
    if (
      largeFamily?.priorRecognitionStatus !== 'granted'
      || !largeFamily.resolutionReference?.trim()
      || !largeFamily.resolutionDate
      || !largeFamily.evidenceReference?.trim()
    ) {
      blockers.push({
        id: 'large-family-prior-recognition-required',
        message: 'La reducción por familia numerosa requiere que la persona usuaria marque el reconocimiento previo como concedido e introduzca resolución, fecha y referencia documental. Quedará pendiente su comprobación externa; no basta marcar una casilla.',
        sourceIds: [...SOURCE_IDS, 'aeat-model-05'],
      });
    }
  }
  if (motorhomeClaimed) {
    const motorhome = claims?.motorhome;
    if (context.vehicleKind !== 'motorhome') {
      blockers.push({
        id: 'motorhome-reduction-incompatible-vehicle',
        message: 'La reducción por autocaravana o vehículo vivienda solo puede aplicarse cuando el tipo fiscal figure como motorhome confirmado por la persona usuaria.',
        sourceIds: [...SOURCE_IDS],
      });
    } else if (!motorhome?.eligibilityConfirmed || !motorhome.evidenceReference?.trim()) {
      blockers.push({
        id: 'motorhome-eligibility-unconfirmed',
        message: 'La aplicación del 70 % exige confirmación de la persona usuaria y una referencia documental. MatriculaPro no comprueba el documento ni la elegibilidad material.',
        sourceIds: [...SOURCE_IDS],
      });
    }
  }
  if (blockers.length > 0) return blocked(blockers);

  let kind: ReductionKind;
  let factorText: '0.50' | '0.70' | '0.20';
  if (largeFamilyClaimed && motorhomeClaimed) {
    kind = 'large-family-and-motorhome-20';
    factorText = '0.20';
  } else if (largeFamilyClaimed) {
    kind = 'large-family-50';
    factorText = '0.50';
  } else {
    kind = 'motorhome-70';
    factorText = '0.70';
  }
  const factor = ExactDecimal.from(factorText);
  const reduced = base.times(factor);

  return {
    status: 'applied',
    kind,
    factor: factor.toNumber(),
    reducedBase: reduced.toNumber(18),
    reducedBaseExact: reduced.toDecimalString(18),
    blockers: [],
    sourceIds: [...SOURCE_IDS, ...(largeFamilyClaimed ? ['aeat-model-05'] : [])],
    explanation: [{
      id: 'legal-base-reduction',
      title: 'Base imponible reducida',
      detail: kind === 'large-family-and-motorhome-20'
        ? 'Ambos supuestos constan como confirmados por la persona usuaria y con referencias introducidas; las instrucciones del Modelo 576 indican consignar el 20 % de la casilla 01. Pendiente de comprobación documental externa.'
        : kind === 'large-family-50'
          ? 'El reconocimiento previo figura como concedido por confirmación de la persona usuaria; se consigna el 50 % de la casilla 01 y queda pendiente la comprobación documental externa.'
          : 'La condición de autocaravana o vehículo vivienda figura como confirmada por la persona usuaria; se consigna el 70 % de la casilla 01 y queda pendiente la comprobación documental externa.',
      formula: `casilla 02 = casilla 01 × ${factorText}`,
      input: { taxableBase: base.toNumber(), reductionKind: kind },
      output: { reducedTaxableBase: reduced.toNumber(18) },
      sourceIds: [...SOURCE_IDS],
    }],
  };
}

function blocked(blockers: FiscalBlocker[]): BaseReductionResult {
  return {
    status: 'blocked',
    kind: null,
    factor: null,
    reducedBase: null,
    reducedBaseExact: null,
    blockers,
    sourceIds: [...SOURCE_IDS],
    explanation: [],
  };
}
