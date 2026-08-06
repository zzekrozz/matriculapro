# Auditoría fiscal completa del Modelo 576 - 2026-08-05

Este documento conserva también la auditoría administrativa y técnica de MatriculaPro, pero su revisión fiscal de 2026 es la referencia principal para el motor del Modelo 576.

**Fecha de revisión:** 2026-08-05  
**Ámbito temporal:** normativa y páginas oficiales comprobadas hasta el 5 de agosto de 2026  
**Naturaleza del documento:** registro de fuentes, reglas de producto y límites del motor de decisión. No sustituye la comprobación del expediente concreto por la Administración, una estación ITV, un técnico competente o un asesor fiscal/aduanero cuando corresponda.

## 1. Ámbito cubierto

El flujo automatizable de la primera versión se limita a la matriculación ordinaria en España de turismos **M1**, nuevos o usados, adquiridos a un particular o profesional, procedentes de un Estado miembro de la Unión Europea, con homologación europea identificable y sin reformas relevantes pendientes de resolver.

La pertenencia al Espacio Económico Europeo tiene efectos técnicos, pero no convierte a Noruega, Islandia o Liechtenstein en Estados miembros de la UE a efectos de IVA o aduanas. Por ello el producto debe separar:

- ámbito técnico EEE;
- ámbito IVA/aduanero de la UE;
- territorios especiales, incluida Irlanda del Norte cuando se acredita mediante la documentación correspondiente;
- Gran Bretaña y los demás terceros países.

El cálculo fiscal automatizado se limita al IEDMT estimado de M1 en territorio de régimen común cuando están confirmados sujeción, ausencia de beneficio fiscal, comunidad autónoma, emisiones oficiales válidas, epígrafe y base imponible. Canarias, Ceuta y Melilla disponen de tipos generales propios, pero permanecen en revisión especial por el resto de particularidades fiscales. Navarra y los territorios históricos del País Vasco no deben usar por defecto la configuración de régimen común.

## 2. Fuentes oficiales empleadas

Todas las fuentes se revisaron el **2026-08-05**. En páginas dinámicas sin fecha de publicación visible se registra esa fecha como `reviewedAt`; no se presume que su contenido sea inmutable.

