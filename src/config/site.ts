export const SITE_NAME = 'MatriculaPro';
export const TRADE_NAME = 'IvanImports';
export const SITE_TAGLINE = 'Comprueba antes de comprar. Matricula después, paso a paso.';
export const SITE_DESCRIPTION =
  'Analiza la documentación de un vehículo extranjero, detecta riesgos y prepara su matriculación en España con cálculos explicados y fuentes oficiales.';
export const SITE_LOCALE = 'es_ES';
export const CONTENT_REVIEW_DATE = '5 de agosto de 2026';

const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();

// A final public domain has not been supplied. Development uses localhost;
// staging/production validation requires NEXT_PUBLIC_SITE_URL explicitly.
export const SITE_URL = (configuredSiteUrl || 'http://localhost:3000').replace(
  /\/$/,
  '',
);

export function absoluteUrl(path = '/'): string {
  return new URL(path, `${SITE_URL}/`).toString();
}

export const PUBLIC_GUIDE_PATHS = [
  '/comprobar-documentacion-coche-importado',
  '/calcular-modelo-576',
  '/tablas-hacienda-vehiculos-2026',
  '/minoracion-impuesto-matriculacion',
  '/modelo-05-06-576',
  '/campo-k-coche-importado',
  '/coc-vehiculo-importado',
  '/matricular-coche-alemania',
  '/coche-nuevo-seis-meses-6000-km',
  '/impuesto-matriculacion-co2',
] as const;

export const PUBLIC_LEGAL_PATHS = [
  '/legal/aviso-legal',
  '/legal/privacidad',
  '/legal/cookies',
  '/legal/terminos',
  '/legal/condiciones-contratacion',
  '/legal/aviso-fiscal-tecnico',
  '/legal/desistimiento',
] as const;
