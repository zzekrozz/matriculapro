'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { safeInternalPath } from '@/lib/auth/redirect';
import { useAuth } from '@/providers/AuthProvider';

export function LoginForm({ nextUrl = '/app/comprobar' }: { nextUrl?: string }) {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const result = await signIn(email, password, nextUrl);
      if (result.error) {
        setError(result.error);
        return;
      }
      window.location.replace(safeInternalPath(result.redirectTo));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <AuthField label="Email"><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" className={inputClass} /></AuthField>
      <AuthField label="Contraseña">
        <div className="relative"><input type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} required autoComplete="current-password" className={`${inputClass} pr-11`} />
          <button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink" aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}>{showPassword ? <EyeOff size={15} /> : <Eye size={15} />}</button>
        </div>
      </AuthField>
      <div className="flex justify-end"><Link href="/recuperar-contrasena" className="text-[11.5px] font-medium text-accent-deep hover:underline">¿Has olvidado tu contraseña?</Link></div>
      {error && <div role="alert" className="rounded-xl bg-danger-soft p-3 text-[12px] text-danger">{error}</div>}
      <button type="submit" disabled={busy || !email || !password} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-ink px-5 py-3 text-[13px] font-medium text-white disabled:opacity-45">{busy ? <><Loader2 size={14} className="animate-spin" /> Entrando…</> : 'Entrar'}</button>
      <p className="text-center text-[11.5px] text-muted">¿Aún no tienes cuenta? <Link href={`/registro?next=${encodeURIComponent(nextUrl)}`} className="font-medium text-accent-deep hover:underline">Regístrate gratis</Link></p>
    </form>
  );
}

function AuthField({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block"><span className="mb-1.5 block text-[10px] font-medium uppercase tracking-[0.16em] text-muted">{label}</span>{children}</label>; }
const inputClass = 'min-h-12 w-full rounded-xl border border-line bg-bg px-3.5 py-3 text-[16px] text-ink outline-none focus:border-accent';
