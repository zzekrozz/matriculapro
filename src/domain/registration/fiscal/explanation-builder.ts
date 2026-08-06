import type { Model576BoxGuidance, Model576Calculation } from './types';

export function buildModel576BoxGuidance(
  calculation: Omit<Model576Calculation, 'boxGuidance'>,
): Model576BoxGuidance[] {
  const reductionWarning = calculation.reductionKind
    ? []
    : ['La casilla 02 solo se cumplimenta cuando existe una reducción legal aplicable.'];
  return [
    {
      box: '01',
      title: 'Base imponible',
      value: calculation.box01TaxableBase,
      origin: calculation.valuationMethod === 'new-vehicle-vat-base'
        ? 'Base de IVA, impuesto equivalente o contraprestación conforme al artículo 78.'
        : calculation.valuationMethod === 'official-table'
          ? 'Precio oficial, depreciación y, si procede, minoración residual.'
          : 'Valoración de mercado justificada aportada por la persona usuaria.',
      formula: calculation.vehicleStatus === 'used'
        ? 'valor de mercado / (1 + impuestos indirectos residuales)'
        : null,
      sourceIds: ['boe-law-38-1992-art-69-residual-tax', 'aeat-model-576-instructions-box-01'],
      warnings: calculation.valuationMethod === 'justified-market-value'
        ? ['Valor introducido por la persona usuaria; pendiente de comprobación documental externa y no comprobado por MatriculaPro.']
        : [],
    },
    {
      box: '02',
      title: 'Base imponible reducida',
      value: calculation.box02ReducedTaxableBase,
      origin: calculation.reductionKind ?? 'Sin reducción declarada como aplicable',
      formula: calculation.reductionKind === 'large-family-50'
        ? 'casilla 01 × 0,50'
        : calculation.reductionKind === 'motorhome-70'
          ? 'casilla 01 × 0,70'
          : calculation.reductionKind === 'large-family-and-motorhome-20'
            ? 'casilla 01 × 0,20'
            : null,
      sourceIds: ['boe-law-38-1992-art-66-4-5', 'aeat-model-576-instructions-box-02'],
      warnings: reductionWarning,
    },
    {
      box: '03',
      title: 'Tipo o epígrafe',
      value: calculation.epigraph === null || calculation.currentIedmtRateForLiquidation === null
        ? null
        : `${calculation.epigraph}.º · ${calculation.currentIedmtRateForLiquidation * 100} %`,
      origin: 'Epígrafe legal y tipo vigente en la comunidad autónoma a la fecha de devengo.',
      formula: null,
      sourceIds: ['boe-law-38-1992-art-70-current', 'aeat-registration-tax-rates-2026'],
      warnings: [],
    },
    {
      box: '04',
      title: 'Cuota',
      value: calculation.box04TaxQuota,
      origin: 'Base aplicable por tipo actual de liquidación.',
      formula: '(casilla 02 si existe; en otro caso casilla 01) × tipo actual',
      sourceIds: ['aeat-model-576-instructions-box-04'],
      warnings: [],
    },
    {
      box: '05',
      title: 'Deducción lineal',
      value: calculation.box05LinearDeduction,
      origin: calculation.box05LinearDeduction
        ? 'Medida oficial extraordinaria indicada y confirmada por la persona usuaria; MatriculaPro no comprueba el documento.'
        : 'No se ha aplicado una medida oficial extraordinaria.',
      formula: null,
      sourceIds: ['aeat-model-576-instructions-box-05'],
      warnings: calculation.box05LinearDeduction
        ? []
        : ['No es un campo de descuento libre.'],
    },
    {
      box: '06',
      title: 'Cuota a ingresar',
      value: calculation.box06AmountAfterDeduction,
      origin: 'Cuota tras la deducción lineal oficial aplicable.',
      formula: 'casilla 04 − casilla 05',
      sourceIds: ['aeat-model-576-instructions-box-06'],
      warnings: [],
    },
    {
      box: '07',
      title: 'A deducir',
      value: calculation.box07PreviousReturnsToDeduct,
      origin: 'Autoliquidaciones anteriores del mismo ejercicio y periodo.',
      formula: null,
      sourceIds: ['aeat-model-576-instructions-box-07'],
      warnings: calculation.box07PreviousReturnsToDeduct
        ? []
        : ['Solo se usa en una autoliquidación complementaria.'],
    },
    {
      box: '08',
      title: 'Resultado de la liquidación',
      value: calculation.box08FinalResult,
      origin: 'Resultado final preparado para revisión; MatriculaPro no presenta el modelo.',
      formula: 'casilla 06 − casilla 07',
      sourceIds: ['aeat-model-576-instructions-box-08'],
      warnings: ['Revisa los datos en la AEAT antes de presentar.'],
    },
  ];
}
