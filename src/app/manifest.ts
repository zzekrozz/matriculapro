import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'MatriculaPro by IvanImports',
    short_name: 'MatriculaPro',
    description:
      'Comprueba la documentación de un vehículo importado y prepara su matriculación en España paso a paso.',
    start_url: '/',
    display: 'standalone',
    background_color: '#F4F6FA',
    theme_color: '#0B1F3A',
    lang: 'es',
    categories: ['business', 'finance', 'utilities'],
    icons: [
      { src: '/icon', sizes: '512x512', type: 'image/png' },
      { src: '/apple-icon', sizes: '180x180', type: 'image/png' },
    ],
  };
}

