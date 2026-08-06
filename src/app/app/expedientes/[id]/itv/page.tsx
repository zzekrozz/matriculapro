'use client';

import { useParams } from 'next/navigation';
import { CaseItv } from '@/components/cases/CaseItv';
import { CaseNotFound, PageLoading } from '@/components/cases/CaseChrome';
import { useRegistrationCases } from '@/providers/RegistrationCaseProvider';

export default function CaseItvPage() {
  const params = useParams<{ id: string }>();
  const { getCase, loading } = useRegistrationCases();
  if (loading) return <PageLoading />;
  const registrationCase = getCase(params.id);
  if (!registrationCase) return <CaseNotFound />;
  return <CaseItv registrationCase={registrationCase} />;
}
