import type { ModuleDef } from '@/lib/types';

export const MODULES: ModuleDef[] = [
  {
    id: 'ruta', code: 'M.01', title: 'Ruta de matriculación',
    description: 'Mapa condicional para clasificar el caso, preparar pruebas y cerrar el expediente.',
    icon: 'Route', href: '/app/ruta', state: 'recommended', hot: true,
  },
  {
    id: 'simulador', code: 'M.02', title: 'Práctica del Modelo 576',
    description: 'Entrena la localización de datos sin sustituir la autoliquidación oficial.',
    icon: 'Calculator', href: '/app/simulador-576', state: 'recommended',
  },
  {
    id: 'ficha', code: 'M.03', title: 'Ficha técnica 3D',
    description: 'Aprende a localizar campos técnicos y a detectar discrepancias documentales.',
    icon: 'ScrollText', href: '/app/ficha-tecnica', state: 'recommended',
  },
  {
    id: 'antes-comprar', code: 'M.04', title: 'Antes de comprar',
    description: 'Verifica vendedor, fiscalidad, homologación, categoría y reformas antes de pagar.',
    icon: 'CheckSquare', href: '/app/checklist/antes-de-comprar', state: 'recommended',
  },
  {
    id: 'pre-itv', code: 'M.05', title: 'Checklist pre-ITV',
    description: 'Prepara vehículo y documentación según la vía técnica confirmada.',
    icon: 'Wrench', href: '/app/checklist/pre-itv', state: 'recommended',
  },
  {
    id: 'itv', code: 'M.06', title: 'Recorrido ITV interactivo',
    description: 'Reconoce las zonas de inspección y qué evidencia debes revisar.',
    icon: 'Car', href: '/app/recorrido-itv', state: 'recommended',
  },
  {
    id: 'pre-dgt', code: 'M.07', title: 'Checklist pre-DGT',
    description: 'Cierra solo las ramas documentales y fiscales aplicables a tu expediente.',
    icon: 'Stamp', href: '/app/checklist/pre-dgt', state: 'recommended',
  },
  {
    id: 'casos', code: 'M.08', title: 'Casos prácticos',
    description: 'Cinco expedientes ramificados: particular, sin COC, empresa, N1 y EE. UU.',
    icon: 'BookOpen', href: '/app/casos-practicos', state: 'recommended',
  },
  {
    id: 'biblioteca', code: 'M.09', title: 'Biblioteca de documentos',
    description: 'Qué acredita cada documento, cuándo puede aplicar y qué no sustituye.',
    icon: 'FileText', href: '/app/biblioteca', state: 'recommended',
  },
  {
    id: 'plantillas', code: 'M.10', title: 'Plantillas para ITV',
    description: 'Mensajes para confirmar por escrito cita, documentación y vía técnica.',
    icon: 'Mail', href: '/app/plantillas-itv', state: 'recommended',
  },
];
