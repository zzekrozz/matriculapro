import Link from 'next/link';
import { createLegalMetadata, LegalPage } from '@/components/public/LegalPage';

const title = 'Condiciones de contratación';
const description = 'Información previa para contratar una licencia temporal de MatriculaPro mediante pago único.';
const path = '/legal/condiciones-contratacion';

export const metadata = createLegalMetadata(title, description, path);

export default function CondicionesContratacionPage() {
  return (
    <LegalPage
      title={title}
      description={description}
      path={path}
      sections={[
        {
          title: 'Características esenciales',
          paragraphs: [
            <>MatriculaPro ofrece licencias <strong>Particular</strong> y <strong>Profesional</strong> de uno, seis o doce meses. La comparación actualizada de funciones y precios se muestra en la <Link className="underline" href="/#precios">tabla pública de precios</Link> y se repite antes de confirmar el pago.</>,
            'Particular está destinado al uso personal no comercial. Profesional permite el uso comercial individual y añade clientes, control financiero e informes profesionales. Ningún plan incluye presentación automática ante AEAT, ITV o DGT.',
          ],
        },
        {
          title: 'Precio, IVA y pago',
          paragraphs: [
            'El checkout debe mostrar plan, duración, base imponible, tipo de IVA, cuota, total, moneda y país fiscal antes de que el comprador quede obligado. Los precios públicos iniciales incluyen IVA español al 21%, pero el tratamiento final debe calcularse según los datos fiscales y la normativa aplicable a la compra.',
            'El pago es único y no existe renovación automática. Stripe procesa el medio de pago; MatriculaPro no debe recibir ni almacenar el número completo de tarjeta. Solo un webhook con firma autenticada puede activar la licencia.',
          ],
        },
        {
          title: 'Activación y duración',
          paragraphs: [
            'La licencia comienza cuando Stripe confirma válidamente el pago y el backend registra la activación. La fecha de vencimiento se muestra en la cuenta y en el email de confirmación. Si el pago queda pendiente o falla, no se concede acceso de pago.',
          ],
        },
        {
          title: 'Compatibilidad y requisitos técnicos',
          paragraphs: [
            'Se requiere un navegador moderno con JavaScript, cookies necesarias y conexión a Internet. Algunas presentaciones administrativas externas pueden exigir Cl@ve, certificado electrónico, DNIe, software o condiciones fijadas por el organismo correspondiente.',
          ],
        },
        {
          title: 'Factura, confirmación y soporte',
          paragraphs: [
            'Tras la compra se enviará una confirmación en soporte duradero con el plan, precio, IVA, duración, fecha de inicio y vencimiento, condiciones aceptadas e información de desistimiento. La factura se emitirá con los datos facilitados y las obligaciones aplicables.',
            'El contacto de soporte se muestra en la cuenta y en el aviso legal una vez configurado. Los tiempos de respuesta o niveles de servicio no deben prometerse hasta quedar definidos y revisados.',
          ],
        },
        {
          title: 'Inicio inmediato y desistimiento',
          paragraphs: [
            <>El acceso inmediato durante el plazo de desistimiento requiere una solicitud o consentimiento expreso separado cuando jurídicamente corresponda. Ninguna casilla debe estar premarcada y el mero acceso no elimina automáticamente el derecho. Consulta la <Link className="underline" href="/legal/desistimiento">información de desistimiento</Link>.</>,
          ],
        },
        {
          title: 'Proceso de contratación',
          bullets: [
            'Iniciar sesión y seleccionar nivel y duración.',
            'Revisar funciones, precio final, impuestos y fechas.',
            'Aceptar las condiciones y, por separado, decidir sobre el inicio inmediato cuando corresponda.',
            'Completar el pago seguro en Stripe Checkout.',
            'Esperar la confirmación del pago y la activación del backend.',
            'Recibir por email el resumen contractual y consultar la licencia en la cuenta.',
          ],
        },
      ]}
    />
  );
}
