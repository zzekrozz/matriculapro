export interface RutaStep {
  n: number;
  id: string;
  title: string;
  /** Nombre del icono lucide-react. */
  icon: string;
  state: 'recommended' | 'pending';
  summary: string;
  what: string;
  need: string[];
  errors: string[];
  delicate?: boolean;
  altMsg?: string;
  linkedModule?: {
    href: string;
    label: string;
    available: boolean;
  };
  why?: string;
  consult?: string;
}

/**
 * Ruta educativa de nueve hitos. No es una secuencia administrativa universal:
 * el orden y los documentos cambian con el origen, la fiscalidad y la vía técnica.
 */
export const RUTA_STEPS: RutaStep[] = [
  {
    n: 1,
    id: 'antes-comprar',
    title: 'Clasificar el caso y comprobar viabilidad',
    icon: 'ShoppingCart',
    state: 'recommended',
    summary: 'Antes de pagar, identifica origen, vendedor, antigüedad, kilometraje, categoría, homologación y reformas.',
    what: 'Crear una ficha del caso con VIN, país de procedencia, quién vende, fecha de primera matriculación, kilometraje, categoría M1/N1, contraseña de homologación y cualquier reforma. Con esos datos se decide qué ramas fiscales y técnicas hay que revisar.',
    need: [
      'VIN y fotos legibles de la documentación extranjera',
      'Fecha de primera matriculación y kilometraje acreditable',
      'Identidad y condición del vendedor: particular, empresa o profesional',
      'Categoría, homologación y lista de reformas o accesorios',
    ],
    errors: [
      'Asumir que todos los vehículos procedentes de Europa siguen la misma vía',
      'Tratar un N1 como turismo M1 sin verificar la categoría y configuración',
      'Ignorar que Reino Unido puede implicar importación aduanera según la operación y su fecha',
    ],
    altMsg: 'Si ya compraste el vehículo, documenta el caso antes de seguir. Detectar ahora una carencia técnica o fiscal evita encadenar trámites incompatibles.',
    linkedModule: {
      href: '/app/checklist/antes-de-comprar',
      label: 'Abrir checklist de compra',
      available: true,
    },
    why: 'La clasificación inicial determina las ramas de IVA o ITP, aduanas, homologación e ITV. Es el mejor momento para descubrir un bloqueo.',
    consult: 'Consulta antes de comprar si no puedes identificar la homologación, faltan originales, existen reformas, el vehículo es N1 o procede de un tercer país.',
  },
  {
    n: 2,
    id: 'docs',
    title: 'Acreditar adquisición, origen y fiscalidad',
    icon: 'FileText',
    state: 'pending',
    summary: 'Reúne la prueba de titularidad y determina si hay ITP, IVA en España, régimen de factura o aduanas.',
    what: 'Conservar contrato o factura completos, justificantes de pago, documentación extranjera y, cuando proceda, traducción, datos de IVA del vendedor, liquidación de ITP o documentación aduanera. Un vehículo es nuevo a efectos de IVA intracomunitario si se entrega antes de seis meses desde la primera puesta en servicio o no supera 6.000 km.',
    need: [
      'Contrato si vende un particular o factura si vende una empresa/profesional',
      'Permiso y documento técnico extranjeros; baja o exportación cuando corresponda',
      'Prueba del tratamiento fiscal: ITP, régimen de IVA, IVA español o aduanas según el caso',
      'Traducción cuando el organismo no pueda tramitar el documento original',
    ],
    errors: [
      'Pedir factura a un particular o aceptar una factura empresarial sin datos fiscales suficientes',
      'Usar “seis meses o 6.000 km” como regla de vehículo usado: basta cumplir uno de los criterios de nuevo para activar la revisión de IVA',
      'Confundir compra intracomunitaria con importación de un tercer país',
    ],
    linkedModule: {
      href: '/app/biblioteca',
      label: 'Consultar documentos y justificantes',
      available: true,
    },
    why: 'La DGT necesita acreditar la titularidad y la situación tributaria aplicable; una prueba de compra incoherente contamina todo el expediente.',
    consult: 'Consulta a AEAT o a un asesor fiscal ante factura intracomunitaria, vehículo nuevo a efectos de IVA, régimen del margen, traslado de residencia o cualquier duda sobre aduanas.',
  },
  {
    n: 3,
    id: 'coc',
    title: 'Confirmar la vía técnica',
    icon: 'FileCheck2',
    state: 'pending',
    summary: 'COC, ficha reducida, equivalencia u homologación individual no son sustitutos automáticos.',
    what: 'Identificar la homologación aplicable y preguntar a la ITV qué soporte técnico acepta. Un COC válido puede acreditar una homologación UE; una ficha reducida puede documentar características cuando existe una homologación identificable. Los vehículos sin homologación UE, de serie corta/individual o con reformas pueden requerir equivalencia, autorización u homologación individual.',
    need: [
      'COC si existe y corresponde exactamente al VIN y variante',
      'Contraseña de homologación, placa del fabricante fotografiada y datos técnicos verificables',
      'Ficha reducida emitida por fabricante, servicio técnico designado o técnico competente cuando sea admisible',
      'Informes de conformidad, certificados de taller o proyecto para reformas, cuando proceda',
    ],
    errors: [
      'Decir que la ficha reducida siempre sustituye al COC',
      'Afirmar que solo un laboratorio puede emitir cualquier ficha reducida',
      'Dar por válida en España una homologación individual extranjera sin confirmación',
    ],
    delicate: true,
    linkedModule: {
      href: '/app/ficha-tecnica',
      label: 'Explorar los campos técnicos',
      available: true,
    },
    why: 'La vía técnica es el principal punto de bloqueo: determina si la ITV puede documentar el vehículo y qué pruebas adicionales exigirá.',
    consult: 'Confirma por escrito con una estación ITV o con el órgano competente antes de encargar documentos técnicos caros, especialmente en vehículos de EE. UU., N1, series cortas, homologaciones individuales o reformas.',
  },
  {
    n: 4,
    id: 'itv',
    title: 'Preparar y realizar la ITV española',
    icon: 'Wrench',
    state: 'pending',
    summary: 'Solicita el tipo de inspección correcto y lleva la vía técnica previamente confirmada.',
    what: 'Reservar una inspección para documentación/matriculación, presentar los originales y acondicionar el vehículo. La estación verifica identidad, características, seguridad, emisiones y reformas, y emite o completa la tarjeta ITV española si el resultado y el expediente son conformes.',
    need: [
      'Permiso y documento técnico extranjeros originales',
      'COC, ficha reducida o resolución técnica que corresponda al caso',
      'Documentación de reformas y acreditación adicional solicitada por la estación',
      'Vehículo con VIN legible y elementos reglamentarios en estado conforme',
    ],
    errors: [
      'Reservar una ITV periódica ordinaria en vez del trámite requerido',
      'Presentarse con luces, neumáticos o reformas diferentes de la configuración documentada',
      'Suponer que una ITV extranjera vigente sustituye automáticamente la documentación española',
    ],
    linkedModule: {
      href: '/app/recorrido-itv',
      label: 'Practicar el recorrido ITV',
      available: true,
    },
    why: 'La tarjeta ITV española enlaza el vehículo físico con sus datos técnicos y con la vía de homologación aceptada.',
    consult: 'Contacta previamente con la estación si el vehículo tiene reformas, contraseña no identificable, homologación individual, categoría N1, documentación no UE o discrepancias de VIN.',
  },
  {
    n: 5,
    id: '576',
    title: 'Impuesto de matriculación: 576, 06, 05 o revisión especial',
    icon: 'Receipt',
    state: 'pending',
    summary: 'Primero se decide sujeción y beneficio fiscal; después se usa 576, 06, 05 o revisión especial.',
    what: 'Analizar el Impuesto Especial sobre Determinados Medios de Transporte. El Modelo 576 autoliquida casos sujetos y no exentos; el 05 se utiliza en determinados supuestos de no sujeción, exención o reducción que requieren reconocimiento previo; el 06 cubre determinados supuestos sin reconocimiento previo. Puede ser necesario otro justificante o revisión profesional.',
    need: [
      'Tarjeta ITV española y datos de categoría, combustible y emisiones',
      'Fecha de primera matriculación, valor y demás datos fiscales acreditables',
      'Pruebas de la exención, no sujeción o reducción invocada, si existe',
      'Confirmación específica en N1, traslado de residencia, uso profesional o datos antiguos/incompletos',
    ],
    errors: [
      'Presentar el 576 como obligación universal',
      'Usar V.7 como si fuera la base imponible de un vehículo usado',
      'Asignar automáticamente el Modelo 06 a cualquier N1 sin verificar categoría, configuración y supuesto legal',
    ],
    delicate: true,
    linkedModule: {
      href: '/app/simulador-576',
      label: 'Practicar campos del 576',
      available: true,
    },
    why: 'Elegir el modelo incorrecto puede producir una autoliquidación improcedente o un justificante que no corresponda al expediente.',
    consult: 'Contrasta el supuesto en la AEAT antes de presentar, especialmente si existe exención, no sujeción, reducción, N1, traslado de residencia o falta de emisiones homologadas comparables.',
  },
  {
    n: 6,
    id: 'ivtm',
    title: 'Gestionar el IVTM municipal',
    icon: 'Building2',
    state: 'pending',
    summary: 'Confirma el alta y el justificante exigido por el ayuntamiento competente.',
    what: 'Solicitar el alta o liquidación del Impuesto sobre Vehículos de Tracción Mecánica en el municipio que corresponda al domicilio del permiso, siguiendo su procedimiento y conservando el justificante.',
    need: [
      'Identidad y domicilio del titular',
      'Datos técnicos solicitados por el ayuntamiento',
      'Justificante de alta, pago o exención que corresponda',
    ],
    errors: [
      'Dar por hecho que todos los ayuntamientos piden los mismos documentos',
      'Confundir domicilio de notificaciones, domicilio fiscal y domicilio del permiso',
    ],
    why: 'La situación del IVTM forma parte de las comprobaciones previas a la matriculación y se resuelve a nivel municipal.',
    consult: 'Pregunta al ayuntamiento si hay dudas sobre competencia municipal, bonificaciones, exenciones o forma de alta.',
  },
  {
    n: 7,
    id: 'tasa-dgt',
    title: 'Cerrar tasas y expediente de Tráfico',
    icon: 'Banknote',
    state: 'pending',
    summary: 'Monta un expediente por ramas: identidad, adquisición, técnica, fiscalidad, IVTM y tasa.',
    what: 'Verificar el trámite y la tasa vigentes en la sede de la DGT, ordenar originales y justificantes y preparar representación si actúa otra persona. No añadas documentos por intuición: marca cada uno como aplicable, no aplicable o pendiente de confirmar.',
    need: [
      'Solicitud, identidad y, cuando proceda, representación',
      'Prueba de adquisición y situación fiscal aplicable',
      'Tarjeta ITV española y documentación extranjera requerida',
      'Justificantes de IEDMT, IVTM y tasa que correspondan',
    ],
    errors: [
      'Pagar una tasa distinta o usar un justificante caducado/no vinculable',
      'Meter COC, Modelo 576 o empadronamiento en todos los expedientes como requisitos universales',
      'No conservar originales o traducciones cuando sean necesarios',
    ],
    linkedModule: {
      href: '/app/checklist/pre-dgt',
      label: 'Revisar checklist pre-DGT',
      available: true,
    },
    why: 'Una revisión por ramas permite detectar exactamente qué falta sin confundir documentos alternativos con acumulativos.',
    consult: 'Comprueba la ficha del trámite vigente en la DGT cuando el titular sea una empresa, exista representación, falten documentos extranjeros o el caso tenga particularidades fiscales.',
  },
  {
    n: 8,
    id: 'dgt',
    title: 'Presentar la matriculación en DGT',
    icon: 'ScrollText',
    state: 'pending',
    summary: 'Presenta el expediente aplicable por el canal admitido y atiende cualquier subsanación.',
    what: 'Presentar la solicitud con los documentos y justificantes que correspondan. Si la DGT requiere subsanar, registra la petición concreta, su plazo y la fuente del documento antes de responder.',
    need: [
      'Expediente final revisado y justificantes vinculables al vehículo y titular',
      'Canal de presentación y cita cuando sean necesarios',
      'Medio para recibir notificaciones o requerimientos',
    ],
    errors: [
      'Prometer que toda presentación termina en una sola visita',
      'Corregir una discrepancia en un documento sin actualizar los demás',
      'Circular solo porque el expediente ya se presentó',
    ],
    delicate: true,
    linkedModule: {
      href: '/app/checklist/pre-dgt',
      label: 'Volver a la revisión pre-DGT',
      available: true,
    },
    why: 'La DGT decide sobre el expediente aportado; una solicitud completa reduce incidencias, pero no sustituye la revisión administrativa.',
    consult: 'Busca ayuda profesional si recibes un requerimiento que cuestiona titularidad, homologación, tributación, importación o autenticidad documental.',
  },
  {
    n: 9,
    id: 'placas-seguro',
    title: 'Permiso, placas, seguro y archivo',
    icon: 'KeyRound',
    state: 'pending',
    summary: 'Cierra el expediente solo cuando la matrícula esté asignada y la circulación sea legal.',
    what: 'Comprobar los datos del permiso de circulación y de la tarjeta ITV, fabricar las placas con la matrícula asignada, activar el seguro obligatorio antes de circular y archivar el expediente completo.',
    need: [
      'Matrícula asignada y permiso de circulación',
      'Tarjeta ITV española sin discrepancias pendientes',
      'Seguro vigente antes de poner el vehículo en circulación',
      'Copias de documentos, recibos y resoluciones finales',
    ],
    errors: [
      'Fabricar placas con un dato provisional o circular sin seguro',
      'No revisar errores en VIN, titular, categoría o fechas de los documentos españoles',
      'Perder justificantes que pueden hacer falta en futuras transferencias o inspecciones',
    ],
    why: 'El cierre ordenado evita que una incidencia administrativa reaparezca en la siguiente ITV, venta o gestión fiscal.',
    consult: 'Consulta a la DGT, ITV o aseguradora antes de circular si el permiso es provisional, hay limitaciones anotadas o persiste cualquier discrepancia.',
  },
];
