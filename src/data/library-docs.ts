export interface LibraryDoc {
  id: string;
  code: string;
  title: string;
  description: string;
  /** Cuándo se usa en el proceso */
  phase: string;
  /** Dónde se consigue */
  source: string;
  /** Cuándo aplica (siempre, según caso, etc.) */
  applies: 'always' | 'sometimes' | 'rare';
  /** Notas adicionales */
  notes?: string[];
}

export const LIBRARY_DOCS: LibraryDoc[] = [
  {
    id: 'coc',
    code: 'COC',
    title: 'Certificado de Conformidad',
    description: 'Documento del fabricante que acredita la homologación europea del vehículo. Es el papel técnico clave para matricular un coche importado en España.',
    phase: 'Antes de la ITV',
    source: 'Fabricante (concesionario oficial) o vendedor',
    applies: 'always',
    notes: [
      'Si no lo tienes, se sustituye con una ficha reducida emitida por laboratorio acreditado.',
      'Verifica que el VIN del COC coincide exactamente con el del coche.',
    ],
  },
  {
    id: 'ficha-reducida',
    code: 'FR',
    title: 'Ficha reducida',
    description: 'Documento técnico emitido por un laboratorio acreditado que sustituye al COC cuando éste no está disponible.',
    phase: 'Antes de la ITV',
    source: 'Laboratorio de ensayo acreditado',
    applies: 'sometimes',
    notes: [
      'Coste: variable según laboratorio.',
      'Plazo: varias semanas. Cuenta con tiempo extra.',
    ],
  },
  {
    id: 'permiso-origen',
    code: 'PERM.',
    title: 'Permiso de circulación de origen',
    description: 'El equivalente al permiso de circulación pero del país donde estaba matriculado el coche (Zulassungsbescheinigung en Alemania, Carte Grise en Francia, Kentekenbewijs en Países Bajos, etc.).',
    phase: 'Todo el proceso',
    source: 'Vendedor (se entrega con el coche)',
    applies: 'always',
  },
  {
    id: 'factura',
    code: 'FACT.',
    title: 'Factura o contrato de compraventa',
    description: 'Documento que acredita la compra del vehículo. Debe contener todos los datos del vendedor, comprador, vehículo y precio.',
    phase: 'Todo el proceso',
    source: 'Vendedor',
    applies: 'always',
    notes: [
      'Si la factura es de empresa UE, puede tener implicaciones de IVA.',
      'Si es contrato entre particulares, asegúrate de que esté firmado por ambas partes.',
    ],
  },
  {
    id: 'itv-favorable',
    code: 'ITV',
    title: 'Informe de ITV de matriculación',
    description: 'Resultado favorable de la ITV de matriculación realizada en España. Incluye la ficha técnica española emitida.',
    phase: 'Después de la ITV',
    source: 'Estación ITV donde hayas hecho la inspección',
    applies: 'always',
  },
  {
    id: 'ficha-esp',
    code: 'FT.ES',
    title: 'Ficha técnica española',
    description: 'Documento técnico oficial español del vehículo. La emite la ITV al pasar la inspección de matriculación. Es la base para el 576 y DGT.',
    phase: 'Después de la ITV',
    source: 'ITV (junto al informe favorable)',
    applies: 'always',
    notes: [
      'Contiene los campos europeos (E, B, V.7, P.1, P.2, etc.).',
      'Sin ella no puedes presentar el Modelo 576.',
    ],
  },
  {
    id: 'm576',
    code: '576',
    title: 'Modelo 576',
    description: 'Impuesto especial sobre determinados medios de transporte. Se presenta ante la Agencia Tributaria antes de matricular el vehículo.',
    phase: 'Antes de DGT',
    source: 'Agencia Tributaria (sede electrónica o presencial)',
    applies: 'always',
    notes: [
      'La base imponible y el tipo dependen de las emisiones (V.7) y otros factores.',
      'MatriculaPRO tiene un simulador educativo, pero el cálculo real es de Hacienda.',
    ],
  },
  {
    id: 'ivtm',
    code: 'IVTM',
    title: 'IVTM (Impuesto Municipal)',
    description: 'Impuesto sobre Vehículos de Tracción Mecánica. Anual y municipal. Se paga en el ayuntamiento del domicilio del titular.',
    phase: 'Antes de DGT',
    source: 'Ayuntamiento del domicilio del titular',
    applies: 'always',
    notes: ['Sin justificante de pago del IVTM, la DGT no completa la matriculación.'],
  },
  {
    id: 'tasa-dgt',
    code: 'TASA',
    title: 'Tasa DGT (matriculación)',
    description: 'Pago de la tasa por la matriculación de un vehículo importado ante la Dirección General de Tráfico.',
    phase: 'Antes de DGT',
    source: 'Sede electrónica de la DGT o entidad colaboradora',
    applies: 'always',
    notes: ['Hay varias tasas DGT, asegúrate de pagar la correcta (matriculación, no transferencia).'],
  },
  {
    id: 'permiso-esp',
    code: 'PERM.ES',
    title: 'Permiso de circulación español',
    description: 'Documento oficial que acredita la matriculación del vehículo en España. Lo emite la DGT al completar la matriculación.',
    phase: 'Después de DGT',
    source: 'DGT (al presentar todo el expediente completo)',
    applies: 'always',
  },
  {
    id: 'seguro',
    code: 'SEG.',
    title: 'Póliza de seguro obligatorio',
    description: 'Seguro de responsabilidad civil obligatorio. Sin él no se puede circular.',
    phase: 'Antes de circular',
    source: 'Cualquier aseguradora autorizada',
    applies: 'always',
    notes: ['Contrata el seguro una vez tengas la matrícula asignada.'],
  },
];
