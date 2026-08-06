export type SeoGuideSource = {
  id: string;
  authority: string;
  label: string;
  url: string;
};

export type SeoGuideSection = {
  title: string;
  paragraphs: string[];
  bullets?: string[];
  warning?: string;
  sourceIds?: string[];
};

export type SeoGuide = {
  path: string;
  shortTitle: string;
  metaTitle: string;
  title: string;
  description: string;
  eyebrow: string;
  intro: string;
  reviewDateIso: string;
  reviewDateLabel: string;
  sections: SeoGuideSection[];
  sources: SeoGuideSource[];
  related: Array<{ href: string; label: string }>;
};

const REVIEW_DATE_ISO = '2026-08-05';
const REVIEW_DATE_LABEL = '5 de agosto de 2026';

const sources = {
  dgtEu: {
    id: 'dgt-eu', authority: 'DGT', label: 'DGT: matricular un vehículo proveniente de la UE',
    url: 'https://www.dgt.es/nuestros-servicios/tu-vehiculo/quieres-traer-o-llevarte-un-vehiculo-del-extranjero/matricular-un-vehiculo-proveniente-de-la-ue/',
  },
  dgtNonEu: {
    id: 'dgt-non-eu', authority: 'DGT', label: 'DGT: importar un vehículo de fuera de la UE',
    url: 'https://www.dgt.es/nuestros-servicios/tu-vehiculo/quieres-traer-o-llevarte-un-vehiculo-del-extranjero/importar-un-vehiculo-de-fuera-de-la-ue/index.html',
  },
  aeat576: {
    id: 'aeat-576', authority: 'AEAT', label: 'Agencia Tributaria: Modelo 576',
    url: 'https://sede.agenciatributaria.gob.es/Sede/vehiculos-embarcaciones/primera-matriculacion-medios-transporte/modelo-576.html',
  },
  aeat576Instructions: {
    id: 'aeat-576-instructions', authority: 'AEAT', label: 'Agencia Tributaria: instrucciones del Modelo 576',
    url: 'https://sede.agenciatributaria.gob.es/Sede/todas-gestiones/impuestos-tasas/impuesto-matriculacion/modelo-576-impue_____eterminados-medios-transporte-autoliquidacion_/instrucciones.html',
  },
  aeat05: {
    id: 'aeat-05', authority: 'AEAT', label: 'Agencia Tributaria: Modelo 05',
    url: 'https://sede.agenciatributaria.gob.es/Sede/vehiculos-embarcaciones/primera-matriculacion-medios-transporte/modelo-05.html',
  },
  aeat06: {
    id: 'aeat-06', authority: 'AEAT', label: 'Agencia Tributaria: Modelo 06',
    url: 'https://sede.agenciatributaria.gob.es/Sede/vehiculos-embarcaciones/primera-matriculacion-medios-transporte/modelo-06.html',
  },
  boeTables2026: {
    id: 'boe-tables-2026', authority: 'BOE', label: 'Orden HAC/1501/2025: precios medios de venta aplicables en 2026',
    url: 'https://www.boe.es/buscar/doc.php?id=BOE-A-2025-26357',
  },
  boeExcise: {
    id: 'boe-excise', authority: 'BOE', label: 'Ley 38/1992, de Impuestos Especiales',
    url: 'https://www.boe.es/buscar/act.php?id=BOE-A-1992-28741',
  },
  boeHomologation: {
    id: 'boe-homologation', authority: 'BOE', label: 'Real Decreto 750/2010 sobre homologación de vehículos',
    url: 'https://www.boe.es/buscar/act.php?id=BOE-A-2010-9994',
  },
  industryItv: {
    id: 'industry-itv', authority: 'Industria', label: 'Ministerio de Industria: inspección técnica de vehículos',
    url: 'https://industria.gob.es/Calidad-Industrial/vehiculos/Paginas/inspeccion-tecnica-vehiculos.aspx',
  },
  euVat: {
    id: 'eu-vat', authority: 'Unión Europea', label: 'Your Europe: IVA al comprar o vender un vehículo en el extranjero',
    url: 'https://europa.eu/youreurope/citizens/vehicles/cars/vat-buying-selling-cars/index_es.htm',
  },
  euRegistration: {
    id: 'eu-registration', authority: 'Unión Europea', label: 'Your Europe: documentación y trámites para matricular vehículos en la UE',
    url: 'https://europa.eu/youreurope/citizens/vehicles/registration/formalities/index_es.htm',
  },
  euFieldK: {
    id: 'eu-field-k', authority: 'EUR-Lex', label: 'Directiva 1999/37/CE relativa a los documentos de matriculación',
    url: 'https://eur-lex.europa.eu/legal-content/ES/TXT/?uri=CELEX:31999L0037',
  },
} satisfies Record<string, SeoGuideSource>;

const common = {
  reviewDateIso: REVIEW_DATE_ISO,
  reviewDateLabel: REVIEW_DATE_LABEL,
};

