import { SEO_GUIDES } from '@/content/seo-guides';
import { createGuideMetadata, SeoGuidePage } from '@/components/public/SeoGuidePage';

const guide = SEO_GUIDES.coc;
export const metadata = createGuideMetadata(guide);
export default function Page() { return <SeoGuidePage guide={guide} />; }

