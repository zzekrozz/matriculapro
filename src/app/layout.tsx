import type { Metadata } from 'next';
import { I18nProvider } from '@/providers/I18nProvider';
import { AuthProvider } from '@/providers/AuthProvider';
import { AccessProvider } from '@/providers/AccessProvider';
import { CourseProvider } from '@/providers/CourseProvider';
import { FounderModalProvider } from '@/providers/FounderModalProvider';
import { DevModeSwitcher } from '@/components/dev/DevModeSwitcher';
import './globals.css';

export const metadata: Metadata = {
  title: 'MatriculaPRO · Ivan Imports',
  description: 'Plataforma interactiva para aprender a matricular coches importados en España. Simuladores, checklists y recorridos guiados. No es un PDF.',
  openGraph: {
    title: 'MatriculaPRO · Ivan Imports',
    description: 'Plataforma interactiva para matricular coches importados. Simulador 576, ficha 3D, recorrido ITV.',
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
          <AuthProvider>
            <AccessProvider>
              <CourseProvider>
                <FounderModalProvider>
                  {children}
                  <DevModeSwitcher />
                </FounderModalProvider>
              </CourseProvider>
            </AccessProvider>
          </AuthProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
