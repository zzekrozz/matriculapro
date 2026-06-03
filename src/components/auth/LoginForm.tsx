'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';

interface LoginFormProps {
  nextUrl?: string;
}

export function LoginForm({ nextUrl = '/app/dashboard' }: LoginFormProps) {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const safeNextUrl =
    nextUrl.startsWith('/') && !nextUrl.startsWith('//')
      ? nextUrl
      : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    setError(null);
    setLoading(true);
    console.log('[LOGIN] form submit for:', email);

    try {
      const result = await signIn(email, password);

      if (result.error) {
        console.log('[LOGIN] form got error:', result.error);
        setError(result.error);
        return;
      }

      const redirectTo = safeNextUrl ?? result.redirectTo ?? '/app/dashboard';
      console.log('[LOGIN] redirecting to:', redirectTo);
      window.location.replace(redirectTo);
    } catch (err) {
      console.error('[LOGIN] form exception:', err);
      setError('No se ha podido iniciar sesión. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div>
        <label className="block text-[10.5px] tracking-[0.18em] uppercase text-muted mb-1.5">
          Email
        </label>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          autoComplete="email"
          placeholder="tu@email.com"
          className="w-full px-3.5 py-2.5 rounded-lg text-[13.5px] outline-none bg-surface border border-line focus:border-ink transition-colors"
        />
      </div>

      <div>
        <label className="block text-[10.5px] tracking-[0.18em] uppercase text-muted mb-1.5">
          Contraseña
        </label>
        <div className="relative">
          <input
            type={showPw ? 'text' : 'password'}
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            placeholder="••••••••"
            className="w-full px-3.5 py-2.5 rounded-lg text-[13.5px] outline-none bg-surface border border-line focus:border-ink transition-colors pr-10"
          />
          <button
            type="button"
            onClick={() => setShowPw(v => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink transition-colors"
            aria-label={showPw ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          >
            {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>
      </div>

      {error && (
        <div role="alert" className="rounded-lg px-3 py-2.5 bg-danger-soft text-danger text-[12.5px] leading-relaxed">
          {error}
        </div>
      )}

      <div className="flex justify-end">
        <Link href="/auth/forgot-password" className="text-[12px] text-accent-deep hover:underline font-medium">
          ¿Olvidaste tu contraseña?
        </Link>
      </div>

      <button
        type="submit"
        disabled={loading || !email || !password}
        className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full text-[13.5px] font-medium transition-transform hover:scale-[1.01] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 bg-ink text-white shadow-soft-md"
      >
        {loading ? <><Loader2 size={14} className="animate-spin" /> Entrando...</> : 'Entrar'}
      </button>

      <p className="text-center text-[12px] text-muted">
        ¿Acabas de pagar?{' '}
        <Link href="/acceso-founder" className="text-accent-deep hover:underline font-medium">
          Activar acceso Founder
        </Link>
      </p>
    </form>
  );
}
