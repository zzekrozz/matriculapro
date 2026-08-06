import { createLegalMetadata, LegalPage } from '@/components/public/LegalPage';

const title = 'Aviso fiscal y técnico';
const description = 'Alcance y límites de los cálculos, rutas y comprobaciones preparados por MatriculaPro.';
const path = '/legal/aviso-fiscal-tecnico';

export const metadata = createLegalMetadata(title, description, path);

export default function AvisoFiscalTecnicoPage() {
  return (
    <LegalPage
      title={title}
      description={description}
      path={path}
      sections={[
        {
          title: 'Qué hace MatriculaPro',
          paragraphs: [
            <strong key="central">MatriculaPro prepara cálculos, rutas y documentación utilizando los datos introducidos por el usuario y fuentes oficiales versionadas. No presenta declaraciones, no sustituye a la AEAT, DGT, ITV u otros organismos y no verifica físicamente la documentación.</strong>,
            'El motor puede determinar una ruta fiscal, consultar una fila oficial de valoración, aplicar depreciación y minoración, y preparar las casillas del Modelo 576 cuando el caso entra en el alcance soportado. Cada resultado identifica sus datos de entrada, reglas, fuente y bloqueos.',
          ],
        },
        {
          title: 'Estados trazables',
          bullets: [
            'Introducido por el usuario.',
            'Confirmado por el usuario.',
            'Procedente de tabla oficial.',
            'Calculado por MatriculaPro.',
            'Pendiente de comprobar documentalmente.',
            'No comprobado por MatriculaPro.',
          ],
          paragraphs: ['Estos estados no certifican autenticidad, integridad o aceptación administrativa. Una coincidencia con una tabla oficial tampoco acredita que el vehículo real sea exactamente esa versión.'],
        },
        {
          title: 'Límites del cálculo fiscal',
          paragraphs: [
            'El cálculo solo se completa cuando existen datos suficientes y una regla versionada para fecha, territorio, categoría, combustible, CO₂, valoración y reducciones. Los periodos o territorios no soportados se bloquean y requieren revisión externa; no se rellenan con supuestos silenciosos.',
            'Los importes no son definitivos hasta que el usuario comprueba documentos, fecha de devengo, sujeto pasivo, beneficios fiscales, tipo territorial y formulario vigente. La AEAT puede comprobar la valoración o pedir documentación adicional.',
          ],
        },
        {
          title: 'Límites técnicos y documentales',
          paragraphs: [
            'MatriculaPro no emite un COC, ficha reducida, informe de conformidad, proyecto, certificado de taller o tarjeta ITV. Tampoco decide si una reforma es legalizable ni garantiza la homologación o matriculación.',
            'La primera versión no admite subir PDF, fotografías o documentos. No utiliza OCR ni IA. Todos los datos técnicos y estados documentales se introducen manualmente.',
          ],
        },
        {
          title: 'Presentación ante organismos',
          paragraphs: [
            'MatriculaPro no paga impuestos o tasas, no obtiene NRC o CEM, no reserva citas, no presenta Modelos 05, 06 o 576 y no remite expedientes a ITV o DGT. El usuario debe completar cada trámite en la sede oficial o con un profesional habilitado.',
          ],
        },
        {
          title: 'Cuándo detener el proceso',
          paragraphs: [
            'Solicita revisión a AEAT, ITV, DGT, ingeniería, homologación, Aduanas o asesoría cuando existan datos contradictorios, CO₂ no acreditado, reformas, categoría especial, homologación individual, territorio foral, traslado desde Canarias, procedencia extracomunitaria o documentación incompleta.',
          ],
        },
      ]}
    />
  );
}

