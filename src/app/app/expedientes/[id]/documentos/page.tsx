'use client';

import { useParams } from 'next/navigation';
import { CaseDocuments } from '@/components/cases/CaseDocuments';
import { CaseNotFound, PageLoading } from '@/components/cases/CaseChrome';
import { useRegistrationCases } from '@/providers/RegistrationCaseProvider';

export default function CaseDocumentsPage() {
  const params = useParams<{ id: string }>();
  const { getCase, loading } = useRegistrationCases();
  if (loading) return <PageLoading />;
  const registrationCase = getCase(params.id);
  if (!registrationCase) return <CaseNotFound />;
  return <CaseDocuments registrationCase={registrationCase} />;
}
