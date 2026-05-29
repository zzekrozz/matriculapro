/** Casos prácticos · 5 escenarios para poner a prueba lo aprendido */

export type Difficulty = 'easy' | 'medium' | 'alert';

export interface CaseDecisionOption {
  id: string;
  label: string;
  correct: boolean;
  /** Explicación que se muestra al elegir esta opción */
  explanation: string;
}

export interface CaseDecision {
  id: string;
  question: string;
  /** Contexto opcional antes de la pregunta */
  context?: string;
  /** Tipo de pregunta: única o múltiple respuesta correcta */
  multi?: boolean;
  options: CaseDecisionOption[];
  /** Lección general tras responder */
  lesson: string;
}

export interface PracticalCase {
  id: string;
  n: number;
  title: string;
  origin: string; // País
  flag: string;   // Emoji bandera (sólo para UI ligera)
  difficulty: Difficulty;
  /** Resumen corto para la card */
  pitch: string;
  /** Historia/contexto del caso, en párrafos */
  scenario: string[];
  /** Lo que el usuario tiene en mano */
  documents: { code: string; label: string; status: 'ok' | 'missing' | 'doubt' }[];
  /** 3-5 decisiones a tomar */
  decisions: CaseDecision[];
  /** Conclusiones del caso una vez resuelto */
  takeaways: string[];
  /** Estimación de tiempo de resolución (min) */
  estimatedMinutes: number;
}

