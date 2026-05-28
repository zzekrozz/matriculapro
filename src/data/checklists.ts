export interface ChecklistItem {
  id: string;
  label: string;
  /** Detalle opcional que se muestra al expandir */
  detail?: string;
  /** Sección a la que pertenece */
  section: string;
  /** Si es crítico, se marca con borde rojo */
  critical?: boolean;
}

export interface ChecklistDef {
  code: string;
  storageKey: string;       // p.ej. 'antes-comprar' (se usará 'mpro:checklist:antes-comprar')
  title: string;
  titleAccent: string;      // palabra en italic ámbar dentro del título
  subtitle: string;
  intro: string;
  sections: { id: string; title: string; description?: string }[];
  items: ChecklistItem[];
  /** Tips finales */
  tips: string[];
  /** Aviso especial al pie */
  warning?: string;
  /** Link al siguiente paso de la ruta */
  nextStep?: { href: string; label: string };
}

/* ============================================================
   M.04 · Antes de comprar
   ============================================================ */
export const CHECKLIST_ANTES_COMPRAR: ChecklistDef = {
  code: 'M.04',
  storageKey: 'antes-comprar',
  title: 'Antes de comprar',
  titleAccent: 'comprar',
  subtitle: 'Lo que tienes que verificar ANTES de pagar un solo euro.',
  intro: 'Esta lista evita las sorpresas más caras del proceso de matriculación. Si algún punto no se cumple, mejor parar que avanzar.',
  sections: [
    { id: 'doc',  title: 'Documentación del coche', description: 'Lo que el vendedor debe enseñarte antes de cerrar la operación.' },
    { id: 'tec',  title: 'Verificación técnica', description: 'Comprobaciones físicas en el coche.' },
    { id: 'leg',  title: 'Verificación legal', description: 'Comprobaciones administrativas.' },
    { id: 'fis',  title: 'Aspectos fiscales', description: 'Lo que cambia el coste real de la operación.' },
  ],
  items: [
    { id: 'coc-disp',    section: 'doc', label: 'El vendedor tiene el COC del coche, o sabe cómo conseguirlo', critical: true, detail: 'Sin COC ni posibilidad de ficha reducida, no hay matriculación. Verifica esto antes de seguir.' },
    { id: 'permiso',     section: 'doc', label: 'Permiso de circulación original del país de origen' },
    { id: 'factura',     section: 'doc', label: 'Factura o contrato de compraventa con datos completos del vendedor' },
    { id: 'itv-origen',  section: 'doc', label: 'ITV (o equivalente) del país de origen, vigente' },
    { id: 'historico',   section: 'doc', label: 'Historial del coche revisado (kilometraje, accidentes, embargos)' },

    { id: 'vin-coincide', section: 'tec', label: 'VIN del coche y VIN del COC coinciden, carácter por carácter', critical: true, detail: 'Compruébalo letra por letra. Una sola diferencia significa que algo no cuadra.' },
    { id: 'vin-todos',    section: 'tec', label: 'VIN coincide también con factura y permiso de circulación' },
    { id: 'cuentakm',     section: 'tec', label: 'Cuentakilómetros coherente con el historial' },
    { id: 'reformas',     section: 'tec', label: 'No hay modificaciones aftermarket sin documentar', detail: 'Escape no original, suspensión rebajada, kits estéticos extremos: cada uno necesita su homologación.' },

    { id: 'titular',  section: 'leg', label: 'El vendedor es el titular del coche o tiene poder para venderlo', critical: true },
    { id: 'cargas',   section: 'leg', label: 'Comprobado que el coche no tiene cargas, embargos o reservas de dominio' },
    { id: 'multas',   section: 'leg', label: 'Sin multas pendientes asociadas al vehículo' },
    { id: 'identidad',section: 'leg', label: 'DNI del comprador en regla y a su nombre' },

    { id: 'iva',     section: 'fis', label: 'Régimen fiscal del IVA aclarado (vehículo nuevo vs usado)', detail: 'En UE, vehículo < 6 meses o < 6.000 km es "nuevo" fiscalmente: IVA en destino.' },
    { id: 'tasas',   section: 'fis', label: 'Estimación de costes totales hecha (vehículo + impuestos + tasas + transporte)' },
    { id: 'gestor',  section: 'fis', label: 'Decidido si vas a hacer todo solo o con gestoría/acompañamiento' },
  ],
  tips: [
    'Si el vendedor tiene prisa por cerrar la operación, eso es señal de revisar el doble — no de acelerar.',
    'Mejor renunciar a un coche que te encaja por dudas documentales que comprometerte y tener problemas después.',
    'El coste de un asesor o gestoría es muy inferior al de un error en esta fase.',
  ],
  warning: 'Esta lista cubre los puntos más comunes pero no es exhaustiva. Cada coche tiene sus particularidades.',
  nextStep: { href: '/app/ruta', label: 'Continúa con la Ruta de matriculación' },
};

