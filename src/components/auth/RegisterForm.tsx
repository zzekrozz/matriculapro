'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Eye, EyeOff, Loader2, Crown } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';

interface RegisterFormProps {
  isFounderContext?: boolean;
}

export function RegisterForm({ isFounderContext = false }: RegisterFormProps) {
  const { signUp } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError(null);
    setLoading(true);

    const { error: err } = await signUp(email, password, {
      display_name: displayName.trim() || undefined,
    });

    setLoading(false);
    if (err) {
      setError(err);
    } else {
      setDone(true);
    }
  };

  if (done) {
    return (
      <div className="rounded-2xl p-6 text-center bg-ok-soft border border-ok">
        <div className="text-4xl mb-3">📬</div>
        <h3 className="font-serif text-[20px] text-ok mb-2">Revisa tu email</h3>
        <p className="text-[12.5px] text-ok leading-relaxed">
          {isFounderContext ? (
            <>Enviamos un enlace a <strong>{email}</strong>. Al confirmar, tu acceso Founder se activa automáticamente.</>
          ) : (
            <>Enviamos un enlace a <strong>{email}</strong>. Haz clic para activar tu cuenta.</>
          )}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {isFounderContext && (
        <div className="rounded-lg p-3 flex items-start gap-2 bg-accent-soft">
          <Crown size={13} className="shrink-0 mt-0.5 text-accent-deep" />
          <p className="text-[11.5px] leading-relaxed text-accent-deep">
            <strong>Usa exactamente el mismo email del pago.</strong>{' '}
            El sistema lo detecta y activa tu acceso Founder.
          </p>
        </div>
      )}

      <div>
        <label className="block text-[10.5px] tracking-[0.18em] uppercase text-muted mb-1.5">
          Nombre (opcional)
        </label>
        <input type="text" value={displayName} onChange={e => setDisplayName(e.target.value)}
          autoComplete="name" placeholder="Tu nombre o alias"
          className="w-full px-3.5 py-2.5 rounded-lg text-[13.5px] outline-none bg-surface border border-line focus:border-ink transition-colors" />
      </div>

      <div>
        <label className="block text-[10.5px] tracking-[0.18em] uppercase text-muted mb-1.5">
          Email
        </label>
        <input type="email" value={email} onChange={e => setEmail(e.target.value)}
          required autoComplete="email"
          placeholder={isFounderContext ? 'El mismo email que en Stripe' : 'tu@email.com'}
          className="w-full px-3.5 py-2.5 rounded-lg text-[13.5px] outline-none bg-surface border border-line focus:border-ink transition-colors" />
      </div>

      <div>
        <label className="block text-[10.5px] tracking-[0.18em] uppercase text-muted mb-1.5">
          Contraseña
        </label>
        <div className="relative">
          <input type={showPw ? 'text' : 'password'} value={password}
            onChange={e => setPassword(e.target.value)}
            required autoComplete="new-password" placeholder="Mínimo 8 caracteres" minLength={8}
            className="w-full px-3.5 py-2.5 rounded-lg text-[13.5px] outline-none bg-surface border border-line focus:border-ink transition-colors pr-10" />
          <button type="button" onClick={() => setShowPw(v => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink transition-colors"
            aria-label={showPw ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
            {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>
      </div>

      {!isFounderContext && (
        <p className="text-[11.5px] leading-relaxed text-ink-soft">
          Recibirás un email de confirmación antes de entrar.
        </p>
      )}

      {error && (
        <div role="alert" className="rounded-lg px-3 py-2 bg-danger-soft text-danger text-[12px] leading-relaxed">
          {error}
        </div>
      )}

      <button type="submit" disabled={loading || !email || !password}
        className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full text-[13.5px] font-medium transition-transform hover:scale-[1.01] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 bg-ink text-white shadow-soft-md">
        {loading
          ? <><Loader2 size={14} className="animate-spin" /> Creando acceso…</>
          : isFounderContext
            ? <><Crown size={14} className="text-accent" /> Crear cuenta Founder</>
            : 'Crear mi acceso'}
      </button>

      <p className="text-center text-[12px] text-muted">
        ¿Ya tienes cuenta?{' '}
        <Link href="/auth/login" className="text-ink hover:underline font-medium">Entrar</Link>
      </p>
    </form>
  );
}
