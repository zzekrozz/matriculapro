import { redirect } from 'next/navigation';
import { safeInternalPath } from '@/lib/auth/redirect';

export default async function LegacyLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; message?: string }>;
}) {
  const params = await searchParams;
  const target = new URL('/entrar', 'https://matriculapro.invalid');
  target.searchParams.set('next', safeInternalPath(params.next));
  if (params.message === 'password-updated') {
    target.searchParams.set('message', 'password-updated');
  }
  redirect(`${target.pathname}${target.search}`);
}