/* ============================================================
   M.05 · Pre-ITV
   ============================================================ */
export const CHECKLIST_PRE_ITV: ChecklistDef = {
  code: 'M.05',
  storageKey: 'pre-itv',
  title: 'Antes de la ITV',
  titleAccent: 'ITV',
  subtitle: 'Lleva el coche y el expediente listos para que no te marquen defectos evitables.',
  intro: 'La mayoría de los defectos que sacan en una ITV de matriculación se podrían haber detectado en casa. Repasa esta lista antes de ir.',
  sections: [
    { id: 'cita',  title: 'Cita y documentación', description: 'Antes de salir de casa.' },
    { id: 'luces', title: 'Luces', description: 'Lo que más se olvida y más fácil de revisar.' },
    { id: 'inter', title: 'Interior y elementos de seguridad' },
    { id: 'rued',  title: 'Ruedas y exterior' },
    { id: 'motor', title: 'Motor y emisiones' },
  ],
  items: [
    { id: 'cita-mat',  section: 'cita', label: 'Cita pedida específicamente como "ITV de matriculación" (no periódica)', critical: true },
    { id: 'exped',     section: 'cita', label: 'Expediente completo en una carpeta: COC, permiso origen, factura, DNI' },
    { id: 'llaves',    section: 'cita', label: 'Llaves y mando del coche (todos los disponibles)' },

    { id: 'cruce',     section: 'luces', label: 'Luces de cruce funcionan en ambos lados, parejas en intensidad' },
    { id: 'largas',    section: 'luces', label: 'Luces largas se notan claramente más potentes que el cruce' },
    { id: 'posicion',  section: 'luces', label: 'Luces de posición delanteras y traseras' },
    { id: 'intermit',  section: 'luces', label: 'Intermitentes delante, detrás y laterales' },
    { id: 'freno',     section: 'luces', label: 'Luz de freno se enciende a la vez en ambos pilotos' },
    { id: 'matricula', section: 'luces', label: 'Luz de matrícula trasera funciona', detail: 'Es la luz que más se olvida. Pide a alguien que mire mientras tú enciendes las luces.' },
    { id: 'marcha-at', section: 'luces', label: 'Luz de marcha atrás funciona' },
    { id: 'antinieb',  section: 'luces', label: 'Antiniebla delantero y trasero' },

    { id: 'cinturones', section: 'inter', label: 'Cinturones sin cortes, abrochan y retraen bien (todos)' },
    { id: 'claxon',     section: 'inter', label: 'Claxon suena claro y a la primera' },
    { id: 'limpia',     section: 'inter', label: 'Limpiaparabrisas funcionan y dejan limpio (escobillas en buen estado)' },
    { id: 'testigos',   section: 'inter', label: 'Sin testigos críticos encendidos en el cuadro', critical: true, detail: 'Motor, ABS, airbag, frenos: cualquiera de estos encendido suele ser defecto grave.' },
    { id: 'extintor',   section: 'inter', label: 'Triángulos / luz de emergencia V16 / chaleco (lo exigido)' },

    { id: 'neum-medida', section: 'rued', label: 'Cuatro neumáticos con dibujo > 1.6 mm', critical: true },
    { id: 'neum-eje',    section: 'rued', label: 'Mismas medidas en cada eje (puede ser distintas entre ejes)' },
    { id: 'neum-danos',  section: 'rued', label: 'Sin cortes, bultos ni deformaciones visibles' },
    { id: 'matricula-fi','section': 'rued', label: 'Matrícula provisional/del país de origen visible y legible' },
    { id: 'carroceria',  section: 'rued', label: 'Sin abolladuras o roturas que afecten a la seguridad' },

    { id: 'motor-calien', section: 'motor', label: 'Coche bien caliente al llegar (mejor circular 15 min antes)', detail: 'Para los gases. Coche frío puede dar emisiones fuera de rango aunque esté bien.' },
    { id: 'aceite',       section: 'motor', label: 'Niveles correctos: aceite, refrigerante, líquido de frenos' },
    { id: 'humo',         section: 'motor', label: 'Sin humo visible al acelerar' },
    { id: 'escape',       section: 'motor', label: 'Escape sin fugas ni golpes evidentes' },
  ],
  tips: [
    'Llega con 10 minutos de antelación. La ITV de matriculación lleva más papeleo que la periódica.',
    'Lleva una linterna en el móvil — viene bien para revisar últimas cosas en el aparcamiento.',
    'Si tienes dudas sobre algún punto, pregunta al inspector al llegar, no después de empezar.',
  ],
  warning: 'Cada estación ITV puede tener matices propios. Esta lista cubre lo común; no sustituye a la inspección oficial.',
  nextStep: { href: '/app/recorrido-itv', label: 'Repasa el Recorrido ITV interactivo' },
};

