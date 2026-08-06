import { createLegalMetadata, LegalPage } from '@/components/public/LegalPage';

const title = 'Términos de uso';
const description = 'Reglas de uso de los niveles Gratis, Particular y Profesional de MatriculaPro.';
const path = '/legal/terminos';

export const metadata = createLegalMetadata(title, description, path);

export default function TerminosPage() {
  return (
    <LegalPage
      title={title}
      description={description}
      path={path}
      sections={[
        {
          title: 'Cuenta y aceptación',
          paragraphs: [
            'Para usar las funciones privadas debes crear una cuenta con información correcta, proteger tus credenciales y aceptar la versión vigente de estos términos. La lectura de privacidad se registra por separado de cualquier consentimiento comercial opcional.',
            'La cuenta es personal. No puede compartirse, revenderse ni utilizarse para eludir controles de seguridad o extraer masivamente el catálogo oficial.',
          ],
        },
        {
          title: 'Niveles de acceso',
          bullets: [
            'Gratis: comprobación preliminar manual antes de la compra, sin tarjeta y sin cálculo fiscal completo.',
            'Particular: funciones fiscales y operativas para uso personal no comercial durante la licencia activa.',
            'Profesional: incluye el núcleo Particular y herramientas para gestionar clientes, costes, márgenes e informes en la actividad de una sola persona profesional.',
          ],
          paragraphs: ['Las funciones efectivamente incluidas son las mostradas en la página de precios y en el resumen previo al pago. No se presentan como disponibles funciones futuras.'],
        },
        {
          title: 'Duración, vencimiento y renovación',
          paragraphs: [
            'Las licencias de pago duran uno, seis o doce meses desde su fecha de inicio. Son pagos únicos, incluyen el IVA indicado y no se renuevan automáticamente.',
            'Al vencer, la cuenta continúa activa, el comprobador gratuito permanece disponible y los expedientes anteriores pasan a modo lectura. Para crear, editar o recalcular expedientes completos será necesario renovar manualmente.',
          ],
        },
        {
          title: 'Ampliación inicial durante 15 días',
          paragraphs: [
            'Quien compre una licencia de un mes puede ampliarla una sola vez a seis o doce meses del mismo nivel durante los primeros quince días naturales. Se descuenta íntegramente lo abonado por la licencia inicial, sin reembolso ni saldo, y la duración total se calcula desde la fecha de inicio original.',
            'La promoción no se combina con cupones, no permite cambiar de Particular a Profesional y deja de estar disponible si la compra inicial fue reembolsada.',
          ],
        },
        {
          title: 'Uso permitido y uso razonable',
          paragraphs: [
            'Una licencia activa no limita comercialmente el número total de comprobaciones o expedientes dentro de su categoría. Pueden aplicarse límites temporales de seguridad para frenar bots, fuerza bruta, scraping o consumo abusivo de recursos.',
            'Particular no autoriza uso comercial, CRM de terceros, informes con marca comercial ni cálculo de margen de compraventa. Profesional autoriza el uso comercial individual, pero no incluye equipos, sedes, API pública o marca blanca.',
          ],
        },
        {
          title: 'Datos introducidos y resultados',
          paragraphs: [
            'El usuario es responsable de transcribir los datos con fidelidad, disponer de base jurídica para introducir información de terceros y revisar cualquier contradicción. MatriculaPro no inspecciona documentos ni garantiza que el organismo competente acepte un cálculo o matricule un vehículo.',
          ],
        },
        {
          title: 'Disponibilidad, mantenimiento y suspensión',
          paragraphs: [
            'Puede haber interrupciones razonables por mantenimiento, seguridad, actualización normativa o incidencias de proveedores. El acceso puede suspenderse de forma proporcionada ante fraude, cuenta compartida, ataques o extracción masiva, con registro del motivo y canal de soporte.',
          ],
        },
        {
          title: 'Ley aplicable y reclamaciones',
          paragraphs: [
            'La ley aplicable, jurisdicción, mecanismos de resolución alternativa y dirección formal de reclamaciones deben completarse tras la revisión jurídica y con los datos reales del titular. Nada en estos términos limita derechos imperativos de consumidores.',
          ],
        },
      ]}
    />
  );
}

