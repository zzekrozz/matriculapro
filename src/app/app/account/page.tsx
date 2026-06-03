'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, Loader2, Mail, Shield, UserRound, KeyRound, LogOut } from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';
import { useAccess, formatFounderNumber } from '@/providers/AccessProvider';
import { useAuth } from '@/providers/AuthProvider';

export default function AccountPage() {
  const { user, profile, refreshProfile, signOut, loading: authLoading } = useAuth();
  const { level, founderNumber } = useAccess();
  const [displayName, setDisplayName] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDisplayName(profile?.display_name ?? '');
  }, [profile?.display_name]);

  const accessLabel = useMemo(() => {
    switch (level) {
      case 'full':
        return 'Full';
      case 'founder':
        return 'Founder';
      case 'explorer':
        return 'Explorer';
      default:
        return 'Visitor';
    }
  }, [level]);

  const handleSaveName = async () => {
    if (!user || savingName) return;

    setSavingName(true);
    setMessage(null);
    setError(null);

    try {
      const supabase = createSupabaseBrowserClient();
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ display_name: displayName.trim() || null })
        .eq('id', user.id);

      if (updateError) {
        console.warn('[ACCOUNT] update display_name error:', updateError.message);
        setError('No se ha podido guardar el nombre visible.');
        return;
      }

      await refreshProfile();
      setMessage('Nombre visible actualizado.');
    } catch (err) {
      console.error('[ACCOUNT] update display_name exception:', err);
      setError('No se ha podido guardar el nombre visible.');
    } finally {
      setSavingName(false);
    }
  };

  const handleSendPasswordReset = async () => {
    if (!user?.email || sendingReset) return;

    setSendingReset(true);
    setMessage(null);
    setError(null);

    try {
      const supabase = createSupabaseBrowserClient();
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (resetError) {
        console.warn('[ACCOUNT] reset password email error:', resetError.message);
        setError('No se ha podido enviar el enlace para cambiar la contraseña.');
        return;
      }

      setMessage('Te hemos enviado un enlace para cambiar tu contraseña.');
    } catch (err) {
      console.error('[ACCOUNT] reset password email exception:', err);
      setError('No se ha podido enviar el enlace para cambiar la contraseña.');
    } finally {
      setSendingReset(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    window.location.replace('/');
  };

  if (authLoading) {
    return (
      <div className="px-5 lg:px-8 pt-8 pb-12 max-w-[920px] mx-auto">
        <div className="rounded-[24px] p-8 bg-surface border border-line shadow-soft-md flex items-center gap-3 text-[13px] text-ink-soft">
          <Loader2 size={16} className="animate-spin text-accent" /> Cargando tu cuenta...
        </div>
      </div>
    );
  }

  return (
    <div className="px-5 lg:px-8 pt-8 pb-12 max-w-[920px] mx-auto">
      <div className="mb-5">
        <Link href="/app/dashboard" className="inline-flex items-center gap-2 text-[12.5px] text-muted hover:text-ink transition-colors">
          <ChevronLeft size={12} /> Volver al dashboard
        </Link>
      </div>

      <section className="rounded-[24px] p-7 lg:p-9 bg-surface border border-line shadow-soft-md">
        <div className="flex items-start justify-between gap-4 flex-wrap mb-7">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full mb-3 bg-accent-soft text-accent-deep">
              <UserRound size={12} />
              <span className="text-[10.5px] tracking-[0.18em] uppercase font-semibold">Mi cuenta</span>
            </div>
            <h1 className="font-serif text-ink leading-[1.08] tracking-tight" style={{ fontSize: 'clamp(28px, 4vw, 40px)' }}>
              Tu perfil en MatriculaPRO
            </h1>
            <p className="mt-3 max-w-[580px] text-[14px] leading-relaxed text-ink-soft">
              Aquí puedes revisar tus datos principales, guardar tu nombre visible y solicitar el cambio de contraseña.
            </p>
          </div>

          <div className="rounded-2xl px-4 py-3 border" style={{ borderColor: 'rgba(200,134,46,0.25)', background: 'rgba(200,134,46,0.08)' }}>
            <div className="text-[10px] tracking-[0.18em] uppercase text-accent-deep mb-1">Nivel de acceso</div>
            <div className="text-[14px] font-medium text-ink">{accessLabel}</div>
            {founderNumber != null && (
              <div className="text-[11px] text-ink-soft mt-1">{formatFounderNumber(founderNumber)}</div>
            )}
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-2xl p-5 border border-line bg-bg">
            <div className="text-[10.5px] tracking-[0.18em] uppercase text-muted mb-4">Datos principales</div>

            <div className="space-y-4">
              <div>
                <label className="block text-[10.5px] tracking-[0.18em] uppercase text-muted mb-1.5">
                  Nombre visible
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  placeholder="Cómo quieres aparecer en MatriculaPRO"
                  className="w-full px-3.5 py-2.5 rounded-lg text-[13.5px] outline-none bg-surface border border-line focus:border-ink transition-colors"
                />
              </div>

              <div>
                <label className="block text-[10.5px] tracking-[0.18em] uppercase text-muted mb-1.5">
                  Email
                </label>
                <div className="w-full px-3.5 py-2.5 rounded-lg text-[13.5px] bg-surface border border-line text-ink-soft">
                  {user?.email ?? '—'}
                </div>
                <p className="mt-2 text-[11.5px] leading-relaxed text-muted">
                  Para cambiar el email de tu cuenta, contacta con soporte.
                </p>
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
                type="button"
                onClick={handleSaveName}
                disabled={savingName}
                className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full text-[13px] font-medium bg-ink text-white disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {savingName ? <><Loader2 size={14} className="animate-spin" /> Guardando...</> : 'Guardar nombre'}
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl p-5 border border-line bg-bg">
              <div className="flex items-center gap-2 mb-3 text-ink">
                <Shield size={15} className="text-accent-deep" />
                <div className="text-[13px] font-medium">Acceso</div>
              </div>
              <div className="text-[12.5px] text-ink-soft leading-relaxed">
                Tu nivel actual es <strong className="text-ink">{accessLabel}</strong>.
                {founderNumber != null && <> Tu número Founder es <strong className="text-ink">{formatFounderNumber(founderNumber)}</strong>.</>}
              </div>
            </div>

            <div className="rounded-2xl p-5 border border-line bg-bg">
              <div className="flex items-center gap-2 mb-3 text-ink">
                <Mail size={15} className="text-accent-deep" />
                <div className="text-[13px] font-medium">Cambiar contraseña</div>
              </div>
              <p className="text-[12.5px] text-ink-soft leading-relaxed mb-4">
                Por simplicidad, te enviaremos un enlace seguro al email actual de tu cuenta.
              </p>
              <button
                type="button"
                onClick={handleSendPasswordReset}
                disabled={sendingReset || !user?.email}
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full text-[13px] font-medium bg-surface border border-line text-ink hover:border-accent disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {sendingReset ? <><Loader2 size={14} className="animate-spin" /> Enviando...</> : <><KeyRound size={14} /> Enviar enlace para cambiar contraseña</>}
              </button>
            </div>

            <div className="rounded-2xl p-5 border border-line bg-bg">
              <div className="text-[12.5px] text-ink-soft leading-relaxed mb-4">
                Si has terminado, puedes cerrar la sesión desde aquí.
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full text-[13px] font-medium bg-danger-soft text-danger hover:opacity-90"
              >
                <LogOut size={14} /> Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
