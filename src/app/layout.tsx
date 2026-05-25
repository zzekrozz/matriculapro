import type { Metadata } from 'next';
import { I18nProvider } from '@/providers/I18nProvider';
import { AccessProvider } from '@/providers/AccessProvider';
import { CourseProvider } from '@/providers/CourseProvider';
import './globals.css';

export const metadata: Metadata = {
  title: 'MatriculaPRO · Ivan Imports',
  description: 'Aprende a matricular coches importados en España practicando. Guía interactiva con simuladores, checklists y recorridos visuales. No es un PDF.',
  openGraph: {
    title: 'MatriculaPRO · Ivan Imports',
    description: 'Guía interactiva para matricular coches importados. Simulador 576, ficha 3D, recorrido ITV.',
    url: 'https://matriculapro.ivanimports.es',
    siteName: 'MatriculaPRO',
    locale: 'es_ES',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <I18nProvider>
          <AccessProvider>
            <CourseProvider>
              {children}
            </CourseProvider>
          </AccessProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
