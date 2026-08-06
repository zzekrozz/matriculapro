import type { Metadata } from 'next';
import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import { AuthPageFrame } from '@/components/auth/AuthPageFrame';
import { safeInternalPath } from '@/lib/auth/redirect';

export const metadata: Metadata = {
  title: 'Confirmación de cuenta',
  robots: { index: false, follow: false, nocache: true },
};

const explanations = {
  expired: 'El enlace ha caducado. Solicita un nuevo envío para continuar.',
  invalid: 'El enlace no es válido o ya fue utilizado. Si ya confirmaste la cuenta, puedes iniciar sesión.',
  provider: 'El proveedor de autenticación no ha podido completar la confirmación. Inténtalo de nuevo más tarde.',
} as const;

type ConfirmationStatus = keyof typeof explanations;

export default async function ConfirmPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; next?: string; flow?: string }>;
}) {
  const params = await searchParams;
  const status: ConfirmationStatus = params.status === 'expired' || params.status === 'provider'
    ? params.status
    : 'invalid';
  const next = safeInternalPath(params.next);
  const nextQuery = encodeURIComponent(next);
  const recovery = params.flow === 'recovery';

  return (
    <AuthPageFrame
      title={recovery ? 'No se ha podido validar la recuperación' : 'No se ha podido confirmar la cuenta'}
      description={explanations[status]}
    >
      <div role="alert" className="rounded-2xl border border-accent/25 bg-accent-soft p-4">
        <AlertTriangle className="text-accent-deep" size={24} aria-hidden="true" />
        <p className="mt-2 text-[12px] leading-relaxed text-ink-soft">
          Por seguridad no mostramos detalles internos del enlace. Un enlace válido conserva el destino que habías elegido.
        </p>
      </div>
      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        <Link
          href={`/entrar?next=${nextQuery}`}
          className="inline-flex min-h-11 items-center justify-center rounded-full bg-ink px-4 text-[12px] font-medium text-white"
        >
          Iniciar sesión
        </Link>
        <Link
          href={recovery ? '/recuperar-contrasena' : `/registro?next=${nextQuery}`}
          className="inline-flex min-h-11 items-center justify-center rounded-full border border-line px-4 text-[12px] font-medium text-ink"
        >
          {recovery ? 'Solicitar otro enlace' : 'Volver al registro'}
        </Link>
      </div>
    </AuthPageFrame>
  );
}
