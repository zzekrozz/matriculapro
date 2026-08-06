import { cookieInventory, usesOptionalTrackingCookies } from '@/config/cookies';
import { createLegalMetadata, LegalPage } from '@/components/public/LegalPage';

const title = 'Política de cookies';
const description = 'Inventario real de cookies necesarias de MatriculaPro y de la pasarela de pago.';
const path = '/legal/cookies';

export const metadata = createLegalMetadata(title, description, path);

export default function CookiesPage() {
  return (
    <LegalPage title={title} description={description} path={path}>
      <div className="mt-10 space-y-9">
        <section>
          <h2 className="font-serif text-[28px]">Criterio de lanzamiento</h2>
          <p className="mt-3 text-[14px] leading-7 text-ink-soft">
            MatriculaPro solo utiliza cookies necesarias para la sesión, la seguridad y el pago. No incorpora Google Analytics, Meta Pixel, TikTok Pixel, Hotjar, grabaciones de sesión, publicidad personalizada ni cookies analíticas o de marketing.
          </p>
          <p className="mt-3 text-[14px] leading-7 text-ink-soft">
            {usesOptionalTrackingCookies
              ? 'Existen cookies opcionales y deben bloquearse hasta obtener consentimiento válido.'
              : 'Como no se cargan cookies opcionales, no se muestra un banner que pida aceptar aquello que no existe. Si se añadiera analítica en el futuro, se actualizará este inventario y se obtendrá consentimiento antes de cargarla.'}
          </p>
        </section>

        <section>
          <h2 className="font-serif text-[28px]">Inventario técnico</h2>
          <div className="mt-4 overflow-x-auto rounded-2xl border border-line bg-white">
            <table className="w-full min-w-[760px] border-collapse text-left text-[12px] leading-relaxed">
              <thead className="bg-bg-deep text-ink">
                <tr>
                  <th className="px-4 py-3">Cookie</th>
                  <th className="px-4 py-3">Proveedor</th>
                  <th className="px-4 py-3">Finalidad</th>
                  <th className="px-4 py-3">Duración</th>
                  <th className="px-4 py-3">Ámbito</th>
                </tr>
              </thead>
              <tbody>
                {cookieInventory.map((cookie) => (
                  <tr key={cookie.name} className="border-t border-line align-top">
                    <td className="px-4 py-4 font-mono text-[11px] text-ink">{cookie.name}</td>
                    <td className="px-4 py-4 text-ink-soft">{cookie.provider}</td>
                    <td className="px-4 py-4 text-ink-soft">{cookie.purpose}<span className="mt-1 block text-muted">{cookie.condition}</span></td>
                    <td className="px-4 py-4 text-ink-soft">{cookie.duration}</td>
                    <td className="px-4 py-4 text-ink-soft">Necesaria · {cookie.firstOrThirdParty === 'first_party' ? 'propia' : 'tercero'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="font-serif text-[28px]">Cómo controlarlas</h2>
          <p className="mt-3 text-[14px] leading-7 text-ink-soft">
            Puedes borrar las cookies desde el navegador. Si bloqueas las cookies de sesión, no podrás mantener una cuenta autenticada. Las cookies de Stripe se administran en el dominio de su Checkout y solo aparecen cuando inicias un pago.
          </p>
        </section>
      </div>
    </LegalPage>
  );
}

