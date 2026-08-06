import type { Metadata } from 'next';
import { AuthPageFrame } from '@/components/auth/AuthPageFrame';
import { RegisterForm } from '@/components/auth/RegisterForm';
import { safeInternalPath } from '@/lib/auth/redirect';

export const metadata: Metadata = { title: 'Registro gratuito', robots: { index: false, follow: false } };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const params = await searchParams;
  return <AuthPageFrame title="Crea tu cuenta gratuita" description="Confirma tu email para usar la comprobación previa a la compra. No necesitas tarjeta."><RegisterForm nextUrl={safeInternalPath(params.next)} /></AuthPageFrame>;
}

