'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Loader2, Mail, ArrowLeft } from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const supabase = createSupabaseBrowserClient();
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (resetError) {
        console.warn('[AUTH] forgot-password error:', resetError.message);
      }

      setMessage('Si existe una cuenta con este email, te enviaremos un enlace para restablecer la contraseña.');
    } catch (err) {
      console.error('[AUTH] forgot-password exception:', err);
      setError('No se ha podido procesar la solicitud ahora mismo. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <div className="w-full max-w-[440px]">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-baseline gap-1.5">
            <span className="text-[9.5px] tracking-[0.22em] uppercase text-muted">Ivan Imports ·</span>
            <span className="font-serif italic text-2xl text-ink">Matricula</span>
            <span className="text-[11px] font-semibold text-accent">PRO</span>
          </Link>
        </div>

        <div className="rounded-[20px] p-7 lg:p-8 bg-surface border border-line shadow-soft-md">
          <div className="w-11 h-11 rounded-2xl flex items-center justify-center mb-4 bg-accent-soft text-accent-deep">
            <Mail size={18} />
          </div>
          <h1 className="font-serif text-ink leading-[1.1] tracking-tight mb-2" style={{ fontSize: 28 }}>
            Recuperar contraseña
          </h1>
          <p className="text-[13px] text-ink-soft mb-6 leading-relaxed">
            Introduce tu email y te enviaremos un enlace para restablecer tu contraseña.
          </p>

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

            {message && (
              <div className="rounded-lg px-3 py-2.5 bg-ok-soft text-ok text-[12.5px] leading-relaxed">
                {message}
              </div>
            )}

            {error && (
              <div className="rounded-lg px-3 py-2.5 bg-danger-soft text-danger text-[12.5px] leading-relaxed">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !email}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full text-[13.5px] font-medium transition-transform hover:scale-[1.01] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 bg-ink text-white shadow-soft-md"
            >
              {loading ? <><Loader2 size={14} className="animate-spin" /> Enviando...</> : 'Enviar enlace'}
            </button>
          </form>
        </div>

        <div className="mt-5 text-center">
          <Link href="/auth/login" className="inline-flex items-center gap-1.5 text-[12px] text-muted hover:text-ink transition-colors">
            <ArrowLeft size={12} /> Volver a iniciar sesión
          </Link>
        </div>
      </div>
    </div>
  );
}
