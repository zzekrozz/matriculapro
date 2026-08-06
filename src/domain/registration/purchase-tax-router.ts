import { DOMAIN_REVIEW_DATE } from './constants';
import type { OriginZone, PurchaseTaxRoute, RegistrationCase, RuleResult, VatVehicleStatus } from './types';

export function determinePurchaseTaxRoute(
  registrationCase: RegistrationCase,
  vatStatus: RuleResult<VatVehicleStatus>,
  originZone: RuleResult<OriginZone>,
): RuleResult<PurchaseTaxRoute> {
  const usedData = {
    operation: registrationCase.operation,
    sellerType: registrationCase.sellerType,
    sellerCountry: registrationCase.sellerCountry,
    vatVehicleStatus: vatStatus.outcome,
    originZone: originZone.outcome,
    invoiceVatNumber: registrationCase.invoiceVatNumber,
  };

  if (registrationCase.vehicle.previouslyRegisteredInSpain) {
    return result('rehabilitation-review', 'El vehículo estuvo matriculado en España. No debe simularse una adquisición de importación ordinaria.', usedData, [], ['dgt-eu-registration'], true, 'high');
  }

  if (registrationCase.operation === 'relocation' || registrationCase.operation === 'already-owned') {
    return result(
      'relocation-review',
      'El vehículo ya era propiedad del usuario. No se simula compraventa: se revisan traslado, fechas de residencia, propiedad, uso y posibles beneficios fiscales.',
      usedData,
      ['Pruebas de residencia anterior y nueva', 'Fechas de propiedad y uso'],
      ['dgt-eu-registration', 'aeat-model-06'],
      true,
      'medium',
    );
  }

  if (originZone.outcome === 'third-country' || originZone.outcome === 'uk-post-brexit' || originZone.outcome === 'eea') {
    return result(
      'customs',
      'La procedencia activa una rama aduanera. Debe aportarse el documento de importación aplicable y no se usa automáticamente la ruta comunitaria.',
      usedData,
      ['Documento aduanero o acreditación válida de estatuto de la UE'],
      ['dgt-ordinary-registration', 'boe-itp-law-1-1993', 'boe-regional-financing-law-22-2009'],
      true,
      'high',
    );
  }

  if (vatStatus.outcome === 'undetermined') {
    return result(
      'special-review',
      'Primero debe determinarse si el vehículo es nuevo o usado a efectos de IVA.',
      usedData,
      vatStatus.missingData,
      ['aeat-vat-new-vehicle'],
      true,
      'low',
    );
  }

  if (registrationCase.sellerType === 'spanish-professional') {
    return result(
      'spanish-professional-invoice',
      'Compra nacional a profesional español que importó previamente: factura y justificación de actividad o alta fiscal cuando DGT la requiera. La clasificación fiscal nuevo/usado no convierte esta compra en una adquisición intracomunitaria del usuario.',
      usedData,
      [],
      ['dgt-ordinary-registration'],
      false,
      'high',
    );
  }

  if (vatStatus.outcome === 'new') {
    return result(
      'spanish-vat-new-vehicle',
      'El medio de transporte es nuevo a efectos de IVA; la adquisición intracomunitaria abre la ruta de IVA español con el modelo o justificante aplicable al perfil tributario.',
      usedData,
      [],
      ['aeat-vat-new-vehicle', 'dgt-ordinary-registration'],
      false,
      'high',
    );
  }

  if (registrationCase.sellerType === 'private') {
    return result(
      'itp',
      'Vehículo usado adquirido a particular de otro país de la UE/EEE: contrato, traducción cuando proceda y justificación del ITP según la comunidad autónoma y el supuesto.',
      usedData,
      [],
      ['dgt-ordinary-registration'],
      false,
      'high',
    );
  }

  if (registrationCase.sellerType === 'foreign-professional') {
    const missing = registrationCase.invoiceVatNumber ? [] : ['Número de IVA del vendedor en la factura'];
    return result(
      'foreign-professional-invoice-review',
      'Vehículo usado adquirido a profesional extranjero: se exige factura, número de IVA y revisión del régimen indicado. No se exige ITP por defecto.',
      usedData,
      missing,
      ['dgt-ordinary-registration'],
      missing.length > 0,
      missing.length > 0 ? 'medium' : 'high',
    );
  }

  return result(
    'special-review',
    'El tipo de transmitente o la operación no permite determinar la tributación de la adquisición.',
    usedData,
    ['Tipo de vendedor y documento de adquisición'],
    ['dgt-ordinary-registration'],
    true,
    'low',
  );
}

function result(
  outcome: PurchaseTaxRoute,
  reason: string,
  usedData: RuleResult<PurchaseTaxRoute>['usedData'],
  missingData: string[],
  sourceIds: string[],
  blocking: boolean,
  confidence: RuleResult<PurchaseTaxRoute>['confidence'],
): RuleResult<PurchaseTaxRoute> {
  return {
    ruleId: 'purchase-tax-route',
    outcome,
    reason,
    usedData,
    missingData,
    sourceIds,
    reviewedAt: DOMAIN_REVIEW_DATE,
    confidence,
    blocking,
  };
}