/* ============================================================
   M.07 · Pre-DGT
   ============================================================ */
export const CHECKLIST_PRE_DGT: ChecklistDef = {
  code: 'M.07',
  storageKey: 'pre-dgt',
  title: 'Antes de pisar Tráfico',
  titleAccent: 'Tráfico',
  subtitle: 'Si falta un solo papel, te hacen volver. Revisa todo antes de salir de casa.',
  intro: 'La DGT es el último paso. Llegar con el expediente completo es la diferencia entre salir con matrícula asignada en una visita o tener que volver dos o tres veces. Marca cada punto con calma.',
  sections: [
    { id: 'tec',  title: 'Documentación técnica' },
    { id: 'fis',  title: 'Documentación fiscal' },
    { id: 'pers', title: 'Documentación personal' },
    { id: 'cita', title: 'Cita y logística' },
  ],
  items: [
    { id: 'ficha-esp',  section: 'tec', label: 'Ficha técnica española emitida por la ITV de matriculación', critical: true },
    { id: 'itv-fav',    section: 'tec', label: 'Informe de ITV favorable de matriculación' },
    { id: 'coc-fr',     section: 'tec', label: 'COC original (o ficha reducida del laboratorio)' },
    { id: 'permiso-or', section: 'tec', label: 'Permiso de circulación del país de origen' },

    { id: 'm576-pres',  section: 'fis', label: 'Modelo 576 presentado y pagado (con sello/justificante)', critical: true },
    { id: 'ivtm-pag',   section: 'fis', label: 'IVTM pagado en el ayuntamiento del domicilio del titular', critical: true },
    { id: 'tasa-dgt',   section: 'fis', label: 'Tasa DGT pagada (modelo correcto)', critical: true, detail: 'Hay varias tasas DGT distintas. La de matriculación de vehículos es específica.' },
    { id: 'iva-justif', section: 'fis', label: 'Justificante de IVA si aplica (operaciones intracomunitarias)' },

    { id: 'dni',        section: 'pers', label: 'DNI/NIE del titular en regla y vigente', critical: true },
    { id: 'empadron',   section: 'pers', label: 'Justificante de empadronamiento (no siempre lo piden, llévalo por si)' },
    { id: 'factura',    section: 'pers', label: 'Factura o contrato de compraventa original' },

    { id: 'cita-dgt',   section: 'cita', label: 'Cita previa en la Jefatura Provincial de Tráfico correspondiente', critical: true, detail: 'Sin cita no te atienden. Pídela con tiempo: hay esperas.' },
    { id: 'copias',     section: 'cita', label: 'Tienes copias de TODO (no solo originales)' },
    { id: 'tiempo',     section: 'cita', label: 'Llegada con 15 min de antelación a la cita' },
  ],
  tips: [
    'Si te falta un solo papel, vuelves otro día. Mejor 5 minutos extra revisando que un viaje extra a la jefatura.',
    'Llévalo todo en una carpeta organizada por secciones. El funcionario te lo agradecerá.',
    'Una vez asignada la matrícula, no fabricates las placas hasta tener el permiso de circulación español impreso.',
  ],
  warning: 'Plazos, tasas y documentación pueden variar según jefatura. Esta lista cubre lo común; consulta antes con la jefatura concreta donde tengas cita.',
  nextStep: { href: '/app/ruta', label: 'Vuelve a la Ruta · Paso 8' },
};

export const CHECKLISTS: Record<string, ChecklistDef> = {
  'antes-de-comprar': CHECKLIST_ANTES_COMPRAR,
  'pre-itv':          CHECKLIST_PRE_ITV,
  'pre-dgt':          CHECKLIST_PRE_DGT,
};
