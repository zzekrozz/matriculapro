export interface ChecklistItem {
  id: string;
  label: string;
  detail?: string;
  section: string;
  critical?: boolean;
}

export interface ChecklistDef {
  code: string;
  storageKey: string;
  title: string;
  titleAccent: string;
  subtitle: string;
  intro: string;
  sections: { id: string; title: string; description?: string }[];
  items: ChecklistItem[];
  tips: string[];
  warning?: string;
  nextStep?: { href: string; label: string };
}

export const CHECKLIST_ANTES_COMPRAR: ChecklistDef = {
  code: 'M.04',
  storageKey: 'antes-comprar',
  title: 'Antes de comprar',
  titleAccent: 'comprar',
  subtitle: 'Clasifica el expediente antes de comprometer dinero.',
  intro: 'Marca un punto solo cuando tengas una prueba verificable. “No aplica” también es una respuesta válida si has documentado por qué. Una duda de homologación, titularidad o fiscalidad debe resolverse antes de pagar.',
  sections: [
    { id: 'case', title: 'Clasificación del caso', description: 'Los datos que abren o cierran cada rama.' },
    { id: 'acq', title: 'Adquisición y origen', description: 'Quién vende, qué entrega y cómo se acredita.' },
    { id: 'tech', title: 'Viabilidad técnica', description: 'Homologación, categoría y reformas.' },
    { id: 'tax', title: 'Fiscalidad y coste', description: 'IVA, ITP, aduanas e IEDMT se analizan por separado.' },
  ],
  items: [
    { id: 'origin', section: 'case', label: 'País de procedencia, país de matriculación y ubicación actual confirmados', critical: true, detail: '“Comprado en Europa” no basta. Una operación con Reino Unido o un vehículo originario de un tercer país puede exigir revisión aduanera.' },
    { id: 'seller', section: 'case', label: 'Vendedor clasificado: particular, empresa no profesional o profesional del automóvil', critical: true },
    { id: 'age-mileage', section: 'case', label: 'Fecha exacta de primera puesta en servicio, fecha de entrega y kilometraje acreditados', critical: true, detail: 'Para IVA intracomunitario es nuevo si se entrega antes de seis meses o si no ha recorrido más de 6.000 km. Verifica ambos datos; no redondees un caso en el límite.' },
    { id: 'category', section: 'case', label: 'Categoría y configuración contrastadas (por ejemplo M1 o N1)', detail: 'Un N1 no debe tratarse automáticamente como turismo ni como no sujeto al impuesto de matriculación.' },

    { id: 'foreign-docs', section: 'acq', label: 'Permiso y documento técnico extranjeros originales identificados', critical: true },
    { id: 'ownership', section: 'acq', label: 'El vendedor acredita titularidad o poder suficiente para vender', critical: true },
    { id: 'purchase-proof', section: 'acq', label: 'Borrador de contrato o factura con partes, VIN, precio, fecha y régimen fiscal coherentes', critical: true, detail: 'Contrato para venta entre particulares; factura completa cuando vende una empresa o profesional.' },
    { id: 'translation', section: 'acq', label: 'Necesidad de traducción o de documentos de baja/exportación confirmada' },
    { id: 'history', section: 'acq', label: 'Kilometraje, daños, cargas y limitaciones revisados en fuentes disponibles', detail: 'La comprobación posible depende del país; no existe una consulta universal de multas o cargas extranjeras.' },

    { id: 'vin', section: 'tech', label: 'VIN físico legible y coincidente en todos los documentos', critical: true },
    { id: 'approval', section: 'tech', label: 'Campo K, contraseña y vía de homologación identificados por una fuente competente', critical: true, detail: 'Distingue homologación UE, homologación individual/serie corta extranjera y ausencia de homologación UE.' },
    { id: 'coc-route', section: 'tech', label: 'COC disponible o alternativa técnica confirmada por la ITV', critical: true, detail: 'No todos los expedientes necesitan COC y una ficha reducida no arregla por sí sola la ausencia de homologación. Confirma antes de encargarla.' },
    { id: 'reforms', section: 'tech', label: 'Reformas, accesorios y diferencias respecto a homologación inventariados', critical: true, detail: 'Una reforma puede exigir informe de conformidad, certificado de taller, proyecto u otra regularización; no toda pieza aftermarket se tramita igual.' },

    { id: 'vat', section: 'tax', label: 'Tratamiento de IVA documentado cuando la operación es intracomunitaria', critical: true, detail: 'Si se cumple cualquiera de los criterios fiscales de medio de transporte nuevo, revisa el IVA en España. En facturas de usados confirma también el régimen aplicado por el vendedor.' },
    { id: 'itp', section: 'tax', label: 'ITP revisado cuando la adquisición es a un particular', detail: 'La obligación y el justificante se confirman con la administración tributaria competente.' },
    { id: 'customs', section: 'tax', label: 'Importación, IVA de importación y aranceles revisados si procede de un tercer país', detail: 'Incluye operaciones vinculadas con Reino Unido cuando, por fecha y circunstancias, no sean intracomunitarias.' },
    { id: 'iedmt', section: 'tax', label: 'Posible sujeción, exención o no sujeción al IEDMT revisada sin asumir un modelo', detail: 'La salida puede ser 576, 06, 05 u otra acreditación según el supuesto.' },
    { id: 'budget', section: 'tax', label: 'Presupuesto con impuestos, transporte, ITV, vía técnica, reformas, tasa, IVTM y contingencia' },
  ],
  tips: [
    'Pide documentación completa y legible, no capturas recortadas de los datos que interesan al vendedor.',
    'Formula a la ITV una pregunta concreta con VIN, categoría, contraseña de homologación y reformas.',
    'Si una factura no deja claro el régimen de IVA, pide que se corrija antes del pago.',
  ],
  warning: 'Esta checklist organiza la decisión de compra; no certifica matriculabilidad ni determina impuestos. Los casos de terceros países, N1, reformas, homologación individual o documentos incompletos requieren confirmación competente.',
  nextStep: { href: '/app/ruta', label: 'Continuar con la ruta condicional' },
};

