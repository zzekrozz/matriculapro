'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RotateCcw } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Error de interfaz de MatriculaPro', error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-bg px-5 text-ink">
      <div className="w-full max-w-xl rounded-[28px] border border-line bg-white p-8 text-center shadow-lg sm:p-12">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-warn-soft text-warn">
          <AlertTriangle size={24} aria-hidden="true" />
        </div>
        <h1 className="mt-6 font-serif text-4xl">No hemos podido cargar esta pantalla</h1>
        <p className="mt-4 text-[14px] leading-7 text-ink-soft">
          Tus datos no se han marcado como presentados ni validados. Puedes volver a intentarlo o regresar al inicio.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <button onClick={reset} className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-3 text-[13px] font-semibold text-white">
            <RotateCcw size={14} aria-hidden="true" /> Reintentar
          </button>
          <Link href="/" className="inline-flex items-center rounded-full border border-line px-5 py-3 text-[13px] font-semibold text-ink">
            Volver al inicio
          </Link>
        </div>
      </div>
    </main>
  );
}

