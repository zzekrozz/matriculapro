import Link from 'next/link';
import { ArrowLeft, Search } from 'lucide-react';

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-bg px-5 text-ink">
      <div className="w-full max-w-xl rounded-[28px] border border-line bg-white p-8 text-center shadow-lg sm:p-12">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-soft text-accent-deep">
          <Search size={24} aria-hidden="true" />
        </div>
        <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.2em] text-accent-deep">Error 404</p>
        <h1 className="mt-3 font-serif text-4xl">Esta ruta no forma parte del expediente</h1>
        <p className="mt-4 text-[14px] leading-7 text-ink-soft">
          El enlace puede haber cambiado o la página ya no existe. Vuelve al inicio para consultar las herramientas y guías disponibles.
        </p>
        <Link href="/" className="mt-7 inline-flex items-center gap-2 rounded-full bg-ink px-5 py-3 text-[13px] font-semibold text-white">
          <ArrowLeft size={14} aria-hidden="true" /> Volver al inicio
        </Link>
      </div>
    </main>
  );
}

