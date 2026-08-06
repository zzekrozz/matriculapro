# Cobertura territorial histórica del IEDMT

Revisión normativa: **2026-08-05**.

Este documento describe únicamente la reconstrucción automática usada para la minoración de impuestos residuales de vehículos usados previamente matriculados en el extranjero. No describe el tipo actual de liquidación del Modelo 576.

## Criterio de territorio y alcance

La Orden EHA/3334/2010 indica que, para retirar la imposición residual, se usa el tipo que habría resultado exigible en la fecha de la primera matriculación y en el ámbito territorial donde el vehículo se matricula ahora en España. Por eso la comunidad autónoma de la matriculación española actual selecciona la cronología autonómica; no se toma la región extranjera de origen.

La automatización cerrada cubre:

- IVA general de Península e Illes Balears entre 1993-01-01 y 2026-12-31.
- IEDMT de turismos M1 ordinarios, con CO₂ introducido y confirmado por la persona usuaria, entre 2008-01-01 y 2026-12-31.
- El tipo común y las cronologías autonómicas de Andalucía, Asturias, Illes Balears, Cantabria, Cataluña, Región de Murcia y Comunitat Valenciana.

No cubre automáticamente la etapa anterior a 2008, motocicletas, quad, vehículos vivienda ni otras categorías en la reconstrucción histórica. Tampoco inspecciona documentos: los datos permanecen pendientes de comprobación documental externa.

## Tipos comunes

Desde 2008, para los epígrafes M1 automatizados, los tipos comunes son 0 %, 4,75 %, 9,75 % y 14,75 % para los epígrafes 1 a 4. Los umbrales ordinarios son `≤120`, `>120 y <160`, `≥160 y <200` y `≥200` g/km.

