import 'server-only';
import type { RenderedTransactionalEmail } from '@/domain/email';
import type { TransactionalEmailConfiguration } from './configuration';

const RESEND_EMAILS_ENDPOINT = 'https://api.resend.com/emails';

export class ResendDeliveryError extends Error {
  constructor(readonly code: string) {
    super('Transactional email provider rejected the request');
    this.name = 'ResendDeliveryError';
  }
}

export async function sendWithResend(input: {
  configuration: TransactionalEmailConfiguration;
  recipient: string;
  idempotencyKey: string;
  email: RenderedTransactionalEmail;
}): Promise<{ providerMessageId: string }> {
  const response = await fetch(RESEND_EMAILS_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${input.configuration.apiKey}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': input.idempotencyKey,
    },
    body: JSON.stringify({
      from: input.configuration.from,
      to: [input.recipient],
      reply_to: input.configuration.replyTo,
      subject: input.email.subject,
      html: input.email.html,
      text: input.email.text,
    }),
    cache: 'no-store',
    signal: AbortSignal.timeout(15_000),
  }).catch((cause: unknown) => {
    if (cause instanceof Error && cause.name === 'TimeoutError') {
      throw new ResendDeliveryError('resend_timeout');
    }
    throw new ResendDeliveryError('resend_network_error');
  });

  if (!response.ok) {
    throw new ResendDeliveryError(`resend_http_${response.status}`);
  }

  const payload = await response.json().catch(() => null) as { id?: unknown } | null;
  if (!payload || typeof payload.id !== 'string' || payload.id.length > 200) {
    throw new ResendDeliveryError('resend_invalid_response');
  }
  return { providerMessageId: payload.id };
}
