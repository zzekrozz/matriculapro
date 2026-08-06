'use client';

import { useParams } from 'next/navigation';
import { CaseTaxes } from '@/components/cases/CaseTaxes';
import { CaseNotFound, PageLoading } from '@/components/cases/CaseChrome';
import { useRegistrationCases } from '@/providers/RegistrationCaseProvider';

export default function CaseTaxesPage() {
  const params = useParams<{ id: string }>();
  const { getCase, loading } = useRegistrationCases();
  if (loading) return <PageLoading />;
  const registrationCase = getCase(params.id);
  if (!registrationCase) return <CaseNotFound />;
  return <CaseTaxes registrationCase={registrationCase} />;
}
