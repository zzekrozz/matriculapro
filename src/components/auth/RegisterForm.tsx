'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Eye, EyeOff, Loader2, Mail } from 'lucide-react';
import {
  firstValidationMessage,
  PASSWORD_MIN_LENGTH,
  registrationSchema,
} from '@/domain/auth/validation';
import { useAuth } from '@/providers/AuthProvider';

export function RegisterForm({ nextUrl = '/app/comprobar' }: { nextUrl?: string }) {
  const { signUp } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [pendingEmail, setPendingEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [resendBusy, setResendBusy] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = window.setTimeout(
      () => setResendCooldown((current) => Math.max(0, current - 1)),
      1_000,
    );
    return () => window.clearTimeout(timer);
  }, [resendCooldown]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setError(null);

    const parsed = registrationSchema.safeParse({
      displayName,
      email,
      password,
      passwordConfirmation,
      acceptedTerms,
      acceptedPrivacy,
      next: nextUrl,
    });
    if (!parsed.success) {
      setError(firstValidationMessage(parsed.error));
      return;
    }

    setBusy(true);
    try {
      const result = await signUp(parsed.data.email, parsed.data.password, {
        displayName: parsed.data.displayName,
        passwordConfirmation: parsed.data.passwordConfirmation,
        next: parsed.data.next,
        acceptedTerms: parsed.data.acceptedTerms,
        acceptedPrivacy: parsed.data.acceptedPrivacy,
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      setPendingEmail(parsed.data.email);
      setDone(true);
    } finally {
      setBusy(false);
    }
  };

  const resendConfirmation = async () => {
    if (resendBusy || resendCooldown > 0 || !pendingEmail) return;
    setResendBusy(true);
    setResendMessage(null);
    try {
      const response = await fetch('/api/auth/resend-confirmation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: pendingEmail, next: nextUrl }),
      });
      const payload = await response.json() as { ok?: boolean; message?: string };
      setResendMessage(
        payload.message
          ?? (response.ok
            ? 'Si la cuenta está pendiente, recibirás un nuevo enlace.'
            : 'No se ha podido solicitar el reenvío.'),
      );
      if (response.ok && payload.ok) setResendCooldown(60);
    } catch {
      setResendMessage('No se ha podido solicitar el reenvío. Inténtalo de nuevo.');
    } finally {
      setResendBusy(false);
    }
  };

  if (done) {
    return (
      <div className="rounded-2xl border border-ok/25 bg-ok-soft p-6 text-center">
        <CheckCircle2 size={30} className="mx-auto text-ok" aria-hidden="true" />
        <h2 className="mt-3 font-serif text-[23px] text-ink">Confirma tu email</h2>
        <p className="mt-2 text-[12px] leading-relaxed text-ink-soft">
          Si el email puede registrarse, recibirás un enlace de confirmación. Al confirmarlo tendrás acceso gratuito a la comprobación previa.
        </p>
        <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-1.5 text-[10.5px] font-medium text-ink-soft">
          <Mail size={13} aria-hidden="true" /> Estado: pendiente de confirmación
        </p>
        <button
          type="button"
          onClick={resendConfirmation}
          disabled={resendBusy || resendCooldown > 0}
          className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-line bg-surface px-4 text-[12px] font-medium text-ink disabled:opacity-45"
        >
          {resendBusy && <Loader2 size={14} className="animate-spin" aria-hidden="true" />}
          {resendCooldown > 0
            ? `Podrás reenviar en ${resendCooldown} s`
            : 'Reenviar confirmación'}
        </button>
        {resendMessage && (
          <p role="status" className="mt-3 text-[11px] leading-relaxed text-ink-soft">
            {resendMessage}
          </p>
        )}
        <p className="mt-4 text-[10.5px] leading-relaxed text-muted">
          Revisa también la carpeta de spam. El mensaje de reenvío es siempre neutro y no confirma si una cuenta existe.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <Field label="Nombre">
        <input
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          required
          minLength={2}
          maxLength={120}
          autoComplete="name"
          className={inputClass}
        />
      </Field>
      <Field label="Email">
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
          maxLength={254}
          autoComplete="email"
          className={inputClass}
        />
      </Field>
      <Field label="Contraseña">
        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            minLength={PASSWORD_MIN_LENGTH}
            autoComplete="new-password"
            className={`${inputClass} pr-11`}
            aria-describedby="password-help"
          />
          <button
            type="button"
            onClick={() => setShowPassword((value) => !value)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink"
            aria-label={showPassword ? 'Ocultar contraseñas' : 'Mostrar contraseñas'}
          >
            {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>
        <span id="password-help" className="mt-1.5 block text-[9.5px] text-muted">
          Mínimo {PASSWORD_MIN_LENGTH} caracteres. Usa una contraseña única y, si puedes, un gestor de contraseñas.
        </span>
      </Field>
      <Field label="Repite la contraseña">
        <input
          type={showPassword ? 'text' : 'password'}
          value={passwordConfirmation}
          onChange={(event) => setPasswordConfirmation(event.target.value)}
          required
          minLength={PASSWORD_MIN_LENGTH}
          autoComplete="new-password"
          className={inputClass}
        />
      </Field>
      <label className="flex items-start gap-2.5 text-[10.5px] leading-relaxed text-ink-soft">
        <input
          type="checkbox"
          checked={acceptedTerms}
          onChange={(event) => setAcceptedTerms(event.target.checked)}
          required
          className="mt-0.5 h-4 w-4 shrink-0 accent-[#C8862E]"
        />
        <span>
          Acepto los{' '}
          <Link href="/legal/terminos" target="_blank" rel="noopener noreferrer" className="font-medium text-accent-deep underline">
            términos de uso
          </Link>.
        </span>
      </label>
      <label className="flex items-start gap-2.5 text-[10.5px] leading-relaxed text-ink-soft">
        <input
          type="checkbox"
          checked={acceptedPrivacy}
          onChange={(event) => setAcceptedPrivacy(event.target.checked)}
          required
          className="mt-0.5 h-4 w-4 shrink-0 accent-[#C8862E]"
        />
        <span>
          He leído la{' '}
          <Link href="/legal/privacidad" target="_blank" rel="noopener noreferrer" className="font-medium text-accent-deep underline">
            política de privacidad
          </Link>.
        </span>
      </label>
      <p className="text-[9.5px] leading-relaxed text-muted">
        Estas confirmaciones son necesarias para crear la cuenta. No constituyen consentimiento comercial.
      </p>
      {error && (
        <div role="alert" className="rounded-xl bg-danger-soft p-3 text-[12px] text-danger">
          {error}
        </div>
      )}
      <button
        type="submit"
        disabled={busy}
        className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-ink px-5 py-3 text-[13px] font-medium text-white disabled:opacity-45"
      >
        {busy ? (
          <><Loader2 size={14} className="animate-spin" /> Creando cuenta…</>
        ) : 'Crear cuenta gratuita'}
      </button>
      <p className="text-center text-[11.5px] text-muted">
        ¿Ya tienes cuenta?{' '}
        <Link href={`/entrar?next=${encodeURIComponent(nextUrl)}`} className="font-medium text-accent-deep hover:underline">
          Entrar
        </Link>
      </p>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[10px] font-medium uppercase tracking-[0.16em] text-muted">
        {label}
      </span>
      {children}
    </label>
  );
}

const inputClass = 'min-h-12 w-full rounded-xl border border-line bg-bg px-3.5 py-3 text-[16px] text-ink outline-none focus:border-accent';
