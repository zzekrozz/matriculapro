'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Loader2, LockKeyhole, CheckCircle2, AlertTriangle } from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';

type ResetState = 'loading' | 'ready' | 'success' | 'invalid';

export default function ResetPasswordPage() {
  const [state, setState] = useState<ResetState>('loading');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const supabase = createSupabaseBrowserClient();

    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      setState(session ? 'ready' : 'invalid');
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (event === 'PASSWORD_RECOVERY' || session) {
        setState('ready');
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;

    if (password.length < 8) {
      setError('La nueva contraseña debe tener al menos 8 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const supabase = createSupabaseBrowserClient();
      const { error: updateError } = await supabase.auth.updateUser({ password });

      if (updateError) {
        console.warn('[AUTH] reset-password error:', updateError.message);
        setError(updateError.message);
        return;
      }

      setState('success');
      window.setTimeout(() => {
        window.location.replace('/auth/login?message=password-updated');
      }, 1200);
    } catch (err) {
      console.error('[AUTH] reset-password exception:', err);
      setError('No se ha podido actualizar la contraseña. Inténtalo de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4 py-6 sm:py-10">
      <div className="w-full max-w-[440px]">
        <div className="text-center mb-6 sm:mb-8">
          <Link href="/" className="inline-flex items-baseline gap-1.5">
            <span className="text-[9.5px] tracking-[0.22em] uppercase text-muted">Ivan Imports ·</span>
            <span className="font-serif italic text-2xl text-ink">Matricula</span>
            <span className="text-[11px] font-semibold text-accent">PRO</span>
          </Link>
        </div>

        <div className="rounded-[20px] p-5 sm:p-7 lg:p-8 bg-surface border border-line shadow-soft-md">
          {state === 'loading' && (
            <div className="text-center">
              <Loader2 size={28} className="animate-spin text-accent mx-auto mb-3" />
              <p className="text-[13px] text-ink-soft">Preparando el cambio de contraseña...</p>
            </div>
          )}

          {state === 'invalid' && (
            <div className="text-center">
              <AlertTriangle size={32} className="text-danger mx-auto mb-3" />
              <h1 className="font-serif text-[24px] text-ink mb-2">Enlace no válido</h1>
              <p className="text-[13px] text-ink-soft leading-relaxed mb-5">
                El enlace para cambiar la contraseña ha caducado o ya no es válido.
              </p>
              <Link
                href="/auth/forgot-password"
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full text-[13px] font-medium bg-ink text-white hover:scale-[1.01] transition-transform"
              >
                Solicitar un enlace nuevo
              </Link>
            </div>
          )}

          {state === 'ready' && (
            <>
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center mb-4 bg-accent-soft text-accent-deep">
                <LockKeyhole size={18} />
              </div>
              <h1 className="font-serif text-ink leading-[1.1] tracking-tight mb-2" style={{ fontSize: 28 }}>
                Nueva contraseña
              </h1>
              <p className="text-[13px] text-ink-soft mb-6 leading-relaxed">
                Escribe tu nueva contraseña y confirma el cambio.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                <div>
                  <label className="block text-[10.5px] tracking-[0.18em] uppercase text-muted mb-1.5">
                    Nueva contraseña
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                    minLength={8}
                    placeholder="Mínimo 8 caracteres"
                    className="w-full px-3.5 py-3 rounded-lg text-[16px] sm:text-[13.5px] outline-none bg-surface border border-line focus:border-ink transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-[10.5px] tracking-[0.18em] uppercase text-muted mb-1.5">
                    Confirmar contraseña
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                    minLength={8}
                    placeholder="Repite la contraseña"
                    className="w-full px-3.5 py-3 rounded-lg text-[16px] sm:text-[13.5px] outline-none bg-surface border border-line focus:border-ink transition-colors"
                  />
                </div>

                {error && (
                  <div className="rounded-lg px-3 py-2.5 bg-danger-soft text-danger text-[12.5px] leading-relaxed">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={saving || !password || !confirmPassword}
                  className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full text-[13.5px] font-medium transition-transform hover:scale-[1.01] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 bg-ink text-white shadow-soft-md"
                >
                  {saving ? <><Loader2 size={14} className="animate-spin" /> Guardando...</> : 'Actualizar contraseña'}
                </button>
              </form>
            </>
          )}

          {state === 'success' && (
            <div className="text-center">
              <CheckCircle2 size={32} className="text-ok mx-auto mb-3" />
              <h1 className="font-serif text-[24px] text-ink mb-2">Contraseña actualizada</h1>
              <p className="text-[13px] text-ink-soft leading-relaxed">
                Ya puedes iniciar sesión con tu nueva contraseña.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
