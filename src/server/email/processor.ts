import 'server-only';
import { createHash, randomUUID } from 'node:crypto';
import { renderTransactionalEmail } from '@/domain/email';
import { getTransactionalEmailConfiguration } from './configuration';
import {
  claimTransactionalEmailBatch,
  completeTransactionalEmail,
  failTransactionalEmail,
  loadTransactionalEmail,
  scheduleDueTransactionalEmails,
} from './outbox-repository';
import { ResendDeliveryError, sendWithResend } from './resend-client';

export interface TransactionalEmailBatchResult {
  scheduledExpiryReminders: number;
  expiredLicenses: number;
  claimed: number;
  sent: number;
  retryScheduled: number;
  deadLettered: number;
  acknowledgementFailures: number;
}

export async function processTransactionalEmailBatch(): Promise<TransactionalEmailBatchResult> {
  const configuration = getTransactionalEmailConfiguration();
  const workerId = randomUUID();
  const now = new Date().toISOString();
  const scheduled = await scheduleDueTransactionalEmails(now);
  const claimed = await claimTransactionalEmailBatch({
    workerId,
    limit: configuration.batchSize,
    now,
  });
  const result: TransactionalEmailBatchResult = {
    scheduledExpiryReminders: Number(scheduled?.expiryReminders ?? 0),
    expiredLicenses: Number(scheduled?.expiredLicenses ?? 0),
    claimed: claimed.length,
    sent: 0,
    retryScheduled: 0,
    deadLettered: 0,
    acknowledgementFailures: 0,
  };

  for (const item of claimed) {
    try {
      const loaded = await loadTransactionalEmail(
        item,
        configuration.siteUrl,
        configuration.replyTo,
      );
      const email = renderTransactionalEmail(loaded.input);
      const delivery = await sendWithResend({
        configuration,
        recipient: loaded.recipient,
        idempotencyKey: item.idempotencyKey,
        email,
      });
      await completeTransactionalEmail({
        outboxId: item.id,
        workerId,
        providerMessageIdSha256: createHash('sha256')
          .update(delivery.providerMessageId, 'utf8')
          .digest('hex'),
      });
      result.sent += 1;
    } catch (cause) {
      try {
        const status = await failTransactionalEmail({
          outboxId: item.id,
          workerId,
          errorCode: safeErrorCode(cause),
          now: new Date().toISOString(),
        });
        if (status === 'dead_letter') result.deadLettered += 1;
        else result.retryScheduled += 1;
      } catch {
        // The processing lease is intentionally left in place and can be
        // reclaimed after its timeout. No recipient, subject or body is logged.
        result.acknowledgementFailures += 1;
      }
    }
  }

  return result;
}

function safeErrorCode(cause: unknown): string {
  if (cause instanceof ResendDeliveryError) return cause.code;
  if (cause instanceof Error && /^[a-z0-9_:-]{1,120}$/.test(cause.message)) {
    return cause.message;
  }
  return 'unexpected_worker_error';
}
