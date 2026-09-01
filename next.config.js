/** @type {import('next').NextConfig} */

const productionTarget = process.env.VERCEL_ENV === 'production'
  || process.env.MATRICULAPRO_DEPLOY_TARGET === 'production';
const publicBetaValue = process.env.PUBLIC_BETA_MODE?.trim().toLowerCase();
const publicBetaMode = !publicBetaValue || ['true', '1', 'yes', 'on'].includes(publicBetaValue);

if (productionTarget && !publicBetaMode) {
  const required = [
    'NEXT_PUBLIC_SITE_URL', 'APP_BASE_URL',
    'NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY',
    'LEGAL_OWNER_FULL_NAME', 'LEGAL_OWNER_NIF', 'LEGAL_TRADE_NAME', 'LEGAL_OWNER_ADDRESS',
    'LEGAL_CONTACT_EMAIL', 'LEGAL_PRIVACY_EMAIL', 'NEXT_PUBLIC_SUPPORT_EMAIL',
    'UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN',
    'RESEND_API_KEY', 'EMAIL_FROM', 'TRANSACTIONAL_EMAIL_CRON_SECRET',
    'STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET',
    'STRIPE_PRICE_PARTICULAR_1M', 'STRIPE_PRICE_PARTICULAR_6M', 'STRIPE_PRICE_PARTICULAR_12M',
    'STRIPE_PRICE_PROFESSIONAL_1M', 'STRIPE_PRICE_PROFESSIONAL_6M', 'STRIPE_PRICE_PROFESSIONAL_12M',
  ];
  const missing = required.filter((name) => !process.env[name]?.trim());
  if (process.env.LEGAL_REVIEW_COMPLETED?.toLowerCase() !== 'true') missing.push('LEGAL_REVIEW_COMPLETED=true');
  if (process.env.LEGAL_TRADE_NAME && process.env.LEGAL_TRADE_NAME !== 'IvanImports') missing.push('LEGAL_TRADE_NAME=IvanImports');
  if (process.env.STRIPE_SECRET_KEY && !process.env.STRIPE_SECRET_KEY.startsWith('sk_test_')) missing.push('STRIPE_SECRET_KEY must be a test key');
  if (missing.length) throw new Error(`MatriculaPro production configuration blocked: ${missing.join(', ')}`);
}

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(self)' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: __dirname,
  experimental: { optimizePackageImports: ['lucide-react'] },
  async headers() { return [{ source: '/(.*)', headers: securityHeaders }]; },
};

module.exports = nextConfig;