Fuente primaria: [Ley 34/2007, disposición adicional octava](https://www.boe.es/eli/es/l/2007/11/15/34) y [Ley 38/1992, artículo 70](https://www.boe.es/buscar/act.php?id=BOE-A-1992-28741). La competencia autonómica procede del [artículo 51 de la Ley 22/2009](https://www.boe.es/diario_boe/txt.php?id=BOE-A-2009-20375).

## Cronologías autonómicas versionadas

Solo se enumeran los epígrafes modificados por cada comunidad. Los demás conservan el tipo común de la fecha.

| Territorio | Vigencia | Tipos autonómicos | Base normativa oficial |
| --- | --- | --- | --- |
| Andalucía | 2010-07-10 a 2011-12-31 | ep. 4/9: 16 %; ep. 5: 13,2 % | [Decreto-ley 4/2010, art. 1.22](https://www.boe.es/buscar/doc.php?id=BOJA-b-2010-90059) y [Ley 11/2010, art. 1.22](https://www.boe.es/buscar/doc.php?id=BOE-A-2010-19850) |
| Andalucía | 2012-01-01 a 2021-12-31 | ep. 4/9: 16,9 %; ep. 5: 13,8 % | [Ley 18/2011, disposición final 8.14](https://www.boe.es/buscar/doc.php?id=BOE-A-2012-881) |
| Andalucía | desde 2022-01-01 | ep. 4/9: 14,75 %; ep. 5: 12 % | [Ley 5/2021, art. 57](https://www.boe.es/buscar/act.php?id=BOE-A-2021-17915) |
| Asturias | desde 2010-07-15 | ep. 4/9: 16 % | [Ley 5/2010, art. 7 y disposición final 2](https://www.boe.es/buscar/doc.php?id=BOE-A-2010-14629); continuidad en el [Decreto Legislativo 2/2014](https://www.boe.es/buscar/act.php?id=BOE-A-2015-945) |
| Illes Balears | desde 2012-05-01 | ep. 4: 16 % | [Decreto-ley 4/2012, art. 4 y disposición transitoria única](https://www.boe.es/buscar/doc.php?id=BOIB-i-2012-90027); continuidad en el [Decreto Legislativo 1/2014, art. 74](https://www.boe.es/buscar/act.php?id=BOE-A-2014-6925) |
| Cantabria | 2011-01-01 a 2017-12-31 | ep. 3: 11 %; ep. 4/9: 16 %; ep. 5: 13 % | [Ley 11/2010, art. 11](https://www.boe.es/buscar/doc.php?id=BOE-A-2011-1651) |
| Cantabria | desde 2018-01-01 | ep. 3: 9,75 %; ep. 4/9: 15 %; ep. 5: 12 % | [Ley 9/2017, art. 3.9](https://www.boe.es/buscar/doc.php?id=BOE-A-2018-856) |
| Cataluña | desde 2010-07-01 | ep. 4/9: 16 % | [Decreto-ley 3/2010, art. 6 y disposición final](https://www.boe.es/buscar/doc.php?id=BOE-A-2010-10217); continuidad en el [Decreto Legislativo 1/2024, art. 661-1](https://www.boe.es/buscar/doc.php?id=BOE-A-2024-6951) |
| Región de Murcia | desde 2014-08-03 | ep. 4/9: 15,9 % | [Decreto-ley 2/2014, art. 1.5 y disposición final 2](https://www.boe.es/buscar/doc.php?id=BORM-s-2014-90385), confirmado por [Ley 8/2014](https://www.boe.es/buscar/act.php?id=BOE-A-2014-13369) |
| Comunitat Valenciana | desde 2017-01-01 | ep. 4/9: 16 % | [Ley 13/2016, art. 18](https://www.boe.es/buscar/doc.php?id=BOE-A-2017-1291) |

La fecha catalana es 2010-07-01, no 2010-06-01: aunque el decreto se publicó el 31 de mayo, su disposición final aplaza expresamente los artículos 4, 5 y 6 al 1 de julio.

## Frontera del 10 y 11 de julio de 2021

La [Ley 11/2021](https://www.boe.es/eli/es/l/2021/07/09/11) se publicó el **2021-07-10** y, conforme a su disposición final séptima, entró en vigor al día siguiente, **2021-07-11**. Su disposición adicional quinta elevó temporalmente los umbrales a 144/192/240 g/km hasta 2021-12-31.

La [estadística anual de la AEAT para 2021](https://sede.agenciatributaria.gob.es/AEAT/Contenidos_Comunes/La_Agencia_Tributaria/Estadisticas/Publicaciones/sites/matriculaciones/2021/jrubikf2a0abcda2808cbd1d2e391fa9fdee1ef71700b13.html) muestra, en cambio, las columnas “hasta 09/07/2021” y “desde 10/07/2021”. Es un rótulo estadístico, no la regla de vigencia de la ley.

Decisión explícita del motor:

- **2021-07-10:** umbrales ordinarios 120/160/200.
- **2021-07-11:** primer día de los umbrales temporales 144/192/240.
- En ambas fechas se emite una advertencia con las dos fuentes para que la frontera no quede oculta.

## Territorios especiales bloqueados

| Territorio | Estado automático | Motivo y fuente primaria |
| --- | --- | --- |
| Canarias | Bloqueado | Falta una serie conjunta y continua de IGIC e IEDMT territorial. No se extrapola IVA. [Ley 20/1991](https://www.boe.es/eli/es/l/1991/06/07/20/con) y [Ley 38/1992, art. 70](https://www.boe.es/buscar/act.php?id=BOE-A-1992-28741). |
| Ceuta y Melilla | Bloqueado | El tipo IEDMT cero no autoriza a fijar en cero el IPSI histórico u otros impuestos residuales. [Ley 8/1991](https://www.boe.es/eli/es/l/1991/03/25/8/con) y [Ley 38/1992, art. 70](https://www.boe.es/buscar/act.php?id=BOE-A-1992-28741). |
| Navarra | Bloqueado | Hace falta una cronología foral propia. [Convenio Económico, Ley 28/1990, art. 35.2](https://www.boe.es/eli/es/l/1990/12/26/28/con). |
| País Vasco | Bloqueado | Hacen falta series propias de los Territorios Históricos. [Concierto Económico, Ley 12/2002, art. 33.3](https://www.boe.es/eli/es/l/2002/05/23/12/con). |

El bloqueo no se presenta como cobertura automática. Solo se puede continuar introduciendo tipos en el modo avanzado —que deja el resultado en `special-review`— o mediante revisión fiscal externa. MatriculaPro no comprueba las fuentes aportadas por la persona usuaria.

## Estados trazables de los datos

Los textos del motor distinguen entre:

- introducido por la persona usuaria;
- confirmado por la persona usuaria;
- procedente de una tabla oficial incorporada;
- calculado por MatriculaPro;
- pendiente de comprobación documental externa;
- no comprobado por MatriculaPro.

Una referencia introducida o una casilla confirmada nunca se describe como un documento inspeccionado por MatriculaPro.
