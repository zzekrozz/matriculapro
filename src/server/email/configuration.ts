import 'server-only';

export interface TransactionalEmailConfiguration {
  apiKey: string;
  cronSecret: string;
  from: string;
  replyTo: string;
  siteUrl: string;
  batchSize: number;
}

export class TransactionalEmailConfigurationError extends Error {
  readonly code = 'transactional_email_configuration_invalid';

  constructor() {
    super('Transactional email is not configured');
    this.name = 'TransactionalEmailConfigurationError';
  }
}

export function getTransactionalEmailConfiguration(
  environment: NodeJS.ProcessEnv = process.env,
): TransactionalEmailConfiguration {
  const apiKey = environment.RESEND_API_KEY?.trim() ?? '';
  const cronSecret = environment.TRANSACTIONAL_EMAIL_CRON_SECRET?.trim() ?? '';
  const from = environment.EMAIL_FROM?.trim() ?? '';
  const replyTo = environment.NEXT_PUBLIC_SUPPORT_EMAIL?.trim() ?? '';
  const siteUrl = environment.NEXT_PUBLIC_SITE_URL?.trim() ?? '';
  const requestedBatchSize = Number(environment.TRANSACTIONAL_EMAIL_BATCH_SIZE ?? '20');

  if (
    !apiKey.startsWith('re_')
    || cronSecret.length < 32
    || !isMailbox(from)
    || !isMailbox(replyTo)
    || !isSafeSiteUrl(siteUrl)
    || !Number.isInteger(requestedBatchSize)
    || requestedBatchSize < 1
    || requestedBatchSize > 50
  ) {
    throw new TransactionalEmailConfigurationError();
  }

  return {
    apiKey,
    cronSecret,
    from,
    replyTo,
    siteUrl: siteUrl.replace(/\/$/, ''),
    batchSize: requestedBatchSize,
  };
}

function isMailbox(value: string): boolean {
  const mailbox = value.match(/<([^<>]+)>$/)?.[1] ?? value;
  return /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(mailbox);
}

function isSafeSiteUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.hostname === 'localhost';
  } catch {
    return false;
  }
}
