'use client';

import { useParams } from 'next/navigation';
import { CaseDgt } from '@/components/cases/CaseDgt';
import { CaseNotFound, PageLoading } from '@/components/cases/CaseChrome';
import { useRegistrationCases } from '@/providers/RegistrationCaseProvider';

export default function CaseDgtPage() {
  const params = useParams<{ id: string }>();
  const { getCase, loading } = useRegistrationCases();
  if (loading) return <PageLoading />;
  const registrationCase = getCase(params.id);
  if (!registrationCase) return <CaseNotFound />;
  return <CaseDgt registrationCase={registrationCase} />;
}
