export interface EmailTemplate {
  id: string;
  code: string;
  title: string;
  purpose: string;
  when: string;
  subject: string;
  body: string;
  notes?: string[];
}

export const EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    id: 'solicitar-coc', code: 'T.01', title: 'Solicitar el COC',
    purpose: 'Pedir al fabricante o representante un certificado de conformidad vinculado al VIN.',
    when: 'Cuando existe homologación de tipo UE identificable y necesitas confirmar si puede emitirse un COC válido.',
    subject: 'Solicitud de COC · [MARCA] [MODELO] · VIN [VIN]',
    body: `Buenos días:

Solicito información para obtener el certificado de conformidad del siguiente vehículo:

· Marca y modelo: [MARCA] [MODELO]
· VIN: [VIN]
· Año de primera matriculación: [AÑO]
· País de matriculación: [PAÍS]
· Categoría declarada: [CATEGORÍA]
· Campo K / homologación: [CAMPO K]

¿Pueden confirmar si existe un COC válido para este VIN, el procedimiento de solicitud y la documentación necesaria?

Gracias.
[NOMBRE Y DATOS DE CONTACTO]`,
    notes: ['Comprueba que el documento emitido corresponde exactamente al VIN.', 'La disponibilidad de un COC no sustituye la comprobación de su validez técnica.'],
  },
  {
    id: 'consultar-ficha-reducida', code: 'T.02', title: 'Consultar ficha reducida',
    purpose: 'Consultar si el supuesto técnico permite documentarse mediante ficha reducida y quién puede emitirla.',
    when: 'Cuando se identifica homologación UE, pero no existe COC válido o disponible.',
    subject: 'Consulta de ficha reducida · [MARCA] [MODELO] · [VIN]',
    body: `Buenos días:

Estoy preparando la matriculación en España de este vehículo:

· Marca y modelo: [MARCA] [MODELO]
· VIN: [VIN]
· País de matriculación: [PAÍS]
· Categoría: [CATEGORÍA]
· Campo K / homologación: [CAMPO K]
· COC disponible: [COC]
· Posibles reformas: [REFORMAS]

¿Pueden confirmar si, para este supuesto concreto, es técnicamente válida una ficha reducida, qué documentación de origen necesitan y quién puede emitirla?

Adjuntaré los documentos y fotografías que me indiquen.

Gracias.
[NOMBRE Y DATOS DE CONTACTO]`,
    notes: ['Según el caso puede proceder del fabricante, servicio técnico designado o técnico competente.', 'No presupone que una ficha reducida resuelva una homologación individual.'],
  },
  {
    id: 'consultar-equivalencia', code: 'T.03', title: 'Consultar equivalencia de homologación',
    purpose: 'Plantear una homologación individual o serie corta concedida en otro Estado del EEE.',
    when: 'Cuando la contraseña no es una homologación UE ordinaria o la documentación indica homologación individual/serie corta.',
    subject: 'Consulta de equivalencia o autorización · VIN [VIN]',
    body: `Buenos días:

Solicito una revisión previa de la vía técnica aplicable al vehículo:

· Marca y modelo: [MARCA] [MODELO]
· VIN: [VIN]
· Año: [AÑO]
· País de matriculación: [PAÍS]
· Categoría: [CATEGORÍA]
· Campo K / homologación: [CAMPO K]
· COC: [COC]
· Reformas o diferencias conocidas: [REFORMAS]

La documentación parece corresponder a una homologación individual o de serie corta. ¿Qué procedimiento de equivalencia, autorización española u homologación individual debe revisarse antes de solicitar ITV?

Gracias.
[NOMBRE Y DATOS DE CONTACTO]`,
  },
  {
    id: 'consulta-itv-previa', code: 'T.04', title: 'Consultar ITV previa',
    purpose: 'Confirmar con una estación el tipo de inspección y el paquete documental del vehículo concreto.',
    when: 'Antes de pedir cita para una inspección previa a matriculación.',
    subject: 'Consulta previa ITV de matriculación · [MARCA] [MODELO] · [VIN]',
    body: `Buenos días:

Quiero solicitar una inspección previa a matriculación para el siguiente vehículo:

· Marca y modelo: [MARCA] [MODELO]
· VIN: [VIN]
· País de matriculación: [PAÍS]
· Categoría: [CATEGORÍA]
· Campo K / homologación: [CAMPO K]
· COC: [COC]
· Posibles reformas: [REFORMAS]

¿Pueden confirmar el tipo de inspección que debo solicitar, los originales que debo presentar y si necesitan revisar previamente la documentación técnica?

Gracias.
[NOMBRE Y DATOS DE CONTACTO]`,
    notes: ['No presupone que una inspección extranjera vigente sustituya la inspección española.', 'Adjunta documentos completos sólo por un canal autorizado por la estación.'],
  },
  {
    id: 'aclaracion-factura', code: 'T.05', title: 'Solicitar aclaración de factura',
    purpose: 'Pedir al vendedor profesional que identifique las partes, el vehículo y el régimen fiscal aplicado.',
    when: 'Cuando la factura es ambigua, falta el número de IVA o no permite distinguir el tratamiento fiscal.',
    subject: 'Aclaración de factura · [MARCA] [MODELO] · VIN [VIN]',
    body: `Buenos días:

Para preparar la matriculación y justificar la adquisición del vehículo [MARCA] [MODELO], VIN [VIN], necesito que la factura identifique claramente:

· Los datos completos y número de IVA del vendedor.
· Los datos del comprador.
· VIN, precio, moneda y fecha de entrega.
· El régimen de IVA aplicado y, si corresponde, su mención fiscal.

¿Pueden revisar la factura y emitir una versión corregida o una aclaración formal? No necesito una declaración genérica de «IVA pagado», sino identificar el tratamiento aplicado a esta operación.

Gracias.
[NOMBRE Y DATOS DE CONTACTO]`,
  },
  {
    id: 'duplicado-documental', code: 'T.06', title: 'Solicitar duplicado documental',
    purpose: 'Pedir un duplicado o certificado del permiso/documento técnico de origen.',
    when: 'Cuando falta un original, está incompleto o sus datos no son legibles.',
    subject: 'Solicitud de duplicado documental · VIN [VIN]',
    body: `Buenos días:

Solicito información para obtener un duplicado o certificado oficial relativo al vehículo:

· Marca y modelo: [MARCA] [MODELO]
· VIN: [VIN]
· Año: [AÑO]
· País de matriculación: [PAÍS]
· Documento que falta o debe sustituirse: [DOCUMENTO PENDIENTE]

¿Pueden indicar quién está legitimado para solicitarlo, qué acreditación de titularidad necesitan y cómo se entrega el documento válido?

Gracias.
[NOMBRE Y DATOS DE CONTACTO]`,
  },
  {
    id: 'consulta-reforma', code: 'T.07', title: 'Consultar una posible reforma',
    purpose: 'Pedir una clasificación técnica de modificaciones sin anticipar un veredicto.',
    when: 'Cuando hay cambios respecto de la configuración documentada o dudas sobre el Manual de Reformas.',
    subject: 'Consulta de posibles reformas · [MARCA] [MODELO] · [VIN]',
    body: `Buenos días:

Estoy preparando la matriculación de este vehículo:

· Marca y modelo: [MARCA] [MODELO]
· VIN: [VIN]
· Categoría: [CATEGORÍA]
· Campo K / homologación: [CAMPO K]
· Modificaciones identificadas: [REFORMAS]

¿Pueden revisar si estas modificaciones están amparadas por la homologación o si encajan en algún código del Manual de Reformas? En ese caso, agradecería que indiquen la documentación técnica exigible para regularizarlas.

Adjuntaré fotografías, medidas y referencias de las piezas disponibles.

Gracias.
[NOMBRE Y DATOS DE CONTACTO]`,
    notes: ['Una pieza aftermarket no implica por sí sola una reforma, pero debe compararse con la configuración homologada.', 'La respuesta puede requerir fabricante, taller, servicio técnico o ingeniería según el caso.'],
  },
];
