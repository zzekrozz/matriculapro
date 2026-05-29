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

export const DEMO_VEHICLE: Vehicle = {
  id: 'demo-fix-01',
  brand: 'Marca Demo',
  model: 'Modelo D · 2.0 TDI',
  variant: 'Variante D · Berlina',
  origin: 'Alemania',
  fields: {
    E:     { label: 'Nº de bastidor (VIN)',      value: 'WAUZZZ0000A000001',   hint: 'Debe coincidir en todos los documentos. 17 caracteres.', mono: true },
    B:     { label: 'Fecha 1ª matriculación',     value: '15/04/2019',          hint: 'Fecha de matriculación en el país de origen.', mono: true },
    'V.7': { label: 'Emisiones CO₂',              value: '132',     unit: 'g/km', hint: 'Dato clave para el Modelo 576. Aparece en ficha técnica o COC.', mono: true },
    'P.1': { label: 'Cilindrada',                 value: '1968',    unit: 'cm³',  hint: 'Volumen total del motor.', mono: true },
    'P.2': { label: 'Potencia neta máxima',       value: '110',     unit: 'kW',   hint: 'Equivale a 150 CV aprox.', mono: true },
    'P.3': { label: 'Combustible',                value: 'Diésel',              hint: 'Tipo de combustible homologado.' },
    K:     { label: 'Contraseña de homologación', value: 'e1*2007/46*0000*00',  hint: 'Identifica la homologación europea del vehículo.', mono: true },
    'F.1': { label: 'Masa máxima en carga',       value: '2100',    unit: 'kg',   hint: 'MMA: masa máxima autorizada.', mono: true },
    G:     { label: 'Masa en servicio',           value: '1620',    unit: 'kg',   hint: 'Masa del vehículo en orden de marcha.', mono: true },
    J:     { label: 'Categoría del vehículo',     value: 'M1',                  hint: 'M1 = turismo. N1 = comercial ligero.' },
  },
};

/** Posiciones de cada campo en la cara TRASERA de la ficha (grid 2 columnas) */
export const FIELD_POSITIONS_BACK: Record<string, { col: 'full' | 'left' | 'right'; row: number; highlight?: boolean }> = {
  E:     { col: 'full',  row: 1 },
  B:     { col: 'left',  row: 2 },
  'V.7': { col: 'right', row: 2, highlight: true },
  'P.1': { col: 'left',  row: 3 },
  'P.2': { col: 'right', row: 3 },
  'P.3': { col: 'left',  row: 4 },
  K:     { col: 'right', row: 4 },
  'F.1': { col: 'left',  row: 5 },
  G:     { col: 'right', row: 5 },
  J:     { col: 'full',  row: 6 },
};

/** Campos activos en la demo del simulador (sólo 3 sin bloquear) */
export const DEMO_ACTIVE_FIELDS = ['E', 'B', 'V.7'] as const;

export interface SimField {
  key: string;
  label: string;
  placeholder: string;
  type: 'text' | 'number';
  mono?: boolean;
  locked?: boolean;
  unit?: string;
}

/** Definición de los 10 campos del Modelo 576 */
export const SIM_FIELDS: SimField[] = [
  // Activos
  { key: 'E',     label: 'Nº de bastidor (VIN)',   placeholder: '17 caracteres', type: 'text',   mono: true },
  { key: 'B',     label: 'Fecha 1ª matriculación', placeholder: 'DD/MM/AAAA',    type: 'text',   mono: true },
  { key: 'V.7',   label: 'Emisiones CO₂',           placeholder: 'g/km',          type: 'number', mono: true, unit: 'g/km' },
  // Bloqueados en demo (visibles pero deshabilitados)
  { key: 'brand', label: 'Marca',                   placeholder: '—',             type: 'text',   locked: true },
  { key: 'model', label: 'Modelo',                  placeholder: '—',             type: 'text',   locked: true },
  { key: 'P.3',   label: 'Combustible',             placeholder: '—',             type: 'text',   locked: true },
  { key: 'P.1',   label: 'Cilindrada',              placeholder: 'cm³',           type: 'number', locked: true, mono: true, unit: 'cm³' },
  { key: 'P.2',   label: 'Potencia',                placeholder: 'kW',            type: 'number', locked: true, mono: true, unit: 'kW' },
  { key: 'base',  label: 'Base orientativa',        placeholder: 'Sólo educativo', type: 'text',  locked: true },
  { key: 'tramo', label: 'Tramo educativo',         placeholder: 'Sólo educativo', type: 'text',  locked: true },
];
