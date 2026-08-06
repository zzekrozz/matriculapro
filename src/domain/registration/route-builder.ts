import { buildDocumentRequirements } from './document-requirements';
import { estimateCaseCosts } from './cost-estimator';
import { determinePurchaseTaxRoute } from './purchase-tax-router';
import { determineRegistrationTaxRoute } from './registration-tax-router';
import { evaluateCaseRisks } from './risk-engine';
import { classifyOriginZone, classifyVatVehicleStatus } from './rules';
import { sourcesForIds } from './sources';
import { determineTechnicalPath } from './technical-path';
import type {
  CaseBlocker, CaseTask, ProcessKind, RegistrationCase, RegistrationDecision,
  RouteStep, RuleResult,
} from './types';

const STAGE_ORDER: RegistrationCase['processStage'][] = [
  'not-purchased', 'purchased', 'transported', 'itv-requested', 'itv-passed',
  'taxes-started', 'dgt-started', 'registered',
];

export function buildRegistrationDecision(registrationCase: RegistrationCase): RegistrationDecision {
  const referenceDate = registrationCase.purchaseDate;
  const vatVehicleStatus = classifyVatVehicleStatus({
    firstRegistrationDate: registrationCase.vehicle.firstRegistrationDate,
    mileageKm: registrationCase.vehicle.mileageKm,
    referenceDate,
  });
  const originZone = classifyOriginZone({
    registrationCountry: registrationCase.vehicle.registrationCountry,
    firstEntryIntoEuDate: registrationCase.firstEntryIntoEuDate,
    customsUnionStatusConfirmed: registrationCase.customsUnionStatusConfirmed,
    northernIrelandV5cConfirmed: registrationCase.northernIrelandV5cConfirmed,
  });
  const technicalPath = determineTechnicalPath(registrationCase.vehicle);
  const purchaseTaxRoute = determinePurchaseTaxRoute(registrationCase, vatVehicleStatus, originZone);
  const registrationTaxRoute = determineRegistrationTaxRoute(registrationCase);
  const riskResult = evaluateCaseRisks(registrationCase);
  const processKind = determineProcessKind(registrationCase, originZone.outcome);

  const ruleBlockers = [vatVehicleStatus, originZone, technicalPath, purchaseTaxRoute, registrationTaxRoute]
    .filter((rule) => rule.blocking)
    .map(ruleToBlocker);
  const blockers = dedupeById([...ruleBlockers, ...riskResult.blockers]);
  const requiredDocuments = buildDocumentRequirements({
    registrationCase,
    technicalPath,
    purchaseTaxRoute,
    registrationTaxRoute,
  });
  const route = buildOperationalRoute(registrationCase, blockers, requiredDocuments.map((document) => document.type));
  const nextAction = selectNextAction(blockers, route);
  const estimatedCosts = estimateCaseCosts(registrationCase, registrationTaxRoute);
  const supportedScope = processKind === 'ordinary-import'
    && registrationCase.vehicle.category === 'M1'
    && originZone.outcome === 'eu'
    && !technicalPath.blocking
    && !Object.values(registrationCase.vehicle.reforms).some((value) => value === true)
    && registrationCase.specialCircumstances.length === 0;

  const sourceIds = collectSourceIds([
    vatVehicleStatus, originZone, technicalPath, purchaseTaxRoute, registrationTaxRoute,
    ...blockers, ...riskResult.warnings, ...riskResult.risks, ...requiredDocuments, ...route,
    ...estimatedCosts,
  ]);

  return {
    processKind,
    supportedScope,
    vatVehicleStatus,
    originZone,
    technicalPath,
    purchaseTaxRoute,
    registrationTaxRoute,
    requiredDocuments,
    route,
    blockers,
    warnings: riskResult.warnings,
    risks: riskResult.risks,
    nextAction,
    estimatedCosts,
    sources: sourcesForIds(sourceIds),
  };
}

function determineProcessKind(registrationCase: RegistrationCase, originZone: string): ProcessKind {
  if (registrationCase.vehicle.previouslyRegisteredInSpain) return 'rehabilitation';
  if (registrationCase.specialCircumstances.includes('historical')) return 'historical';
  if (registrationCase.operation === 'relocation') return 'relocation';
  if (
    registrationCase.operation === 'purchase'
    && registrationCase.vehicle.category === 'M1'
    && (originZone === 'eu' || originZone === 'eea')
  ) return 'ordinary-import';
  return 'special-review';
}

function ruleToBlocker(rule: RuleResult<unknown>): CaseBlocker {
  return {
    id: `rule-${rule.ruleId}`,
    title: blockerTitle(rule.ruleId),
    reason: rule.reason,
    missingData: rule.missingData,
    sourceIds: rule.sourceIds,
  };
}

function blockerTitle(ruleId: string): string {
  const labels: Record<string, string> = {
    'vat-new-or-used': 'No se ha determinado la clasificación fiscal nuevo/usado',
    'origin-zone': 'La procedencia requiere revisión especial',
    'technical-approval-path': 'No se ha confirmado la ruta técnica',
    'purchase-tax-route': 'No se ha determinado la fiscalidad de la adquisición',
    'registration-tax-route': 'No se ha determinado el modelo fiscal aplicable',
  };
  return labels[ruleId] ?? 'Regla pendiente de confirmación';
}

