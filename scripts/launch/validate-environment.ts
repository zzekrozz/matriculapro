type EnvironmentRule = {
  name: string;
  scope: 'public' | 'server';
  requiredFor: Array<'staging' | 'production'>;
  validate?: (value: string) => string | undefined;
};

const args = new Set(process.argv.slice(2));
const environmentHint = (
  process.env.VERCEL_ENV ||
  process.env.MATRICULAPRO_DEPLOY_TARGET ||
  process.env.DEPLOYMENT_ENV ||
  process.env.APP_ENV ||
  ''
).trim().toLowerCase();
const requestedEnvironment = args.has('--production')
  ? 'production'
  : args.has('--staging')
    ? 'staging'
    : ['staging', 'stage', 'preview'].includes(environmentHint)
      ? 'staging'
      : ['production', 'prod'].includes(environmentHint)
        ? 'production'
        : undefined;

const urlRule = (value: string) => {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' || parsed.hostname === 'localhost'
      ? undefined
      : 'debe usar HTTPS fuera de localhost';
  } catch {
    return 'no contiene una URL válida';
  }
};

const stripeSecretRule = (value: string) =>
  value.startsWith('sk_test_') ? undefined : 'debe ser una clave de prueba sk_test_';

const stripeWebhookRule = (value: string) =>
  value.startsWith('whsec_') ? undefined : 'debe ser un secreto de firma whsec_';

const stripePriceRule = (value: string) =>
  value.startsWith('price_') ? undefined : 'debe ser un identificador de precio price_';

const resendApiKeyRule = (value: string) =>
  value.startsWith('re_') ? undefined : 'debe ser una API key de Resend con prefijo re_';

const mailboxRule = (value: string) => {
  const mailbox = value.match(/<([^<>]+)>$/)?.[1] ?? value;
  return /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(mailbox)
    ? undefined
    : 'debe contener una dirección remitente válida del dominio verificado';
};

const cronSecretRule = (value: string) =>
  value.length >= 32 ? undefined : 'debe tener al menos 32 caracteres aleatorios';

const rules: EnvironmentRule[] = [
  { name: 'NEXT_PUBLIC_SITE_URL', scope: 'public', requiredFor: ['staging', 'production'], validate: urlRule },
  { name: 'APP_BASE_URL', scope: 'server', requiredFor: ['staging', 'production'], validate: urlRule },
  { name: 'NEXT_PUBLIC_SUPABASE_URL', scope: 'public', requiredFor: ['staging', 'production'], validate: urlRule },
  { name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', scope: 'public', requiredFor: ['staging', 'production'] },
  { name: 'SUPABASE_SERVICE_ROLE_KEY', scope: 'server', requiredFor: ['staging', 'production'] },
  { name: 'NEXT_PUBLIC_SUPPORT_EMAIL', scope: 'public', requiredFor: ['staging', 'production'], validate: mailboxRule },
  { name: 'UPSTASH_REDIS_REST_URL', scope: 'server', requiredFor: ['staging', 'production'], validate: urlRule },
  { name: 'UPSTASH_REDIS_REST_TOKEN', scope: 'server', requiredFor: ['staging', 'production'] },
  { name: 'RESEND_API_KEY', scope: 'server', requiredFor: ['staging', 'production'], validate: resendApiKeyRule },
  { name: 'EMAIL_FROM', scope: 'server', requiredFor: ['staging', 'production'], validate: mailboxRule },
  { name: 'TRANSACTIONAL_EMAIL_CRON_SECRET', scope: 'server', requiredFor: ['staging', 'production'], validate: cronSecretRule },
  { name: 'STRIPE_SECRET_KEY', scope: 'server', requiredFor: ['staging', 'production'], validate: stripeSecretRule },
  { name: 'STRIPE_WEBHOOK_SECRET', scope: 'server', requiredFor: ['staging', 'production'], validate: stripeWebhookRule },
  { name: 'STRIPE_PRICE_PARTICULAR_1M', scope: 'server', requiredFor: ['staging', 'production'], validate: stripePriceRule },
  { name: 'STRIPE_PRICE_PARTICULAR_6M', scope: 'server', requiredFor: ['staging', 'production'], validate: stripePriceRule },
  { name: 'STRIPE_PRICE_PARTICULAR_12M', scope: 'server', requiredFor: ['staging', 'production'], validate: stripePriceRule },
  { name: 'STRIPE_PRICE_PROFESSIONAL_1M', scope: 'server', requiredFor: ['staging', 'production'], validate: stripePriceRule },
  { name: 'STRIPE_PRICE_PROFESSIONAL_6M', scope: 'server', requiredFor: ['staging', 'production'], validate: stripePriceRule },
  { name: 'STRIPE_PRICE_PROFESSIONAL_12M', scope: 'server', requiredFor: ['staging', 'production'], validate: stripePriceRule },
  { name: 'PAYMENT_INCIDENT_ADMIN_SECRET', scope: 'server', requiredFor: ['staging', 'production'], validate: cronSecretRule },
  { name: 'PAYMENT_INCIDENT_ALERT_WEBHOOK_URL', scope: 'server', requiredFor: [], validate: urlRule },
  { name: 'PAYMENT_INCIDENT_ALERT_EMAIL', scope: 'server', requiredFor: [], validate: mailboxRule },
];

const errors: string[] = [];
const warnings: string[] = [];

for (const rule of rules) {
  const value = process.env[rule.name]?.trim();
  const required = requestedEnvironment && rule.requiredFor.includes(requestedEnvironment);

  if (!value) {
    (required ? errors : warnings).push(`${rule.name}: no configurada (${rule.scope}).`);
    continue;
  }

  const validationError = rule.validate?.(value);
  if (validationError) {
    errors.push(`${rule.name}: ${validationError}.`);
  }

  if (rule.scope === 'server' && rule.name.startsWith('NEXT_PUBLIC_')) {
    errors.push(`${rule.name}: un secreto de servidor no puede usar el prefijo NEXT_PUBLIC_.`);
  }
}

for (const name of Object.keys(process.env)) {
  if (/NEXT_PUBLIC_.*(?:SECRET|SERVICE_ROLE|PRIVATE|PASSWORD)/i.test(name)) {
    errors.push(`${name}: parece un secreto expuesto al bundle cliente.`);
  }
}

if (
  requestedEnvironment
  && !process.env.PAYMENT_INCIDENT_ALERT_WEBHOOK_URL?.trim()
  && !process.env.PAYMENT_INCIDENT_ALERT_EMAIL?.trim()
) {
  errors.push('PAYMENT_INCIDENT_ALERT_*: staging y producción requieren webhook interno o email de alerta.');
}

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
const appBaseUrl = process.env.APP_BASE_URL?.trim();
if (siteUrl && appBaseUrl) {
  try {
    if (new URL(siteUrl).origin !== new URL(appBaseUrl).origin) {
      errors.push('APP_BASE_URL: debe usar el mismo origen que NEXT_PUBLIC_SITE_URL.');
    }
  } catch {
    // Las reglas URL anteriores ya aportan el error específico.
  }
}

console.log(`ENVIRONMENT_MODE=${requestedEnvironment ?? 'development'}`);
for (const warning of warnings) console.warn(`WARN ${warning}`);
for (const error of errors) console.error(`ERROR ${error}`);

if (errors.length > 0) {
  console.error(`ENVIRONMENT_STATUS=INVALID (${errors.length} errores)`);
  process.exit(1);
}

console.log(`ENVIRONMENT_STATUS=${warnings.length ? 'DEVELOPMENT_WITH_WARNINGS' : 'VALID'}`);
