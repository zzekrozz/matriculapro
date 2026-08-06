import { redirect } from 'next/navigation';
import { safeInternalPath } from '@/lib/auth/redirect';

export default async function LegacyRegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;
  redirect(`/registro?next=${encodeURIComponent(safeInternalPath(params.next))}`);
}
