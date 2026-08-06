'use client';

import { useParams } from 'next/navigation';
import { CaseNotFound, PageLoading } from '@/components/cases/CaseChrome';
import { CaseOverview } from '@/components/cases/CaseOverview';
import { useRegistrationCases } from '@/providers/RegistrationCaseProvider';

export default function CaseSummaryPage() {
  const params = useParams<{ id: string }>();
  const { getCase, loading } = useRegistrationCases();
  if (loading) return <PageLoading />;
  const registrationCase = getCase(params.id);
  if (!registrationCase) return <CaseNotFound />;
  return <CaseOverview registrationCase={registrationCase} />;
}
