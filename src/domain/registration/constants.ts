import type { AutonomousCommunity, ReformAnswers } from './types';

export const DOMAIN_REVIEW_DATE = '2026-08-05';

export const EU_COUNTRY_CODES = new Set([
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE',
  'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'SE',
]);

export const EEA_NON_EU_COUNTRY_CODES = new Set([
  'IS', 'LI', 'NO',
]);

export const AUTONOMOUS_COMMUNITIES: Array<{ value: AutonomousCommunity; label: string }> = [
  { value: 'andalucia', label: 'Andalucía' },
  { value: 'aragon', label: 'Aragón' },
  { value: 'asturias', label: 'Asturias' },
  { value: 'baleares', label: 'Illes Balears' },
  { value: 'canarias', label: 'Canarias' },
  { value: 'cantabria', label: 'Cantabria' },
  { value: 'castilla-la-mancha', label: 'Castilla-La Mancha' },
  { value: 'castilla-y-leon', label: 'Castilla y León' },
  { value: 'cataluna', label: 'Cataluña' },
  { value: 'comunidad-valenciana', label: 'Comunitat Valenciana' },
  { value: 'extremadura', label: 'Extremadura' },
  { value: 'galicia', label: 'Galicia' },
  { value: 'madrid', label: 'Comunidad de Madrid' },
  { value: 'murcia', label: 'Región de Murcia' },
  { value: 'navarra', label: 'Navarra' },
  { value: 'pais-vasco', label: 'País Vasco' },
  { value: 'la-rioja', label: 'La Rioja' },
  { value: 'ceuta', label: 'Ceuta' },
  { value: 'melilla', label: 'Melilla' },
];

export const COUNTRY_OPTIONS = [
  { value: 'DE', label: 'Alemania' },
  { value: 'NL', label: 'Países Bajos' },
  { value: 'FR', label: 'Francia' },
  { value: 'BE', label: 'Bélgica' },
  { value: 'IT', label: 'Italia' },
  { value: 'PT', label: 'Portugal' },
  { value: 'ES', label: 'España' },
  { value: 'GB', label: 'Reino Unido (excepto Irlanda del Norte)' },
  { value: 'XI', label: 'Irlanda del Norte' },
  { value: 'US', label: 'Estados Unidos' },
  { value: 'JP', label: 'Japón' },
  { value: 'AE', label: 'Emiratos Árabes Unidos' },
  { value: 'OTHER', label: 'Otro país' },
];

export const EMPTY_REFORMS: ReformAnswers = {
  suspension: null,
  nonEquivalentWheels: null,
  spacers: null,
  lighting: null,
  towBar: null,
  seats: null,
  classification: null,
  bodywork: null,
  camperConversion: null,
  exhaust: null,
  powerOrEngine: null,
  dimensions: null,
  exteriorElements: null,
  steeringConversion: null,
  structural: null,
};

export const REFORM_LABELS: Record<keyof ReformAnswers, string> = {
  suspension: 'Suspensión modificada',
  nonEquivalentWheels: 'Llantas o neumáticos no equivalentes',
  spacers: 'Separadores',
  lighting: 'Alumbrado sustituido',
  towBar: 'Enganche',
  seats: 'Cambio de asientos',
  classification: 'Cambio de clasificación',
  bodywork: 'Cambio de carrocería',
  camperConversion: 'Camperización',
  exhaust: 'Escape',
  powerOrEngine: 'Potencia o motor',
  dimensions: 'Dimensiones',
  exteriorElements: 'Elementos exteriores',
  steeringConversion: 'Conversión de volante',
  structural: 'Modificaciones estructurales',
};
