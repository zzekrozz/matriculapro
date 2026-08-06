import type { MetadataRoute } from 'next';
import { legalReviewCompleted } from '@/config/legal';
import { PUBLIC_GUIDE_PATHS, PUBLIC_LEGAL_PATHS, absoluteUrl } from '@/config/site';

const lastModified = new Date('2026-08-05T00:00:00.000Z');

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: absoluteUrl('/'),
      lastModified,
      changeFrequency: 'weekly',
      priority: 1,
    },
    ...PUBLIC_GUIDE_PATHS.map((path) => ({
      url: absoluteUrl(path),
      lastModified,
      changeFrequency: 'monthly' as const,
      priority: 0.75,
    })),
    ...(legalReviewCompleted ? PUBLIC_LEGAL_PATHS : []).map((path) => ({
      url: absoluteUrl(path),
      lastModified,
      changeFrequency: 'yearly' as const,
      priority: 0.25,
    })),
  ];
}
