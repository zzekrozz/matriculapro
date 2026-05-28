'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Eye, EyeOff, FlaskConical, Loader2 } from 'lucide-react';
import { login } from '@/lib/auth/client';

interface LoginFormProps {
  onSuccess?: () => void;
}

export function LoginForm({ onSuccess }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await login({ email, password });
      if (result.ok) {
        onSuccess?.();
      } else {
        setError(result.error ?? 'Error al iniciar sesión.');
      }
    } catch {
      setError('Ha ocurrido un error inesperado.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Banner mock */}
      <div className="rounded-lg px-3 py-2 flex items-center gap-2 bg-accent-soft text-accent-deep text-[11px]">
        <FlaskConical size={11} />
        <span>Login mock — conectará con Supabase Auth en la siguiente fase.</span>
      </div>

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
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink"
            aria-label={showPw ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
            {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg px-3 py-2 bg-danger-soft text-danger text-[12px]">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading || !email || !password}
        className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full text-[13.5px] font-medium transition-transform hover:scale-[1.01] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 bg-ink text-white shadow-soft-md">
        {loading ? <><Loader2 size={14} className="animate-spin" /> Entrando…</> : 'Entrar'}
      </button>

      <p className="text-center text-[12px] text-muted">
        ¿No tienes cuenta?{' '}
        <Link href="/auth/register" className="text-ink hover:underline font-medium">
          Regístrate gratis
        </Link>
      </p>
    </form>
  );
}
