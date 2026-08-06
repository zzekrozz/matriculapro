export interface VehicleField {
  label: string;
  value: string;
  unit?: string;
  hint: string;
  mono?: boolean;
}

export interface Vehicle {
  id: string;
  brand: string;
  model: string;
  variant: string;
  origin: string;
  fields: Record<string, VehicleField>;
}

/** Vehículo ficticio: sirve para aprender a localizar datos, no para calcular impuestos. */
export const PRACTICE_VEHICLE: Vehicle = {
  id: 'practice-fixture-01',
  brand: 'Marca ficticia',
  model: 'Modelo D · 2.0 TDI',
  variant: 'Variante D · Berlina',
  origin: 'Alemania',
  fields: {
    E: { label: 'N.º de bastidor (VIN)', value: 'WAUZZZ0000A000001', hint: 'Comprueba los 17 caracteres en vehículo, documentos extranjeros, COC y tarjeta ITV.', mono: true },
    B: { label: 'Fecha de 1.ª matriculación', value: '15/04/2019', hint: 'Fecha documental de primera matriculación; no sustituye la fecha de compra o entrega.', mono: true },
    'V.7': { label: 'Emisiones de CO₂', value: '132', unit: 'g/km', hint: 'Dato técnico relevante para clasificar ciertos supuestos del IEDMT; no es la base imponible.', mono: true },
    'P.1': { label: 'Cilindrada', value: '1968', unit: 'cm³', hint: 'Dato técnico del motor; verifica que coincide entre fuentes.', mono: true },
    'P.2': { label: 'Potencia neta máxima', value: '110', unit: 'kW', hint: 'Potencia homologada en kW; no debe confundirse con potencia fiscal.', mono: true },
    'P.3': { label: 'Combustible', value: 'Diésel', hint: 'Combustible o fuente de energía que figura en la documentación técnica.' },
    K: { label: 'Contraseña de homologación', value: 'e1*2007/46*0000*00', hint: 'Ayuda a identificar la homologación, pero debe comprobarse con la variante y el VIN.', mono: true },
    'F.1': { label: 'Masa máxima en carga', value: '2100', unit: 'kg', hint: 'Masa máxima técnicamente admisible; puede ser relevante para categoría y configuración.', mono: true },
    G: { label: 'Masa en servicio', value: '1620', unit: 'kg', hint: 'Masa del vehículo en orden de marcha según la fuente técnica.', mono: true },
    J: { label: 'Categoría del vehículo', value: 'M1', hint: 'La categoría debe verificarse: M1 y N1 pueden abrir análisis técnicos y fiscales distintos.' },
  },
};

/** Posiciones educativas de los campos en el reverso de la tarjeta. */
export const FIELD_POSITIONS_BACK: Record<string, { col: 'full' | 'left' | 'right'; row: number; highlight?: boolean }> = {
  E: { col: 'full', row: 1 },
  B: { col: 'left', row: 2 },
  'V.7': { col: 'right', row: 2, highlight: true },
  'P.1': { col: 'left', row: 3 },
  'P.2': { col: 'right', row: 3 },
  'P.3': { col: 'left', row: 4 },
  K: { col: 'right', row: 4 },
  'F.1': { col: 'left', row: 5 },
  G: { col: 'right', row: 5 },
  J: { col: 'full', row: 6 },
};

/** Campos editables en esta práctica de lectura documental. */
export const PRACTICE_ACTIVE_FIELDS = ['E', 'B', 'V.7'] as const;

export interface SimField {
  key: string;
  label: string;
  placeholder: string;
  type: 'text' | 'number';
  mono?: boolean;
  locked?: boolean;
  unit?: string;
}

/**
 * Campos de entrenamiento. La pantalla no reproduce el Modelo 576 oficial ni
 * calcula cuota, base imponible, exenciones o no sujeciones.
 */
export const SIM_FIELDS: SimField[] = [
  { key: 'E', label: 'N.º de bastidor (VIN)', placeholder: '17 caracteres', type: 'text', mono: true },
  { key: 'B', label: 'Fecha de 1.ª matriculación', placeholder: 'DD/MM/AAAA', type: 'text', mono: true },
  { key: 'V.7', label: 'Emisiones de CO₂', placeholder: 'g/km', type: 'number', mono: true, unit: 'g/km' },
  { key: 'brand', label: 'Marca (referencia)', placeholder: 'Práctica bloqueada', type: 'text', locked: true },
  { key: 'model', label: 'Modelo (referencia)', placeholder: 'Práctica bloqueada', type: 'text', locked: true },
  { key: 'P.3', label: 'Combustible', placeholder: 'Práctica bloqueada', type: 'text', locked: true },
  { key: 'P.1', label: 'Cilindrada', placeholder: 'cm³', type: 'number', locked: true, mono: true, unit: 'cm³' },
  { key: 'P.2', label: 'Potencia', placeholder: 'kW', type: 'number', locked: true, mono: true, unit: 'kW' },
  { key: 'base', label: 'Base imponible', placeholder: 'Debe determinarse fuera de esta práctica', type: 'text', locked: true },
  { key: 'tramo', label: 'Tratamiento fiscal', placeholder: 'Confirmar sujeción, exención o no sujeción', type: 'text', locked: true },
];
