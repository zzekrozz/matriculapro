import { DOMAIN_REVIEW_DATE } from './constants';
import { looksLikeEuropeanTypeApproval } from './rules';
import type { RuleResult, TechnicalApprovalPath, Vehicle } from './types';

export function determineTechnicalPath(vehicle: Vehicle): RuleResult<TechnicalApprovalPath> {
  const euApproval = vehicle.approvalType === 'eu-type'
    || looksLikeEuropeanTypeApproval(vehicle.fieldK, vehicle.approvalNumber);
  const usedData = {
    fieldK: vehicle.fieldK,
    approvalNumber: vehicle.approvalNumber,
    approvalType: vehicle.approvalType,
    cocAvailable: vehicle.cocAvailable,
    foreignTechnicalDocumentAvailable: vehicle.foreignTechnicalDocumentAvailable,
    category: vehicle.category,
  };

  if (euApproval && vehicle.cocAvailable === true && vehicle.cocValidityConfirmed && vehicle.cocVinMatchConfirmed) {
    return {
      ruleId: 'technical-approval-path',
      outcome: 'eu-coc',
      reason: 'Se identifica homologación europea y existe CoC. El CoC puede sustituir a la ficha reducida en el supuesto aplicable.',
      usedData,
      missingData: [],
      sourceIds: ['industry-itv-manual-7-9'],
      reviewedAt: DOMAIN_REVIEW_DATE,
      confidence: 'high',
      blocking: false,
    };
  }

  if (euApproval && vehicle.cocAvailable === true) {
    const missing = [
      ...(!vehicle.cocValidityConfirmed ? ['Validez y correspondencia técnica del CoC'] : []),
      ...(!vehicle.cocVinMatchConfirmed ? ['Coincidencia del VIN entre vehículo y CoC'] : []),
    ];
    return {
      ruleId: 'technical-approval-path',
      outcome: 'special-review',
      reason: 'Se ha indicado que existe CoC, pero disponibilidad no equivale a validez. Deben comprobarse autenticidad, correspondencia y VIN.',
      usedData,
      missingData: missing,
      sourceIds: ['industry-itv-manual-7-9', 'boe-rd-750-2010'],
      reviewedAt: DOMAIN_REVIEW_DATE,
      confidence: 'low',
      blocking: true,
    };
  }

  if (euApproval && vehicle.cocAvailable === false) {
    return {
      ruleId: 'technical-approval-path',
      outcome: 'eu-reduced-sheet',
      reason: 'La homologación europea es identificable, pero no hay CoC. Puede ser aplicable una ficha reducida emitida, según el caso, por fabricante, autoridad/servicio técnico o técnico competente.',
      usedData,
      missingData: ['Confirmación de la estación ITV de la documentación técnica aplicable'],
      sourceIds: ['industry-itv-manual-7-9'],
      reviewedAt: DOMAIN_REVIEW_DATE,
      confidence: 'medium',
      blocking: false,
    };
  }

  if (vehicle.approvalType === 'individual-eea' || vehicle.approvalType === 'short-series-eea') {
    return {
      ruleId: 'technical-approval-path',
      outcome: 'eea-equivalence-review',
      reason: 'Una homologación individual o serie corta concedida por otro Estado del EEE necesita comprobar aceptación o equivalencia por la autoridad española.',
      usedData,
      missingData: ['Resolución extranjera', 'Autorización española de equivalencia o aceptación'],
      sourceIds: ['industry-itv-manual-7-9'],
      reviewedAt: DOMAIN_REVIEW_DATE,
      confidence: 'high',
      blocking: true,
    };
  }

  if (vehicle.approvalType === 'individual-eu') {
    return {
      ruleId: 'technical-approval-path',
      outcome: 'eea-equivalence-review',
      reason: 'Debe comprobarse el certificado CE de homologación individual y su encaje en el procedimiento español.',
      usedData,
      missingData: ['Certificado CE de homologación individual'],
      sourceIds: ['industry-itv-manual-7-9'],
      reviewedAt: DOMAIN_REVIEW_DATE,
      confidence: 'medium',
      blocking: true,
    };
  }

  if (vehicle.approvalType === 'individual-spain') {
    return {
      ruleId: 'technical-approval-path',
      outcome: 'spanish-individual-approval',
      reason: 'Se ha declarado una homologación individual española; debe verificarse la resolución y su ficha reducida asociada.',
      usedData,
      missingData: ['Resolución de homologación individual española'],
      sourceIds: ['industry-itv-manual-7-9'],
      reviewedAt: DOMAIN_REVIEW_DATE,
      confidence: 'medium',
      blocking: true,
    };
  }

  if (vehicle.approvalType === 'none') {
    return {
      ruleId: 'technical-approval-path',
      outcome: 'spanish-individual-approval',
      reason: 'No se identifica homologación europea válida. No debe continuarse como si una ficha reducida ordinaria bastara; puede ser necesaria homologación individual.',
      usedData,
      missingData: [
        'Campo K o dato equivalente', 'Documento técnico extranjero', 'Identificación de la placa de fabricante',
        'Confirmación técnica de homologación y reformas',
      ],
      sourceIds: ['industry-itv-manual-7-9'],
      reviewedAt: DOMAIN_REVIEW_DATE,
      confidence: 'high',
      blocking: true,
    };
  }

  return {
    ruleId: 'technical-approval-path',
    outcome: 'special-review',
    reason: 'La documentación disponible no permite determinar todavía la ruta de homologación.',
    usedData,
    missingData: [
      ...(vehicle.fieldK ? [] : ['Campo K o dato equivalente']),
      ...(vehicle.cocAvailable === null ? ['Disponibilidad de CoC'] : []),
      ...(vehicle.foreignTechnicalDocumentAvailable === true ? [] : ['Documento técnico extranjero']),
      'Tipo de homologación',
    ],
    sourceIds: ['industry-itv-manual-7-9'],
    reviewedAt: DOMAIN_REVIEW_DATE,
    confidence: 'low',
    blocking: true,
  };
}
