import type { Metadata } from 'next';
import { AuthPageFrame } from '@/components/auth/AuthPageFrame';
import { RecoverPasswordForm } from '@/components/auth/RecoverPasswordForm';

export const metadata: Metadata = { title: 'Recuperar contraseña', robots: { index: false, follow: false } };
export default function RecoverPasswordPage() { return <AuthPageFrame title="Recuperar contraseña" description="Te enviaremos un enlace si existe una cuenta asociada al email."><RecoverPasswordForm /></AuthPageFrame>; }

