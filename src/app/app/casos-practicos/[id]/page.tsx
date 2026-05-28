import { notFound } from 'next/navigation';
import { PRACTICAL_CASES } from '@/data/practical-cases';
import { CaseRunner } from '@/components/modules/casos/CaseRunner';

interface PageProps {
  params: { id: string };
}

export function generateStaticParams() {
  return PRACTICAL_CASES.map(c => ({ id: c.id }));
}

export default function CasoPracticoPage({ params }: PageProps) {
  const practicalCase = PRACTICAL_CASES.find(c => c.id === params.id);
  if (!practicalCase) notFound();
  return <CaseRunner practicalCase={practicalCase} />;
}
