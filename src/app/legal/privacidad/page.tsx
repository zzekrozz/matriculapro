import { legalOwnerConfig } from '@/config/legal';
import { createLegalMetadata, LegalPage } from '@/components/public/LegalPage';

const title = 'Política de privacidad';
const description = 'Cómo trata MatriculaPro los datos de cuentas, expedientes, pagos y solicitudes de soporte.';
const path = '/legal/privacidad';

export const metadata = createLegalMetadata(title, description, path);

export default function PrivacidadPage() {
  return (
    <LegalPage
      title={title}
      description={description}
      path={path}
      sections={[
        {
          title: 'Responsable del tratamiento',
          paragraphs: [
            <>Responsable: <strong>{legalOwnerConfig.legalFullName}</strong>, NIF <strong>{legalOwnerConfig.nif}</strong>, actuando bajo la marca IvanImports. Domicilio: <strong>{legalOwnerConfig.legalAddress}</strong>. Contacto de privacidad: <strong>{legalOwnerConfig.privacyEmail}</strong>.</>,
          ],
        },
        {
          title: 'Datos tratados',
          bullets: [
            'Cuenta: nombre, email, credenciales gestionadas por Supabase Auth, aceptación de términos y estado de licencia.',
            'Operación: datos técnicos y documentales del vehículo introducidos manualmente, cálculos, hitos, costes y notas del expediente.',
            'Pago: identificadores de compra, plan, importe, moneda, impuestos, estado y eventos. MatriculaPro no debe almacenar datos completos de tarjeta.',
            'Seguridad: registros técnicos mínimos, dirección IP cuando sea necesaria para prevenir abuso o acreditar una operación, y datos de sesión.',
            'Soporte y derechos: mensajes enviados, datos necesarios para resolverlos y estado de solicitudes de supresión.',
            'Profesional: datos de titulares o clientes que el usuario profesional introduzca bajo su propia responsabilidad y con una base jurídica válida.',
          ],
        },
        {
          title: 'Finalidades y bases jurídicas',
          bullets: [
            'Crear y proteger la cuenta, prestar la comprobación gratuita y ejecutar la licencia contratada: ejecución de contrato o medidas precontractuales.',
            'Gestionar cobros, facturación y conservación exigida: ejecución contractual y obligaciones legales.',
            'Prevenir fraude, abuso y accesos indebidos: interés legítimo, ponderado y limitado a lo necesario.',
            'Atender derechos de privacidad y reclamaciones: obligación legal.',
            'Enviar comunicaciones comerciales: únicamente con consentimiento separado, revocable y nunca premarcado. El lanzamiento inicial no activa marketing por defecto.',
          ],
        },
        {
          title: 'Proveedores y destinatarios',
          paragraphs: [
            'Pueden intervenir como encargados o proveedores tecnológicos Supabase (base de datos y autenticación), el proveedor de alojamiento configurado —actualmente previsto Vercel—, Resend (correo transaccional) y Stripe (pago). Cada integración solo debe recibir los datos necesarios para su función.',
            'Antes de producción deben verificarse contratos, regiones de tratamiento, subencargados, medidas de seguridad y condiciones vigentes de cada proveedor. Los datos podrán comunicarse a administraciones o tribunales cuando exista obligación legal.',
          ],
        },
        {
          title: 'Transferencias internacionales',
          paragraphs: [
            'Algunos proveedores pueden tratar datos desde países situados fuera del Espacio Económico Europeo. Antes del lanzamiento debe documentarse la ubicación efectiva y, cuando proceda, la decisión de adecuación, cláusulas contractuales tipo y medidas adicionales aplicables. Esta página no presume una transferencia ni una garantía sin comprobar la configuración real.',
          ],
        },
        {
          title: 'Conservación',
          paragraphs: [
            'La cuenta y los expedientes se conservan mientras el servicio permanezca activo o el usuario los necesite. Al vencer una licencia, los expedientes pueden permanecer disponibles en modo lectura. Las compras, facturas y eventos asociados se conservarán durante los plazos legalmente exigibles.',
            'Una solicitud de supresión no provoca el borrado inmediato de información sometida a una obligación de conservación. Los plazos concretos y el procedimiento de bloqueo deben aprobarse en la revisión jurídica previa a producción.',
          ],
        },
        {
          title: 'Derechos',
          paragraphs: [
            <>Puedes solicitar acceso, rectificación, supresión, oposición, limitación o portabilidad escribiendo a <strong>{legalOwnerConfig.privacyEmail}</strong>. La solicitud podrá requerir una verificación proporcionada de identidad. También puedes reclamar ante la Agencia Española de Protección de Datos.</>,
            <>Marco de referencia: <a className="underline" href="https://eur-lex.europa.eu/eli/reg/2016/679/oj">Reglamento (UE) 2016/679</a> y <a className="underline" href="https://www.boe.es/buscar/act.php?id=BOE-A-2018-16673">Ley Orgánica 3/2018</a>.</>,
          ],
        },
        {
          title: 'Documentos y decisiones automatizadas',
          paragraphs: [
            'La primera versión no permite subir documentos, fotografías ni PDF y no utiliza OCR o IA para leerlos. Los estados documentales y datos del vehículo son introducidos por el usuario. El indicador de riesgo aplica reglas deterministas y explica sus factores; no es una probabilidad ni una decisión administrativa.',
          ],
        },
      ]}
    />
  );
}

