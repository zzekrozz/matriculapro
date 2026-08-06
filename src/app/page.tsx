import Landing from '@/components/landing/Landing';
import { LANDING_FAQS } from '@/content/landing';
import { isPendingLegalValue, legalOwnerConfig } from '@/config/legal';
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL, TRADE_NAME, absoluteUrl } from '@/config/site';
import { PLAN_PRICES } from '@/lib/payments/catalog';
import { StructuredData } from '@/components/public/StructuredData';

export default function HomePage() {
  const durationLabels = {
    one_month: '1 mes',
    six_months: '6 meses',
    twelve_months: '12 meses',
  } as const;
  const offers = Object.values(PLAN_PRICES).flatMap((prices) =>
    Object.values(prices).map((price) => ({
      '@type': 'Offer',
      priceCurrency: price.currency,
      price: (price.totalCents / 100).toFixed(2),
      name: `${price.tier === 'particular' ? 'Particular' : 'Profesional'} · ${durationLabels[price.duration]}`,
      url: `${SITE_URL}/#precios`,
    })),
  );
  const graph: Array<Record<string, unknown>> = [
    {
      '@type': 'WebSite',
      '@id': absoluteUrl('/#website'),
      url: absoluteUrl('/'),
      name: SITE_NAME,
      description: SITE_DESCRIPTION,
      inLanguage: 'es-ES',
    },
    {
      '@type': 'Brand',
      '@id': absoluteUrl('/#brand'),
      name: TRADE_NAME,
    },
    {
      '@type': 'SoftwareApplication',
      '@id': absoluteUrl('/#software'),
      name: SITE_NAME,
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Navegador web moderno',
      description: SITE_DESCRIPTION,
      brand: { '@id': absoluteUrl('/#brand') },
      offers,
    },
    {
      '@type': 'FAQPage',
      mainEntity: LANDING_FAQS.map(({ question, answer }) => ({
        '@type': 'Question',
        name: question,
        acceptedAnswer: { '@type': 'Answer', text: answer },
      })),
    },
  ];

  if (
    !isPendingLegalValue(legalOwnerConfig.legalFullName) &&
    !isPendingLegalValue(legalOwnerConfig.legalAddress)
  ) {
    graph.push({
      '@type': 'Person',
      '@id': absoluteUrl('/#owner'),
      name: legalOwnerConfig.legalFullName,
      address: legalOwnerConfig.legalAddress,
    });
  }

  return (
    <>
      <StructuredData data={{ '@context': 'https://schema.org', '@graph': graph }} />
      <Landing />
    </>
  );
}
