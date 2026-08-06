import type { MetadataRoute } from 'next';
import { absoluteUrl } from '@/config/site';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/app',
          '/app/',
          '/api',
          '/api/',
          '/auth',
          '/auth/',
          '/entrar',
          '/registro',
          '/recuperar-contrasena',
          '/restablecer-contrasena',
          '/checkout',
          '/checkout/',
          '/cuenta',
        ],
      },
    ],
    sitemap: absoluteUrl('/sitemap.xml'),
    host: absoluteUrl('/'),
  };
}
