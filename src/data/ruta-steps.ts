export interface RutaStep {
  n: number;
  id: string;
  title: string;
  /** Nombre del icono lucide-react */
  icon: string;
  state: 'recommended' | 'pending';
  /** Resumen corto del paso (subtítulo) */
  summary: string;
  /** Qué haces en este paso */
  what: string;
  /** Qué necesitas para completarlo */
  need: string[];
  /** Errores comunes a evitar */
  errors: string[];
  /** Si es true, marcar como "punto delicado" */
  delicate?: boolean;
  /** Mensaje alternativo (mostrado en paso 1 cuando bought === 'yes') */
  altMsg?: string;
  /** Módulo asociado (para CTA "Practicar este paso") */
  linkedModule?: {
    href: string;
    label: string;
    available: boolean;
  };
}

export const RUTA_STEPS: RutaStep[] = [
  {
    n: 1, id: 'antes-comprar', title: 'Antes de comprar o revisar lo comprado',
    icon: 'ShoppingCart',
    state: 'recommended',
    summary: 'Lo ideal es revisar la documentación ANTES de comprar. Si ya compraste, ordenamos el expediente.',
    what: 'Revisar la documentación del vehículo, comprobar coherencia entre documentos y, si hay dudas, escribir a la ITV antes de comprar.',
    need: ['Anuncio o ficha del vendedor', 'Fotos de documentación', 'Bastidor visible (VIN)', 'COC si está disponible'],
    errors: ['Comprar sin ver el COC ni la ficha técnica', 'No comprobar que el bastidor coincide en todos los documentos', 'Asumir que cualquier coche UE se matricula igual'],
    altMsg: 'Si ya compraste el coche, no pasa nada. Ahora el objetivo es ordenar el expediente, detectar puntos críticos y avanzar con cuidado.',
    linkedModule: {
      href: '/app/checklist/antes-de-comprar',
      label: 'Checklist antes de comprar',
      available: false,
    },
  },
  {
    n: 2, id: 'docs', title: 'Reunir documentación',
    icon: 'FileText',
    state: 'pending',
    summary: 'Documentación extranjera, factura/contrato y datos de identidad. Todo coherente entre sí.',
    what: 'Reunir todos los documentos del vehículo y del titular en una sola carpeta.',
    need: ['Permiso de circulación del país de origen', 'Factura o contrato de compraventa', 'COC o ficha reducida', 'DNI/NIE del titular'],
    errors: ['Documentos con datos que no cuadran entre sí', 'Falta el COC y no se ha pedido ficha reducida', 'Factura sin datos completos del vendedor'],
    linkedModule: {
      href: '/app/biblioteca',
      label: 'Biblioteca de documentos',
      available: false,
    },
  },
  {
    n: 3, id: 'coc', title: 'COC o ficha reducida',
    icon: 'FileCheck2',
    state: 'pending',
    summary: 'Documento técnico que homologa el vehículo. Si no hay COC, ficha reducida en laboratorio.',
    what: 'Obtener el Certificado de Conformidad (COC) o, si no está disponible, una ficha reducida emitida por laboratorio autorizado.',
    need: ['Solicitud al fabricante o ficha reducida', 'Datos técnicos del vehículo', 'Documentación de origen'],
    errors: ['Pedir el COC sin VIN coincidente', 'Asumir que el COC del país de origen es directo'],
    linkedModule: {
      href: '/app/ficha-tecnica',
      label: 'Aprende a leer la ficha 3D',
      available: true,
    },
  },
  {
    n: 4, id: 'itv', title: 'ITV de matriculación',
    icon: 'Wrench',
    state: 'pending',
    summary: 'Inspección técnica con expediente especial de matriculación. Resultado favorable obligatorio.',
    what: 'Acudir a una ITV con cita de matriculación y entregar el expediente completo. Te emiten la ficha técnica española.',
    need: ['Cita previa', 'Documentación original', 'Vehículo en condiciones (luces, ruedas, frenos, emisiones)'],
    errors: ['Llegar sin cita de matriculación específica', 'No revisar testigos del cuadro antes', 'Neumáticos sin medidas coherentes'],
    linkedModule: {
      href: '/app/recorrido-itv',
      label: 'Practicar el Recorrido ITV',
      available: true,
    },
  },
  {
    n: 5, id: '576', title: 'Modelo 576',
    icon: 'Receipt',
    state: 'pending',
    summary: 'Impuesto de matriculación. Se presenta en Hacienda con los datos técnicos del vehículo.',
    what: 'Presentar el Modelo 576 ante la Agencia Tributaria con los datos del vehículo (V.7, E, etc.).',
    need: ['Ficha técnica española', 'V.7 (CO₂)', 'Bastidor', 'Base imponible orientativa'],
    errors: ['Confundir V.7 con potencia', 'Presentar sin ficha técnica española emitida', 'Errores en bastidor (no coincide)'],
    linkedModule: {
      href: '/app/simulador-576',
      label: 'Practicar el Simulador 576',
      available: true,
    },
  },
  {
    n: 6, id: 'ivtm', title: 'IVTM (Ayuntamiento)',
    icon: 'Building2',
    state: 'pending',
    summary: 'Impuesto municipal anual. Se paga en el ayuntamiento del domicilio del titular.',
    what: 'Dar de alta en el padrón del IVTM y pagar el primer recibo en el ayuntamiento correspondiente.',
    need: ['Justificante de empadronamiento o domicilio', 'Datos del vehículo', 'Ficha técnica española'],
    errors: ['Confundir municipio del vehículo con el del titular', 'Olvidar el IVTM antes de DGT'],
  },
  {
    n: 7, id: 'tasa-dgt', title: 'Tasa DGT',
    icon: 'Banknote',
    state: 'pending',
    summary: 'Pago de la tasa por la matriculación ante la Dirección General de Tráfico.',
    what: 'Pagar la tasa correspondiente a la matriculación de un vehículo en la DGT.',
    need: ['Datos del vehículo', 'Datos del titular', 'Justificante de pago'],
    errors: ['Pagar tasa equivocada (no es la misma para todos los trámites)', 'No conservar el justificante'],
  },
  {
    n: 8, id: 'dgt', title: 'Presentación en DGT',
    icon: 'ScrollText',
    state: 'pending',
    summary: 'Expediente completo en DGT. Si todo es correcto, te asignan matrícula.',
    what: 'Presentar el expediente completo en la Jefatura Provincial de Tráfico. Te asignan la matrícula española.',
    need: ['Toda la documentación anterior', 'Justificantes de pago', 'Cita previa DGT'],
    errors: ['Faltar un solo justificante (te hacen volver)', 'Datos del titular mal escritos en algún documento'],
    delicate: true,
    linkedModule: {
      href: '/app/checklist/pre-dgt',
      label: 'Checklist pre-DGT',
      available: false,
    },
  },
  {
    n: 9, id: 'placas-seguro', title: 'Placas y seguro',
    icon: 'KeyRound',
    state: 'pending',
    summary: 'Fabricar las placas con la matrícula asignada y contratar el seguro antes de circular.',
    what: 'Una vez asignada la matrícula, fabricar placas y contratar seguro obligatorio antes de circular.',
    need: ['Matrícula asignada por DGT', 'Permiso de circulación español', 'Seguro contratado'],
    errors: ['Fabricar placas antes de que DGT asigne la matrícula', 'Circular sin seguro vigente'],
  },
];
