import type { ModuleDef } from '@/lib/types';

export const MODULES: ModuleDef[] = [
  {
    id: 'ruta', code: 'M.01', title: 'Ruta de matriculación',
    description: '9 pasos guiados desde antes de comprar hasta tener placas.',
    icon: 'Route', href: '/app/ruta', state: 'recommended', hot: true,
  },
  {
    id: 'simulador', code: 'M.02', title: 'Simulador Modelo 576',
    description: 'Practica el formulario con corrección campo a campo.',
    icon: 'Calculator', href: '/app/simulador-576', state: 'recommended', hot: true,
    demo: true,
  },
  {
    id: 'ficha', code: 'M.03', title: 'Ficha técnica 3D',
    description: 'Documento interactivo con tilt, flip y campos clicables.',
    icon: 'ScrollText', href: '/app/ficha-tecnica', state: 'recommended', hot: true,
    demo: true,
  },
  {
    id: 'antes-comprar', code: 'M.04', title: 'Antes de comprar',
    description: 'Lista de verificación crítica antes de cerrar la compra.',
    icon: 'CheckSquare', href: '/app/checklist/antes-de-comprar', state: 'recommended',
  },
  {
    id: 'pre-itv', code: 'M.05', title: 'Checklist pre-ITV',
    description: 'Revisa el coche zona por zona antes de ir.',
    icon: 'Wrench', href: '/app/checklist/pre-itv', state: 'recommended',
  },
  {
    id: 'itv', code: 'M.06', title: 'Recorrido ITV interactivo',
    description: 'Maqueta con luces, rodillos y medidor de frenos.',
    icon: 'Car', href: '/app/recorrido-itv', state: 'recommended', hot: true,
    demo: true,
  },
  {
    id: 'pre-dgt', code: 'M.07', title: 'Checklist pre-DGT',
    description: 'La lista que tienes que cumplir antes de pisar Tráfico.',
    icon: 'Stamp', href: '/app/checklist/pre-dgt', state: 'recommended',
  },
  {
    id: 'casos', code: 'M.08', title: 'Casos prácticos',
    description: '5 casos: Alemania, Francia, Holanda, datos dudosos, reforma.',
    icon: 'BookOpen', href: '/app/casos-practicos', state: 'recommended', hot: true,
  },
  {
    id: 'biblioteca', code: 'M.09', title: 'Biblioteca de documentos',
    description: 'COC, 576, IVTM, tasa DGT… qué es y cuándo se usa.',
    icon: 'FileText', href: '/app/biblioteca', state: 'recommended',
  },
  {
    id: 'plantillas', code: 'M.10', title: 'Plantillas para ITV',
    description: 'Emails listos para pedir cita y aclarar dudas.',
    icon: 'Mail', href: '/app/plantillas-itv', state: 'recommended',
  },
  {
    id: 'acompanamiento', code: 'M.11', title: 'Acompañamiento',
    description: 'Atención directa antes de ITV, 576 y DGT durante 30 días.',
    icon: 'Phone', href: '/app/acompanamiento', state: 'premium', premium: true,
  },
];
