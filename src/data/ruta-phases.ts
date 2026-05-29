/** Las 3 fases del proceso de matriculación · Mapa visual */

export type PhaseId = 'preparar' | 'pagos' | 'dgt';

export interface RutaPhase {
  id: PhaseId;
  n: number;
  shortTitle: string;       // título corto para badges (ej: "Fase 1")
  title: string;            // título completo (ej: "Preparar expediente e ITV")
  /** Palabra en italic ámbar para titulares */
  titleAccent: string;
  /** Resumen corto para la card del mapa */
  pitch: string;
  /** Mensaje clave (más largo) para la sección agrupada */
  message: string;
  /** Pasos incluidos (rango de números de paso) */
  steps: number[];
  /** Nombre del icono lucide */
  icon: string;
  /** Colores de la fase (CSS variables o hex) */
  color: {
    main: string;          // color principal
    soft: string;          // fondo suave
    deep: string;          // texto/accent oscuro
    accent: string;        // detalle (ámbar de la marca o color complementario)
  };
}

export const RUTA_PHASES: RutaPhase[] = [
  {
    id: 'preparar',
    n: 1,
    shortTitle: 'Fase 1',
    title: 'Preparar expediente e ITV',
    titleAccent: 'expediente',
    pitch: 'Reúnes los papeles, consigues el COC y pasas la ITV de matriculación.',
    message: 'Es la fase donde preparas el expediente y donde necesitas llevar el coche físicamente a ITV. Sin la ficha técnica española emitida aquí, no puedes seguir.',
    steps: [1, 2, 3, 4],
    icon: 'FileCheck2',
    color: {
      main:  '#0B1F3A',  // navy de la marca
      soft:  '#ECF0F6',
      deep:  '#0B1F3A',
      accent:'#C8862E',
    },
  },
  {
    id: 'pagos',
    n: 2,
    shortTitle: 'Fase 2',
    title: 'Pagos y tasas',
    titleAccent: 'pagos',
    pitch: 'Presentas el 576 en Hacienda, pagas el IVTM al ayuntamiento y la tasa DGT.',
    message: 'Después de la ITV, preparas los pagos necesarios antes de presentar en DGT. El Modelo 576 es la pieza delicada — un dato mal puesto te lo devuelve.',
    steps: [5, 6, 7],
    icon: 'Receipt',
    color: {
      main:  '#C8862E',  // ámbar
      soft:  '#F5E9D4',
      deep:  '#9C661E',
      accent:'#0B1F3A',
    },
  },
  {
    id: 'dgt',
    n: 3,
    shortTitle: 'Fase 3',
    title: 'DGT y placas',
    titleAccent: 'matrícula',
    pitch: 'Con el expediente completo, presentas en DGT y el coche queda matriculado.',
    message: 'Con el expediente completo, presentas en DGT y el vehículo queda matriculado en España. Solo entonces fabricates las placas y contratas el seguro definitivo.',
    steps: [8, 9],
    icon: 'Flag',
    color: {
      main:  '#1F7A4D',  // verde (cierre)
      soft:  '#DEF1E5',
      deep:  '#1F7A4D',
      accent:'#C8862E',
    },
  },
];

/** Devuelve la fase a la que pertenece un paso */
export function phaseOfStep(stepN: number): RutaPhase {
  return RUTA_PHASES.find(p => p.steps.includes(stepN)) ?? RUTA_PHASES[0];
}
