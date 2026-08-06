import 'server-only';

export async function notifyPaymentIncident(input: {
  stripeEventId: string;
  kind: string;
  purchaseId?: string | null;
  reason: string;
}): Promise<void> {
  const safePayload = {
    event: 'matriculapro.payment_incident',
    stripeEventId: input.stripeEventId,
    kind: input.kind,
    purchaseId: input.purchaseId ?? null,
    reason: input.reason.slice(0, 300),
    occurredAt: new Date().toISOString(),
  };
  console.error(JSON.stringify(safePayload));

  const tasks: Promise<unknown>[] = [];
  const webhookUrl = process.env.PAYMENT_INCIDENT_ALERT_WEBHOOK_URL?.trim();
  if (webhookUrl) {
    tasks.push(fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(safePayload),
      cache: 'no-store',
      signal: AbortSignal.timeout(8_000),
    }));
  }
  const alertEmail = process.env.PAYMENT_INCIDENT_ALERT_EMAIL?.trim();
  const resendKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim();
  if (alertEmail && resendKey && from) {
    tasks.push(fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': `incident-${input.stripeEventId}-${input.kind}`.slice(0, 256),
      },
      body: JSON.stringify({
        from, to: [alertEmail], subject: `[MatriculaPro] Incidencia ${input.kind}`,
        text: JSON.stringify(safePayload, null, 2),
      }),
      cache: 'no-store',
      signal: AbortSignal.timeout(8_000),
    }));
  }
  await Promise.allSettled(tasks);
}