export const CHECKLIST_PRE_ITV: ChecklistDef = {
  code: 'M.05',
  storageKey: 'pre-itv',
  title: 'Antes de la ITV',
  titleAccent: 'ITV',
  subtitle: 'Alinea vehículo, documentos y vía técnica antes de la inspección.',
  intro: 'La inspección de documentación/matriculación no es una ITV periódica ordinaria. Confirma con la estación el trámite y los originales para tu caso, y después revisa el vehículo en la configuración que se pretende documentar.',
  sections: [
    { id: 'appointment', title: 'Trámite y expediente', description: 'Confirmación previa con la estación.' },
    { id: 'identity', title: 'Identidad y configuración', description: 'Lo que debe coincidir con la documentación.' },
    { id: 'safety', title: 'Seguridad y visibilidad' },
    { id: 'running', title: 'Frenos, ruedas, motor y emisiones' },
  ],
  items: [
    { id: 'type', section: 'appointment', label: 'Tipo de inspección para documentación/matriculación confirmado con la estación', critical: true },
    { id: 'foreign-permit', section: 'appointment', label: 'Permiso de circulación extranjero original preparado', critical: true },
    { id: 'foreign-tech', section: 'appointment', label: 'Documento técnico o de inspección extranjero equivalente, cuando exista, preparado', critical: true },
    { id: 'technical-route', section: 'appointment', label: 'COC, ficha reducida, equivalencia o resolución técnica aplicable confirmada', critical: true, detail: 'Lleva la opción que corresponda; no todas son acumulativas ni intercambiables.' },
    { id: 'purchase-and-id', section: 'appointment', label: 'Identidad, prueba de adquisición y documentos adicionales solicitados por la estación preparados' },
    { id: 'reform-pack', section: 'appointment', label: 'Documentación de reformas completa cuando exista alguna', critical: true, detail: 'Puede incluir informe de conformidad, certificado de taller, proyecto u otros documentos según la reforma.' },

    { id: 'vin', section: 'identity', label: 'VIN limpio, legible y coincidente con todos los documentos', critical: true },
    { id: 'plates-labels', section: 'identity', label: 'Placas del fabricante y etiquetas reglamentarias legibles' },
    { id: 'configuration', section: 'identity', label: 'Asientos, carrocería, masas, neumáticos y demás configuración coinciden con la vía técnica', critical: true },
    { id: 'changes', section: 'identity', label: 'No hay cambios sin declarar en iluminación, suspensión, ruedas, escape, enganche o carrocería' },

    { id: 'lights', section: 'safety', label: 'Alumbrado y señalización funcionan, son simétricos donde corresponde y están configurados para España', critical: true },
    { id: 'belts', section: 'safety', label: 'Cinturones, anclajes, asientos y cierre de puertas funcionan correctamente' },
    { id: 'glass', section: 'safety', label: 'Parabrisas, retrovisores, limpiaparabrisas y lavaparabrisas en buen estado' },
    { id: 'warnings', section: 'safety', label: 'Sin testigos de avería relevantes encendidos', critical: true },
    { id: 'horn', section: 'safety', label: 'Claxon y mandos principales funcionan' },

    { id: 'tyres', section: 'running', label: 'Neumáticos sin daños, con dibujo legal y medidas/índices admitidos', critical: true },
    { id: 'brakes-steering', section: 'running', label: 'Frenos, dirección y suspensión sin síntomas de fallo' },
    { id: 'leaks', section: 'running', label: 'Sin fugas evidentes y con niveles de servicio correctos' },
    { id: 'exhaust', section: 'running', label: 'Escape, control de emisiones y ruido en configuración documentada', critical: true },
    { id: 'engine-ready', section: 'running', label: 'Motor en condiciones normales de funcionamiento para la prueba de emisiones' },
  ],
  tips: [
    'Envía antes a la estación un resumen con VIN, categoría, homologación, origen y reformas y conserva su respuesta.',
    'No desmontes ni regularices una modificación basándote solo en una checklist: confirma la solución técnica.',
    'Al recibir la tarjeta, revisa VIN, categoría, masas, plazas, neumáticos y observaciones antes de marcharte.',
  ],
  warning: 'La estación y el órgano de industria determinan la documentación y pruebas aplicables. Esta lista no anticipa un resultado favorable.',
  nextStep: { href: '/app/recorrido-itv', label: 'Repasar el recorrido educativo ITV' },
};

