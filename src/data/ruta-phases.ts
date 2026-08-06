/** Las tres fases del mapa educativo. El expediente real puede exigir otro orden. */

export type PhaseId = 'preparar' | 'pagos' | 'dgt';

export interface RutaPhase {
  id: PhaseId;
  n: number;
  shortTitle: string;
  title: string;
  titleAccent: string;
  pitch: string;
  message: string;
  steps: number[];
  icon: string;
  color: {
    main: string;
    soft: string;
    deep: string;
    accent: string;
  };
}

export const RUTA_PHASES: RutaPhase[] = [
  {
    id: 'preparar',
    n: 1,
    shortTitle: 'Fase 1',
    title: 'Definir el caso y preparar la parte técnica',
    titleAccent: 'parte técnica',
    pitch: 'Clasificas el caso, reúnes las pruebas y confirmas la vía técnica antes de la ITV.',
    message: 'El origen, la fecha y kilometraje, el tipo de vendedor, la categoría, la homologación y las reformas cambian el expediente. Los pasos 1 a 4 son un mapa de preparación: no convierten el COC, la ficha reducida ni una vía de homologación en requisitos intercambiables o universales.',
    steps: [1, 2, 3, 4],
    icon: 'FileCheck2',
    color: {
      main: '#0B1F3A',
      soft: '#ECF0F6',
      deep: '#0B1F3A',
      accent: '#C8862E',
    },
  },
  {
    id: 'pagos',
    n: 2,
    shortTitle: 'Fase 2',
    title: 'Resolver impuestos, tasas y justificantes',
    titleAccent: 'impuestos',
    pitch: 'Determinas qué obligación corresponde y conservas el justificante correcto para tu caso.',
    message: 'No todos los expedientes presentan ni pagan lo mismo. Hay que separar IVA o ITP de los trámites de primera matriculación, y decidir entre Modelo 576, 06, 05 u otra justificación según la sujeción, exención y necesidad de reconocimiento previo. El IVTM y la tasa de Tráfico también se verifican con el organismo competente.',
    steps: [5, 6, 7],
    icon: 'Receipt',
    color: {
      main: '#C8862E',
      soft: '#F5E9D4',
      deep: '#9C661E',
      accent: '#0B1F3A',
    },
  },
  {
    id: 'dgt',
    n: 3,
    shortTitle: 'Fase 3',
    title: 'Presentar, matricular y cerrar',
    titleAccent: 'cerrar',
    pitch: 'Revisas el expediente aplicable, lo presentas y solo después completas placas, seguro y entrega.',
    message: 'La DGT contrasta la identidad, la titularidad, la documentación técnica y las justificaciones tributarias que correspondan. La matrícula, el permiso y la tarjeta ITV española permiten cerrar la operación; el vehículo solo debe circular cuando además esté asegurado y cumpla el resto de condiciones legales.',
    steps: [8, 9],
    icon: 'Flag',
    color: {
      main: '#1F7A4D',
      soft: '#DEF1E5',
      deep: '#1F7A4D',
      accent: '#C8862E',
    },
  },
];

/** Devuelve la fase educativa en la que se muestra un paso. */
export function phaseOfStep(stepN: number): RutaPhase {
  return RUTA_PHASES.find((phase) => phase.steps.includes(stepN)) ?? RUTA_PHASES[0];
}
