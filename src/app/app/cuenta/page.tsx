'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Download, KeyRound, Loader2, LogOut, Mail, Save, ShieldAlert, Trash2, UserRound } from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';
import { useAccess } from '@/providers/AccessProvider';
import { useAuth } from '@/providers/AuthProvider';

export default function AccountPage() {
  const { user, profile, refreshProfile, signOut } = useAuth();
  const access = useAccess();
  const [displayName, setDisplayName] = useState(profile?.display_name ?? '');
  const [newEmail, setNewEmail] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (access.publicBeta) return;
    const query = new URLSearchParams(window.location.search);
    const sessionId = query.get('session_id');
    if (query.get('checkout') !== 'success' || !sessionId) return;
    void createSupabaseBrowserClient()
      .rpc('get_my_payment_activation_status', { p_checkout_session_id: sessionId })
      .then(({ data, error: statusError }) => {
        if (statusError || !data || typeof data !== 'object') return;
        const status = (data as { status?: unknown }).status;
        if (status === 'review') {
          setMessage('Hemos recibido el pago, pero la activación necesita revisión. No vuelvas a pagar. Te avisaremos cuando quede resuelta.');
        } else if (status === 'activated') {
          setMessage('Pago recibido y licencia activada correctamente.');
          void access.refresh();
        } else if (status === 'pending') {
          setMessage('El pago se está verificando. No repitas la compra; actualizaremos la licencia al recibir el webhook.');
        } else if (status === 'fully_refunded_before_activation') {
          setMessage('El pago fue reembolsado antes de completar la activación. Tu cuenta gratuita sigue disponible.');
          void access.refresh();
        } else if (status === 'dispute_before_activation') {
          setMessage('El pago está siendo revisado por el proveedor de pagos. Te avisaremos cuando cambie su estado.');
          void access.refresh();
        }
      });
  }, [access]);

  const action = async (key: string, callback: () => Promise<string>) => {
    setBusy(key); setMessage(null); setError(null);
    try { setMessage(await callback()); } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se ha podido completar la acción.'); }
    finally { setBusy(null); }
  };
  const saveName = () => action('name', async () => { const { error: updateError } = await createSupabaseBrowserClient().rpc('update_my_profile', { p_display_name: displayName }); if (updateError) throw updateError; await refreshProfile(); return 'Nombre actualizado.'; });
  const requestPassword = () => action('password', async () => { if (!user?.email) throw new Error('No se ha encontrado el email de la cuenta.'); const response = await fetch('/api/auth/recover', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: user.email }) }); const payload = await response.json() as { message?: string }; if (!response.ok) throw new Error(payload.message || 'No se ha podido enviar el enlace.'); return payload.message || 'Revisa tu email.'; });
  const requestEmailChange = () => action('email', async () => { if (!newEmail.trim()) throw new Error('Introduce el nuevo email.'); const { error: updateError } = await createSupabaseBrowserClient().auth.updateUser({ email: newEmail.trim() }); if (updateError) throw updateError; setNewEmail(''); return 'Revisa ambos correos para confirmar el cambio, según la configuración de seguridad.'; });
  const requestDeletion = () => action('delete', async () => { const { error: requestError } = await createSupabaseBrowserClient().rpc('request_account_deletion', { p_reason: 'Solicitud iniciada desde el área de cuenta.' }); if (requestError && !/duplicate/i.test(requestError.message)) throw requestError; return 'Solicitud registrada. Se revisarán antes las obligaciones de conservación aplicables.'; });
  const downloadData = () => action('download', async () => {
    if (!user) throw new Error('No hay sesión.');
    const supabase = createSupabaseBrowserClient();
    const betaCases = access.publicBeta
      ? fetch('/api/public-beta/cases?resource=cases', { cache: 'no-store' }).then(async (response) => {
        const payload = await response.json() as { ok?: boolean; data?: unknown[]; message?: string };
        if (!response.ok || !payload.ok) throw new Error(payload.message || 'No se han podido exportar los expedientes.');
        return payload.data ?? [];
      })
      : supabase.from('registration_cases').select('id, title, status, created_at, updated_at').eq('user_id', user.id).is('deleted_at', null).then(({ data, error: casesError }) => {
        if (casesError) throw casesError;
        return data ?? [];
      });
    const [checks, cases, deletion] = await Promise.all([
      supabase.from('free_vehicle_checks').select('id, risk_level, rule_version, created_at').eq('user_id', user.id).is('deleted_at', null),
      betaCases,
      supabase.from('account_deletion_requests').select('id, status, requested_at, resolved_at').eq('user_id', user.id),
    ]);
    const exportData = { exportedAt: new Date().toISOString(), account: { id: user.id, email: user.email, displayName: profile?.display_name ?? null }, access: { tier: access.tier, mode: access.mode, publicBeta: access.publicBeta, license: access.license }, freeChecks: checks.data ?? [], cases, deletionRequests: deletion.data ?? [] };
    const url = URL.createObjectURL(new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' }));
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = `matriculapro-datos-${new Date().toISOString().slice(0, 10)}.json`; anchor.click(); URL.revokeObjectURL(url);
    return 'Exportación preparada.';
  });
  const logout = async (scope: 'local' | 'global') => { setBusy(scope); await signOut(scope); window.location.replace('/'); };

  return <div className="mx-auto max-w-[1020px] px-5 pb-16 pt-7 lg:px-8"><header><div className="text-[9.5px] uppercase tracking-[.2em] text-accent-deep">Cuenta</div><h1 className="mt-1 font-serif text-[38px] text-ink">{access.publicBeta ? 'Perfil y privacidad' : 'Perfil, licencia y privacidad'}</h1><p className="mt-2 max-w-2xl text-[12.5px] leading-relaxed text-ink-soft">Gestiona los datos básicos y registra solicitudes sensibles sin borrar inmediatamente información que pueda estar sujeta a conservación legal.</p></header>
    {(message || error) && <div role="status" className={`mt-5 rounded-xl p-3 text-[11.5px] ${error ? 'bg-danger-soft text-danger' : 'bg-ok-soft text-ok'}`}>{error ?? message}</div>}
    <div className="mt-6 grid gap-5 lg:grid-cols-2"><section className="rounded-[20px] border border-line bg-surface p-5"><Heading icon={UserRound}>Datos de la cuenta</Heading><div className="mt-4 space-y-4"><label><span className={labelClass}>Email actual</span><div className={readClass}>{user?.email ?? '—'}</div></label><label><span className={labelClass}>Nombre visible</span><input value={displayName} onChange={(event) => setDisplayName(event.target.value)} maxLength={120} className={inputClass} /></label><ActionButton busy={busy === 'name'} onClick={saveName} icon={Save}>Guardar nombre</ActionButton><label><span className={labelClass}>Solicitar cambio de email</span><input type="email" value={newEmail} onChange={(event) => setNewEmail(event.target.value)} placeholder="nuevo@email.com" className={inputClass} /></label><ActionButton busy={busy === 'email'} onClick={requestEmailChange} icon={Mail}>Solicitar cambio</ActionButton></div></section>
      {access.publicBeta ? <section className="rounded-[20px] border border-line bg-surface p-5"><Heading icon={ShieldAlert}>Acceso durante la beta</Heading><div className="mt-4 rounded-2xl bg-accent-soft p-4"><div className="text-[9px] uppercase tracking-[.15em] text-accent-deep">MatriculaPro Beta</div><div className="mt-1 font-serif text-[27px]">Herramientas abiertas</div><div className="mt-2 text-[10.5px] leading-relaxed text-ink-soft">Puedes utilizar las funciones particulares y profesionales mientras desarrollamos y mejoramos la plataforma. Tu sesión sigue protegiendo y separando tus datos.</div></div></section> : <section className="rounded-[20px] border border-line bg-surface p-5"><Heading icon={ShieldAlert}>Licencia</Heading><div className="mt-4 rounded-2xl bg-bg p-4"><div className="text-[9px] uppercase tracking-[.15em] text-muted">Plan actual</div><div className="mt-1 font-serif text-[27px] capitalize">{access.tier === 'free' ? 'Gratis' : access.tier}</div><div className="mt-2 text-[10.5px] leading-relaxed text-ink-soft">{access.mode === 'full' ? `Activa desde ${date(access.license?.startsAt)} hasta ${date(access.license?.expiresAt)}.` : access.mode === 'read_only' ? `Finalizó el ${date(access.expiredAt)}. Los expedientes siguen en modo lectura.` : 'Comprobación previa disponible sin tarjeta.'}</div></div><Link href="/app/planes" className="mt-4 inline-flex rounded-full bg-ink px-5 py-2.5 text-[11.5px] text-white">{access.isPaid ? 'Renovar o ampliar' : 'Elegir una licencia'}</Link></section>}
      <section className="rounded-[20px] border border-line bg-surface p-5"><Heading icon={KeyRound}>Seguridad de acceso</Heading><p className="mt-3 text-[11px] leading-relaxed text-ink-soft">El cambio de contraseña utiliza un enlace temporal. También puedes cerrar solo este dispositivo o todas las sesiones.</p><div className="mt-4 space-y-2"><ActionButton busy={busy === 'password'} onClick={requestPassword} icon={KeyRound}>Enviar enlace de contraseña</ActionButton><ActionButton busy={busy === 'local'} onClick={() => void logout('local')} icon={LogOut}>Cerrar este dispositivo</ActionButton><ActionButton busy={busy === 'global'} onClick={() => void logout('global')} icon={LogOut}>Cerrar todas las sesiones</ActionButton></div></section>
      <section className="rounded-[20px] border border-line bg-surface p-5"><Heading icon={Download}>Datos y supresión</Heading><p className="mt-3 text-[11px] leading-relaxed text-ink-soft">Descarga un resumen básico en JSON. Una solicitud de supresión queda pendiente de revisión para aplicar obligaciones fiscales o contractuales.</p><div className="mt-4 space-y-2"><ActionButton busy={busy === 'download'} onClick={downloadData} icon={Download}>Descargar datos básicos</ActionButton><ActionButton busy={busy === 'delete'} onClick={requestDeletion} icon={Trash2} danger>Solicitar eliminación de cuenta</ActionButton></div></section>
    </div>
  </div>;
}

