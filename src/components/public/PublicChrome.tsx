import Link from 'next/link';
import { ArrowRight, CarFront, ChevronRight } from 'lucide-react';
import { legalOwnerConfig, isPendingLegalValue } from '@/config/legal';

export function PublicHeader({ publicBeta = false }: { publicBeta?: boolean }) {
  return (
    <header className="border-b border-line bg-white/95 backdrop-blur">
      <div className="mx-auto flex min-h-16 max-w-[1180px] items-center justify-between gap-4 px-5 lg:px-8">
        <Link href="/" className="flex items-center gap-2 text-ink" aria-label="MatriculaPro, inicio">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-ink text-white">
            <CarFront size={18} aria-hidden="true" />
          </span>
          <span>
            <span className="font-serif text-[22px] leading-none">MatriculaPro</span>
            <span className="block text-[9px] font-semibold uppercase tracking-[0.2em] text-accent-deep">
              by IvanImports
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-6 text-[13px] text-ink-soft md:flex" aria-label="Navegación pública">
          <Link href="/#como-funciona" className="hover:text-ink">Cómo funciona</Link>
          {!publicBeta && <Link href="/#precios" className="hover:text-ink">Precios</Link>}
          <Link href="/calcular-modelo-576" className="hover:text-ink">Guías</Link>
        </nav>

        <div className="flex items-center gap-2">
          <Link href="/entrar" className="hidden rounded-full px-3 py-2 text-[12px] text-ink-soft hover:bg-bg-deep sm:inline-flex">
            Entrar
          </Link>
          <Link
            href={publicBeta ? '/registro?next=/app/expedientes/nuevo' : '/registro?next=/app/comprobar'}
            className="inline-flex items-center gap-1.5 rounded-full bg-ink px-4 py-2.5 text-[12px] font-semibold text-white"
          >
            {publicBeta ? 'Probar MatriculaPro' : 'Comprobar gratis'} <ChevronRight size={13} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </header>
  );
}

export function PublicFooter({ publicBeta = false }: { publicBeta?: boolean }) {
  const supportConfigured = !isPendingLegalValue(legalOwnerConfig.supportEmail);

  return (
    <footer className="bg-ink py-12 text-[#B4BECE]">
      <div className="mx-auto max-w-[1180px] px-5 lg:px-8">
        <div className="grid gap-9 border-b border-white/10 pb-9 md:grid-cols-[1.5fr_1fr_1fr]">
          <div>
            <p className="font-serif text-2xl text-white">MatriculaPro</p>
            <p className="mt-2 max-w-md text-[13px] leading-relaxed">
              Software de IvanImports para preparar la importación y matriculación de vehículos en España con datos introducidos manualmente y fuentes oficiales versionadas.
            </p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">Producto</p>
            <ul className="mt-3 space-y-2 text-[13px]">
              <li><Link href="/#como-funciona" className="hover:text-white">Cómo funciona</Link></li>
              {!publicBeta && <li><Link href="/#precios" className="hover:text-white">Precios</Link></li>}
              <li><Link href="/comprobar-documentacion-coche-importado" className="hover:text-white">Guías públicas</Link></li>
              <li><Link href="/legal/aviso-fiscal-tecnico" className="hover:text-white">Límites fiscales y técnicos</Link></li>
            </ul>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">Legal</p>
            <ul className="mt-3 space-y-2 text-[13px]">
              <li><Link href="/legal/aviso-legal" className="hover:text-white">Aviso legal</Link></li>
              <li><Link href="/legal/privacidad" className="hover:text-white">Privacidad</Link></li>
              <li><Link href="/legal/cookies" className="hover:text-white">Cookies</Link></li>
              <li><Link href="/legal/terminos" className="hover:text-white">Términos de uso</Link></li>
              <li><Link href="/legal/condiciones-contratacion" className="hover:text-white">Contratación</Link></li>
              <li><Link href="/legal/desistimiento" className="hover:text-white">Desistimiento</Link></li>
            </ul>
          </div>
        </div>
        <div className="flex flex-col gap-2 pt-6 text-[11px] sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} MatriculaPro by IvanImports.</span>
          <span>{supportConfigured ? legalOwnerConfig.supportEmail : 'Contacto legal pendiente de configuración antes de producción.'}</span>
        </div>
      </div>
    </footer>
  );
}

export function PublicCta({
  title = 'Comprueba el vehículo antes de comprarlo',
  body = 'Regístrate gratis e introduce los datos manualmente. Recibirás una revisión preliminar de documentación y riesgos sin aportar tarjeta.',
}: {
  title?: string;
  body?: string;
}) {
  return (
    <aside className="rounded-[28px] bg-ink p-7 text-white shadow-xl sm:p-10">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-accent">Comprobación previa gratuita</p>
      <h2 className="mt-3 font-serif text-3xl leading-tight sm:text-4xl">{title}</h2>
      <p className="mt-4 max-w-2xl text-[14px] leading-relaxed text-[#C7D0DE]">{body}</p>
      <Link
        href="/registro?next=/app/comprobar"
        className="mt-6 inline-flex items-center gap-2 rounded-full bg-accent px-5 py-3 text-[13px] font-semibold text-ink"
      >
        Comprobar un vehículo gratis <ArrowRight size={15} aria-hidden="true" />
      </Link>
    </aside>
  );
}
