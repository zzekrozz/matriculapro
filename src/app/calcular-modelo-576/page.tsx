import { SEO_GUIDES } from '@/content/seo-guides';
import { createGuideMetadata, SeoGuidePage } from '@/components/public/SeoGuidePage';

const guide = SEO_GUIDES.model576;
export const metadata = createGuideMetadata(guide);
export default function Page() { return <SeoGuidePage guide={guide} />; }