export const CHECKLIST_PRE_DGT: ChecklistDef = {
  code: 'M.07',
  storageKey: 'pre-dgt',
  title: 'Antes de presentar en Tráfico',
  titleAccent: 'Tráfico',
  subtitle: 'Revisa por ramas, no con una lista universal de papeles.',
  intro: 'Marca cada elemento como aportado solo si aplica a tu expediente. Si no aplica, conserva la razón y el justificante alternativo. Comprueba siempre la ficha vigente del trámite y el canal de presentación.',
  sections: [
    { id: 'identity', title: 'Solicitud e identidad' },
    { id: 'ownership', title: 'Titularidad y procedencia' },
    { id: 'technical', title: 'Rama técnica' },
    { id: 'tax', title: 'Ramas fiscales y pagos' },
    { id: 'submission', title: 'Presentación y control final' },
  ],
  items: [
    { id: 'application', section: 'identity', label: 'Solicitud y datos del titular revisados con el trámite vigente', critical: true },
    { id: 'id', section: 'identity', label: 'Identidad vigente y acreditación adicional exigible preparada', critical: true },
    { id: 'representation', section: 'identity', label: 'Representación acreditada si presenta otra persona', detail: 'No aplica cuando el titular actúa por sí mismo.' },

    { id: 'purchase', section: 'ownership', label: 'Contrato o factura aplicable acredita la adquisición y coincide con titular, VIN y precio', critical: true },
    { id: 'foreign-docs', section: 'ownership', label: 'Documentación extranjera original exigible y situación de baja/exportación revisadas', critical: true },
    { id: 'translation-customs', section: 'ownership', label: 'Traducción y documentación aduanera aportadas cuando correspondan' },

    { id: 'spanish-itv', section: 'technical', label: 'Tarjeta ITV española y resultado/documentación técnica exigible revisados', critical: true },
    { id: 'technical-support', section: 'technical', label: 'COC, ficha reducida, homologación o documentos de reforma solo si el trámite los exige', detail: 'No conviertas documentos alternativos usados en ITV en anexos universales para DGT.' },

    { id: 'acquisition-tax', section: 'tax', label: 'IVA, ITP o régimen de factura acreditado según vendedor y condición fiscal del vehículo', critical: true },
    { id: 'iedmt-proof', section: 'tax', label: 'Justificante IEDMT correcto: 576, 06, 05 u otro que corresponda', critical: true, detail: 'No marques 576 por defecto; confirma sujeción, exención o no sujeción.' },
    { id: 'ivtm', section: 'tax', label: 'Alta, pago o exención del IVTM acreditados como corresponda', critical: true },
    { id: 'fee', section: 'tax', label: 'Tasa vigente del trámite pagada y justificante vinculable', critical: true },

    { id: 'channel', section: 'submission', label: 'Canal, cita y jefatura competentes confirmados' },
    { id: 'cross-check', section: 'submission', label: 'VIN, titular, fechas y categoría coinciden en todo el expediente', critical: true },
    { id: 'copies', section: 'submission', label: 'Originales, copias y resguardos guardados; sistema para registrar subsanaciones preparado' },
  ],
  tips: [
    'Separa la carpeta en identidad, adquisición, técnica, IVA/ITP, IEDMT, IVTM y tasa.',
    'Descarga o consulta la ficha vigente del trámite el mismo día de la revisión final.',
    'Tras la resolución, revisa los datos del permiso y de la tarjeta ITV antes de fabricar placas.',
  ],
  warning: 'Los requisitos, importes, canales y justificantes cambian. Esta checklist organiza el expediente, pero la DGT, AEAT, la comunidad autónoma, aduanas y el ayuntamiento determinan qué corresponde.',
  nextStep: { href: '/app/ruta', label: 'Volver a la ruta · presentación' },
};

export const CHECKLISTS: Record<string, ChecklistDef> = {
  'antes-de-comprar': CHECKLIST_ANTES_COMPRAR,
  'pre-itv': CHECKLIST_PRE_ITV,
  'pre-dgt': CHECKLIST_PRE_DGT,
};
