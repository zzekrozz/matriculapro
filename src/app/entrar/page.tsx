import type { Metadata } from 'next';
import { AuthPageFrame } from '@/components/auth/AuthPageFrame';
import { LoginForm } from '@/components/auth/LoginForm';
import { safeInternalPath } from '@/lib/auth/redirect';

export const metadata: Metadata = { title: 'Entrar', robots: { index: false, follow: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; message?: string }> }) {
  const params = await searchParams;
  return <AuthPageFrame title="Entrar en MatriculaPro" description="Accede con tu email y contraseña. Tu licencia se comprueba en el servidor.">{params.message === 'password-updated' && <div className="mb-4 rounded-xl bg-ok-soft p-3 text-[12px] text-ok">Contraseña actualizada. Ya puedes iniciar sesión.</div>}<LoginForm nextUrl={safeInternalPath(params.next)} /></AuthPageFrame>;
}