| Autoridad | Fuente oficial y versión comprobada | Ámbito utilizado |
|---|---|---|
| Jefatura del Estado / BOE | [Ley 37/1992, de 28 de diciembre, del Impuesto sobre el Valor Añadido — texto consolidado](https://www.boe.es/eli/es/l/1992/12/28/37/con), última actualización publicada 28/02/2026 | Concepto de medio de transporte nuevo, adquisiciones intracomunitarias y límite de seis meses/6.000 km. |
| AEAT | [Adquisiciones intracomunitarias de medios de transporte nuevos — Manual práctico de IVA 2025](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/manual-iva-2025/capitulo-03-entregas-realizadas-empresarios-profesionales/adquisiciones-intracomunitarias-importaciones-bienes/concepto-adquisicion-intracomunitaria/adquisic-intrac-medios-transp-nuevos-iva.html) | Tributación en destino y explicación administrativa del concepto de vehículo nuevo. |
| Jefatura del Estado / BOE | [Ley 38/1992, de 28 de diciembre, de Impuestos Especiales — texto consolidado](https://www.boe.es/eli/es/l/1992/12/28/38/con), última actualización publicada 30/06/2026 | Sujeción, no sujeción, exenciones, reducciones, base, epígrafes y tipos del IEDMT. |
| AEAT | [Modelo 576. Impuesto Especial sobre Determinados Medios de Transporte. Autoliquidación](https://sede.agenciatributaria.gob.es/Sede/vehiculos-embarcaciones/primera-matriculacion-medios-transporte/modelo-576.html) y [sus instrucciones](https://sede.agenciatributaria.gob.es/Sede/todas-gestiones/impuestos-tasas/impuesto-matriculacion/modelo-576-impue_____eterminados-medios-transporte-autoliquidacion_/instrucciones.html) | Autoliquidación de operaciones sujetas y no exentas, incluida la cuota resultante de tipo cero. |
| AEAT | [Modelo 05. Reconocimiento previo de determinados supuestos de no sujeción, exención o reducción](https://sede.agenciatributaria.gob.es/Sede/vehiculos-embarcaciones/primera-matriculacion-medios-transporte/modelo-05.html), [procedimiento GZ17](https://sede.agenciatributaria.gob.es/Sede/procedimientos/GZ17.shtml) e [instrucciones PDF](https://sede.agenciatributaria.gob.es/static_files/Sede/Procedimiento_ayuda/GZ17/instr_mod05.pdf) | Beneficios que requieren reconocimiento previo y posterior 576 cuando el beneficio es una reducción. |
| AEAT | [Modelo 06. Exenciones y no sujeción sin reconocimiento previo](https://sede.agenciatributaria.gob.es/Sede/vehiculos-embarcaciones/primera-matriculacion-medios-transporte/modelo-06.html) e [instrucciones](https://sede.agenciatributaria.gob.es/Sede/todas-gestiones/impuestos-tasas/impuesto-matriculacion/modelo-06-impues_____xenciones-no-sujecion-previo_/instrucciones-modelo-06.html) | Claves, justificantes, primera puesta en servicio y supuestos declarables mediante 06. |
| AEAT | [Tipos impositivos del Impuesto de Matriculación](https://sede.agenciatributaria.gob.es/Sede/vehiculos-embarcaciones/primera-matriculacion-medios-transporte/son-tipos-impuesto-aplicar-caso/tipos-impositivos.html), página dinámica comprobada 05/08/2026 | Tipos estatales, territoriales y modificaciones autonómicas publicadas por AEAT. Revisión anual obligatoria. |
| Ministerio de Hacienda / BOE | [Orden HAC/1501/2025, de 17 de diciembre, por la que se aprueban los precios medios de venta aplicables en 2026](https://www.boe.es/buscar/doc.php?id=BOE-A-2025-26357), efectos 01/01/2026 | Medio oficial de valoración de vehículos usados; no se trata como único valor posible en todos los casos. |
| Jefatura del Estado / BOE | [Ley 34/2007, de 15 de noviembre](https://www.boe.es/eli/es/l/2007/11/15/34), con efectos fiscales desde 01/01/2008 | Inicio de la estructura del IEDMT por epígrafes de CO₂ utilizada por el resolver histórico automatizado. |
| Jefatura del Estado / BOE | [Ley 11/2021, de 9 de julio](https://www.boe.es/buscar/act.php?id=BOE-A-2021-11473), disposición adicional quinta | Umbrales transitorios 144/192/240 g/km desde 11/07/2021 hasta 31/12/2021. |
| Jefatura del Estado / BOE | [Ley 41/1994](https://www.boe.es/buscar/act.php?id=BOE-A-1994-28967), [Ley 26/2009](https://www.boe.es/diario_boe/txt.php?id=BOE-A-2009-20765) y [Real Decreto-ley 20/2012](https://www.boe.es/buscar/act.php?id=BOE-A-2012-9364) | Cronología del IVA común utilizada en la minoración residual: 15 %, 16 %, 18 % y 21 % según fecha. |
| Ministerio de Economía y Hacienda / BOE | [Real Decreto Legislativo 1/1993, de 24 de septiembre, texto refundido del ITPAJD](https://www.boe.es/buscar/act.php?id=BOE-A-1993-25359), última actualización publicada 21/03/2026 | Sujeción territorial a TPO y exclusión cuando transmite un empresario/profesional en el ejercicio de su actividad o la operación está sujeta a IVA. |
| Jefatura del Estado / BOE | [Ley 22/2009, de 18 de diciembre](https://www.boe.es/buscar/act.php?id=BOE-A-2009-20375), última actualización publicada 29/07/2022 | Punto de conexión autonómico del ITP para bienes muebles. |
| DGT | [Matricular un vehículo proveniente de la UE](https://www.dgt.es/nuestros-servicios/tu-vehiculo/quieres-traer-o-llevarte-un-vehiculo-del-extranjero/matricular-un-vehiculo-proveniente-de-la-ue/), actualización indicada por DGT 25/09/2024 | Titularidad, ITV española, fiscalidad, IVTM, DGT, rehabilitación, placas y circulación. |
| Sede Electrónica DGT | [Matriculación de vehículos nuevos y vehículos provenientes del extranjero](https://sede.dgt.gob.es/es/vehiculos/matriculaciones-de-vehiculos/matriculacion-ordinaria/index.html), comprobada 05/08/2026 | Documentación dinámica por origen/vendedor, fiscalidad, canales, Reino Unido y documentos aduaneros. |
| DGT | [Importar un vehículo de fuera de la UE](https://www.dgt.es/nuestros-servicios/tu-vehiculo/quieres-traer-o-llevarte-un-vehiculo-del-extranjero/importar-un-vehiculo-de-fuera-de-la-ue/index.html), actualización indicada por DGT 03/11/2025 | Rama de terceros países y coordinación con aduanas, ITV y matriculación. |
| DGT | [Matricular un vehículo nuevo](https://www.dgt.es/nuestros-servicios/tu-vehiculo/matricular-un-vehiculo/matricular-un-vehiculo-nuevo/) | Asignación de matrícula, placas y obligación de seguro antes de circular. |
| Ministerio de Industria y Turismo | [Vehículos — preguntas frecuentes de homologación y matriculación](https://industria.gob.es/es-es/servicios/calidad/paginas/vehiculos.aspx), comprobada 05/08/2026 | Documentación de vehículos previamente matriculados en el EEE, CoC, ficha reducida y equivalencia. |
| Ministerio de Industria y Turismo | [Manual de Procedimiento de Inspección de las Estaciones ITV, versión 7.9](https://industria.gob.es/Calidad-Industrial/vehiculos/itv1/Manual%20de%20procedimiento%20de%20inspecci%C3%B3n/Manual%20de%20procedimiento%20de%20inspeccion%20de%20estaciones%20ITV-V%207.9_final2.pdf), vigente desde 01/01/2026 | ITV previa, documentación EEE, vigencia/reconocimiento de inspecciones extranjeras y comprobaciones técnicas. |
| Ministerio de Industria y Turismo / BOE | [Resolución de 1 de octubre de 2025 que aprueba la revisión 7.9 del Manual ITV](https://www.boe.es/diario_boe/txt.php?id=BOE-A-2025-20343) | Versión y entrada en vigor del Manual ITV. |
| Ministerio de Industria, Turismo y Comercio / BOE | [Real Decreto 750/2010, de 4 de junio — texto consolidado](https://www.boe.es/buscar/act.php?id=BOE-A-2010-9994), última actualización publicada 29/05/2026 | Procedimientos de homologación y documentación para matriculación de vehículos del EEE. |
| Ministerio de Industria y Turismo | [Manual de Reformas de Vehículos, revisión 7, corrección 2](https://industria.gob.es/Calidad-Industrial/vehiculos/Documents/Manual%20de%20Reformas%20de%20Veh%C3%ADculos%20Revisi%C3%B3n%207.2.pdf), vigente desde 06/02/2026 | Identificación y documentación de reformas. |
| Ministerio de Industria y Turismo / BOE | [Resolución de 27 de enero de 2026 que actualiza el Manual de Reformas](https://www.boe.es/diario_boe/txt.php?id=BOE-A-2026-2709), publicada 05/02/2026 y eficaz al día siguiente | Versión y entrada en vigor de la revisión 7, corrección 2. |
| Ministerio de la Presidencia / BOE | [Real Decreto 866/2010, de 2 de julio, sobre tramitación de reformas](https://www.boe.es/buscar/act.php?id=BOE-A-2010-11154) | Definición normativa de reforma y procedimiento general. |
| AEAT | [Nota Informativa GA 15/2021 sobre matriculación de vehículos procedentes del Reino Unido](https://sede.agenciatributaria.gob.es/static_files/Sede/Tema/Aduanas/Notas_info/NI_2021/NIGA15_21.pdf), 31/05/2021 | Estatuto aduanero de vehículos de Gran Bretaña tras el Brexit y prueba específica de Irlanda del Norte mediante V5C. |
| AEAT | [Consecuencias del Brexit en el IVA desde el 1 de enero de 2021](https://sede.agenciatributaria.gob.es/Sede/iva/iva-operaciones-comercio-exterior/consecuencias-brexit-iva-partir-1-2021.html) | Separación entre Gran Bretaña, Irlanda del Norte y operaciones de bienes. |
| Ministerio de Hacienda / BOE | [Real Decreto Legislativo 2/2004, de 5 de marzo, texto refundido de la Ley Reguladora de las Haciendas Locales](https://www.boe.es/buscar/act.php?id=BOE-A-2004-4214), última actualización publicada 03/06/2026 | Naturaleza municipal del IVTM, tarifa base, ordenanzas, devengo y competencia de gestión. |

La aplicación no calcula actualmente tipos autonómicos de ITP ni cuotas municipales de IVTM. Antes de implantar esos importes deberá registrarse además la norma autonómica o la ordenanza municipal aplicable al expediente, con fecha de vigencia y revisión.

## 3. Reglas implantadas y criterio jurídico validado

### 3.1 Vehículo nuevo o usado a efectos de IVA

La regla exacta es:

```text
nuevo = fechaEntrega < sumarMesesNaturales(primeraPuestaEnServicio, 6)
        OR kilometraje <= 6000

usado = fechaEntrega >= sumarMesesNaturales(primeraPuestaEnServicio, 6)
        AND kilometraje > 6000
```

Consecuencias de límite:

| Antigüedad en la entrega | Kilometraje | Resultado IVA |
|---|---:|---|
| Cinco meses | 20.000 km | Nuevo por antigüedad. |
| Ocho meses | 5.900 km | Nuevo por kilometraje. |
| Seis meses exactos | 6.000 km | Nuevo por kilometraje. |
| Seis meses exactos | 6.001 km | Usado; la entrega ya no es anterior al sexto mes y supera 6.000 km. |

Se usan meses naturales, no una aproximación de 180 o 183 días. La referencia jurídica es la fecha de entrega/adquisición que determina la operación; la fecha de evaluación del expediente no puede sustituirla. Como primera puesta en servicio se emplea normalmente la primera matriculación, con las reglas probatorias subsidiarias indicadas por AEAT cuando aquella no existe o no es acreditable.

### 3.2 Fiscalidad de la adquisición

- Medio de transporte nuevo adquirido en otro Estado miembro de la UE y expedido a Península o Baleares: se abre IVA español. El justificante o modelo concreto depende del perfil del adquirente; no se fija universalmente modelo 300 o 309.
- Usado adquirido a particular de otro Estado miembro: contrato, traducción cuando proceda y justificación de ITP conforme al supuesto y a la comunidad autónoma competente.
- Usado adquirido a profesional extranjero: factura, identificación fiscal IVA del vendedor y régimen de IVA cuando sea relevante; no se exige ITP por defecto.
- Compra a profesional español que importó el vehículo: factura y acreditación de actividad/alta fiscal cuando DGT la requiera. No se presenta como adquisición intracomunitaria realizada por el comprador español.
- Vehículo ya propiedad del usuario: no se simula compraventa; se revisan titularidad, residencia, uso y posible exención.
- Tercer país: rama aduanera y prueba aduanera aplicable. El producto usa el concepto genérico de `customsProof`, pues la documentación oficial vigente puede referirse, según el canal y supuesto, a H1, DUA, anotación ITV u otra acreditación válida.

### 3.3 Homologación e ITV

- Homologación CE de tipo y CoC **válido y correspondiente al vehículo**: el CoC sustituye la ficha reducida en el expediente técnico aplicable; no sustituye la inspección ni la ficha ITV española.
- Homologación CE identificable sin CoC: posible ficha reducida particularizada, emitida según el caso por fabricante, servicio técnico designado o técnico competente tras la comprobación física exigible.
- Homologación individual o serie corta del EEE: revisión de equivalencia/autorización española; una ficha reducida aislada no resuelve el supuesto.
- Sin homologación europea o española aplicable: posible homologación individual. La ficha reducida no es una homologación.
- La ausencia del campo K es una señal de documentación incompleta, no una declaración automática de imposibilidad. Campo K, placa del fabricante y demás documentos deben contrastarse.
- Para vehículos previamente matriculados en el EEE se solicitan los originales de circulación e inspección técnica/equivalente aplicables. Si fueron retirados al dar de baja, el Real Decreto 750/2010 contempla copias autenticadas en el supuesto previsto.
- La vigencia de una inspección extranjera y la inspección previa española son conceptos distintos. El Manual ITV 7.9 recalcula la siguiente inspección conforme a frecuencias españolas y determina si procede inspección limitada o completa.

### 3.4 Reformas

Una pieza no original no constituye por sí sola una reforma. Se detectan posibles modificaciones de suspensión, ruedas no equivalentes, separadores, alumbrado, enganche, asientos, clasificación, carrocería, camperización, escape, potencia/motor, dimensiones, elementos exteriores, volante y estructura. El resultado es una alerta o revisión contra el Manual de Reformas vigente; nunca una garantía favorable o desfavorable sin inspección y documentación.

### 3.5 IEDMT: 576, 06, 05 o revisión especial

- **576:** operación sujeta y no exenta, incluso si el tipo aplicable produce cuota cero.
- **06:** declaración de una no sujeción o exención que no necesita reconocimiento previo, cuando encaja en sus claves e instrucciones.
- **05:** solicitud de reconocimiento previo de no sujeción, exención o reducción. Si se reconoce una reducción —por ejemplo, familia numerosa— el expediente necesita después la autoliquidación 576 con la reducción concedida.
- **Revisión especial:** falta fundamento, documentación o datos para determinar el modelo.

Para N1, N2 y N3 se comprueba la categoría definitiva y si el vehículo está acondicionado como vivienda. En N1, además, la no sujeción exige afectación significativa a actividad económica; se presume cuando existe derecho a deducir al menos el 50 % del IVA soportado en adquisición/importación. N2 y N3 están incluidos en la no sujeción legal salvo excepciones, en particular su acondicionamiento como vivienda. M2 y M3 forman parte de los supuestos de no sujeción, pero permanecen fuera de la automatización del MVP.

El traslado de residencia solo puede abrir una posible exención tras comprobar, entre otros requisitos, residencia fuera de España durante al menos doce meses consecutivos, adquisición con tributación normal y sin beneficio de exportación, uso en la residencia anterior durante al menos seis meses, plazo de matriculación aplicable y prohibición de transmisión durante los doce meses posteriores.

### 3.6 Base y emisiones

- Vehículo nuevo: base definida por las reglas del IVA/contraprestación conforme a la Ley 38/1992.
- Vehículo usado: valor de mercado en la fecha de devengo, con la reducción de impuestos indirectos residuales en la medida legalmente procedente para vehículos previamente matriculados en el extranjero.
- Las tablas de precios medios de venta son una herramienta oficial de valoración, no una calculadora universal ni necesariamente el único medio admisible.
- V.7, CO₂, cilindrada y precio de compra no son por sí mismos la base imponible universal.
- Las emisiones oficiales intervienen principalmente en el epígrafe y el tipo. Pueden acreditarse mediante la documentación oficial admitida; V.7 no es la única fuente posible.

El motor ofrece tres vías separadas: base de IVA para vehículo nuevo, fila exacta de la tabla oficial para usado y valoración de mercado justificada marcada como avanzada. Para una fila oficial usada calcula primero el valor de mercado con el porcentaje del Anexo IV y, si el vehículo estuvo matriculado en el extranjero, aplica aritmética racional exacta. La salida explicativa limita la representación a 18 decimales y las casillas monetarias se presentan a céntimos:

```text
BI = VM / (1 + IVA histórico + IEDMT histórico + otros impuestos indirectos)
```

Los tipos históricos del denominador nunca se reutilizan como tipo actual de liquidación. La minoración residual tampoco se confunde con las reducciones legales de la base: 50 % para familia numerosa con reconocimiento previo acreditado, 70 % para autocaravana o vehículo vivienda cuya clasificación y elegibilidad estén documentadas, y 20 % cuando concurren ambas condiciones. El motor bloquea una reducción de vivienda si `vehicle.kind` no es `motorhome`.

### 3.7 Tipos IEDMT comprobados para 2026

| Territorio | Epígrafes 1/6 | 2/7 | 3/8 | 4/9 | 5 |
|---|---:|---:|---:|---:|---:|
| Península y Baleares, tipo estatal | 0 % | 4,75 % | 9,75 % | 14,75 % | 12 % |
| Canarias | 0 % | 3,75 % | 8,75 % | 13,75 % | 11 % |
| Ceuta y Melilla | 0 % | 0 % | 0 % | 0 % | 0 % |

Modificaciones autonómicas mostradas por AEAT el 2026-08-05:

- Andalucía: epígrafes 4/9, 14,75 %; epígrafe 5, 12 %.
- Asturias: epígrafes 4/9, 16 %.
- Illes Balears: epígrafe 4, 16 %.
- Cantabria: epígrafe 3, 9,75 %; 4/9, 15 %; 5, 12 %.
- Cataluña: epígrafes 4/9, 16 %.
- Región de Murcia: epígrafes 4/9, 15,9 %.
- Comunitat Valenciana: epígrafes 4/9, 16 %.

El resto de comunidades de régimen común usa la tabla estatal salvo cambio normativo. Navarra y País Vasco requieren configuración foral trazada a una fuente vigente y no heredan automáticamente estos valores.

### 3.8 IVTM, DGT, placas y seguro

- El IVTM es municipal. El producto solicita municipio correspondiente al domicilio que figurará en el permiso, potencia fiscal, fecha y posibles bonificaciones; no fija un importe nacional.
- DGT recibe documentación dinámica según expediente: identidad/representación, documentos extranjeros aplicables, ficha ITV española, título de adquisición, justificantes de adquisición y del IEDMT, IVTM, tasa y prueba aduanera cuando corresponda.
- CoC, ficha reducida, empadronamiento, informe ITV separado y modelo 576 no son requisitos universales del paso DGT.
- Las personas jurídicas tramitan por canal electrónico conforme a las instrucciones vigentes; no se les promete la misma vía presencial que a una persona física.
- Las placas se fabrican después de que DGT asigne el número. El seguro debe estar vigente antes de circular, pero puede prepararse o quedar pendiente de matrícula definitiva con anterioridad.

### 3.9 Reino Unido después del Brexit

- Gran Bretaña: la entrada en el territorio aduanero de la UE-27 desde 01/01/2021 activa la rama de tercer país salvo prueba válida del estatuto aduanero de mercancía de la Unión.
- Irlanda del Norte: debe acreditarse, en particular, mediante el V5C que identifique Irlanda del Norte; no basta seleccionar un código de país en la interfaz.
- Para probar presencia anterior al fin del periodo transitorio importa la entrada en UE-27, no únicamente la entrada en España.
- Estatuto aduanero y homologación técnica son decisiones independientes. Una mercancía de la Unión no adquiere por ello homologación CE, y una homologación CE no evita por sí misma el despacho aduanero.

## 4. Estado de implantación tras la reconstrucción

Revisión final de `src/domain/registration` realizada el 2026-08-05:

| Regla | Estado implantado |
|---|---|
| Límite IVA con OR, seis meses naturales y 6.000 km incluidos | Implantada en `rules.ts`; sólo usa una fecha real de referencia y bloquea cuando falta. |
| Compra a particular/profesional, IVA nuevo y aduanas | Decisiones separadas en `purchase-tax-router.ts`, incluida la separación UE/EEE y el vendedor profesional español. |
| COC, ficha reducida y equivalencia | Ruta conservadora en `technical-path.ts`; distingue disponibilidad, validez, coincidencia con VIN y homologación individual/serie corta. |
| Posibles reformas | Detector estructurado, alerta y bloqueo operativo según datos; nunca emite un veredicto de inspección. |
| 576, 06, 05 o revisión | Enrutador implantado, incluidas cautelas N1/N2/N3, vivienda y 05 seguido de 576 cuando se reconoce una reducción. |
| Configuración IEDMT 2026 | Versionada en `config/tax-rates-2026.ts`; Navarra y País Vasco devuelven cálculo no disponible. |
| Catálogo oficial 2026 | Importadas 70.931 filas del Anexo I (70.886 vehículos y 45 bandas), con hashes, duplicados, rechazos, muestras y migración versionada. |
| Estimación M1 | Sólo se ejecuta con ruta 576, confirmación expresa de sujeción, datos coherentes, territorio soportado y CO₂ contrastado con un documento oficial; produce las casillas 01–08 aplicables. |
| Depreciación y uso profesional | Anexo IV completo por aniversarios naturales; factor 70 % sólo para taxi, alquiler o autoescuela con fechas de inicio y fin coherentes, periodo superior a seis meses naturales, exclusividad, confirmación y evidencia. |
| Minoración residual | Implementada con decimal exacto, IVA/IEDMT históricos separados del tipo actual y `tiposOTROS` nunca inventado. |
| Reducciones de base | Familia numerosa 50 % condicionada a reconocimiento previo; vivienda 70 % condicionada a clasificación `motorhome` y elegibilidad documentada; concurrencia 20 % sólo si ambas ramas superan sus validaciones. |
| Historial fiscal | Cada cálculo es una versión inmutable con entradas, resultados intermedios, fuentes, advertencias y confirmación. |
| Documentación dinámica | Generada según vendedor, procedencia, vía técnica y modelo fiscal; el COC no es universal. |
| Fuentes y fecha | Registro oficial versionado en `sources.ts` y `official_source_versions`, con fecha visible en las decisiones. |

## 5. Supuestos que requieren revisión profesional

Requieren un resultado `special-review`, explicación del dato activador, documentos pendientes y profesional/organismo competente:

- N1 sin acreditar afectación económica, N2/N3 acondicionados como vivienda, M2/M3 y categorías especiales;
- autocaravanas, camperizaciones y cambios de clasificación;
- vehículos históricos, rehabilitaciones y vehículos anteriormente matriculados en España;
- terceros países, Gran Bretaña post-Brexit, titularidad aduanera dudosa o prueba insuficiente de estatuto de la Unión;
- vehículos sin homologación europea válida, homologación individual o serie corta extranjera y equivalencia no autorizada;
- reformas complejas, alteraciones estructurales, potencia/motor, carrocería o conversión de volante;
- traslado de residencia, herencias, donaciones, diplomáticos e importación temporal;
- taxi, alquiler, autoescuela, familia numerosa, discapacidad y cualquier beneficio fiscal no acreditado;
- Canarias, Ceuta, Melilla, Navarra y territorios forales vascos cuando se pretenda una conclusión fiscal completa;
- factura ambigua, régimen de IVA no identificado, documentos contradictorios, VIN/titularidad dudosos o documentación incompleta;
- base imponible discutible, corrección de impuestos indirectos residuales o emisiones no acreditadas oficialmente.

Según el caso, la revisión corresponde a AEAT o administración tributaria foral/autonómica, Aduanas, DGT, ayuntamiento, estación ITV, autoridad de homologación, fabricante, servicio técnico designado, técnico competente o asesor fiscal/aduanero.

## 6. Limitaciones del cálculo

- La cuota mostrada es una **estimación orientativa para preparar el expediente**, no el impuesto definitivo.
- No se calcula si falta comunidad aplicable, categoría compatible, emisiones oficiales válidas, ruta 576, valoración trazable o confirmación de ausencia de exención/no sujeción pendiente.
- El valor oficial sólo se usa tras confirmar una fila exacta; una coincidencia posible, ambigua, no encontrada o fuera del periodo comercial bloquea la vía oficial.
- En usados, la factura se conserva como comparación y no sustituye automáticamente el valor de mercado. La valoración justificada permanece identificada como vía avanzada.
- El motor aplica depreciación, minoración residual y reducciones acreditadas, pero bloquea los tipos históricos que no puede resolver con evidencia oficial suficiente.
- No se calculan ITP autonómico, IVA/IGIC de adquisición, aranceles/importación, IVTM municipal, tarifas ITV, ingeniería, traducción, transporte, seguro, placas ni honorarios.
- Las exenciones y no sujeciones se enrutan a Modelo 05, 06 o revisión; no se genera una cuota 576 mientras esa ruta siga pendiente.
- No se calculan automáticamente epígrafes cuando las emisiones exigibles no están acreditadas: se exige revisión en lugar de inferir el motivo de la ausencia.
- Los tipos de 2026 caducan como configuración operativa al cambiar ejercicio o norma; deben revisarse al menos anualmente y antes de una presentación real.
- La minoración histórica automática cubre IVA común desde 1993 e IEDMT M1 estatal común desde 2008. Periodos anteriores, Canarias, Ceuta, Melilla, Navarra, País Vasco y series autonómicas históricas quedan bloqueados salvo dato avanzado aportado con fuente y marcado como pendiente de contraste.
- Las comunidades que tienen una modificación autonómica en la configuración vigente quedan bloqueadas en modo histórico automático mientras no exista su serie autonómica completa y versionada; el motor no las sustituye por el tipo estatal.
- No hay una medida general de deducción lineal registrada para 2026. Todo importe positivo en la casilla 05 queda bloqueado hasta incorporar una medida oficial versionada con identificador y fuente coincidentes.
- Una confirmación de ruta enviada como texto no basta: el cálculo requiere además `registrationTaxSubjectConfirmed: true`; el router conserva `special-review` mientras esa confirmación sea nula.

## 7. Decisiones de producto

- Separar la clasificación IVA, la fiscalidad de adquisición, la ruta técnica y el IEDMT; ninguna decide automáticamente las demás.
- Usar bloqueos explícitos cuando faltan datos jurídicamente determinantes; no rellenarlos con la fecha actual ni con supuestos silenciosos.
- Guardar por regla resultado, motivo, datos usados, datos ausentes, fuente, fecha, confianza y carácter bloqueante.
- Mantener porcentajes y versiones en configuración de dominio, nunca dispersos en componentes React.
- Tratar CoC/ficha reducida/equivalencia como documentación de la fase ITV; DGT recibe normalmente la ficha ITV española y los documentos administrativos aplicables.
- Generar requisitos documentales por expediente, no una lista universal.
- Usar prueba aduanera genérica y verificable en lugar de hardcodear únicamente “DUA”.
- No convertir una bandera como `cocAvailable`, un campo K o un CO₂ escrito por el usuario en validación documental.
- Mantener separados la práctica ficticia y el expediente real, y mostrar siempre cuándo un cálculo es ficticio u orientativo.
- Versionar manual ITV, Manual de Reformas, orden anual de valores y tipos fiscales, con revisión programada.

## 8. Contenido antiguo incorrecto eliminado o excluido del dominio

En la capa de dominio inspeccionada se han sustituido o excluido como reglas válidas las siguientes afirmaciones:

- “Menos de seis meses **y** menos de 6.000 km” para considerar nuevo: la conexión correcta es **o** y el kilometraje incluye 6.000.
- “Usado solo si han pasado más de seis meses”: exactamente seis meses y más de 6.000 km ya no cumple la definición de nuevo.
- “V.7, emisiones, cilindrada o precio de compra determinan siempre la base imponible”.
- “La tabla de Hacienda es el único valor posible”.
- “El CoC es obligatorio para todos los vehículos y para DGT”.
- “Solo un laboratorio puede emitir ficha reducida” o “una ficha reducida siempre resuelve la falta de homologación”.
- “Toda pieza aftermarket exige homologación” y cualquier garantía previa de resultado ITV.
- “Todo vehículo importado presenta modelo 576” o “tipo 0 % equivale a modelo 06”.
- “Todo N1 está no sujeto” o “N1 usa automáticamente la tabla M1 de CO₂”.
- “El modelo 05 sustituye siempre cualquier trámite posterior”, incluso cuando solo reconoce una reducción.
- “La ITV extranjera vigente es siempre obligatoria” o “siempre evita una inspección española completa”.
- “DUA” como única prueba aduanera posible.
- COC “americano-europeo”, certificado BTW pagado en Países Bajos como requisito universal, plazos fijos sin fuente y costes nacionales únicos.
- Empadronamiento, COC, ficha reducida, informe ITV separado o 576 como requisitos universales de DGT.
- “El seguro solo puede contratarse después de fabricar las placas”.

La búsqueda global final confirmó que esas expresiones sólo sobreviven cuando se citan para negarlas, explicar el error o plantearlas como respuesta incorrecta en una práctica.

## 9. Fuera del MVP

Quedan detectados pero no resueltos automáticamente:

- N1, N2, N3, M2, M3, L, O y categorías especiales;
- autocaravanas y vehículos vivienda fuera de los supuestos fiscales expresamente soportados;
- históricos, rehabilitación y anteriores matrículas españolas;
- terceros países, Gran Bretaña post-Brexit e importaciones temporales;
- homologación individual, series cortas, equivalencia y ausencia de homologación;
- reformas complejas;
- traslado de residencia, herencia, donación y diplomáticos;
- discapacidad y otros beneficios no modelados; taxi, alquiler, autoescuela y familia numerosa sólo se resuelven con las condiciones y evidencias exigidas por el motor;
- Canarias, Ceuta, Melilla y fiscalidad foral completa;
- cálculo automático de ITP, IVTM, IVA/IGIC, aduanas y costes técnicos/logísticos;
- expedientes con documentación contradictoria, incompleta o titularidad dudosa.

## 10. Discrepancias encontradas y resolución aplicada

La inspección inicial encontró dieciocho discrepancias. Todas se trataron antes del cierre:

1. **UE/EEE:** se separaron `eu` y `eea`; el EEE no UE abre revisión fiscal/aduanera aunque conserve la vía técnica EEE.
2. **Fecha IVA:** se eliminó el fallback a `updatedAt`; sin fecha de entrega/compra el resultado es indeterminado y bloqueante.
3. **N1:** se añadieron categoría ITV, uso económico, porcentaje de deducción de IVA y excepción de vehículo vivienda.
4. **N2/N3 vivienda:** se bloquea la recomendación automática cuando existe configuración de vivienda o falta confirmar la categoría.
5. **Reducción:** Modelo 05 genera también el requisito de 576 posterior cuando corresponde.
6. **Foralidad:** Navarra y País Vasco ya no heredan tipos de régimen común.
7. **Brexit:** se modelan entrada en UE-27, prueba de estatuto de la Unión y V5C de Irlanda del Norte.
8. **Profesional español:** su factura se decide antes de la rama de adquisición intracomunitaria.
9. **Validez del COC:** se distinguen disponibilidad, validez comprobada y coincidencia con VIN.
10. **Casos especiales:** bloquean la estimación fiscal automática.
11. **CO₂:** se guardan fuente y estado de contraste; un valor manual sin respaldo documental no calcula cuota.
12. **Traslado:** se validan periodos mínimos y declaraciones sobre tributación, plazo y no transmisión.
13. **Documentos extranjeros:** se solicitan sólo cuando el vehículo fue matriculado y el documento existe o resulta aplicable.
14. **M2/M3:** permanecen en revisión especial dentro del MVP.
15. **Fuentes:** se añadieron las leyes, reales decretos, fuentes locales y nota Brexit al registro versionado.
16. **Manual de Reformas:** `effectiveFrom` se corrigió a **2026-02-06**.
17. **IVTM:** se añadieron potencia fiscal, fecha, beneficio y cinco estados municipales.
18. **Inspección extranjera:** se modelan disponibilidad, fecha y vigencia separadas de la inspección previa española.

Las pruebas unitarias cubren los límites fiscales y los escenarios críticos; cualquier dato insuficiente mantiene `special-review` o un bloqueo explícito.

## 11. Mantenimiento

- Revisar anualmente tipos IEDMT, orden de precios medios y manuales técnicos.
- Revisar las páginas dinámicas AEAT/DGT antes de cada release que cambie reglas o documentos.
- Conservar pruebas de límites de IVA, UE frente a EEE, N1/N2/N3 vivienda, reducciones 05 + 576, foralidad, Brexit y falta de emisiones acreditadas.
- No cambiar una regla administrativa sin actualizar fuente, `reviewedAt`, versión, pruebas y este documento.