function Heading({ icon: Icon, children }: { icon: typeof UserRound; children: React.ReactNode }) { return <h2 className="flex items-center gap-2 font-serif text-[23px]"><Icon size={16} className="text-accent-deep" />{children}</h2>; }
function ActionButton({ busy, onClick, icon: Icon, children, danger = false }: { busy: boolean; onClick: () => void; icon: typeof Save; children: React.ReactNode; danger?: boolean }) { return <button type="button" disabled={busy} onClick={onClick} className={`inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-full px-4 text-[11px] font-medium disabled:opacity-45 ${danger ? 'bg-danger-soft text-danger' : 'bg-bg-deep text-ink'}`}>{busy ? <Loader2 size={12} className="animate-spin" /> : <Icon size={12} />}{children}</button>; }
const labelClass = 'mb-1.5 block text-[9.5px] font-medium text-ink'; const inputClass = 'min-h-11 w-full rounded-xl border border-line bg-bg px-3 text-[16px] outline-none focus:border-accent sm:text-[12px]'; const readClass = 'min-h-11 rounded-xl border border-line bg-bg px-3 py-3 text-[12px] text-ink-soft';
function date(value: string | null | undefined) { return value ? new Intl.DateTimeFormat('es-ES', { dateStyle: 'medium' }).format(new Date(value)) : '—'; }