export const PRACTICAL_CASES: PracticalCase[] = [
  /* ============================================================
     CASO 1 · Alemania con COC · FÁCIL
     ============================================================ */
  {
    id: 'alemania-coc',
    n: 1,
    title: 'BMW Serie 3 con COC alemán',
    origin: 'Alemania',
    flag: '🇩🇪',
    difficulty: 'easy',
    estimatedMinutes: 6,
    pitch: 'Coche reciente, documentación limpia y COC del fabricante. El "modo fácil" para entender el proceso.',
    scenario: [
      'Has comprado un BMW Serie 3 (320d) de 2022 en Múnich. El vendedor era un particular, todo legal: factura a tu nombre, permiso de circulación alemán (Zulassungsbescheinigung Teil II), y COC original del fabricante.',
      'El bastidor del salpicadero coincide con el de la documentación. El coche pasa una ITV en Alemania (HU) hace 8 meses con resultado favorable.',
      'Llegas a España con el coche cargado en un remolque (sin matricular aún). El siguiente paso es matricularlo. ¿Por dónde empiezas?',
    ],
    documents: [
      { code: 'COC',     label: 'Certificate of Conformity (COC original BMW)', status: 'ok' },
      { code: 'PERM.',   label: 'Permiso de circulación alemán (Zulassungsbescheinigung Teil II)', status: 'ok' },
      { code: 'FACT.',   label: 'Factura del vendedor particular', status: 'ok' },
      { code: 'HU',      label: 'ITV alemana favorable (vigente 8 meses)', status: 'ok' },
      { code: 'DNI',     label: 'DNI del comprador (a su nombre)', status: 'ok' },
    ],
    decisions: [
      {
        id: 'first-step',
        question: '¿Cuál es el primer paso correcto?',
        options: [
          {
            id: 'a', label: 'Ir directamente a la DGT a matricular',
            correct: false,
            explanation: 'No puedes ir a la DGT sin antes haber pasado la ITV de matriculación española y haber presentado el Modelo 576.',
          },
          {
            id: 'b', label: 'Pedir cita de matriculación en una ITV española',
            correct: true,
            explanation: 'Correcto. La ITV de matriculación es el primer paso técnico. Allí verifican el coche y emiten la ficha técnica española.',
          },
          {
            id: 'c', label: 'Presentar el Modelo 576 en Hacienda primero',
            correct: false,
            explanation: 'El Modelo 576 necesita la ficha técnica española como referencia, que sólo te dan tras pasar la ITV de matriculación.',
          },
          {
            id: 'd', label: 'Contratar el seguro antes de cualquier trámite',
            correct: false,
            explanation: 'El seguro va al final, cuando ya tengas la matrícula asignada por DGT.',
          },
        ],
        lesson: 'El orden correcto es: ITV de matriculación → Modelo 576 (Hacienda) → IVTM (Ayuntamiento) → Tasa DGT → DGT → Placas y seguro.',
      },
      {
        id: 'coc-use',
        question: '¿Qué papel juega el COC en este proceso?',
        options: [
          {
            id: 'a', label: 'Sustituye a la ITV de matriculación',
            correct: false,
            explanation: 'El COC documenta la homologación europea pero no sustituye a la inspección técnica en España.',
          },
          {
            id: 'b', label: 'Es opcional, se puede matricular sin él',
            correct: false,
            explanation: 'Sin COC necesitarías una ficha reducida emitida por un laboratorio autorizado, un proceso más caro y lento. Tener COC es una ventaja clave.',
          },
          {
            id: 'c', label: 'Acredita la homologación europea del vehículo, base para emitir la ficha técnica española',
            correct: true,
            explanation: 'Correcto. El COC es el documento técnico clave que permite que la ITV emita tu ficha técnica española sin necesidad de ficha reducida.',
          },
        ],
        lesson: 'El COC ahorra tiempo y dinero. Sin él hay que tramitar ficha reducida en laboratorio autorizado.',
      },
      {
        id: 'itv-cita',
        question: 'Llamas a la ITV. ¿Qué tipo de cita pides?',
        options: [
          {
            id: 'a', label: 'ITV periódica (la de toda la vida)',
            correct: false,
            explanation: 'La periódica es para vehículos ya matriculados en España. La tuya es diferente.',
          },
          {
            id: 'b', label: 'ITV de matriculación / matriculación importado',
            correct: true,
            explanation: 'Correcto. Específica para importados: incluye revisión documental + técnica y emisión de ficha técnica española.',
          },
          {
            id: 'c', label: 'ITV de reformas',
            correct: false,
            explanation: 'Es para vehículos con modificaciones (suspensión, motor, etc.). Tu BMW está de serie.',
          },
        ],
        lesson: 'Pedir el tipo de cita correcto evita que te manden de vuelta. La cita de matriculación suele costar más que una periódica.',
      },
      {
        id: 'co2-576',
        question: 'Para el Modelo 576 necesitas las emisiones de CO₂. ¿Dónde las encuentras?',
        options: [
          {
            id: 'a', label: 'En la ficha técnica española (campo V.7)',
            correct: true,
            explanation: 'Correcto. El campo V.7 de la ficha técnica española contiene las emisiones de CO₂ en g/km, dato clave para calcular la base del 576.',
          },
          {
            id: 'b', label: 'En el COC, en la sección 49',
            correct: true,
            explanation: 'También correcto. El COC tiene las emisiones homologadas, normalmente en la sección 49.',
          },
          {
            id: 'c', label: 'En el permiso de circulación alemán',
            correct: false,
            explanation: 'El permiso alemán suele tener el dato pero en otro código y formato. Mejor coger el de la ficha técnica española una vez emitida.',
          },
        ],
        multi: true,
        lesson: 'V.7 es uno de los datos críticos del Modelo 576. Si está mal, el impuesto sale mal.',
      },
    ],
    takeaways: [
      'Con COC, ficha técnica clara y documentación coherente, el caso "fácil" sigue una ruta lineal de 9 pasos.',
      'El orden importa: ITV → 576 → IVTM → Tasa DGT → DGT → Placas.',
      'V.7 (CO₂) determina la base del Modelo 576. Compruébalo dos veces.',
    ],
  },

  /* ============================================================
     CASO 2 · Francia sin COC · MEDIO
     ============================================================ */
  {
    id: 'francia-sin-coc',
    n: 2,
    title: 'Peugeot 308 francés sin COC',
    origin: 'Francia',
    flag: '🇫🇷',
    difficulty: 'medium',
    estimatedMinutes: 9,
    pitch: 'El fabricante no te entrega el COC. ¿Te bloquea? No. Hay alternativa, pero te cuesta tiempo y dinero.',
    scenario: [
      'Compras un Peugeot 308 de 2020 en Lyon. Documentación francesa correcta (Carte Grise, factura, contrôle technique reciente). El coche está bien.',
      'Cuando contactas con Peugeot para pedir el COC, te dicen que no lo emiten retroactivamente para tu unidad concreta o piden un proceso largo. Sin COC, no puedes ir directo a la ITV.',
      '¿Qué haces?',
    ],
    documents: [
      { code: 'COC',   label: 'COC del fabricante', status: 'missing' },
      { code: 'CG',    label: 'Carte Grise francesa', status: 'ok' },
      { code: 'CT',    label: 'Contrôle technique favorable (3 meses)', status: 'ok' },
      { code: 'FACT.', label: 'Factura de compraventa', status: 'ok' },
      { code: 'DNI',   label: 'DNI a nombre del comprador', status: 'ok' },
    ],
    decisions: [
      {
        id: 'no-coc',
        question: 'Peugeot no te da el COC. ¿Te bloquea el proceso?',
        options: [
          {
            id: 'a', label: 'Sí, sin COC no puedes matricular',
            correct: false,
            explanation: 'Hay una alternativa legal: la ficha reducida emitida por un laboratorio autorizado.',
          },
          {
            id: 'b', label: 'No: puedes tramitar una "ficha reducida" en laboratorio autorizado',
            correct: true,
            explanation: 'Correcto. La ficha reducida emitida por laboratorio acreditado sustituye al COC para la matriculación.',
          },
          {
            id: 'c', label: 'No: la Carte Grise francesa sirve como COC',
            correct: false,
            explanation: 'La Carte Grise es el permiso de circulación francés, no equivale al COC. Tiene datos pero no es un certificado de homologación.',
          },
        ],
        lesson: 'Sin COC no estás bloqueado, pero el camino se complica con costes adicionales (laboratorio) y tiempo.',
      },
      {
        id: 'laboratorio',
        question: '¿Qué necesitas para encargar la ficha reducida?',
        options: [
          {
            id: 'a', label: 'Datos técnicos del vehículo (potencia, peso, dimensiones, emisiones)',
            correct: true,
            explanation: 'Correcto. El laboratorio necesita los parámetros técnicos para verificar la homologación.',
          },
          {
            id: 'b', label: 'Documentación de origen (Carte Grise, factura)',
            correct: true,
            explanation: 'Correcto. Sin documentación de origen no hay base sobre la que trabajar.',
          },
          {
            id: 'c', label: 'Bastidor visible y coherente con los documentos',
            correct: true,
            explanation: 'Correcto. El VIN es la clave de identificación del vehículo durante todo el proceso.',
          },
          {
            id: 'd', label: 'Permiso de circulación español ya emitido',
            correct: false,
            explanation: 'Eso es el final del proceso, no se puede tener antes de la matriculación.',
          },
        ],
        multi: true,
        lesson: 'El laboratorio reconstruye técnicamente la homologación del vehículo a partir de sus datos. Si los datos están sucios, el resultado también.',
      },
      {
        id: 'tiempo-extra',
        question: '¿Cuánto tiempo extra puede sumar este caso?',
        options: [
          {
            id: 'a', label: '2-3 días, prácticamente nada',
            correct: false,
            explanation: 'Demasiado optimista. La ficha reducida implica plazos de laboratorio y revisión.',
          },
          {
            id: 'b', label: '1-2 meses adicionales según laboratorio y carga de trabajo',
            correct: true,
            explanation: 'Correcto. El proceso de ficha reducida puede sumar de varias semanas a un par de meses al calendario total.',
          },
          {
            id: 'c', label: '6 meses como mínimo',
            correct: false,
            explanation: 'Esto sería un caso muy complejo o con incidencias graves. Para un caso estándar son semanas, no medio año.',
          },
        ],
        lesson: 'Cuenta con tiempo extra y coste extra. Pregunta al laboratorio el plazo realista antes de comprometerte con plazos a terceros.',
      },
    ],
    takeaways: [
      'Sin COC no estás bloqueado, pero el coste y el tiempo aumentan claramente.',
      'La ficha reducida la emite un laboratorio acreditado. No vale cualquier "técnico".',
      'Pregunta el plazo y el coste antes de empezar para no llevarte sorpresas.',
    ],
  },

  /* ============================================================
     CASO 3 · Holanda factura empresa · MEDIO
     ============================================================ */
  {
    id: 'holanda-empresa',
    n: 3,
    title: 'Audi A4 holandés con factura de empresa',
    origin: 'Países Bajos',
    flag: '🇳🇱',
    difficulty: 'medium',
    estimatedMinutes: 8,
    pitch: 'El coche está a nombre de una empresa holandesa. La factura va a tu nombre pero implica IVA. Cuidado con los matices fiscales.',
    scenario: [
      'Audi A4 Avant de 2021. Lo compras a una empresa holandesa de leasing. Factura emitida a tu nombre, con IVA holandés desglosado. El coche es nuevo para ti pero "usado" administrativamente.',
      'El concesionario holandés te asegura que no hay problema, "todo lo demás se hace en España". Documentación parece estar bien, COC original.',
      'Antes de mover el coche te surge la duda: ¿hay implicaciones fiscales por venir de empresa?',
    ],
    documents: [
      { code: 'COC',   label: 'COC original Audi', status: 'ok' },
      { code: 'KENT.', label: 'Kentekenbewijs (permiso holandés)', status: 'ok' },
      { code: 'FACT.', label: 'Factura empresa NL con IVA holandés desglosado', status: 'doubt' },
      { code: 'BTW',   label: 'Certificado de IVA pagado en NL', status: 'doubt' },
      { code: 'DNI',   label: 'DNI del comprador', status: 'ok' },
    ],
    decisions: [
      {
        id: 'iva-implicaciones',
        question: 'Has pagado IVA en Holanda. ¿Tienes que pagar IVA otra vez en España?',
        options: [
          {
            id: 'a', label: 'No, el IVA holandés vale para España al ser UE',
            correct: false,
            explanation: 'No siempre. El IVA intracomunitario tiene reglas concretas según si el vehículo es "nuevo" o "usado" fiscalmente y según el comprador.',
          },
          {
            id: 'b', label: 'Depende de si fiscalmente el coche se considera "nuevo" o "usado"',
            correct: true,
            explanation: 'Correcto. Un vehículo es fiscalmente "nuevo" si tiene <6 meses o <6.000 km. En ese caso, el IVA se paga en destino (España). Si es "usado", aplica el régimen de bienes usados.',
          },
          {
            id: 'c', label: 'Siempre pagas IVA en España, independientemente del país de origen',
            correct: false,
            explanation: 'No es así. Las reglas dependen de la condición fiscal del vehículo y de quién compra.',
          },
        ],
        lesson: 'En vehículos UE intracomunitarios, "nuevo" o "usado" fiscalmente es la pregunta clave. Si dudas, consulta con asesor fiscal antes de comprar.',
      },
      {
        id: 'cuando-parar',
        question: 'Tienes dudas sobre el IVA. ¿Qué haces?',
        options: [
          {
            id: 'a', label: 'Sigo adelante, ya lo aclararé en Hacienda al presentar el 576',
            correct: false,
            explanation: 'Es mala estrategia. Si Hacienda te marca incidencia, te puede salir mucho más caro o lento que aclararlo antes.',
          },
          {
            id: 'b', label: 'Paro y consulto con asesor fiscal o gestoría antes de cerrar nada más',
            correct: true,
            explanation: 'Correcto. Casos con factura de empresa UE merecen una consulta puntual antes de avanzar. El coste de una asesoría es muy inferior al de un error fiscal.',
          },
          {
            id: 'c', label: 'Llamo a la ITV a ver qué me dicen',
            correct: false,
            explanation: 'La ITV revisa el aspecto técnico, no temas fiscales. No es su competencia.',
          },
        ],
        lesson: 'Cuando aparecen dudas fiscales, parar y consultar es siempre más barato que avanzar y rectificar.',
      },
      {
        id: 'documento-extra',
        question: '¿Qué documento adicional puede pedirte Hacienda en este caso?',
        options: [
          {
            id: 'a', label: 'Justificante del IVA pagado en Holanda (BTW)',
            correct: true,
            explanation: 'Correcto. Si el IVA holandés se considera deducible o relevante, te pedirán el justificante oficial.',
          },
          {
            id: 'b', label: 'Acta notarial española del vendedor',
            correct: false,
            explanation: 'No es habitual. La factura y los documentos UE suelen ser suficientes.',
          },
          {
            id: 'c', label: 'Certificado del concesionario sobre estado fiscal del vehículo',
            correct: true,
            explanation: 'Correcto en algunos casos. Algunos concesionarios UE emiten certificados específicos para operaciones intracomunitarias.',
          },
        ],
        multi: true,
        lesson: 'Los casos con factura de empresa UE suelen requerir documentación fiscal adicional. Pídela al vendedor antes de cerrar la compra.',
      },
    ],
    takeaways: [
      'Factura de empresa UE → siempre revisar implicaciones de IVA antes de cerrar.',
      'Vehículo "nuevo" fiscalmente (<6 meses / <6.000 km) tributa en destino.',
      'Pagar 100€ a un asesor fiscal puede ahorrar miles de euros y semanas de trámites.',
    ],
  },

  /* ============================================================
     CASO 4 · Datos dudosos · ALERTA
     ============================================================ */
  {
    id: 'datos-dudosos',
    n: 4,
    title: 'VW Tiguan con datos que no cuadran',
    origin: 'Bélgica',
    flag: '🇧🇪',
    difficulty: 'alert',
    estimatedMinutes: 10,
    pitch: 'El bastidor del coche y el del COC no son idénticos. Hay un carácter de diferencia. ¿Te lo juegas?',
    scenario: [
      'Volkswagen Tiguan 2.0 TDI de 2019, comprado en un concesionario belga. Documentación entregada en bloque, todo parece estar.',
      'Revisando los papeles en casa, descubres una incoherencia: el bastidor del salpicadero termina en "…A123456" pero el del COC termina en "…A123450". Difiere el último carácter.',
      'El vendedor te dice que "seguro que es un error de impresión, no te preocupes". ¿Sigues adelante?',
    ],
    documents: [
      { code: 'COC',   label: 'COC del fabricante (VIN ...A123450)', status: 'doubt' },
      { code: 'VIN',   label: 'Bastidor visible en el coche (...A123456)', status: 'doubt' },
      { code: 'BEL.',  label: 'Permiso de circulación belga', status: 'ok' },
      { code: 'FACT.', label: 'Factura del concesionario', status: 'ok' },
      { code: 'DNI',   label: 'DNI del comprador', status: 'ok' },
    ],
    decisions: [
      {
        id: 'sigues-adelante',
        question: 'El vendedor te dice "es un error de imprenta". ¿Sigues?',
        options: [
          {
            id: 'a', label: 'Sí, por un carácter no van a marcar nada',
            correct: false,
            explanation: 'Grave error. Un solo carácter del VIN hace que el coche sea OTRO vehículo distinto. Es un dato crítico de identificación.',
          },
          {
            id: 'b', label: 'No: paro inmediatamente y exijo aclaración por escrito del vendedor',
            correct: true,
            explanation: 'Correcto. El bastidor es la "huella dactilar" del vehículo. Cualquier discrepancia debe aclararse antes de cualquier trámite.',
          },
          {
            id: 'c', label: 'Sí, en la ITV ya me lo dirán si está mal',
            correct: false,
            explanation: 'La ITV te lo va a marcar, sí, pero después de que hayas pagado, viajado, perdido tiempo y posiblemente perdido el dinero del coche si resulta ser fraude.',
          },
        ],
        lesson: 'Un carácter de diferencia en el VIN puede significar fraude, error administrativo grave o vehículo robado. NUNCA seguir adelante con un VIN dudoso.',
      },
      {
        id: 'que-puede-pasar',
        question: '¿Qué escenarios podrían explicar la discrepancia?',
        options: [
          {
            id: 'a', label: 'Error administrativo del fabricante al emitir el COC',
            correct: true,
            explanation: 'Posible. Pasa en raras ocasiones, pero el fabricante puede emitir un COC corregido si lo demuestras.',
          },
          {
            id: 'b', label: 'COC pertenece a OTRO vehículo (el coche es otro)',
            correct: true,
            explanation: 'Posible y grave. El COC podría corresponder a otro vehículo similar, o el coche puede ser un duplicado con VIN clonado.',
          },
          {
            id: 'c', label: 'Es completamente normal y siempre pasa',
            correct: false,
            explanation: 'Falso. El VIN debe coincidir exactamente. No hay "casi coincidencia" aceptable.',
          },
          {
            id: 'd', label: 'Vehículo robado con VIN manipulado',
            correct: true,
            explanation: 'Posible. Es uno de los escenarios más graves. Por eso hay que parar y verificar antes de avanzar.',
          },
        ],
        multi: true,
        lesson: 'Las discrepancias en el VIN siempre se aclaran antes de cualquier movimiento. Es la única forma de protegerte.',
      },
      {
        id: 'siguiente-paso',
        question: '¿Cuál es el siguiente paso correcto?',
        options: [
          {
            id: 'a', label: 'Exigir al vendedor que aclare la discrepancia por escrito y emita COC correcto si es error',
            correct: true,
            explanation: 'Correcto. Cualquier solución pasa por documentación oficial corregida. No hay arreglo verbal posible.',
          },
          {
            id: 'b', label: 'Buscar el VIN en bases de datos de vehículos robados (Interpol, policía local)',
            correct: true,
            explanation: 'Correcto. Verificar contra bases de datos te da seguridad sobre el origen del vehículo.',
          },
          {
            id: 'c', label: 'Si el vendedor no aclara, valorar deshacer la operación y reclamar el dinero',
            correct: true,
            explanation: 'Correcto. Si no hay aclaración, la pérdida controlada de la operación es mejor que asumir riesgos legales y económicos mayores.',
          },
        ],
        multi: true,
        lesson: 'Mejor perder la operación ahora que asumir riesgos legales después. Vehículos con VIN dudoso pueden ser confiscados.',
      },
    ],
    takeaways: [
      'El VIN es sagrado. Una sola letra/número de diferencia es razón para parar.',
      'Aclarar por escrito siempre, nunca por palabra del vendedor.',
      'Si no hay aclaración convincente, deshacer la operación es la salida más barata.',
    ],
  },

  /* ============================================================
     CASO 5 · Posible reforma · ALERTA
     ============================================================ */
  {
    id: 'posible-reforma',
    n: 5,
    title: 'Ford Mustang con sospecha de reforma',
    origin: 'Estados Unidos (vía Alemania)',
    flag: '🇺🇸',
    difficulty: 'alert',
    estimatedMinutes: 10,
    pitch: 'El coche tiene escape diferente al de fábrica y suspensión rebajada. ¿Lo cubre la homologación o necesitas pasar por ingeniero?',
    scenario: [
      'Ford Mustang GT V8 de 2018, importado de EEUU vía Alemania por su anterior dueño. Documentación alemana completa, COC americano-europeo gestionado por un importador.',
      'Al inspeccionarlo, notas que tiene un escape racing aftermarket (no original Ford) y la suspensión está claramente rebajada. El vendedor te dice que "todo está homologado, vino así".',
      'Te enfrentas a una decisión clave antes de matricularlo en España.',
    ],
    documents: [
      { code: 'COC',   label: 'COC europeo (versión estándar Ford)', status: 'ok' },
      { code: 'PERM.', label: 'Permiso de circulación alemán', status: 'ok' },
      { code: 'FACT.', label: 'Factura del importador alemán', status: 'ok' },
      { code: 'MODS',  label: 'Documentos de homologación de las modificaciones', status: 'missing' },
      { code: 'DNI',   label: 'DNI del comprador', status: 'ok' },
    ],
    decisions: [
      {
        id: 'modificaciones',
        question: 'Las modificaciones (escape + suspensión). ¿Las cubre el COC?',
        options: [
          {
            id: 'a', label: 'Sí, el COC cubre todo lo que tenga el coche',
            correct: false,
            explanation: 'Error grave. El COC cubre la configuración HOMOLOGADA del fabricante. Modificaciones aftermarket NO están cubiertas.',
          },
          {
            id: 'b', label: 'No, las modificaciones aftermarket necesitan homologación específica (informe de reformas)',
            correct: true,
            explanation: 'Correcto. Cualquier modificación fuera de la homologación de fábrica necesita su propio informe de homologación firmado por ingeniero acreditado.',
          },
          {
            id: 'c', label: 'Sí, si las modificaciones son de marcas conocidas',
            correct: false,
            explanation: 'La marca de la pieza no homologa nada. Necesitas un proceso de homologación de reforma específico para tu vehículo.',
          },
        ],
        lesson: 'COC = configuración de fábrica. Modificaciones aftermarket = proceso aparte con ingeniero acreditado.',
      },
      {
        id: 'que-pasa-itv',
        question: '¿Qué pasa si vas a la ITV con esas modificaciones sin documentar?',
        options: [
          {
            id: 'a', label: 'No pasa nada, la ITV es flexible con coches de importación',
            correct: false,
            explanation: 'Falso. La ITV revisa que el coche coincida con lo homologado. Modificaciones no documentadas = resultado desfavorable.',
          },
          {
            id: 'b', label: 'Resultado desfavorable: te marcan defecto y no te emiten la ficha técnica española',
            correct: true,
            explanation: 'Correcto. La ITV revisa la concordancia entre el vehículo y su documentación. Si no concuerda, no hay matriculación.',
          },
          {
            id: 'c', label: 'Te dejan pasar pero con multa',
            correct: false,
            explanation: 'La ITV no aplica multas. Su rol es validar o no la inspección. Si no es válida, no matricula.',
          },
        ],
        lesson: 'La ITV es estricta con la concordancia. Si el coche no es lo que dicen sus papeles, no hay matriculación.',
      },
      {
        id: 'que-haces',
        question: '¿Cuál es la mejor estrategia ahora?',
        options: [
          {
            id: 'a', label: 'Quitar las modificaciones y dejar el coche como de fábrica antes de la ITV',
            correct: true,
            explanation: 'Opción válida. Si las modificaciones no se quieren homologar, devolver el coche a configuración original permite matricularlo con el COC tal cual.',
          },
          {
            id: 'b', label: 'Contactar con ingeniero acreditado para homologar las reformas en España',
            correct: true,
            explanation: 'Opción válida. Si quieres mantener las modificaciones, este es el camino. Suma tiempo y coste pero es la vía legal.',
          },
          {
            id: 'c', label: 'Ir a la ITV "a ver qué dicen"',
            correct: false,
            explanation: 'Pérdida de tiempo y dinero. Te van a marcar desfavorable. Mejor llegar con la situación resuelta.',
          },
          {
            id: 'd', label: 'Vender el coche a otra persona y comprar uno sin modificaciones',
            correct: true,
            explanation: 'Opción válida si las opciones anteriores no te compensan. A veces deshacer la operación es la salida más práctica.',
          },
        ],
        multi: true,
        lesson: 'Tres caminos válidos: restaurar a fábrica, homologar reformas, o salirte de la operación. Lo que NO es válido es ignorar el problema.',
      },
    ],
    takeaways: [
      'Las modificaciones aftermarket NO están cubiertas por el COC de fábrica.',
      'Pasar la ITV con reformas sin homologar = resultado desfavorable garantizado.',
      'Tres salidas: restaurar a fábrica, homologar con ingeniero, o vender.',
      'MatriculaPRO no cubre el proceso de homologación de reformas en profundidad — para eso, ingeniero acreditado.',
    ],
  },
];

export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  easy:   'Fácil',
  medium: 'Medio',
  alert:  'Alerta',
};
