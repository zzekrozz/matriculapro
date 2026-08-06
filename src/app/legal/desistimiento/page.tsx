import { legalOwnerConfig } from '@/config/legal';
import { createLegalMetadata, LegalPage } from '@/components/public/LegalPage';

const title = 'Derecho de desistimiento';
const description = 'Información y modelo de comunicación para desistir de una compra de MatriculaPro cuando corresponda.';
const path = '/legal/desistimiento';

export const metadata = createLegalMetadata(title, description, path);

export default function DesistimientoPage() {
  return (
    <LegalPage title={title} description={description} path={path}>
      <div className="mt-10 space-y-10">
        <section>
          <h2 className="font-serif text-[28px]">Regla general</h2>
          <p className="mt-3 text-[14px] leading-7 text-ink-soft">
            Cuando la normativa de consumidores resulte aplicable a una contratación a distancia, existe con carácter general un plazo de catorce días naturales para comunicar el desistimiento sin indicar el motivo. El cómputo, efectos y excepciones dependen de la naturaleza jurídica final del servicio digital y de cómo se solicite su ejecución.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-[28px]">Inicio inmediato</h2>
          <p className="mt-3 text-[14px] leading-7 text-ink-soft">
            MatriculaPro no presume que acceder al producto elimina automáticamente el derecho. Si el usuario solicita que la prestación comience durante el plazo de desistimiento, esa petición debe recogerse de forma expresa, separada, sin casilla premarcada y con información clara de sus posibles consecuencias. La aplicación concreta debe aprobarse en revisión jurídica antes de habilitar cobros reales.
          </p>
          <p className="mt-3 text-[14px] leading-7 text-ink-soft">
            Referencias oficiales: <a className="underline" href="https://www.boe.es/buscar/act.php?id=BOE-A-2007-20555">Real Decreto Legislativo 1/2007</a> y <a className="underline" href="https://eur-lex.europa.eu/legal-content/ES/TXT/?uri=celex%3A32011L0083">Directiva 2011/83/UE</a>.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-[28px]">Cómo comunicarlo</h2>
          <p className="mt-3 text-[14px] leading-7 text-ink-soft">
            Envía una declaración inequívoca antes de que termine el plazo a <strong>{legalOwnerConfig.contactEmail}</strong>. Conserva prueba del envío. MatriculaPro debe acusar recibo en un soporte duradero.
          </p>
        </section>

        <section className="rounded-2xl border border-line bg-white p-6">
          <h2 className="font-serif text-[28px]">Modelo orientativo</h2>
          <div className="mt-4 space-y-3 text-[14px] leading-7 text-ink-soft">
            <p>A la atención de: {legalOwnerConfig.legalFullName}, IvanImports, {legalOwnerConfig.legalAddress}.</p>
            <p>Por la presente comunico que desisto de la compra de la licencia MatriculaPro indicada a continuación:</p>
            <ul className="space-y-1 pl-5">
              <li className="list-disc">Plan y duración: ____________________</li>
              <li className="list-disc">Fecha de compra: ____________________</li>
              <li className="list-disc">Identificador de compra: ____________________</li>
              <li className="list-disc">Nombre del consumidor: ____________________</li>
              <li className="list-disc">Email de la cuenta: ____________________</li>
              <li className="list-disc">Fecha de comunicación: ____________________</li>
            </ul>
          </div>
        </section>

        <section>
          <h2 className="font-serif text-[28px]">Reembolsos y acceso</h2>
          <p className="mt-3 text-[14px] leading-7 text-ink-soft">
            Si procede un reembolso, se tramitará por el mismo medio de pago salvo acuerdo válido distinto. La licencia podrá pasar a estado reembolsado y perder las funciones de pago, mientras la cuenta y el nivel gratuito continúan disponibles. Los plazos y posibles importes proporcionales deben determinarse con la revisión jurídica del caso.
          </p>
        </section>
      </div>
    </LegalPage>
  );
}

