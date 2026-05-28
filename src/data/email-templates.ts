export interface EmailTemplate {
  id: string;
  code: string;
  title: string;
  /** Para qué sirve */
  purpose: string;
  /** Cuándo usarla */
  when: string;
  subject: string;
  body: string;
  /** Notas opcionales */
  notes?: string[];
}

export const EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    id: 'pedir-cita-mat',
    code: 'T.01',
    title: 'Pedir cita de matriculación',
    purpose: 'Solicitar formalmente cita en la estación ITV para hacer la inspección de matriculación de un vehículo importado.',
    when: 'Antes de ir a la ITV. Algunas estaciones aceptan cita por email, otras requieren teléfono.',
    subject: 'Solicitud de cita · ITV de matriculación de vehículo importado',
    body: `Buenos días,

Quiero solicitar cita para realizar la ITV de matriculación de un vehículo importado de [PAÍS DE ORIGEN].

Datos del vehículo:
· Marca y modelo: [MARCA] [MODELO]
· Año: [AÑO]
· Bastidor (VIN): [VIN COMPLETO]
· Disponibilidad de COC: [SÍ / NO]

Indico que es una ITV de MATRICULACIÓN (no periódica), por si necesitan reservar un slot específico o un técnico cualificado para emisión de ficha técnica.

Adjunto fotos del coche y de la documentación de origen para que puedan revisar previamente, si lo ven útil.

Quedo a la espera de día y hora propuestos.

Gracias y un saludo,
[TU NOMBRE]
[TELÉFONO]
[DNI/NIE]`,
    notes: [
      'Sustituye los corchetes por tus datos reales.',
      'Si no sabes el VIN, ponlo igualmente o indica que lo confirmarás al llegar.',
    ],
  },
  {
    id: 'consulta-previa',
    code: 'T.02',
    title: 'Consulta previa a la compra',
    purpose: 'Preguntar a una estación ITV si tu caso concreto va a tener problemas antes de comprar un coche.',
    when: 'Antes de comprar, cuando tienes dudas sobre si el coche se podrá matricular.',
    subject: 'Consulta previa · Viabilidad de matriculación de vehículo de importación',
    body: `Buenos días,

Estoy valorando comprar un vehículo en [PAÍS DE ORIGEN] para matricularlo en España, y me gustaría hacer una consulta previa antes de cerrar la operación.

Datos del vehículo:
· Marca y modelo: [MARCA] [MODELO]
· Año: [AÑO]
· Bastidor (VIN): [VIN]
· Documentación disponible: COC [SÍ / NO], permiso de circulación de origen, factura.
· Modificaciones: [DETALLE SI LAS HAY o "ninguna"]

Mis dudas concretas:
· [LISTA NUMERADA DE LO QUE TE PREOCUPA: bastidor, reformas, COC, etc.]

¿Podrían indicarme si ven algún punto que pudiera ser problemático antes de proceder con la compra? Cualquier orientación me ayudaría a evitar sorpresas.

Adjunto documentación disponible.

Gracias por su tiempo,
[TU NOMBRE]
[TELÉFONO]`,
    notes: [
      'Útil sobre todo si tienes dudas: VIN, reformas, factura de empresa, etc.',
      'No todas las estaciones responden a consultas previas, pero merece la pena intentarlo.',
    ],
  },
  {
    id: 'aclaracion-defecto',
    code: 'T.03',
    title: 'Aclaración tras defecto en ITV',
    purpose: 'Pedir detalles tras un resultado desfavorable para entender qué corregir antes de la segunda visita.',
    when: 'Después de una ITV desfavorable, cuando el informe no es del todo claro.',
    subject: 'Solicitud de aclaración · Informe ITV [FECHA] · [MATRÍCULA O VIN]',
    body: `Buenos días,

El día [FECHA] realicé en su estación una ITV de matriculación que resultó desfavorable. El número de expediente / matrícula provisional / VIN es: [DATO].

Tras revisar el informe, me gustaría aclarar algunos puntos para preparar la segunda visita:

1. [DEFECTO 1 según informe]
   ¿Pueden indicarme con más detalle qué corrección esperan ver?

2. [DEFECTO 2 según informe]
   ¿Es algo que puedo resolver yo o necesito ir a un taller específico?

Mi intención es volver con todo subsanado en la siguiente cita. Cualquier orientación adicional me sería muy útil.

Gracias por su tiempo,
[TU NOMBRE]
[TELÉFONO]`,
  },
  {
    id: 'reforma-consulta',
    code: 'T.04',
    title: 'Consulta sobre reformas / modificaciones',
    purpose: 'Preguntar si una modificación concreta del coche necesita homologación específica o ingeniero.',
    when: 'Cuando tu coche tiene escape aftermarket, suspensión rebajada, kit estético, etc.',
    subject: 'Consulta sobre reformas · Viabilidad para ITV de matriculación',
    body: `Buenos días,

Voy a matricular un vehículo importado y tiene las siguientes modificaciones respecto a su configuración de fábrica:

1. [MODIFICACIÓN 1]: [DESCRIPCIÓN BREVE]
2. [MODIFICACIÓN 2]: [DESCRIPCIÓN BREVE]

¿Podrían indicarme si estas modificaciones:
· Se pueden mantener al matricular (con homologación específica),
· Necesitan informe de ingeniero o laboratorio acreditado,
· O directamente impedirán matricular en su configuración actual?

Si necesito gestionar homologación adicional, agradecería que me orienten sobre qué tipo de profesional / informe es el correcto para mi caso.

Gracias y un saludo,
[TU NOMBRE]
[TELÉFONO]`,
    notes: [
      'MatriculaPRO no cubre homologación de reformas en profundidad.',
      'Para casos serios, contacta con un ingeniero acreditado o laboratorio.',
    ],
  },
  {
    id: 'cita-segunda',
    code: 'T.05',
    title: 'Pedir cita para segunda inspección',
    purpose: 'Solicitar la segunda visita tras corregir defectos.',
    when: 'Después de un resultado desfavorable, una vez has subsanado las incidencias.',
    subject: 'Cita para segunda inspección · ITV matriculación · [VIN]',
    body: `Buenos días,

El día [FECHA] realicé en su estación una ITV de matriculación que resultó desfavorable (expediente / VIN: [DATO]).

He subsanado los defectos indicados en el informe:
· [DEFECTO 1] → [CÓMO LO HAS CORREGIDO]
· [DEFECTO 2] → [CÓMO LO HAS CORREGIDO]

Quería solicitar cita para la segunda inspección dentro del plazo previsto. Adjunto justificantes / fotografías de las correcciones realizadas, por si les facilita el trámite.

Quedo a la espera de la cita que me indiquen.

Gracias por su atención,
[TU NOMBRE]
[TELÉFONO]`,
  },
];
