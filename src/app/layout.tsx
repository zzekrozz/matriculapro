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
  description: 'Herramienta guiada para entender y avanzar en la matriculación de vehículos en España. Rutas, checklists, simuladores y recorridos prácticos.',
  openGraph: {
    title: 'MatriculaPRO · Ivan Imports',
    description: 'Herramienta guiada para preparar la matriculación de vehículos en España. Simulador 576, ficha 3D, recorrido ITV y checklists.',
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
