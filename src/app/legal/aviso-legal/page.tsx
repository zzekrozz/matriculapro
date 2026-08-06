import { legalOwnerConfig } from '@/config/legal';
import { createLegalMetadata, LegalPage } from '@/components/public/LegalPage';

const title = 'Aviso legal';
const description = 'Identificación del titular, condiciones de acceso y responsabilidades del sitio MatriculaPro.';
const path = '/legal/aviso-legal';

export const metadata = createLegalMetadata(title, description, path);

export default function AvisoLegalPage() {
  return (
    <LegalPage
      title={title}
      description={description}
      path={path}
      sections={[
        {
          title: 'Titular del sitio',
          paragraphs: [
            <>MatriculaPro es un producto de una persona física que actúa bajo el nombre comercial <strong>{legalOwnerConfig.tradeName}</strong>. IvanImports no se presenta como sociedad mercantil.</>,
          ],
          bullets: [
            <>Nombre y apellidos: <strong>{legalOwnerConfig.legalFullName}</strong></>,
            <>NIF: <strong>{legalOwnerConfig.nif}</strong></>,
            <>Domicilio: <strong>{legalOwnerConfig.legalAddress}</strong></>,
            <>País: <strong>{legalOwnerConfig.country}</strong></>,
            <>Contacto general: <strong>{legalOwnerConfig.contactEmail}</strong></>,
          ],
        },
        {
          title: 'Objeto del sitio',
          paragraphs: [
            'El sitio informa sobre MatriculaPro y permite acceder a herramientas para organizar datos, preparar cálculos y seguir de forma guiada un expediente de matriculación de vehículos en España.',
            'El acceso gratuito ofrece una comprobación preliminar basada exclusivamente en datos introducidos manualmente. Las licencias de pago habilitan las funciones correspondientes durante un plazo determinado, sin renovación automática.',
          ],
        },
        {
          title: 'Uso correcto de la información',
          paragraphs: [
            'Los resultados dependen de la exactitud de los datos aportados y de la versión de las fuentes indicada en cada cálculo. El usuario debe contrastar la documentación original y las instrucciones vigentes del organismo competente antes de actuar.',
            'El acceso al sitio no crea una relación de gestoría, asesoramiento fiscal individualizado, ingeniería, inspección técnica ni representación ante la Administración.',
          ],
        },
        {
          title: 'Propiedad intelectual',
          paragraphs: [
            'El software, la estructura, los textos propios y la identidad visual de MatriculaPro están protegidos por la normativa aplicable. Las normas, formularios y datos oficiales pertenecen a sus respectivos organismos y se identifican mediante sus fuentes.',
            'La licencia permite usar el producto según el nivel contratado; no autoriza copiar, revender, extraer masivamente el catálogo, compartir credenciales ni crear un servicio derivado que reproduzca MatriculaPro.',
          ],
        },
        {
          title: 'Disponibilidad y enlaces externos',
          paragraphs: [
            'El servicio puede interrumpirse por mantenimiento, seguridad o incidencias de proveedores. Los enlaces a AEAT, DGT, BOE, Industria y otras sedes se facilitan para consultar la fuente; MatriculaPro no controla su disponibilidad ni su contenido futuro.',
          ],
        },
        {
          title: 'Normativa aplicable',
          paragraphs: [
            <>Este aviso debe revisarse conforme, entre otras normas, a la <a className="underline" href="https://www.boe.es/buscar/act.php?id=BOE-A-2002-13758">Ley 34/2002, de servicios de la sociedad de la información y comercio electrónico</a>. La ley aplicable, jurisdicción y mecanismos de reclamación definitivos quedan pendientes de revisión jurídica con los datos reales del titular.</>,
          ],
        },
      ]}
    />
  );
}

