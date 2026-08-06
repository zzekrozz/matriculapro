import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { AuthPageFrame } from '@/components/auth/AuthPageFrame';
import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm';
import { isRecoveryToken, RECOVERY_AUTHORIZED_COOKIE } from '@/lib/auth/recovery-flow';

export const metadata: Metadata = { title: 'Restablecer contraseña', robots: { index: false, follow: false } };
export default async function ResetPasswordPage() {
  const cookieStore = await cookies();
  const recoveryAuthorized = isRecoveryToken(
    cookieStore.get(RECOVERY_AUTHORIZED_COOKIE)?.value,
  );
  return <AuthPageFrame title="Define una nueva contraseña" description="El enlace es temporal y solo funciona con una sesión de recuperación válida."><ResetPasswordForm recoveryAuthorized={recoveryAuthorized} /></AuthPageFrame>;
}
