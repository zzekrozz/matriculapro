'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import {
  firstValidationMessage,
  recoveryRequestSchema,
} from '@/domain/auth/validation';

export function RecoverPasswordForm() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setError(null);
    setMessage(null);

    const parsed = recoveryRequestSchema.safeParse({ email });
    if (!parsed.success) {
      setError(firstValidationMessage(parsed.error));
      return;
    }

    setBusy(true);
    try {
      const response = await fetch('/api/auth/recover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: parsed.data.email }),
      });
      const payload = await response.json() as { ok?: boolean; message?: string };
      if (!response.ok || !payload.ok) {
        setError(payload.message || 'No se ha podido procesar la solicitud.');
      } else {
        setMessage(payload.message || 'Si existe una cuenta, recibirás un enlace.');
      }
    } catch {
      setError('No se ha podido procesar la solicitud.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <label className="block">
        <span className="mb-1.5 block text-[10px] uppercase tracking-[0.16em] text-muted">
          Email
        </span>
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
          maxLength={254}
          autoComplete="email"
          className="min-h-12 w-full rounded-xl border border-line bg-bg px-3.5 text-[16px] outline-none focus:border-accent"
        />
      </label>
      {message && (
        <div role="status" className="rounded-xl bg-ok-soft p-3 text-[12px] leading-relaxed text-ok">
          {message}
        </div>
      )}
      {error && (
        <div role="alert" className="rounded-xl bg-danger-soft p-3 text-[12px] text-danger">
          {error}
        </div>
      )}
      <button
        type="submit"
        disabled={busy}
        className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-ink text-[13px] font-medium text-white disabled:opacity-45"
      >
        {busy ? <><Loader2 size={14} className="animate-spin" /> Enviando…</> : 'Enviar enlace'}
      </button>
      <p className="text-center text-[11px] text-muted">
        <Link href="/entrar" className="font-medium text-accent-deep hover:underline">
          Volver a entrar
        </Link>
      </p>
    </form>
  );
}
