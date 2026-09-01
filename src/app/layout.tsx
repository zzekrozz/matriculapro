import type { Metadata } from 'next';
import { I18nProvider } from '@/providers/I18nProvider';
import { AuthProvider } from '@/providers/AuthProvider';
import { AccessProvider } from '@/providers/AccessProvider';
import { CourseProvider } from '@/providers/CourseProvider';
import { RegistrationCaseProvider } from '@/providers/RegistrationCaseProvider';
import {
  SITE_DESCRIPTION,
  SITE_LOCALE,
  SITE_NAME,
  SITE_TAGLINE,
  SITE_URL,
  TRADE_NAME,
} from '@/config/site';
import { isPublicBetaEnabled } from '@/config/public-beta';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} by ${TRADE_NAME} | Matricular vehículos importados`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  authors: [{ name: TRADE_NAME }],
  creator: TRADE_NAME,
  publisher: TRADE_NAME,
  category: 'software',
  keywords: [
    'matricular coche importado',
    'Modelo 576',
    'tablas Hacienda vehículos 2026',
    'documentación coche importado',
    'impuesto de matriculación',
    'ITV vehículo importado',
  ],
  alternates: { canonical: '/' },
  manifest: '/manifest.webmanifest',
  icons: {
    icon: '/icon',
    apple: '/apple-icon',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  openGraph: {
    title: SITE_TAGLINE,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    siteName: SITE_NAME,
    locale: SITE_LOCALE,
    type: 'website',
    images: [{ url: '/og.png', width: 1731, height: 909, alt: `${SITE_NAME} by ${TRADE_NAME}` }],
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE_TAGLINE,
    description: SITE_DESCRIPTION,
    images: ['/og.png'],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const publicBetaEnabled = isPublicBetaEnabled();
  return (
    <html lang="es" data-public-beta={publicBetaEnabled ? 'true' : 'false'}>
      <body>
        <I18nProvider>
          <AuthProvider disabled={publicBetaEnabled}>
            <AccessProvider publicBetaEnabled={publicBetaEnabled}>
              <RegistrationCaseProvider>
                <CourseProvider>
                  {children}
                </CourseProvider>
              </RegistrationCaseProvider>
            </AccessProvider>
          </AuthProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
