import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowUpRight, ChevronRight, Clock3 } from 'lucide-react';
import type { SeoGuide } from '@/content/seo-guides';
import { absoluteUrl } from '@/config/site';
import { PublicCta, PublicFooter, PublicHeader } from './PublicChrome';
import { StructuredData } from './StructuredData';

export function createGuideMetadata(guide: SeoGuide): Metadata {
  return {
    title: guide.metaTitle,
    description: guide.description,
    alternates: { canonical: guide.path },
    openGraph: {
      title: guide.metaTitle,
      description: guide.description,
      url: absoluteUrl(guide.path),
      type: 'article',
      modifiedTime: guide.reviewDateIso,
      images: [{ url: '/og.png', width: 1731, height: 909, alt: 'MatriculaPro by IvanImports' }],
    },
    twitter: {
      card: 'summary_large_image',
      title: guide.metaTitle,
      description: guide.description,
      images: ['/og.png'],
    },
  };
}

export function SeoGuidePage({ guide }: { guide: SeoGuide }) {
  const breadcrumbs = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Inicio', item: absoluteUrl('/') },
      { '@type': 'ListItem', position: 2, name: guide.title, item: absoluteUrl(guide.path) },
    ],
  };
  const article = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: guide.title,
    description: guide.description,
    dateModified: guide.reviewDateIso,
    inLanguage: 'es-ES',
    mainEntityOfPage: absoluteUrl(guide.path),
  };

  const sourceById = new Map(guide.sources.map((source) => [source.id, source]));

  return (
    <div className="min-h-screen bg-bg text-ink">
      <StructuredData data={[breadcrumbs, article]} />
      <PublicHeader />
      <main>
        <article className="mx-auto max-w-[900px] px-5 pb-16 pt-12 lg:px-8 lg:pt-16">
          <nav className="flex items-center gap-1.5 text-[12px] text-muted" aria-label="Migas de pan">
            <Link href="/" className="hover:text-ink">Inicio</Link>
            <ChevronRight size={12} aria-hidden="true" />
            <span aria-current="page">{guide.shortTitle}</span>
          </nav>

          <header className="mt-7">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-accent-deep">{guide.eyebrow}</p>
            <h1 className="mt-3 max-w-[820px] font-serif text-[43px] leading-[1.03] tracking-tight sm:text-[58px]">{guide.title}</h1>
            <p className="mt-5 max-w-3xl text-[17px] leading-8 text-ink-soft">{guide.intro}</p>
            <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-line bg-white px-3 py-1.5 text-[11px] text-muted">
              <Clock3 size={13} aria-hidden="true" /> Revisado el {guide.reviewDateLabel}
            </div>
          </header>

          <div className="mt-12 space-y-12">
            {guide.sections.map((section) => (
              <section key={section.title}>
                <h2 className="font-serif text-[30px] leading-tight sm:text-[34px]">{section.title}</h2>
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph} className="mt-4 text-[15px] leading-8 text-ink-soft">{paragraph}</p>
                ))}
                {section.bullets && (
                  <ul className="mt-5 space-y-3 rounded-2xl border border-line bg-white p-5 text-[14px] leading-7 text-ink-soft">
                    {section.bullets.map((bullet) => (
                      <li key={bullet} className="flex gap-3 before:mt-[11px] before:h-1.5 before:w-1.5 before:shrink-0 before:rounded-full before:bg-accent">{bullet}</li>
                    ))}
                  </ul>
                )}
                {section.warning && (
                  <p className="mt-5 rounded-2xl border border-warn/30 bg-warn-soft px-5 py-4 text-[13px] leading-6 text-ink">
                    <strong>Límite importante:</strong> {section.warning}
                  </p>
                )}
                {section.sourceIds && (
                  <div className="mt-4 flex flex-wrap gap-2" aria-label="Fuentes de esta sección">
                    {section.sourceIds.map((sourceId) => {
                      const source = sourceById.get(sourceId);
                      if (!source) return null;
                      return (
                        <a
                          key={source.id}
                          href={source.url}
                          className="inline-flex items-center gap-1 rounded-full border border-line bg-bg-deep px-3 py-1.5 text-[11px] text-ink-soft hover:border-accent"
                        >
                          {source.authority} <ArrowUpRight size={11} aria-hidden="true" />
                        </a>
                      );
                    })}
                  </div>
                )}
              </section>
            ))}
          </div>

          <section className="mt-14 border-t border-line pt-8">
            <h2 className="font-serif text-[28px]">Fuentes oficiales consultadas</h2>
            <ul className="mt-4 space-y-3 text-[13px] leading-6 text-ink-soft">
              {guide.sources.map((source) => (
                <li key={source.id}>
                  <a href={source.url} className="inline-flex items-start gap-1.5 underline decoration-line underline-offset-4 hover:decoration-accent">
                    {source.label} <ArrowUpRight className="mt-1 shrink-0" size={12} aria-hidden="true" />
                  </a>
                </li>
              ))}
            </ul>
          </section>

          <section className="mt-12">
            <h2 className="font-serif text-[28px]">Contenido relacionado</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {guide.related.map((item) => (
                <Link key={item.href} href={item.href} className="rounded-2xl border border-line bg-white p-4 text-[13px] font-medium text-ink hover:border-accent">
                  {item.label} <ChevronRight className="ml-1 inline" size={13} aria-hidden="true" />
                </Link>
              ))}
            </div>
          </section>

          <div className="mt-12">
            <PublicCta />
          </div>
        </article>
      </main>
      <PublicFooter />
    </div>
  );
}
