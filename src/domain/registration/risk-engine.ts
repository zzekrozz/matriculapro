import { DOMAIN_REVIEW_DATE, REFORM_LABELS } from './constants';
import type { CaseBlocker, CaseRisk, CaseWarning, RegistrationCase } from './types';

export interface RiskEngineResult {
  blockers: CaseBlocker[];
  warnings: CaseWarning[];
  risks: CaseRisk[];
}

export function evaluateCaseRisks(registrationCase: RegistrationCase): RiskEngineResult {
  const blockers: CaseBlocker[] = [];
  const warnings: CaseWarning[] = [];
  const risks: CaseRisk[] = [];
  const { vehicle } = registrationCase;

  const positiveReforms = Object.entries(vehicle.reforms)
    .filter(([, value]) => value === true)
    .map(([key]) => REFORM_LABELS[key as keyof typeof REFORM_LABELS]);
  const unansweredReforms = Object.values(vehicle.reforms).filter((value) => value === null).length;

  if (positiveReforms.length > 0) {
    warnings.push({
      id: 'possible-reforms',
      title: 'Hay posibles reformas que deben revisarse',
      detail: `${positiveReforms.join(', ')}. La aplicación no afirma un resultado favorable o desfavorable; debe contrastarse con el Manual de Reformas y la documentación del vehículo.`,
      sourceIds: ['industry-reforms-manual-7-c2', 'industry-itv-manual-7-9'],
    });
    risks.push({
      id: 'reform-review',
      level: positiveReforms.some((item) => /estructural|carrocería|motor|volante|camper/i.test(item)) ? 'high' : 'medium',
      title: 'Revisión de reformas',
      reason: 'Una modificación sólo es reforma si encaja en la normativa y debe evaluarse sobre el vehículo y su documentación.',
      reviewBy: 'Estación ITV, técnico competente o servicio técnico según el supuesto',
      sourceIds: ['industry-reforms-manual-7-c2'],
    });
  } else if (unansweredReforms > 0) {
    warnings.push({
      id: 'reforms-unanswered',
      title: 'Detector de reformas incompleto',
      detail: `Quedan ${unansweredReforms} comprobaciones sin responder. No se emite un veredicto técnico con documentación incompleta.`,
      sourceIds: ['industry-reforms-manual-7-c2'],
    });
  }

  if (vehicle.category !== 'M1') {
    risks.push({
      id: 'category-outside-mvp',
      level: 'high',
      title: `Categoría ${vehicle.category} fuera de la automatización ordinaria M1`,
      reason: 'Las categorías especiales o distintas de M1 necesitan reglas técnicas y fiscales propias.',
      reviewBy: 'ITV y, en su caso, AEAT o técnico competente',
      sourceIds: ['industry-itv-manual-7-9', 'aeat-model-06-instructions'],
    });
  }

  if (registrationCase.specialCircumstances.length > 0) {
    risks.push({
      id: 'special-circumstances',
      level: 'high',
      title: 'El expediente contiene circunstancias especiales',
      reason: registrationCase.specialCircumstances.join(', '),
      reviewBy: 'Organismo o profesional competente según la circunstancia',
      sourceIds: ['dgt-ordinary-registration', 'aeat-model-05', 'aeat-model-06'],
    });
  }

  if (vehicle.previouslyRegisteredAbroad && vehicle.foreignTechnicalDocumentAvailable === false) {
    blockers.push({
      id: 'missing-foreign-technical-document',
      title: 'Falta documentación técnica extranjera',
      reason: 'La ITV necesita comprobar los datos y la correspondencia documental del vehículo.',
      missingData: ['Documento técnico extranjero o equivalente'],
      sourceIds: ['industry-itv-manual-7-9'],
    });
  }

  if (!registrationCase.municipality) {
    blockers.push({
      id: 'missing-municipality',
      title: 'No se ha introducido el municipio',
      reason: 'El IVTM es municipal y no puede estimarse ni gestionarse como un importe nacional.',
      missingData: ['Municipio de domicilio fiscal o matriculación'],
      sourceIds: ['dgt-eu-registration', 'boe-local-finance-law-2-2004'],
    });
  }

  if (vehicle.previouslyRegisteredInSpain) {
    blockers.push({
      id: 'previously-registered-spain',
      title: 'El vehículo estuvo matriculado en España',
      reason: 'No debe seguir la matriculación ordinaria de importación; corresponde revisar rehabilitación u otro trámite.',
      missingData: ['Matrícula española anterior y situación registral'],
      sourceIds: ['dgt-eu-registration'],
    });
  }

  void DOMAIN_REVIEW_DATE;
  return { blockers, warnings, risks };
}
