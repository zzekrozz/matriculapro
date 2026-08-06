'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Loader2 } from 'lucide-react';
import {
  firstValidationMessage,
  newPasswordSchema,
  PASSWORD_MIN_LENGTH,
} from '@/domain/auth/validation';

interface ResetResponse {
  ok?: boolean;
  message?: string;
  sessionsClosed?: boolean;
}

export function ResetPasswordForm({
  recoveryAuthorized,
}: {
  recoveryAuthorized: boolean;
}) {
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(false);
  const [sessionsClosed, setSessionsClosed] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy || !recoveryAuthorized) return;
    setError(null);

    const parsed = newPasswordSchema.safeParse({
      password,
      passwordConfirmation: confirmation,
    });
    if (!parsed.success) {
      setError(firstValidationMessage(parsed.error));
      return;
    }

    setBusy(true);
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed.data),
      });
      const payload = await response.json().catch(() => null) as ResetResponse | null;
      if (!response.ok || !payload?.ok) {
        setError(payload?.message ?? 'No se ha podido actualizar la contraseña.');
        return;
      }
      setSessionsClosed(payload.sessionsClosed !== false);
      setSuccess(true);
    } catch {
      setError('No se ha podido actualizar la contraseña.');
    } finally {
      setBusy(false);
    }
  };

  if (!recoveryAuthorized && !success) {
    return (
      <div className="rounded-xl bg-danger-soft p-4 text-[12px] leading-relaxed text-danger">
        El enlace no es válido, ha caducado o no corresponde a una recuperación.{' '}
        <Link href="/recuperar-contrasena" className="font-semibold underline">
          Solicita uno nuevo
        </Link>.
      </div>
    );
  }

  if (success) {
    return (
      <div role="status" className="text-center">
        <CheckCircle2 size={30} className="mx-auto text-ok" />
        <h2 className="mt-3 font-serif text-[22px]">Contraseña actualizada</h2>
        <p className="mt-2 text-[12px] text-ink-soft">
          {sessionsClosed
            ? 'Se han invalidado las sesiones anteriores por seguridad.'
            : 'La contraseña se actualizó, pero no pudimos confirmar el cierre global de sesiones. Revisa tu cuenta al entrar.'}
        </p>
        <Link
          href="/entrar?message=password-updated"
          className="mt-5 inline-flex rounded-full bg-ink px-5 py-2.5 text-[12px] text-white"
        >
          Iniciar sesión
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <PasswordField label="Nueva contraseña" value={password} onChange={setPassword} />
      <PasswordField label="Repite la contraseña" value={confirmation} onChange={setConfirmation} />
      <p className="text-[9.5px] leading-relaxed text-muted">
        Mínimo {PASSWORD_MIN_LENGTH} caracteres. Usa una contraseña única y, si puedes, un gestor de contraseñas.
      </p>
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
        {busy ? <><Loader2 size={14} className="animate-spin" /> Guardando…</> : 'Actualizar contraseña'}
      </button>
    </form>
  );
}

function PasswordField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[10px] uppercase tracking-[0.16em] text-muted">
        {label}
      </span>
      <input
        type="password"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        minLength={PASSWORD_MIN_LENGTH}
        required
        autoComplete="new-password"
        className="min-h-12 w-full rounded-xl border border-line bg-bg px-3.5 text-[16px] outline-none focus:border-accent"
      />
    </label>
  );
}