export const SEO_GUIDES: Record<string, SeoGuide> = {
  documentation: {
    ...common,
    path: '/comprobar-documentacion-coche-importado',
    shortTitle: 'Comprobar documentación',
    metaTitle: 'Cómo comprobar la documentación de un coche importado',
    title: 'Qué comprobar en la documentación de un coche importado antes de comprar',
    description: 'Lista razonada para revisar titularidad, permiso extranjero, COC, homologación, CO₂ y coherencia documental antes de pagar un coche importado.',
    eyebrow: 'Antes de comprar',
    intro: 'Una matrícula extranjera y un anuncio convincente no prueban que el expediente esté completo. La comprobación útil consiste en cruzar identidad, titularidad, homologación, fiscalidad y estado real del vehículo antes de entregar dinero.',
    sections: [
      {
        title: 'Empieza por demostrar quién vende y qué vehículo vende',
        paragraphs: [
          'Pide el permiso de circulación original, el número de bastidor completo y un documento de compraventa o factura que identifique a vendedor, comprador, vehículo, precio y fecha. La denominación comercial del anuncio debe coincidir con la versión que aparece en la documentación técnica.',
          'Si la compra es entre particulares dentro de la UE, la DGT exige contrato acompañado de traducción e Impuesto sobre Transmisiones Patrimoniales. Si vende un profesional de otro Estado miembro, la factura debe reflejar su número de IVA. La ruta cambia si el vehículo ya era del titular y llega por traslado de residencia.',
        ],
        bullets: ['Permiso de circulación extranjero original y todas sus partes.', 'VIN idéntico en vehículo, permiso, factura o contrato y documentación técnica.', 'Identidad y capacidad del vendedor para transmitir la propiedad.', 'Factura o contrato sin espacios en blanco y con precio real.'],
        sourceIds: ['dgt-eu'],
      },
      {
        title: 'Comprueba la ruta técnica antes de confiar en un COC',
        paragraphs: [
          'El Certificado de Conformidad europeo puede sustituir a una ficha reducida cuando existe una homologación de tipo europea válida para ese vehículo. No basta con que un PDF lleve el título “COC”: el VIN, variante, versión, contraseña de homologación, masas, potencia y emisiones deben corresponder al coche.',
          'La ausencia de COC no hace imposible por sí sola la matriculación, pero puede exigir ficha reducida, acreditación de equivalencia u homologación individual. Reformas, luces, enganches, suspensiones, carrocerías o neumáticos distintos pueden abrir una ruta técnica diferente.',
        ],
        sourceIds: ['boe-homologation', 'industry-itv'],
      },
      {
        title: 'Datos que cambian impuestos y viabilidad',
        paragraphs: [
          'Fecha de primera puesta en servicio, kilometraje, vendedor, país de procedencia y CO₂ no son detalles secundarios. Determinan si el medio de transporte puede ser nuevo a efectos de IVA, qué justificante fiscal corresponde y qué epígrafe puede aplicar en el impuesto de matriculación.',
          'Anota quién aportó cada dato y dónde aparece. Si dos documentos discrepan, no elijas el valor más favorable: marca la contradicción y pide aclaración escrita antes de pagar.',
        ],
        bullets: ['Primera matriculación o puesta en servicio.', 'Kilometraje actual acreditable.', 'Emisiones oficiales y ciclo de medición.', 'Categoría, combustible y uso especial.', 'País de procedencia y condición del vendedor.'],
        sourceIds: ['eu-vat', 'aeat-576-instructions'],
      },
      {
        title: 'Qué puede decir una comprobación preliminar',
        paragraphs: [
          'Una revisión manual puede señalar documentos ausentes, contradicciones y rutas probables. No certifica autenticidad ni garantiza que ITV, AEAT o DGT acepten el expediente. El resultado correcto distingue “introducido por el usuario” de “procedente de fuente oficial” y deja visibles los bloqueos.',
        ],
        warning: 'No pagues basándote solo en una captura, un informe automático o la promesa de que “se matricula sin problema”. Si la homologación o la fiscalidad no están claras, consulta antes con el organismo o profesional competente.',
      },
    ],
    sources: [sources.dgtEu, sources.boeHomologation, sources.industryItv, sources.euVat, sources.aeat576Instructions],
    related: [
      { href: '/campo-k-coche-importado', label: 'Qué significa el campo K' },
      { href: '/coc-vehiculo-importado', label: 'Cómo revisar un COC' },
      { href: '/matricular-coche-alemania', label: 'Ruta para un coche de Alemania' },
    ],
  },
  model576: {
    ...common,
    path: '/calcular-modelo-576',
    shortTitle: 'Calcular Modelo 576',
    metaTitle: 'Calcular el Modelo 576 de un coche importado',
    title: 'Cómo preparar el cálculo del Modelo 576 sin ocultar los supuestos',
    description: 'Explicación del Modelo 576, su base imponible, epígrafe por CO₂, cuota y límites de una calculadora trazable.',
    eyebrow: 'Impuesto de matriculación',
    intro: 'El Modelo 576 es la autoliquidación general para medios de transporte sujetos y no exentos. Prepararlo bien exige decidir primero la ruta fiscal, documentar la valoración y aplicar el tipo correspondiente a la fecha y al territorio.',
    sections: [
      {
        title: 'Primero confirma que la ruta es 576',
        paragraphs: [
          'No todos los vehículos utilizan el Modelo 576. Los supuestos de no sujeción, exención o reducción pueden requerir Modelo 05 o 06 y documentación específica. La calculadora debe pedir una confirmación expresa de que el medio de transporte está sujeto y no exento, sin deducirlo únicamente de la URL elegida.',
          'La AEAT indica que el 576 se emplea con carácter general para la autoliquidación y permite también declaraciones complementarias. La presentación oficial produce el Código Electrónico de Matriculación; un cálculo preparado por MatriculaPro no lo produce.',
        ],
        sourceIds: ['aeat-576', 'aeat-05', 'aeat-06'],
      },
      {
        title: 'Datos mínimos para un cálculo explicable',
        paragraphs: [
          'En un vehículo nuevo la base parte de la contraprestación o base imponible correspondiente. En un usado previamente matriculado en el extranjero puede utilizarse una valoración oficial de Hacienda con depreciación y minoración, o una valoración de mercado justificada.',
          'Además hacen falta fecha de devengo, primera matriculación, territorio, categoría, combustible, emisiones oficiales de CO₂ y posibles beneficios fiscales. Si el CO₂ exigible no se acredita o el territorio histórico no está versionado, el resultado debe bloquearse o derivarse a revisión.',
        ],
        bullets: ['Origen y condición de nuevo o usado.', 'Método de valoración y evidencia.', 'CO₂ oficial, categoría y tecnología de propulsión.', 'Comunidad autónoma de devengo.', 'Reducciones, deducciones o cantidades de una complementaria.'],
        sourceIds: ['aeat-576-instructions', 'boe-tables-2026'],
      },
      {
        title: 'De la base a las casillas',
        paragraphs: [
          'Una preparación trazable muestra la base imponible, la base reducida cuando procede, el epígrafe y tipo, la cuota, las deducciones oficiales admitidas, la cuota tras deducción, las cantidades anteriores en una complementaria y el resultado final.',
          'El redondeo debe hacerse en la salida monetaria y conservar la precisión durante el cálculo. Cada valor debe poder relacionarse con el dato de entrada y la regla aplicada, evitando importes “mágicos” que el usuario no pueda revisar.',
        ],
        sourceIds: ['aeat-576-instructions'],
      },
      {
        title: 'La calculadora prepara; la AEAT presenta',
        paragraphs: [
          'La presentación electrónica se realiza en la Sede de la AEAT con los medios de identificación admitidos y, cuando existe ingreso, con el procedimiento de pago correspondiente. MatriculaPro no presenta, no obtiene NRC o CEM y no confirma que Hacienda haya aceptado la valoración.',
        ],
        warning: 'No uses el resultado si faltan datos, hay una discrepancia de versión, se trata de un territorio foral o especial no soportado, o la documentación del CO₂ no se ha comprobado.',
        sourceIds: ['aeat-576'],
      },
    ],
    sources: [sources.aeat576, sources.aeat576Instructions, sources.aeat05, sources.aeat06, sources.boeTables2026],
    related: [
      { href: '/modelo-05-06-576', label: 'Diferencias entre 05, 06 y 576' },
      { href: '/tablas-hacienda-vehiculos-2026', label: 'Tablas de Hacienda 2026' },
      { href: '/impuesto-matriculacion-co2', label: 'Epígrafes por CO₂' },
    ],
  },
  tables2026: {
    ...common,
    path: '/tablas-hacienda-vehiculos-2026',
    shortTitle: 'Tablas Hacienda 2026',
    metaTitle: 'Tablas de Hacienda de vehículos 2026: cómo usarlas',
    title: 'Tablas de Hacienda de vehículos 2026: valor, versión y depreciación',
    description: 'Cómo localizar una versión en la Orden HAC/1501/2025 y aplicar el valor oficial y la depreciación sin seleccionar una coincidencia ambigua.',
    eyebrow: 'Valores oficiales 2026',
    intro: 'La tabla no ofrece “el precio de cualquier coche parecido”. Cada fila representa una combinación concreta de marca, modelo o tipo, combustible, cilindrada, potencia, periodo comercial y valor. Elegir bien la fila es parte del cálculo.',
    sections: [
      {
        title: 'Qué aprobó Hacienda para 2026',
        paragraphs: [
          'La Orden HAC/1501/2025 sustituyó los anexos del ejercicio anterior. Sus precios medios pueden utilizarse como medio de comprobación en varios impuestos, incluido el Impuesto Especial sobre Determinados Medios de Transporte.',
          'Para vehículos ya matriculados, el valor de la fila se combina con el porcentaje que corresponde por años de utilización. La propia Orden conserva también reglas específicas para la minoración de impuestos indirectos en usados procedentes del extranjero.',
        ],
        sourceIds: ['boe-tables-2026'],
      },
      {
        title: 'Cómo identificar una fila sin adivinar',
        paragraphs: [
          'Compara la denominación completa, combustible, cilindrada, potencia y años de comercialización. Abre la referencia oficial y contrasta el dato con la documentación real. Si aparecen dos filas compatibles, la interfaz debe pedir una selección consciente y conservar la referencia elegida.',
          'Una denominación de anuncio abreviada no basta. Paquetes comerciales, potencias cercanas, versiones automáticas y carrocerías distintas pueden tener valores diferentes aunque compartan el nombre principal.',
        ],
        bullets: ['Marca y modelo/tipo literal.', 'Energía o combustible.', 'Cilindrada y potencia.', 'Periodo de comercialización.', 'Valor oficial y referencia de la fila.'],
        warning: 'MatriculaPro no debe seleccionar automáticamente “el primer resultado” cuando quedan discrepancias que afectan al valor.',
        sourceIds: ['boe-tables-2026'],
      },
      {
        title: 'El valor de tabla no es aún la base imponible',
        paragraphs: [
          'En un usado se aplica primero el porcentaje de depreciación según los años de utilización. Después, para la primera matriculación definitiva en España, puede ser necesario minorar el importe residual de IVA, impuesto de matriculación y otros impuestos indirectos incluidos en el valor de mercado.',
          'La fecha fiscal inicial y el historial de uso profesional pueden cambiar el porcentaje. Los aniversarios exactos importan: aproximar la edad por años naturales puede situar el vehículo en un tramo incorrecto.',
        ],
        sourceIds: ['boe-tables-2026'],
      },
      {
        title: 'Qué hacer si el vehículo no aparece',
        paragraphs: [
          'No debe forzarse una fila de otro modelo. La alternativa es una valoración de mercado justificada con fecha, método, fuente y evidencias. Esa valoración sigue sujeta a comprobación por la Administración y debe quedar diferenciada del método oficial de tablas.',
        ],
      },
    ],
    sources: [sources.boeTables2026, sources.aeat576Instructions],
    related: [
      { href: '/minoracion-impuesto-matriculacion', label: 'Cómo funciona la minoración' },
      { href: '/calcular-modelo-576', label: 'Preparar el Modelo 576' },
      { href: '/coche-nuevo-seis-meses-6000-km', label: 'Nuevo o usado a efectos de IVA' },
    ],
  },
  reduction: {
    ...common,
    path: '/minoracion-impuesto-matriculacion',
    shortTitle: 'Minoración del impuesto',
    metaTitle: 'Minoración del impuesto de matriculación en vehículos usados',
    title: 'Minoración en vehículos usados: por qué el valor de tabla no se copia sin más',
    description: 'Explicación de la minoración de impuestos indirectos residuales en la base del Modelo 576 de vehículos usados importados.',
    eyebrow: 'Base imponible de usados',
    intro: 'El precio medio depreciado de un vehículo usado puede incorporar todavía una parte residual de impuestos pagados en su primera adquisición. La minoración evita usar esa parte como si fuera valor neto en la nueva matriculación.',
    sections: [
      {
        title: 'La regla oficial',
        paragraphs: [
          'La Orden de precios medios establece que, cuando un medio usado estuvo matriculado previamente en el extranjero y se matricula definitivamente por primera vez en España, del valor de mercado se minora el importe residual de los impuestos indirectos.',
          'El punto de partida VM es el valor oficial después de aplicar el porcentaje de depreciación. La base imponible se obtiene separando el componente residual de IVA, impuesto de matriculación histórico y, cuando existan, otros impuestos indirectos.',
        ],
        sourceIds: ['boe-tables-2026'],
      },
      {
        title: 'Por qué hacen falta tipos históricos',
        paragraphs: [
          'No se puede usar siempre el IVA o el tipo de matriculación actuales. Deben reconstruirse los tipos vigentes en la fecha fiscal inicial y el territorio correspondiente. También importa el epígrafe histórico derivado de las emisiones oficiales.',
          'Si una comunidad aplicó un tipo autonómico diferente o el vehículo estuvo en un territorio especial, la serie debe estar versionada con norma, artículo y fechas. Cuando esa cronología no está suficientemente acreditada, el cálculo responsable se bloquea.',
        ],
        sourceIds: ['boe-excise', 'boe-tables-2026'],
      },
      {
        title: 'Ejemplo conceptual, no una autoliquidación',
        paragraphs: [
          'Imagina un valor oficial de 20.000 euros al que corresponde un 34% por antigüedad. El valor de mercado depreciado sería 6.800 euros. La base no se obtiene restando porcentajes directamente: se divide por el factor que representa los impuestos indirectos históricos incluidos.',
          'El ejemplo solo explica la estructura. Para calcular un caso real hacen falta fechas exactas, territorio, CO₂ acreditado, tipo histórico, otros impuestos y la fila oficial correcta.',
        ],
        warning: 'Confirmar “no hubo otros impuestos” sin revisar la operación puede infravalorar o distorsionar la base. Esa ausencia debe ser declarada conscientemente por el usuario.',
      },
      {
        title: 'Trazabilidad que debes conservar',
        bullets: ['Fila y valor oficial utilizados.', 'Fecha y porcentaje exacto de depreciación.', 'Fecha fiscal inicial y territorio.', 'IVA e IEDMT históricos con su fuente.', 'Otros impuestos confirmados o pendientes.', 'Operación decimal y redondeo final.'],
        paragraphs: ['Una salida útil permite reconstruir la fórmula y explica por qué un dato está calculado, procede de tabla o sigue pendiente de comprobar documentalmente.'],
      },
    ],
    sources: [sources.boeTables2026, sources.boeExcise, sources.aeat576Instructions],
    related: [
      { href: '/tablas-hacienda-vehiculos-2026', label: 'Seleccionar el valor oficial' },
      { href: '/calcular-modelo-576', label: 'Casillas del Modelo 576' },
      { href: '/impuesto-matriculacion-co2', label: 'Tipos por CO₂' },
    ],
  },
  models: {
    ...common,
    path: '/modelo-05-06-576',
    shortTitle: 'Modelos 05, 06 y 576',
    metaTitle: 'Modelo 05, 06 o 576: diferencias antes de matricular',
    title: 'Modelo 05, 06 o 576: la ruta depende del supuesto, no del resultado deseado',
    description: 'Diferencias entre solicitud con reconocimiento previo, declaración sin reconocimiento previo y autoliquidación del impuesto de matriculación.',
    eyebrow: 'Ruta fiscal',
    intro: 'Elegir el formulario no consiste en buscar el que produce cuota cero. La situación del medio de transporte y del titular determina si existe sujeción, exención, no sujeción, reducción o una autoliquidación ordinaria.',
    sections: [
      {
        title: 'Modelo 05: hace falta reconocimiento previo',
        paragraphs: [
          'La AEAT define el Modelo 05 para supuestos de no sujeción, exención o reducción que requieren reconocimiento previo. Se presenta antes de la matriculación definitiva y esta no puede completarse hasta que la Administración reconoce el beneficio.',
          'La solicitud necesita la documentación específica del supuesto invocado. Marcar una casilla en una herramienta privada no equivale al reconocimiento de la AEAT.',
        ],
        sourceIds: ['aeat-05'],
      },
      {
        title: 'Modelo 06: declaración sin reconocimiento previo',
        paragraphs: [
          'El Modelo 06 cubre determinados supuestos de exención o no sujeción en los que no se exige una concesión previa. Aun así, se presenta antes de la matriculación y debe acompañarse de la documentación que corresponda.',
          'La AEAT explica que algunos supuestos se relacionan con las características constructivas del vehículo y otros con el titular o el traslado de residencia. La forma de presentación puede variar para ciudadanos y gestores.',
        ],
        sourceIds: ['aeat-06'],
      },
      {
        title: 'Modelo 576: autoliquidación',
        paragraphs: [
          'El 576 es la autoliquidación general de medios sujetos y no exentos. Determina una cuota a ingresar, que también puede ser cero por el epígrafe aplicable, y contempla complementarias. Que la cuota resulte cero no transforma el caso en un Modelo 05 o 06.',
        ],
        sourceIds: ['aeat-576', 'aeat-576-instructions'],
      },
      {
        title: 'Preguntas antes de escoger',
        paragraphs: ['La decisión debe quedar vinculada al supuesto legal y a la evidencia disponible, no a una preferencia del usuario por una cuota concreta.'],
        bullets: ['¿El hecho está sujeto al impuesto?', '¿Existe una exención o no sujeción concreta?', '¿Requiere reconocimiento previo?', '¿La reducción debe concederse antes de autoliquidar?', '¿Qué documentos acreditan el supuesto?', '¿La competencia corresponde a AEAT o a una Hacienda foral?'],
        warning: 'Cuando la respuesta depende de hechos personales o documentación que MatriculaPro no puede inspeccionar, la ruta queda pendiente de comprobar y no debe automatizarse.',
      },
    ],
    sources: [sources.aeat05, sources.aeat06, sources.aeat576, sources.aeat576Instructions, sources.boeExcise],
    related: [
      { href: '/calcular-modelo-576', label: 'Cómo preparar el 576' },
      { href: '/impuesto-matriculacion-co2', label: 'Epígrafes y emisiones' },
      { href: '/comprobar-documentacion-coche-importado', label: 'Documentación antes de comprar' },
    ],
  },
  fieldK: {
    ...common,
    path: '/campo-k-coche-importado',
    shortTitle: 'Campo K',
    metaTitle: 'Campo K de un coche importado: qué revisar',
    title: 'Campo K en un coche importado: una pista sobre la homologación, no una garantía',
    description: 'Qué representa el campo K del permiso de circulación, cómo contrastarlo con el COC y cuándo consultar la ruta técnica antes de comprar.',
    eyebrow: 'Homologación y documentación',
    intro: 'El campo K se utiliza en el formato europeo de los documentos de matriculación para la homologación de tipo. Es un dato valioso para orientar la ruta técnica, pero debe leerse junto con el VIN, el COC, la variante, la versión y el estado real del vehículo.',
    sections: [
      {
        title: 'Qué información aporta',
        paragraphs: [
          'La Directiva europea sobre documentos de matriculación identifica la letra K con el número de homologación de tipo, cuando esté disponible. Ese número ayuda a relacionar el vehículo con una aprobación técnica, pero la forma concreta del permiso y el grado de detalle pueden variar según país y fecha.',
          'En un vehículo procedente de la UE, la DGT pide acreditar que está homologado para circular en España mediante COC, ficha reducida u otra documentación admitida. Por eso el campo K sirve como señal inicial, no como sustituto de todo el expediente.',
        ],
        sourceIds: ['eu-field-k', 'dgt-eu'],
      },
      {
        title: 'Cómo contrastarlo',
        paragraphs: [
          'Copia el campo literalmente y compáralo con la contraseña de homologación del COC o ficha reducida. Revisa además que el VIN corresponda, que variante y versión sean compatibles y que el vehículo conserve la configuración homologada.',
          'Una fotografía borrosa, un carácter omitido o confundir el campo K con otro código puede llevar a una conclusión incorrecta. Pide una imagen legible del documento completo y conserva el contexto de país y fecha de expedición.',
        ],
        bullets: ['Campo K completo, sin recortes.', 'VIN coincidente en todos los documentos.', 'Contraseña del COC o ficha reducida.', 'Variante, versión y categoría.', 'Reformas o componentes que alteren la configuración.'],
        sourceIds: ['boe-homologation'],
      },
      {
        title: 'Si está vacío o no coincide',
        paragraphs: [
          'Un campo vacío no significa automáticamente que el vehículo sea imposible de matricular. Puede tratarse de un documento antiguo, una homologación nacional, una serie corta o un caso que necesite equivalencia u homologación individual.',
          'Una discrepancia tampoco debe corregirse a mano ni resolverse eligiendo el dato más conveniente. Consulta con una estación ITV o un técnico competente antes de pagar, indicando VIN, permiso, COC disponible, país de origen y modificaciones.',
        ],
        warning: 'MatriculaPro no valida la autenticidad del permiso ni decide que una homologación sea aceptable. Marca el dato como introducido por el usuario y la comprobación documental como pendiente.',
        sourceIds: ['industry-itv', 'boe-homologation'],
      },
      {
        title: 'Pregunta útil para el vendedor',
        paragraphs: [
          'En vez de preguntar solo “¿tiene contraseña europea?”, solicita el permiso completo, el COC vinculado al VIN, fotografías de la placa del fabricante y una declaración de reformas. Esa respuesta permite comparar datos concretos y detectar antes un expediente que exige trabajo técnico adicional.',
        ],
      },
    ],
    sources: [sources.euFieldK, sources.dgtEu, sources.boeHomologation, sources.industryItv],
    related: [
      { href: '/coc-vehiculo-importado', label: 'Revisar el Certificado de Conformidad' },
      { href: '/comprobar-documentacion-coche-importado', label: 'Checklist documental previo' },
      { href: '/matricular-coche-alemania', label: 'Matricular un coche alemán' },
    ],
  },
  coc: {
    ...common,
    path: '/coc-vehiculo-importado',
    shortTitle: 'COC de vehículo importado',
    metaTitle: 'COC de un vehículo importado: qué es y cómo revisarlo',
    title: 'COC de un vehículo importado: qué resuelve y qué no resuelve',
    description: 'Guía para entender el Certificado de Conformidad europeo, comprobar su correspondencia con el vehículo y anticipar la ruta ITV.',
    eyebrow: 'Certificado de Conformidad',
    intro: 'El COC acredita que un vehículo corresponde a un tipo homologado conforme al marco europeo. Puede simplificar la obtención de la tarjeta ITV española, pero no reemplaza el permiso extranjero, la titularidad, la inspección ni la revisión de reformas.',
    sections: [
      {
        title: 'Por qué lo pide la ruta de matriculación',
        paragraphs: [
          'La DGT incluye el Certificado de Conformidad europeo entre los documentos que pueden acreditar la homologación para obtener la ficha ITV española. El Real Decreto 750/2010 permite aceptar un COC vinculado a una homologación de tipo CE como sustituto de la ficha reducida en los supuestos previstos.',
          'El fabricante emite el COC. Si se perdió, la DGT señala que puede solicitarse un duplicado a la marca; como alternativa puede proceder una ficha reducida u otra vía técnica según el caso.',
        ],
        sourceIds: ['dgt-eu', 'boe-homologation'],
      },
      {
        title: 'Datos que deben corresponder',
        paragraphs: [
          'El primer control es el VIN. Después conviene comparar fabricante, categoría, tipo, variante, versión, contraseña de homologación, masas, dimensiones, potencia, combustible, emisiones y neumáticos. No todos los campos tienen el mismo formato en todas las generaciones de COC.',
          'Una diferencia puede ser una errata, una adaptación de mercado o una reforma real. No la normalices sin evidencia: consérvala como contradicción y pregunta a la ITV qué documento admite para resolverla.',
        ],
        bullets: ['VIN y fabricante.', 'Tipo, variante, versión y categoría.', 'Número de homologación de tipo.', 'Masas y dimensiones.', 'Potencia, combustible y CO₂.', 'Neumáticos y configuración declarada.'],
        sourceIds: ['eu-registration', 'industry-itv'],
      },
      {
        title: 'COC no significa vehículo sin reformas',
        paragraphs: [
          'El certificado describe la configuración homologada de origen. Suspensión, enganche, llantas, iluminación, carrocería, plazas o transformación posterior pueden exigir documentación adicional aunque exista un COC válido.',
          'La inspección técnica identifica el vehículo y comprueba la concordancia entre documentos, categoría y configuración. Por eso deben comunicarse modificaciones aparentes antes de reservar la inspección.',
        ],
        warning: 'No compres un “COC genérico”, una plantilla o un documento cuyo VIN no coincide. MatriculaPro no autentica certificados ni consulta bases privadas de fabricantes.',
        sourceIds: ['industry-itv'],
      },
      {
        title: 'Cuándo preparar una alternativa',
        paragraphs: [
          'Si no existe homologación de tipo europea compatible, el vehículo es anterior, procede de una serie corta o llega de un mercado con especificaciones distintas, puede ser necesaria ficha reducida, equivalencia u homologación individual. Confírmalo con ITV o técnico competente antes de transportar el vehículo.',
        ],
        sourceIds: ['boe-homologation', 'dgt-non-eu'],
      },
    ],
    sources: [sources.dgtEu, sources.boeHomologation, sources.euRegistration, sources.industryItv, sources.dgtNonEu],
    related: [
      { href: '/campo-k-coche-importado', label: 'Interpretar el campo K' },
      { href: '/comprobar-documentacion-coche-importado', label: 'Comprobación documental completa' },
      { href: '/matricular-coche-alemania', label: 'Documentos de un coche alemán' },
    ],
  },
  germany: {
    ...common,
    path: '/matricular-coche-alemania',
    shortTitle: 'Coche de Alemania',
    metaTitle: 'Cómo matricular un coche de Alemania en España',
    title: 'Matricular un coche de Alemania en España: orden de documentos, ITV e impuestos',
    description: 'Ruta práctica para comprobar una compra en Alemania, obtener ficha ITV española, justificar impuestos y solicitar la matrícula en la DGT.',
    eyebrow: 'Vehículo procedente de la UE',
    intro: 'Alemania está dentro de la Unión Europea, pero eso no convierte la operación en automática. La ruta depende de quién vende, si el vehículo es nuevo a efectos de IVA, la homologación, la documentación original y el impuesto de matriculación.',
    sections: [
      {
        title: 'Antes de pagar en Alemania',
        paragraphs: [
          'Asegura la trazabilidad de la propiedad y pide toda la documentación original del vehículo. Si compra un particular, prepara contrato y traducción; si vende un profesional, revisa factura, identificación fiscal y régimen de IVA aplicado.',
          'Solicita el COC vinculado al VIN, revisa el campo K, compara kilometraje y fecha de primera matriculación, y pregunta por reformas. Aclara también cómo se trasladará el coche y qué matrícula o seguro temporal permitirá circular, si corresponde.',
        ],
        bullets: ['Permiso alemán completo y baja o situación de exportación.', 'Contrato o factura con VIN y precio real.', 'COC o alternativa técnica identificada.', 'Kilometraje, primera matriculación y CO₂.', 'Forma de transporte, placas y seguro vigentes.'],
        sourceIds: ['dgt-eu', 'eu-registration'],
      },
      {
        title: 'ITV para obtener la ficha española',
        paragraphs: [
          'La DGT sitúa la inspección técnica antes de la matriculación. La estación solicita permiso de circulación de origen, acreditación de homologación —COC, ficha reducida u otra admitida— y contrato o factura cuando el solicitante no figura como titular en el permiso.',
          'La ITV expide la tarjeta española si el resultado es favorable. Una reforma o una discrepancia técnica puede exigir documentos adicionales, por lo que conviene consultar la estación antes de desplazar el vehículo.',
        ],
        sourceIds: ['dgt-eu', 'industry-itv'],
      },
      {
        title: 'IVA e impuesto de matriculación',
        paragraphs: [
          'Para IVA, un medio de transporte es nuevo si no supera 6.000 km o si la entrega ocurre dentro de los seis meses desde la primera puesta en servicio. Un coche con poco kilometraje puede seguir siendo nuevo aunque tenga más de seis meses, y al revés.',
          'Después debe justificarse el impuesto de matriculación mediante el Modelo 576, 06 o 05 que corresponda y el impuesto municipal de circulación. El tipo del 576 se relaciona con CO₂, categoría, territorio y posibles beneficios fiscales.',
        ],
        sourceIds: ['eu-vat', 'dgt-eu', 'aeat-576'],
      },
      {
        title: 'DGT, permiso y placas',
        paragraphs: [
          'Con titularidad, tarjeta ITV española y justificantes fiscales, se solicita la matriculación en la DGT. Tras asignarse el número, se expide el permiso y pueden fabricarse las placas. Hasta entonces solo debe circularse con una matrícula temporal válida y seguro, o transportarse por otro medio autorizado.',
        ],
        warning: 'No uses una ruta alemana genérica si el vehículo viene de un tercero país, estuvo matriculado antes en España, pertenece a un traslado de residencia o tiene homologación no europea: esos hechos cambian los pasos.',
        sourceIds: ['dgt-eu'],
      },
    ],
    sources: [sources.dgtEu, sources.euRegistration, sources.euVat, sources.industryItv, sources.aeat576],
    related: [
      { href: '/comprobar-documentacion-coche-importado', label: 'Qué pedir antes de pagar' },
      { href: '/coche-nuevo-seis-meses-6000-km', label: 'Regla de seis meses y 6.000 km' },
      { href: '/modelo-05-06-576', label: 'Elegir el modelo fiscal' },
    ],
  },
  newVehicle: {
    ...common,
    path: '/coche-nuevo-seis-meses-6000-km',
    shortTitle: 'Seis meses y 6.000 km',
    metaTitle: 'Coche nuevo: regla de 6 meses o 6.000 km para IVA',
    title: 'Seis meses o 6.000 km: cuándo un coche usado comercialmente sigue siendo nuevo para IVA',
    description: 'Cómo funciona la doble regla europea de antigüedad y kilometraje al comprar un vehículo en otro país de la UE.',
    eyebrow: 'IVA intracomunitario',
    intro: '“Usado” en un anuncio no equivale necesariamente a usado a efectos de IVA. La norma europea aplica dos pruebas alternativas: basta con cumplir una para que el medio de transporte sea nuevo fiscalmente.',
    sections: [
      {
        title: 'La regla utiliza OR para nuevo y AND para usado',
        paragraphs: [
          'Un vehículo es nuevo a efectos de IVA si se entrega antes de transcurrir seis meses desde su primera puesta en servicio o si ha recorrido como máximo 6.000 km. Para ser usado debe superar ambos límites: más de seis meses y más de 6.000 km.',
          'Esto explica dos casos contraintuitivos: un coche de dos años con 4.000 km sigue siendo nuevo fiscalmente; uno de cuatro meses con 15.000 km también. Solo el vehículo que rebasa tiempo y kilometraje pasa ambas condiciones de usado.',
        ],
        sourceIds: ['eu-vat'],
      },
      {
        title: 'Fechas exactas, no meses aproximados',
        paragraphs: [
          'La fecha relevante es la entrega comparada con la primera puesta en servicio o primera matriculación documentada. Deben conservarse las fechas completas y calcular el aniversario de seis meses, incluyendo meses con distinta duración.',
          'Si la entrega es anterior al aniversario, el vehículo es nuevo por tiempo. En la propia frontera o después, el kilometraje aún puede mantener la condición de nuevo cuando no supera 6.000 km.',
        ],
        warning: 'No redondees “unos seis meses” ni “aproximadamente 6.000 km”. Un día o un kilómetro puede cambiar la ruta fiscal; conserva evidencia de fecha y lectura de kilometraje.',
        sourceIds: ['eu-vat'],
      },
      {
        title: 'Consecuencia de comprar en otro Estado miembro',
        paragraphs: [
          'Cuando un particular compra un medio de transporte nuevo en otro país de la UE para matricularlo en España, el IVA corresponde al país de destino conforme a la operativa aplicable. El comprador debe informar al vendedor del traslado para evitar una doble tributación mal gestionada y conservar los justificantes.',
          'La DGT menciona el justificante de pago del IVA para vehículos nuevos adquiridos en la UE. La forma concreta —por ejemplo, el modelo tributario correspondiente— debe confirmarse con la AEAT según el tipo de comprador y operación.',
        ],
        sourceIds: ['eu-vat', 'dgt-eu'],
      },
      {
        title: 'No confundas IVA con IEDMT',
        paragraphs: [
          'La clasificación nuevo/usado para IVA no decide por sí sola si hay cuota del impuesto de matriculación. Son análisis distintos: el IEDMT atiende a sujeción, exenciones, valoración, emisiones, categoría y territorio.',
        ],
        sourceIds: ['aeat-576-instructions'],
      },
    ],
    sources: [sources.euVat, sources.dgtEu, sources.aeat576Instructions],
    related: [
      { href: '/matricular-coche-alemania', label: 'Compra y matriculación desde Alemania' },
      { href: '/calcular-modelo-576', label: 'Preparar el Modelo 576' },
      { href: '/comprobar-documentacion-coche-importado', label: 'Documentos antes de comprar' },
    ],
  },
  co2: {
    ...common,
    path: '/impuesto-matriculacion-co2',
    shortTitle: 'Impuesto y CO₂',
    metaTitle: 'Impuesto de matriculación por CO₂: tramos y cautelas',
    title: 'CO₂ e impuesto de matriculación: el tramo es solo una parte del cálculo',
    description: 'Cómo influyen las emisiones oficiales en los epígrafes del impuesto de matriculación y por qué también importan fecha, categoría y territorio.',
    eyebrow: 'Epígrafes del IEDMT',
    intro: 'En turismos ordinarios, las emisiones oficiales orientan el epígrafe, pero no bastan para calcular la cuota. Antes deben confirmarse la categoría, el tipo de motor, la fecha de devengo, el territorio y la base imponible.',
    sections: [
      {
        title: 'Tramos estatales ordinarios',
        paragraphs: [
          'La Ley 38/1992 estructura los epígrafes ordinarios de turismos con límites de 120, 160 y 200 g/km: hasta 120; más de 120 y menos de 160; desde 160 y menos de 200; e igual o superior a 200. Un vehículo con un único motor no de combustión interna entra en el supuesto específico previsto en el primer epígrafe.',
          'Los límites jurídicos deben leerse literalmente. “Inferior a 160” y “no inferior a 160” colocan 160 exactamente en el tramo siguiente. Lo mismo ocurre en 200.',
        ],
        sourceIds: ['boe-excise', 'aeat-576-instructions'],
      },
      {
        title: 'El porcentaje depende del territorio',
        paragraphs: [
          'La ley establece tipos de referencia y permite tipos aprobados por comunidades autónomas en el marco aplicable. Canarias tiene una escala estatal distinta y Ceuta y Melilla reglas propias; Navarra y País Vasco requieren revisar su competencia foral.',
          'Por eso una calculadora no debe mostrar un porcentaje solo a partir de CO₂. Necesita la comunidad o territorio de devengo y una tabla versionada para esa fecha.',
        ],
        sourceIds: ['boe-excise', 'aeat-576-instructions'],
      },
      {
        title: 'Qué significa “emisiones oficiales”',
        paragraphs: [
          'El dato debe proceder de documentación técnica aplicable al vehículo y al ciclo reconocido para el caso. No debe sustituirse por una cifra de un anuncio, una base de datos comercial o el valor de otra versión parecida.',
          'Si es exigible acreditar CO₂ y no se acredita, las instrucciones del 576 prevén un tratamiento específico. MatriculaPro debe distinguir “introducido por el usuario” de “pendiente de comprobar documentalmente” y bloquear automatismos cuando la evidencia falta.',
        ],
        warning: 'El CO₂ de una ficha comercial no queda acreditado por copiarlo. Contrástalo con COC, tarjeta técnica o documento oficial correspondiente al VIN y versión.',
        sourceIds: ['aeat-576-instructions', 'dgt-eu'],
      },
      {
        title: 'De epígrafe a cuota',
        paragraphs: [
          'Después de identificar el epígrafe y tipo se aplica el porcentaje a la base imponible o base reducida. En usados importados, esa base puede exigir valor oficial, depreciación y minoración; en nuevos sigue una regla de valoración distinta.',
          'Una cuota cero puede resultar de un tipo del 0%, pero el caso puede seguir siendo una autoliquidación 576. No debe confundirse con una exención o no sujeción tramitada por Modelo 05 o 06.',
        ],
        sourceIds: ['aeat-576-instructions', 'boe-tables-2026'],
      },
    ],
    sources: [sources.boeExcise, sources.aeat576Instructions, sources.dgtEu, sources.boeTables2026],
    related: [
      { href: '/calcular-modelo-576', label: 'Calcular las casillas del 576' },
      { href: '/modelo-05-06-576', label: 'Cuota cero no siempre es exención' },
      { href: '/minoracion-impuesto-matriculacion', label: 'Base de vehículos usados' },
    ],
  },
};
