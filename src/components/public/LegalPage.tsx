import Link from 'next/link';
import type { Metadata } from 'next';
import { AlertTriangle, ChevronRight } from 'lucide-react';
import {
  LEGAL_DOCUMENT_REVIEW_DATE,
  LEGAL_DOCUMENT_VERSION,
  LEGAL_REVIEW_NOTICE,
  legalReviewCompleted,
} from '@/config/legal';
import { absoluteUrl } from '@/config/site';
import { PublicFooter, PublicHeader } from './PublicChrome';
import { StructuredData } from './StructuredData';

export type LegalSection = {
  title: string;
  paragraphs?: React.ReactNode[];
  bullets?: React.ReactNode[];
};

export function createLegalMetadata(
  title: string,
  description: string,
  path: string,
): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    robots: legalReviewCompleted
      ? { index: true, follow: true }
      : { index: false, follow: false, nocache: true },
    openGraph: {
      title: `${title} | MatriculaPro`,
      description,
      url: absoluteUrl(path),
      type: 'website',
      images: [{ url: '/og.png', width: 1731, height: 909, alt: 'MatriculaPro by IvanImports' }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} | MatriculaPro`,
      description,
      images: ['/og.png'],
    },
  };
}

export function LegalPage({
  title,
  description,
  path,
  sections,
  children,
}: {
  title: string;
  description: string;
  path: string;
  sections?: LegalSection[];
  children?: React.ReactNode;
}) {
  const breadcrumbs = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Inicio', item: absoluteUrl('/') },
      { '@type': 'ListItem', position: 2, name: title, item: absoluteUrl(path) },
    ],
  };

  return (
    <div className="min-h-screen bg-bg text-ink">
      <StructuredData data={breadcrumbs} />
      <PublicHeader />
      <main className="mx-auto max-w-[900px] px-5 py-12 lg:px-8 lg:py-16">
        <nav className="flex items-center gap-1.5 text-[12px] text-muted" aria-label="Migas de pan">
          <Link href="/" className="hover:text-ink">Inicio</Link>
          <ChevronRight size={12} aria-hidden="true" />
          <span aria-current="page">{title}</span>
        </nav>

        <header className="mt-7 border-b border-line pb-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-accent-deep">Información legal</p>
          <h1 className="mt-3 font-serif text-[42px] leading-[1.05] sm:text-[54px]">{title}</h1>
          <p className="mt-4 max-w-3xl text-[15px] leading-relaxed text-ink-soft">{description}</p>
          <p className="mt-4 text-[11px] text-muted">
            Versión {LEGAL_DOCUMENT_VERSION} · Revisado técnicamente el {LEGAL_DOCUMENT_REVIEW_DATE}
          </p>
        </header>

        {!legalReviewCompleted && (
          <div className="mt-7 flex gap-3 rounded-2xl border border-warn/30 bg-warn-soft p-4 text-[13px] leading-relaxed text-ink" role="note">
            <AlertTriangle className="mt-0.5 shrink-0 text-warn" size={18} aria-hidden="true" />
            <p><strong>Estado del documento:</strong> {LEGAL_REVIEW_NOTICE}</p>
          </div>
        )}

        {children}

        {sections && (
          <div className="mt-10 space-y-10">
            {sections.map((section) => (
              <section key={section.title}>
                <h2 className="font-serif text-[28px] leading-tight">{section.title}</h2>
                {section.paragraphs?.map((paragraph, index) => (
                  <div key={index} className="mt-3 text-[14px] leading-7 text-ink-soft">{paragraph}</div>
                ))}
                {section.bullets && (
                  <ul className="mt-4 space-y-2 pl-5 text-[14px] leading-7 text-ink-soft">
                    {section.bullets.map((bullet, index) => <li key={index} className="list-disc">{bullet}</li>)}
                  </ul>
                )}
              </section>
            ))}
          </div>
        )}
      </main>
      <PublicFooter />
    </div>
  );
}
