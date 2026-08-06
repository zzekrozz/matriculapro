/** Cinco expedientes educativos para practicar decisiones, no recetas cerradas. */

export type Difficulty = 'easy' | 'medium' | 'alert';

export interface CaseDecisionOption {
  id: string;
  label: string;
  correct: boolean;
  explanation: string;
}

export interface CaseDecision {
  id: string;
  question: string;
  context?: string;
  multi?: boolean;
  options: CaseDecisionOption[];
  lesson: string;
}

export interface PracticalCase {
  id: string;
  n: number;
  title: string;
  origin: string;
  flag: string;
  difficulty: Difficulty;
  pitch: string;
  scenario: string[];
  documents: { code: string; label: string; status: 'ok' | 'missing' | 'doubt' }[];
  decisions: CaseDecision[];
  takeaways: string[];
  estimatedMinutes: number;
}

export const PRACTICAL_CASES: PracticalCase[] = [
  {
    id: 'alemania-coc',
    n: 1,
    title: 'Turismo usado comprado a un particular alemán',
    origin: 'Alemania',
    flag: '🇩🇪',
    difficulty: 'easy',
    estimatedMinutes: 8,
    pitch: 'Un caso común que obliga a separar contrato, ITP, IVA, ITV e impuesto de matriculación.',
    scenario: [
      'Compras a una persona particular un turismo matriculado por primera vez en Alemania en 2019. La entrega se produce en agosto de 2026 y el cuentakilómetros acreditado marca 84.200 km.',
      'Recibes el contrato firmado, las dos partes de la documentación alemana y un COC que coincide con el VIN y la variante. El vehículo no tiene reformas conocidas.',
      'Aunque parece un expediente sencillo, no existe una secuencia fiscal universal: primero debes acreditar la compra, confirmar el tratamiento de adquisición, completar la vía técnica española y resolver qué justificante del IEDMT corresponde.',
    ],
    documents: [
      { code: 'CTO.', label: 'Contrato entre particulares con VIN, precio, fecha y firmas', status: 'ok' },
      { code: 'ZUL.', label: 'Documentación alemana completa y original', status: 'ok' },
      { code: 'COC', label: 'COC coincidente con VIN, variante y versión', status: 'ok' },
      { code: 'KM', label: 'Kilometraje y fecha de primera puesta en servicio acreditados', status: 'ok' },
      { code: 'ITP', label: 'Justificante autonómico de ITP o situación aplicable', status: 'missing' },
      { code: 'ITV ES', label: 'Tarjeta ITV española', status: 'missing' },
      { code: 'IEDMT', label: '576, 06, 05 u otra justificación aplicable', status: 'doubt' },
      { code: 'IVTM', label: 'Alta, pago o situación municipal aplicable', status: 'missing' },
      { code: 'DGT', label: 'Tasa y expediente de matriculación', status: 'missing' },
      { code: 'CIERRE', label: 'Matrícula, placas y seguro vigente antes de circular', status: 'missing' },
    ],
    decisions: [
      {
        id: 'proof-of-purchase',
        question: '¿Qué prueba de adquisición encaja con el vendedor?',
        options: [
          { id: 'a', label: 'Contrato firmado y revisión de ITP', correct: true, explanation: 'Correcto. Al vender un particular, el contrato acredita la compra y debes confirmar la obligación autonómica de ITP y su justificante.' },
          { id: 'b', label: 'Factura con IVA alemán', correct: false, explanation: 'Un particular no emite una factura empresarial con IVA. Inventar ese documento haría incoherente el expediente.' },
          { id: 'c', label: 'Solo justificante bancario', correct: false, explanation: 'El pago ayuda, pero no sustituye un contrato que identifique partes, vehículo, precio y fecha.' },
        ],
        lesson: 'La condición del vendedor determina la prueba de adquisición. Contrato e ITP no deben sustituirse por una factura ficticia.',
      },
      {
        id: 'vat-status',
        question: '¿Es un medio de transporte nuevo a efectos de la regla especial de IVA intracomunitario?',
        context: 'Han transcurrido años desde la primera puesta en servicio y ha recorrido 84.200 km.',
        options: [
          { id: 'a', label: 'No: supera seis meses y 6.000 km', correct: true, explanation: 'Correcto. En los datos del caso se superan ambos umbrales. Aun así, documenta fechas y kilometraje y resuelve por separado el ITP.' },
          { id: 'b', label: 'Sí, porque todo vehículo importado es nuevo fiscalmente', correct: false, explanation: 'El origen extranjero no lo convierte en nuevo. La prueba usa antigüedad y kilometraje.' },
          { id: 'c', label: 'Usado solo porque supera seis meses', correct: false, explanation: 'La antigüedad aislada no basta. En este caso también consta un kilometraje superior a 6.000 km; hacen falta los dos datos para descartar ambas condiciones de nuevo.' },
        ],
        lesson: 'Es nuevo si se entrega antes de seis meses o si no ha recorrido más de 6.000 km. Para tratarlo como usado deben quedar fuera ambas condiciones de nuevo; los casos exactamente en el límite merecen revisión precisa.',
      },
      {
        id: 'technical-path',
        question: '¿Qué haces con el COC y la ITV alemana?',
        options: [
          { id: 'a', label: 'Confirmar el trámite español y presentar el COC como soporte técnico', correct: true, explanation: 'Correcto. El COC coincidente puede soportar la vía UE, pero la estación debe confirmar el procedimiento y emitir/documentar la tarjeta ITV española.' },
          { id: 'b', label: 'Usar la ITV alemana como tarjeta ITV española', correct: false, explanation: 'La documentación alemana aporta antecedentes, pero no es por sí sola la tarjeta ITV española del expediente de matriculación.' },
          { id: 'c', label: 'Encargar además una ficha reducida por sistema', correct: false, explanation: 'No acumules alternativas sin necesidad. Con COC válido, pregunta qué requiere la estación antes de pagar otro documento.' },
        ],
        lesson: 'El COC y la ficha reducida no son documentos que deban reunirse siempre juntos; la estación confirma la vía aplicable.',
      },
      {
        id: 'iedmt-path',
        question: 'Tras obtener la tarjeta ITV española, ¿qué decisión fiscal es correcta?',
        options: [
          { id: 'a', label: 'Presentar siempre 576 y usar V.7 como base', correct: false, explanation: 'El 576 no es universal y V.7 son emisiones, no la base imponible de un usado importado.' },
          { id: 'b', label: 'Determinar sujeción y decidir entre 576, 06, 05 u otra prueba', correct: true, explanation: 'Correcto. La salida depende del supuesto legal, posibles beneficios y reconocimiento previo; solo después se elige el modelo.' },
          { id: 'c', label: 'No revisar IEDMT porque el coche es usado', correct: false, explanation: 'Ser usado no elimina automáticamente el análisis del impuesto de primera matriculación.' },
        ],
        lesson: 'Separa la clasificación del vehículo de la elección del formulario. Después se completan IVTM, tasa y expediente DGT aplicables.',
      },
    ],
    takeaways: [
      'Particular vendedor: contrato completo y revisión autonómica de ITP, no factura empresarial.',
      'En este caso ambos datos —antigüedad y kilometraje— permiten descartar la regla de medio de transporte nuevo; nunca compruebes solo uno.',
      'COC válido, ITV española, IEDMT, IVTM y DGT son piezas distintas, y el modelo fiscal se decide antes de rellenarlo.',
      'V.7 puede servir para clasificar emisiones, pero no es la base imponible del 576.',
      'Las placas se fabrican tras la asignación de matrícula y el seguro debe estar vigente antes de circular.',
    ],
  },
  {
    id: 'francia-sin-coc',
    n: 2,
    title: 'Vehículo francés sin COC',
    origin: 'Francia',
    flag: '🇫🇷',
    difficulty: 'medium',
    estimatedMinutes: 10,
    pitch: 'La ausencia del COC no tiene una solución única: primero hay que identificar la homologación.',
    scenario: [
      'El vendedor entrega permiso y documento técnico franceses, pero no COC. En una foto aparece una contraseña parcial que podría corresponder a una homologación UE, aunque la variante no se lee bien.',
      'Una empresa ofrece “hacer una ficha reducida para cualquier vehículo” sin revisar la contraseña. Otra persona afirma que la Carte Grise basta. Ninguna de las dos respuestas define la vía técnica.',
      'Tu decisión es clasificar el vehículo antes de encargar documentos: tipo UE identificable, aprobación individual/serie corta extranjera o ausencia de homologación UE.',
    ],
    documents: [
      { code: 'COC', label: 'Certificado de conformidad', status: 'missing' },
      { code: 'CG', label: 'Permiso y documento técnico franceses', status: 'ok' },
      { code: 'K', label: 'Contraseña de homologación completa y verificable', status: 'doubt' },
      { code: 'VIN', label: 'VIN físico y documental coincidente', status: 'ok' },
      { code: 'REF.', label: 'Inventario de reformas o diferencias', status: 'doubt' },
    ],
    decisions: [
      {
        id: 'first-check',
        question: '¿Cuál es el primer paso útil?',
        options: [
          { id: 'a', label: 'Encargar de inmediato una ficha reducida', correct: false, explanation: 'La ficha reducida no crea una homologación. Primero hay que saber qué aprobación y variante existen y confirmar la vía con la ITV.' },
          { id: 'b', label: 'Identificar homologación, variante, VIN y reformas y consultar a la ITV', correct: true, explanation: 'Correcto. Esa clasificación distingue una carencia documental solucionable de un expediente de homologación más complejo.' },
          { id: 'c', label: 'Usar la Carte Grise como COC', correct: false, explanation: 'El permiso francés no se convierte en declaración de conformidad del fabricante.' },
        ],
        lesson: '“Sin COC” describe un síntoma, no una vía técnica. La contraseña, la variante y el tipo de aprobación determinan el siguiente paso.',
      },
      {
        id: 'eu-type',
        question: 'Si se confirma un tipo UE identificable que cubre exactamente el vehículo, ¿qué puede ser viable?',
        options: [
          { id: 'a', label: 'COC del fabricante o ficha reducida admisible, previa confirmación ITV', correct: true, explanation: 'Correcto. Según el supuesto, fabricante, servicio técnico designado o técnico competente puede documentar características; la estación confirma emisor y alcance.' },
          { id: 'b', label: 'Una ficha casera firmada por el comprador', correct: false, explanation: 'No acredita técnicamente el vehículo ni procede de un emisor habilitado.' },
          { id: 'c', label: 'Homologación individual española obligatoria en todo caso', correct: false, explanation: 'Si existe un tipo UE aplicable, puede haber una vía ordinaria; no se debe escalar sin comprobarla.' },
        ],
        lesson: 'Una ficha reducida puede servir para documentar un tipo identificable, pero su emisor y validez dependen del procedimiento concreto.',
      },
      {
        id: 'individual-series',
        question: '¿Qué ocurre si la documentación revela una aprobación individual o de serie corta extranjera?',
        options: [
          { id: 'a', label: 'Se trata automáticamente como homologación UE completa', correct: false, explanation: 'La aprobación individual o de serie corta tiene un alcance distinto y su reconocimiento no debe presumirse.' },
          { id: 'b', label: 'Se estudia equivalencia, autorización o vía española específica', correct: true, explanation: 'Correcto. ITV, servicio técnico y autoridad competente deben indicar si cabe equivalencia o qué procedimiento español corresponde.' },
          { id: 'c', label: 'Basta con traducir el permiso extranjero', correct: false, explanation: 'La traducción hace legible el documento, pero no cambia el alcance jurídico de la aprobación.' },
        ],
        lesson: 'Las aprobaciones individuales y series cortas exigen una decisión de reconocimiento; no son un COC incompleto.',
      },
      {
        id: 'no-eu-approval',
        question: 'Si no existe homologación UE aplicable, ¿qué respuesta es responsable?',
        options: [
          { id: 'a', label: 'Prometer una ficha reducida en dos semanas', correct: false, explanation: 'Ni la viabilidad ni el plazo pueden prometerse antes de que el caso técnico sea aceptado.' },
          { id: 'b', label: 'Evaluar homologación individual española o asumir un posible bloqueo', correct: true, explanation: 'Correcto. Puede requerir ensayos y adaptaciones o resultar inviable; hay que obtener una evaluación competente antes de comprar.' },
          { id: 'c', label: 'Pasar una ITV periódica y continuar', correct: false, explanation: 'Una inspección periódica no resuelve la ausencia de vía de homologación para matricular.' },
        ],
        lesson: 'Sin aprobación UE puede existir una vía individual, pero no hay resultado, coste ni plazo garantizados.',
      },
    ],
    takeaways: [
      'COC ausente no equivale automáticamente a ficha reducida.',
      'Tipo UE identificable, aprobación individual/serie corta y ausencia de aprobación UE son tres ramas diferentes.',
      'La ficha reducida puede proceder de distintos emisores habilitados según el caso; confirma el emisor con la ITV.',
      'No prometas semanas ni un resultado antes de validar la vía técnica.',
    ],
  },
  {
    id: 'holanda-empresa',
    n: 3,
    title: 'Compra a empresa neerlandesa con IVA ambiguo',
    origin: 'Países Bajos',
    flag: '🇳🇱',
    difficulty: 'medium',
    estimatedMinutes: 10,
    pitch: 'La factura existe, pero faltan el régimen de IVA y una lectura correcta de seis meses/6.000 km.',
    scenario: [
      'Una empresa neerlandesa vende a un particular residente en España un turismo cuya primera puesta en servicio fue el 20 de enero de 2026. Se entrega el 5 de agosto de 2026 con 5.980 km acreditados.',
      'La factura incluye nombre y dirección de la empresa, pero no muestra con claridad su número de IVA ni si aplica régimen general, margen de bienes usados u otro tratamiento. Solo dice “VAT included”.',
      'El vendedor sostiene que, al haber pasado más de seis meses, el coche es usado. Debes clasificarlo con los dos criterios y aclarar la factura antes de pagar.',
    ],
    documents: [
      { code: 'FACT.', label: 'Factura de la empresa con VIN, precio y fecha', status: 'doubt' },
      { code: 'VAT ID', label: 'Número de IVA del vendedor y condición empresarial verificables', status: 'missing' },
      { code: 'RÉG.', label: 'Régimen de IVA indicado de forma inequívoca', status: 'missing' },
      { code: 'KENT.', label: 'Documentación neerlandesa', status: 'ok' },
      { code: 'KM', label: '5.980 km acreditados en la entrega', status: 'ok' },
      { code: 'COC', label: 'COC coincidente', status: 'ok' },
    ],
    decisions: [
      {
        id: 'seller-invoice',
        question: '¿Qué debe corregirse o verificarse antes del pago?',
        multi: true,
        options: [
          { id: 'a', label: 'Identidad y número de IVA del vendedor', correct: true, explanation: 'Correcto. La factura y la condición del vendedor deben poder verificarse.' },
          { id: 'b', label: 'Régimen de IVA aplicado y desglose o mención legal', correct: true, explanation: 'Correcto. “VAT included” no explica si es régimen general, margen u otro tratamiento.' },
          { id: 'c', label: 'Factura sustituida por contrato entre particulares', correct: false, explanation: 'Vende una empresa. Convertirla documentalmente en particular sería incorrecto.' },
          { id: 'd', label: 'Fecha de entrega y kilometraje acreditados', correct: true, explanation: 'Correcto. Son esenciales para la regla de medio de transporte nuevo.' },
        ],
        lesson: 'Factura, condición del vendedor, régimen fiscal, fecha y kilometraje forman una sola prueba coherente.',
      },
      {
        id: 'new-or-used',
        question: 'Con 5.980 km, ¿cómo se clasifica para la regla especial de IVA?',
        options: [
          { id: 'a', label: 'Usado, porque han pasado más de seis meses', correct: false, explanation: 'Falta el segundo criterio. No ha recorrido más de 6.000 km.' },
          { id: 'b', label: 'Nuevo: basta cumplir cualquiera de los dos criterios de nuevo', correct: true, explanation: 'Correcto. Aunque haya pasado el umbral temporal, 5.980 km no supera 6.000 km. Incluso 6.000 km exactos sigue siendo “no más de 6.000”.' },
          { id: 'c', label: 'Usado porque el vendedor lo llama de ocasión', correct: false, explanation: 'La etiqueta comercial no altera la definición fiscal.' },
        ],
        lesson: 'La regla usa una disyunción: entrega antes de seis meses o kilometraje no superior a 6.000 km. No sustituyas “o” por “y”.',
      },
      {
        id: 'spanish-vat',
        question: '¿Qué riesgo fiscal debes resolver?',
        options: [
          { id: 'a', label: 'Posible IVA en España por adquisición intracomunitaria de vehículo nuevo', correct: true, explanation: 'Correcto. Debes confirmar el cumplimiento en España y cómo debe facturar/corregir el vendedor para evitar un IVA de origen mal tratado.' },
          { id: 'b', label: 'Ninguno: cualquier IVA neerlandés cierra el caso', correct: false, explanation: 'Pagar una cantidad llamada IVA en origen no garantiza que la operación esté tratada correctamente.' },
          { id: 'c', label: 'Resolverlo dentro del Modelo 576', correct: false, explanation: 'IVA de adquisición e IEDMT son impuestos distintos y no se corrigen uno dentro del otro.' },
        ],
        lesson: 'En un vehículo nuevo a estos efectos, la tributación en destino debe revisarse antes de cerrar la factura y el pago.',
      },
      {
        id: 'ambiguous-action',
        question: 'Si el vendedor no aclara el régimen de la factura, ¿qué haces?',
        options: [
          { id: 'a', label: 'Pagar y pedir un certificado genérico después', correct: false, explanation: 'Después del pago pierdes capacidad para exigir una factura correcta y puedes duplicar costes.' },
          { id: 'b', label: 'Pausar y consultar a AEAT o asesor fiscal con la factura concreta', correct: true, explanation: 'Correcto. La revisión debe hacerse con fechas, km, condición de las partes y texto íntegro de la factura.' },
          { id: 'c', label: 'Preguntar a la ITV', correct: false, explanation: 'La estación resuelve la vía técnica, no el tratamiento de IVA de la compraventa.' },
        ],
        lesson: 'La ambigüedad fiscal es una condición de parada, no un campo que completar por intuición.',
      },
    ],
    takeaways: [
      'Una empresa debe emitir una factura coherente e identificable; no existe un “certificado BTW” universal que arregle cualquier caso.',
      'Menos de seis meses y no más de 6.000 km son criterios alternativos de vehículo nuevo.',
      'IVA/ITP, IEDMT e ITV son ramas distintas.',
      'Una factura ambigua se corrige o revisa antes del pago.',
    ],
  },
  {
    id: 'datos-dudosos',
    n: 4,
    title: 'Vehículo N1 con configuración dudosa',
    origin: 'Italia',
    flag: '🇮🇹',
    difficulty: 'alert',
    estimatedMinutes: 11,
    pitch: 'La etiqueta N1 abre comprobaciones técnicas y fiscales; no concede por sí sola un modelo ni un tipo de gravamen.',
    scenario: [
      'Una furgoneta de 2012 figura como N1 en parte de la documentación italiana. Tiene una segunda fila de asientos y revestimiento interior añadidos después, sin que el vendedor aporte documentos de reforma.',
      'La contraseña de homologación se lee parcialmente y el campo de emisiones no usa un dato comparable con el que esperabas encontrar. El anuncio la llama “turismo mixto”.',
      'Un intermediario recomienda presentar directamente el Modelo 06 “porque todos los N1 están exentos”. Debes comprobar categoría, configuración, homologación y supuesto fiscal antes de aceptar esa conclusión.',
    ],
    documents: [
      { code: 'J', label: 'Categoría N1 en documento extranjero', status: 'doubt' },
      { code: 'K', label: 'Contraseña de homologación completa', status: 'doubt' },
      { code: 'V.7', label: 'Dato de emisiones comparable y trazable', status: 'doubt' },
      { code: 'REF.', label: 'Documentación de asientos y acondicionamiento', status: 'missing' },
      { code: '06', label: 'Supuesto de no sujeción/exención confirmado', status: 'missing' },
    ],
    decisions: [
      {
        id: 'verify-category',
        question: '¿Qué determina que el vehículo se trate como N1?',
        options: [
          { id: 'a', label: 'El anuncio y la forma exterior de furgoneta', correct: false, explanation: 'La descripción comercial no fija la categoría reglamentaria.' },
          { id: 'b', label: 'Documentación, homologación y configuración física coherentes', correct: true, explanation: 'Correcto. Categoría, variante, masas, plazas y uso constructivo deben poder verificarse y coincidir.' },
          { id: 'c', label: 'Que el comprador vaya a usarla para trabajar', correct: false, explanation: 'El uso previsto puede ser fiscalmente relevante en algunos supuestos, pero no reescribe por sí solo la categoría técnica.' },
        ],
        lesson: 'N1 es una categoría técnica que se demuestra; no una etiqueta elegida para obtener un tratamiento fiscal.',
      },
      {
        id: 'model-06',
        question: '¿Puedes elegir el Modelo 06 solo porque aparece N1?',
        options: [
          { id: 'a', label: 'Sí, todos los N1 usan 06', correct: false, explanation: 'La categoría aislada no basta. Debes comprobar el supuesto legal, configuración y documentación exigida.' },
          { id: 'b', label: 'No: primero se confirma no sujeción/exención y el modelo aplicable', correct: true, explanation: 'Correcto. Algunos supuestos de categorías N pueden encajar en el 06, pero no se presume ni se traslada a un vehículo incoherente.' },
          { id: 'c', label: 'No hace falta ningún justificante fiscal', correct: false, explanation: 'La no sujeción o exención también necesita la acreditación que corresponda para el expediente.' },
        ],
        lesson: 'El modelo es la consecuencia del análisis fiscal, no su punto de partida.',
      },
      {
        id: 'emissions-old',
        question: 'El dato de emisiones es antiguo o no comparable. ¿Qué haces?',
        options: [
          { id: 'a', label: 'Aplicar automáticamente la tabla de CO₂ de un M1 moderno', correct: false, explanation: 'Categoría, método de medición y dato homologado pueden no ser comparables. No inventes un V.7.' },
          { id: 'b', label: 'Trazar el dato técnico y pedir criterio para la clasificación fiscal', correct: true, explanation: 'Correcto. ITV, documentación de homologación y AEAT deben sostener el dato y su uso.' },
          { id: 'c', label: 'Usar la potencia del motor como emisiones', correct: false, explanation: 'Potencia y emisiones son magnitudes distintas.' },
        ],
        lesson: 'En N1, vehículos antiguos o sin aprobación UE clara, no se traslada mecánicamente una tabla pensada para otro supuesto.',
      },
      {
        id: 'seat-reform',
        question: '¿Cómo afectan la segunda fila y el acondicionamiento?',
        options: [
          { id: 'a', label: 'No afectan si el vendedor dice que venían así', correct: false, explanation: 'La configuración debe acreditarse frente a la homologada; una afirmación verbal no documenta una reforma.' },
          { id: 'b', label: 'Se comparan con homologación y se legalizan o revierten si son reforma', correct: true, explanation: 'Correcto. Pueden cambiar plazas, masas, anclajes, categoría o clasificación y necesitan la documentación técnica aplicable.' },
          { id: 'c', label: 'Se ocultan para pasar primero la ITV', correct: false, explanation: 'Ocultar una discrepancia compromete la inspección y el expediente.' },
        ],
        lesson: 'Categoría y reformas se analizan juntas: modificar plazas o configuración puede cambiar la vía técnica y la fiscal.',
      },
    ],
    takeaways: [
      'N1 debe constar de forma coherente en homologación, documentos y vehículo.',
      'El Modelo 06 puede corresponder a determinados supuestos, pero nunca se asigna automáticamente por la categoría.',
      'No apliques una tabla de CO₂ de M1 ni inventes V.7 cuando el método o dato no sean comparables.',
      'Vehículos antiguos, sin homologación UE clara o reformados requieren revisión técnica y fiscal específica.',
    ],
  },
  {
    id: 'posible-reforma',
    n: 5,
    title: 'Vehículo de EE. UU. matriculado antes en Alemania',
    origin: 'Estados Unidos · vía Alemania',
    flag: '🇺🇸',
    difficulty: 'alert',
    estimatedMinutes: 12,
    pitch: 'La matrícula alemana no convierte automáticamente un vehículo estadounidense en un tipo homologado UE.',
    scenario: [
      'Un Ford Mustang fabricado para el mercado estadounidense fue importado y matriculado en Alemania mediante una aprobación individual alemana. El vendedor aporta permiso alemán y una resolución técnica, pero no un COC europeo del fabricante.',
      'El vehículo conserva parte de la iluminación estadounidense y monta escape y suspensión distintos de los que figuran en algunas fotografías de la aprobación alemana.',
      'El vendedor lo anuncia como “ya europeizado” y garantiza que España reconocerá todo. Debes separar registro alemán, base de homologación, posible equivalencia española y reformas actuales.',
    ],
    documents: [
      { code: 'PERM. DE', label: 'Permiso de circulación alemán', status: 'ok' },
      { code: 'EINZEL', label: 'Aprobación individual alemana y anexos', status: 'ok' },
      { code: 'COC UE', label: 'COC europeo del fabricante', status: 'missing' },
      { code: 'LUZ', label: 'Configuración de alumbrado admitida en España', status: 'doubt' },
      { code: 'REF.', label: 'Documentos de escape, suspensión y otras reformas', status: 'missing' },
      { code: 'ADUANA', label: 'Historial de importación y situación aduanera', status: 'doubt' },
    ],
    decisions: [
      {
        id: 'german-registration',
        question: '¿Qué demuestra la matrícula alemana?',
        options: [
          { id: 'a', label: 'Que existe un COC “americano-europeo” válido en toda la UE', correct: false, explanation: 'Ese concepto no sustituye una homologación de tipo UE. El coche puede haber sido autorizado individualmente solo bajo el procedimiento alemán.' },
          { id: 'b', label: 'Que Alemania lo admitió según una base que hay que estudiar', correct: true, explanation: 'Correcto. Permiso y resolución alemana son evidencias útiles, pero hay que identificar el alcance exacto de aquella aprobación.' },
          { id: 'c', label: 'Que España debe matricularlo sin inspección', correct: false, explanation: 'No hay resultado automático por haber estado matriculado en otro Estado.' },
        ],
        lesson: 'Registro previo y homologación de tipo UE son conceptos distintos.',
      },
      {
        id: 'possible-paths',
        question: '¿Qué vías merece evaluar con ITV, servicio técnico y autoridad competente?',
        multi: true,
        options: [
          { id: 'a', label: 'Reconocimiento/equivalencia de la aprobación alemana si legalmente cabe', correct: true, explanation: 'Correcto. Debe evaluarse con el expediente completo, sin presumir aceptación.' },
          { id: 'b', label: 'Homologación individual española si no hay vía de equivalencia', correct: true, explanation: 'Correcto. Puede requerir ensayos y adaptaciones, y tampoco garantiza resultado.' },
          { id: 'c', label: 'Ficha reducida como creación automática de homologación UE', correct: false, explanation: 'Una ficha reducida describe características; no transforma una aprobación individual estadounidense/alemana en tipo UE.' },
          { id: 'd', label: 'Desistir si la viabilidad o el coste no son aceptables', correct: true, explanation: 'Correcto. Antes de comprar, la inviabilidad o incertidumbre técnica es una razón legítima para salir de la operación.' },
        ],
        lesson: 'Equivalencia, homologación individual y desistimiento son ramas posibles; ninguna debe prometerse sin evaluación.',
      },
      {
        id: 'lighting-reforms',
        question: '¿Cómo tratas iluminación, escape y suspensión?',
        options: [
          { id: 'a', label: 'Como configuración a comparar y reformas a documentar o corregir', correct: true, explanation: 'Correcto. Hay que contrastar vehículo actual, aprobación alemana y requisitos españoles; puede haber adaptaciones y documentos específicos.' },
          { id: 'b', label: 'Como cambios cubiertos por el permiso alemán', correct: false, explanation: 'El permiso no demuestra que cada modificación posterior forme parte de la aprobación.' },
          { id: 'c', label: 'Solo importa el ruido del escape', correct: false, explanation: 'También pueden afectar alumbrado, anclajes, suspensión, emisiones y correspondencia con la configuración aprobada.' },
        ],
        lesson: 'En vehículos de mercado estadounidense, la configuración reglamentaria y las reformas actuales requieren una comparación documental y física precisa.',
      },
      {
        id: 'promise',
        question: 'El vendedor garantiza resultado y plazo. ¿Qué respuesta es prudente?',
        options: [
          { id: 'a', label: 'Aceptar: la matrícula alemana elimina el riesgo', correct: false, explanation: 'La afirmación omite la vía española, las reformas y la situación aduanera.' },
          { id: 'b', label: 'Condicionar la compra a una evaluación escrita y sin promesa de resultado', correct: true, explanation: 'Correcto. El análisis debe incluir documentos completos, vehículo actual, aduanas y criterio técnico español.' },
          { id: 'c', label: 'Ir a una ITV periódica para probar suerte', correct: false, explanation: 'No resuelve la base de homologación ni protege la decisión de compra.' },
        ],
        lesson: 'Un expediente complejo no tiene resultado ni calendario garantizados antes de su evaluación por los órganos competentes.',
      },
    ],
    takeaways: [
      'No existe un “COC americano-europeo” genérico: identifica la base real de homologación.',
      'Una aprobación individual alemana no se convierte automáticamente en homologación española o UE.',
      'Equivalencia y homologación individual española son vías a evaluar, no promesas.',
      'Iluminación, emisiones, escape, suspensión y situación aduanera pueden ser decisivos.',
      'No garantices matriculación, coste ni plazo en un vehículo de EE. UU. previamente registrado en Europa.',
    ],
  },
];

export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  easy: 'Fácil',
  medium: 'Medio',
  alert: 'Alerta',
};