function buildOperationalRoute(
  registrationCase: RegistrationCase,
  blockers: CaseBlocker[],
  allDocumentTypes: RegistrationDecision['requiredDocuments'][number]['type'][],
): RouteStep[] {
  const stageIndex = STAGE_ORDER.indexOf(registrationCase.processStage);
  const definitions: Array<Omit<RouteStep, 'status'>> = [
    { id: 'document-feasibility', order: 1, title: 'Viabilidad documental', description: 'Titularidad, procedencia y documentación de origen.', requiredDocuments: allDocumentTypes.filter((type) => ['foreign-registration-certificate', 'foreign-technical-document', 'purchase-contract', 'invoice', 'identity'].includes(type)), sourceIds: ['dgt-ordinary-registration'] },
    { id: 'technical-itv', order: 2, title: 'Homologación e ITV', description: 'Ruta técnica aplicable y ficha ITV española.', requiredDocuments: allDocumentTypes.filter((type) => ['coc', 'reduced-technical-sheet', 'individual-approval-or-equivalence', 'spanish-itv-card', 'reform-documents'].includes(type)), sourceIds: ['industry-itv-manual-7-9', 'industry-reforms-manual-7-c2'] },
    { id: 'purchase-tax', order: 3, title: 'Fiscalidad de adquisición', description: 'ITP, IVA o aduanas según la operación.', requiredDocuments: allDocumentTypes.filter((type) => ['itp-proof', 'vat-proof', 'customs-document', 'invoice', 'purchase-contract'].includes(type)), sourceIds: ['dgt-ordinary-registration', 'aeat-vat-new-vehicle'] },
    { id: 'registration-tax', order: 4, title: 'Impuesto de matriculación', description: '576, 06, 05 o revisión especial.', requiredDocuments: allDocumentTypes.filter((type) => ['model-576-proof', 'model-06-proof', 'model-05-resolution'].includes(type)), sourceIds: ['aeat-model-576', 'aeat-model-05', 'aeat-model-06'] },
    { id: 'ivtm', order: 5, title: 'IVTM', description: 'Liquidación o justificación municipal.', requiredDocuments: allDocumentTypes.filter((type) => type === 'ivtm-proof'), sourceIds: ['dgt-eu-registration'] },
    { id: 'dgt', order: 6, title: 'DGT', description: 'Solicitud, tasa y documentos dinámicos del expediente.', requiredDocuments: allDocumentTypes.filter((type) => ['dgt-fee', 'identity', 'representation', 'spanish-itv-card'].includes(type)), sourceIds: ['dgt-ordinary-registration'] },
    { id: 'plates-insurance', order: 7, title: 'Placas y seguro', description: 'Placas tras obtener matrícula y seguro vigente antes de circular.', requiredDocuments: allDocumentTypes.filter((type) => ['insurance', 'spanish-registration-certificate'].includes(type)), sourceIds: ['dgt-ordinary-registration'] },
  ];

  const completionThresholds = [1, 5, 5, 5, 6, 7, 7];
  const blockerRoute = new Set<string>(blockers.map((blocker) => {
    if (/técnic|homolog|reforma/i.test(`${blocker.title} ${blocker.reason}`)) return 'technical-itv';
    if (/adquisición|IVA|ITP|aduan/i.test(`${blocker.title} ${blocker.reason}`)) return 'purchase-tax';
    if (/modelo fiscal|matriculación/i.test(`${blocker.title} ${blocker.reason}`)) return 'registration-tax';
    if (/municipio|IVTM/i.test(`${blocker.title} ${blocker.reason}`)) return 'ivtm';
    return 'document-feasibility';
  }));

  let currentAssigned = false;
  return definitions.map((definition, index) => {
    let status: RouteStep['status'];
    if (stageIndex >= completionThresholds[index]) status = 'completed';
    else if (blockerRoute.has(definition.id)) status = 'blocked';
    else if (!currentAssigned) {
      status = 'current';
      currentAssigned = true;
    } else status = 'pending';
    return { ...definition, status };
  });
}

function selectNextAction(blockers: CaseBlocker[], route: RouteStep[]): CaseTask | null {
  const blocker = blockers[0];
  if (blocker) {
    return {
      id: `resolve-${blocker.id}`,
      title: blocker.missingData[0] ? `Completa: ${blocker.missingData[0]}` : blocker.title,
      description: blocker.reason,
      category: inferTaskCategory(blocker),
      status: 'blocked',
      sourceIds: blocker.sourceIds,
    };
  }
  const current = route.find((step) => step.status === 'current' || step.status === 'pending');
  if (!current) return null;
  return {
    id: `continue-${current.id}`,
    title: `Continuar: ${current.title}`,
    description: current.description,
    category: routeIdToCategory(current.id),
    status: 'pending',
    sourceIds: current.sourceIds,
  };
}

function inferTaskCategory(blocker: CaseBlocker): CaseTask['category'] {
  const value = `${blocker.title} ${blocker.reason}`;
  if (/técnic|homolog|ITV|reforma/i.test(value)) return 'itv';
  if (/adquisición|IVA|ITP|aduan/i.test(value)) return 'purchase-tax';
  if (/modelo fiscal|impuesto de matriculación/i.test(value)) return 'registration-tax';
  if (/municipio|IVTM/i.test(value)) return 'ivtm';
  return 'case-data';
}

function routeIdToCategory(id: string): CaseTask['category'] {
  const map: Record<string, CaseTask['category']> = {
    'document-feasibility': 'documents',
    'technical-itv': 'itv',
    'purchase-tax': 'purchase-tax',
    'registration-tax': 'registration-tax',
    ivtm: 'ivtm',
    dgt: 'dgt',
    'plates-insurance': 'plates-insurance',
  };
  return map[id] ?? 'case-data';
}

function collectSourceIds(items: Array<{ sourceIds: string[] }>): Set<string> {
  return new Set(items.flatMap((item) => item.sourceIds));
}

function dedupeById<T extends { id: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter((item) => !seen.has(item.id) && seen.add(item.id));
}
