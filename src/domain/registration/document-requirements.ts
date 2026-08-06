import type {
  PurchaseTaxRoute, RegistrationCase, RegistrationTaxRoute, RequiredDocument,
  RuleResult, TechnicalApprovalPath,
} from './types';

type DocumentInput = {
  registrationCase: RegistrationCase;
  technicalPath: RuleResult<TechnicalApprovalPath>;
  purchaseTaxRoute: RuleResult<PurchaseTaxRoute>;
  registrationTaxRoute: RuleResult<RegistrationTaxRoute>;
};

export function buildDocumentRequirements(input: DocumentInput): RequiredDocument[] {
  const docs: RequiredDocument[] = [
    doc('identity', 'Identificación del interesado', 'Acredita la identidad del titular o solicitante.', ['dgt'], false, ['dgt-ordinary-registration']),
    doc('spanish-itv-card', 'Ficha ITV española', 'Documento técnico español que DGT necesita para la matriculación.', ['itv', 'dgt'], false, ['dgt-ordinary-registration']),
    doc('ivtm-proof', 'Justificante de IVTM', 'El impuesto de circulación se gestiona en el ayuntamiento aplicable.', ['ivtm', 'dgt'], false, ['dgt-eu-registration']),
    doc('dgt-fee', 'Justificante de tasa DGT', 'Acredita el pago de la tasa de matriculación que corresponda.', ['dgt'], false, ['dgt-ordinary-registration']),
  ];

  if (input.registrationCase.vehicle.previouslyRegisteredAbroad) {
    docs.push(doc('foreign-registration-certificate', 'Permiso de circulación extranjero original', 'Acredita la matriculación y documentación de origen aplicable.', ['ownership', 'itv', 'dgt'], false, ['industry-itv-manual-7-9', 'dgt-ordinary-registration']));
  }
  if (input.registrationCase.vehicle.foreignTechnicalDocumentAvailable !== false) {
    docs.push(doc('foreign-technical-document', 'Documento técnico extranjero o equivalente', 'Permite comprobar datos técnicos, correspondencia e inspecciones cuando ese documento exista en el país de origen.', ['itv'], true, ['industry-itv-manual-7-9']));
  }

  if (input.technicalPath.outcome === 'eu-coc') {
    docs.push(doc('coc', 'Certificado de Conformidad (CoC)', 'En este expediente acredita la homologación europea y puede sustituir a la ficha reducida.', ['itv'], false, ['industry-itv-manual-7-9']));
  } else if (input.technicalPath.outcome === 'eu-reduced-sheet') {
    docs.push(doc('reduced-technical-sheet', 'Ficha reducida particularizada', 'Alternativa técnica posible al CoC cuando la homologación europea es identificable.', ['itv'], false, ['industry-itv-manual-7-9']));
  } else if (input.technicalPath.outcome === 'eea-equivalence-review' || input.technicalPath.outcome === 'spanish-individual-approval') {
    docs.push(doc('individual-approval-or-equivalence', 'Resolución de homologación o equivalencia', 'La ruta técnica especial debe acreditarse antes de continuar.', ['itv'], false, ['industry-itv-manual-7-9']));
  }

  const purchaseDocs: Record<PurchaseTaxRoute, RequiredDocument[]> = {
    itp: [
      doc('purchase-contract', 'Contrato de compraventa', 'Acredita una adquisición a particular.', ['ownership', 'purchase-tax', 'dgt'], false, ['dgt-ordinary-registration']),
      doc('translation', 'Traducción del contrato cuando proceda', 'DGT exige traducción del contrato extranjero cuando resulte necesaria.', ['dgt'], true, ['dgt-ordinary-registration']),
      doc('itp-proof', 'Justificante de ITP', 'Debe justificarse según la comunidad autónoma y el supuesto.', ['purchase-tax', 'dgt'], false, ['dgt-ordinary-registration']),
    ],
    'spanish-vat-new-vehicle': [
      doc('invoice', 'Factura o documento de adquisición', 'Acredita la adquisición del medio de transporte nuevo.', ['ownership', 'purchase-tax', 'dgt'], false, ['dgt-ordinary-registration']),
      doc('vat-proof', 'Justificante de IVA español', 'Acredita el tratamiento de la adquisición intracomunitaria de medio de transporte nuevo.', ['purchase-tax', 'dgt'], false, ['aeat-vat-new-vehicle', 'dgt-ordinary-registration']),
    ],
    'foreign-professional-invoice-review': [
      doc('invoice', 'Factura con número de IVA del vendedor', 'Acredita la compra a un profesional extranjero y el régimen indicado.', ['ownership', 'purchase-tax', 'dgt'], false, ['dgt-ordinary-registration']),
    ],
    'spanish-professional-invoice': [
      doc('invoice', 'Factura del profesional español', 'Acredita la adquisición al profesional que importó previamente el vehículo.', ['ownership', 'purchase-tax', 'dgt'], false, ['dgt-ordinary-registration']),
      doc('seller-tax-registration', 'Justificación de actividad del vendedor', 'DGT puede exigir acreditar el alta fiscal del compraventa español.', ['dgt'], true, ['dgt-ordinary-registration']),
    ],
    customs: [doc('customs-document', 'Documento aduanero de importación', 'Acredita el despacho o estatuto aduanero aplicable.', ['purchase-tax', 'dgt'], false, ['dgt-ordinary-registration'])],
    'relocation-review': [],
    'rehabilitation-review': [],
    'special-review': [],
  };
  docs.push(...purchaseDocs[input.purchaseTaxRoute.outcome]);

  if (input.registrationTaxRoute.outcome === 'model-576') {
    docs.push(doc('model-576-proof', 'Justificante Modelo 576', 'Acredita la autoliquidación de una operación sujeta y no exenta.', ['registration-tax', 'dgt'], false, ['aeat-model-576']));
  } else if (input.registrationTaxRoute.outcome === 'model-06') {
    docs.push(doc('model-06-proof', 'Justificante Modelo 06', 'Acredita la no sujeción o exención sin reconocimiento previo aplicable.', ['registration-tax', 'dgt'], false, ['aeat-model-06']));
  } else if (input.registrationTaxRoute.outcome === 'model-05') {
    docs.push(doc('model-05-resolution', 'Resolución o justificante Modelo 05', 'Acredita el reconocimiento previo del beneficio fiscal.', ['registration-tax', 'dgt'], false, ['aeat-model-05']));
    if (input.registrationCase.taxBenefitKind === 'reduction') {
      docs.push(doc('model-576-proof', 'Modelo 576 posterior a la reducción', 'Tras reconocer la reducción mediante Modelo 05, se autoliquida el IEDMT con la base reducida.', ['registration-tax', 'dgt'], false, ['aeat-model-05', 'aeat-model-576']));
    }
  }

  if (Object.values(input.registrationCase.vehicle.reforms).some((value) => value === true)) {
    docs.push(doc('reform-documents', 'Documentación de posibles reformas', 'Permite comprobar si las modificaciones están incluidas en homologación o requieren tramitación.', ['itv'], false, ['industry-reforms-manual-7-c2']));
  }
  if (input.registrationCase.buyerType === 'company') {
    docs.push(doc('representation', 'Representación de la persona jurídica', 'La persona jurídica debe tramitar electrónicamente y acreditar representación cuando proceda.', ['dgt'], true, ['dgt-ordinary-registration']));
  }

  const seen = new Set<string>();
  return docs.filter((item) => !seen.has(item.type) && seen.add(item.type));
}

function doc(
  type: RequiredDocument['type'],
  title: string,
  reason: string,
  requiredFor: RequiredDocument['requiredFor'],
  conditional: boolean,
  sourceIds: string[],
): RequiredDocument {
  return { type, title, reason, status: 'pending', requiredFor, conditional, sourceIds };
}
