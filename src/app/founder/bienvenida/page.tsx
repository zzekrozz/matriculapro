'use client';

import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Crown, CheckCircle2, Loader2, ChevronRight, Mail, Eye, EyeOff
} from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { useAccess, formatFounderNumber } from '@/providers/AccessProvider';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';

/**
 * /founder/bienvenida
 *
 * Stripe redirige aquí tras el pago exitoso.
 * En Stripe Payment Link → After payment → Redirect to URL:
 *   https://matriculapro-psi.vercel.app/founder/bienvenida
 *
 * CASOS:
 * A) Usuario YA tiene sesión → refrescar perfil → mostrar bienvenida si es founder
 * B) Usuario NO tiene sesión → mostrar formulario de registro/login con instrucciones
 *    "Crea tu cuenta con el mismo email que usaste en Stripe"
 *    Al hacer login/registro, el sistema detecta founder_number asignado por el webhook
 */

type PageState =
  | 'checking'      // Verificando sesión inicial
  | 'needs-account' // Sin sesión: mostrar form de registro/login
  | 'waiting'       // Con sesión pero webhook aún no procesó
  | 'active'        // Founder activo y confirmado
  | 'pending';      // Pago recibido pero activación tardó demasiado

function BienvenidaContent() {
  const { user, profile, refreshProfile, signIn, signUp } = useAuth();
  const { level, founderNumber } = useAccess();
  const [pageState, setPageState] = useState<PageState>('checking');
  const searchParams = useSearchParams();

  // Form de registro/login
  const [authMode, setAuthMode] = useState<'register' | 'login'>('register');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authDone, setAuthDone] = useState(false); // registro OK, pendiente confirmación

  useEffect(() => {
    // Si hay sesión activa, intentar confirmar que es founder
    if (user) {
      if (level === 'founder' || level === 'full') {
        setPageState('active');
        return;
      }
      // Tiene sesión pero no es founder todavía — hacer polling
      setPageState('waiting');
      let attempts = 0;
      const interval = setInterval(async () => {
        await refreshProfile();
        attempts++;
        // refreshProfile actualiza el contexto — la siguiente render del efecto [level] lo capturará
        if (attempts >= 8) {
          setPageState('pending');
          clearInterval(interval);
        }
      }, 1500);
      return () => clearInterval(interval);
    } else {
      // Sin sesión: mostrar instrucciones para crear cuenta
      setPageState('needs-account');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Reaccionar a cambios de nivel (cuando el polling o el login actualizan)
  useEffect(() => {
    if ((level === 'founder' || level === 'full') && pageState !== 'active') {
      setPageState('active');
    }
  }, [level, pageState]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthLoading(true);
    try {
      if (authMode === 'register') {
        const { error } = await signUp(email, password);
        if (error) { setAuthError(error); return; }
        setAuthDone(true); // Confirmar email
      } else {
        const { error } = await signIn(email, password);
        if (error) { setAuthError(error); return; }
        // El useEffect de [user] detectará la sesión y hará polling
      }
    } finally {
      setAuthLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-[560px] text-center">

        {/* Logo */}
        <Link href="/" className="inline-flex items-baseline gap-1.5 mb-10">
          <span className="text-[9.5px] tracking-[0.22em] uppercase text-muted">Ivan Imports ·</span>
          <span className="font-serif italic text-2xl text-ink">Matricula</span>
          <span className="text-[11px] font-semibold text-accent">PRO</span>
        </Link>

        {/* ── CHECKING ── */}
        {pageState === 'checking' && (
          <div className="rounded-[24px] p-8 bg-surface border border-line shadow-soft-md">
            <Loader2 size={28} className="animate-spin text-accent mx-auto mb-3" />
            <p className="text-[13px] text-ink-soft">Verificando tu pago…</p>
          </div>
        )}

        {/* ── NEEDS ACCOUNT ── */}
        {pageState === 'needs-account' && (
          <div className="rounded-[24px] overflow-hidden bg-surface border border-line shadow-soft-md">
            <div className="p-6 lg:p-8 border-b border-line"
                 style={{ background: 'linear-gradient(135deg, #0B1F3A 0%, #16335E 100%)', color: '#fff' }}>
              <div className="relative">
                <Crown size={28} className="text-accent mx-auto mb-3" />
                <div className="text-[10px] tracking-[0.22em] uppercase mb-1 text-accent">
                  Pago completado · Activa tu acceso
                </div>
                <h2 className="font-serif italic text-white leading-[1.05]"
                    style={{ fontSize: 'clamp(22px, 2.8vw, 30px)' }}>
                  Crea tu cuenta con el mismo email que usaste en Stripe.
                </h2>
                <p className="mt-2 text-[12.5px] text-muted-soft leading-relaxed">
                  El sistema activará tu acceso Founder automáticamente al detectar el email de tu compra.
                </p>
              </div>
            </div>

            <div className="p-6 lg:p-8">
              {authDone ? (
                <div className="rounded-xl p-5 text-center bg-ok-soft border border-ok">
                  <CheckCircle2 size={24} className="text-ok mx-auto mb-2" />
                  <p className="text-[13px] text-ok font-medium mb-1">¡Revisa tu email!</p>
                  <p className="text-[12px] text-ok leading-relaxed">
                    Hemos enviado un enlace de confirmación a <strong>{email}</strong>.
                    Al confirmar, tu acceso Founder se activará automáticamente.
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex gap-2 mb-5">
                    {(['register', 'login'] as const).map(mode => (
                      <button key={mode} onClick={() => { setAuthMode(mode); setAuthError(null); }}
                        className="flex-1 py-2 rounded-full text-[12.5px] font-medium transition-colors"
                        style={{
                          background: authMode === mode ? 'var(--color-ink)' : 'var(--color-bg-deep)',
                          color: authMode === mode ? '#fff' : 'var(--color-ink-soft)',
                        }}>
                        {mode === 'register' ? 'Crear cuenta' : 'Ya tengo cuenta'}
                      </button>
                    ))}
                  </div>

                  <form onSubmit={handleAuth} className="space-y-3">
                    <div>
                      <label className="block text-[10.5px] tracking-[0.18em] uppercase text-muted mb-1.5">
                        Email (el mismo que usaste en Stripe)
                      </label>
                      <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                        required placeholder="tu@email.com" autoComplete="email"
                        className="w-full px-3.5 py-2.5 rounded-lg text-[13.5px] outline-none bg-surface border border-line focus:border-ink transition-colors" />
                    </div>
                    <div>
                      <label className="block text-[10.5px] tracking-[0.18em] uppercase text-muted mb-1.5">
                        Contraseña
                      </label>
                      <div className="relative">
                        <input type={showPw ? 'text' : 'password'} value={password}
                          onChange={e => setPassword(e.target.value)}
                          required placeholder="Mínimo 8 caracteres" minLength={8}
                          autoComplete={authMode === 'register' ? 'new-password' : 'current-password'}
                          className="w-full px-3.5 py-2.5 rounded-lg text-[13.5px] outline-none bg-surface border border-line focus:border-ink transition-colors pr-10" />
                        <button type="button" onClick={() => setShowPw(v => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink">
                          {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </div>
                    </div>

                    {authError && (
                      <p className="rounded-lg px-3 py-2 bg-danger-soft text-danger text-[12px]">{authError}</p>
                    )}

                    <button type="submit" disabled={authLoading || !email || !password}
                      className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full text-[13.5px] font-medium disabled:opacity-40 disabled:cursor-not-allowed bg-ink text-white shadow-soft-md hover:scale-[1.01] transition-transform">
                      {authLoading
                        ? <><Loader2 size={14} className="animate-spin" /> Procesando…</>
                        : authMode === 'register' ? 'Crear cuenta y activar Founder' : 'Entrar y activar Founder'}
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>
        )}

        {/* ── WAITING ── */}
        {pageState === 'waiting' && (
          <div className="rounded-[24px] p-8 bg-surface border border-line shadow-soft-md">
            <Loader2 size={28} className="animate-spin text-accent mx-auto mb-3" />
            <h2 className="font-serif text-[22px] text-ink mb-2">Activando tu acceso…</h2>
            <p className="text-[13px] text-ink-soft">
              Confirmando el pago con Stripe. Esto tarda unos segundos.
            </p>
          </div>
        )}

        {/* ── ACTIVE ── */}
        {pageState === 'active' && (
          <div className="rounded-[24px] overflow-hidden bg-surface border border-line shadow-soft-md">
            <div className="p-8 lg:p-10 relative overflow-hidden"
                 style={{ background: 'linear-gradient(135deg, #0B1F3A 0%, #16335E 100%)', color: '#fff' }}>
              <div className="absolute -top-20 -right-20 w-56 h-56 rounded-full opacity-25 blur-3xl bg-accent" />
              <div className="relative">
                <motion.div
                  initial={{ scale: 0 }} animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 180, damping: 14 }}
                  className="w-20 h-20 rounded-2xl mx-auto mb-4 flex items-center justify-center bg-accent text-ink">
                  <Crown size={30} />
                </motion.div>
                <div className="text-[10.5px] tracking-[0.22em] uppercase mb-2 text-accent">
                  Bienvenido a MatriculaPRO
                </div>
                <h1 className="font-serif italic leading-[1.05] tracking-tight mb-2"
                    style={{ fontSize: 'clamp(26px, 3.2vw, 36px)' }}>
                  {founderNumber
                    ? <>Eres <span className="text-accent">Founder {formatFounderNumber(founderNumber)}</span></>
                    : 'Eres Founder Alpha'}
                </h1>
                <p className="text-[13.5px] text-muted-soft leading-relaxed">
                  Acceso activo. Ya puedes usar todos los módulos y guardar tu progreso.
                </p>
              </div>
            </div>
            <div className="p-6 lg:p-8 text-left">
              <ul className="space-y-2 mb-6">
                {[
                  'Ruta de matriculación completa con todos los pasos',
                  'Simulador 576, ficha técnica 3D, recorrido ITV completo',
                  'Checklists, casos prácticos, biblioteca y plantillas',
                  'Guardar progreso · Badge Founder en sidebar',
                ].map((t, i) => (
                  <li key={i} className="flex items-start gap-2 text-[12.5px] text-ink-soft">
                    <CheckCircle2 size={13} className="shrink-0 mt-0.5 text-accent" />
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
              {/* SIEMPRE al dashboard — nunca a la landing */}
              <Link href="/app/dashboard"
                className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full text-[14px] font-medium transition-transform hover:scale-[1.01] bg-ink text-white shadow-soft-md">
                Empezar a usar MatriculaPRO <ChevronRight size={14} />
              </Link>
            </div>
          </div>
        )}

        {/* ── PENDING ── */}
        {pageState === 'pending' && (
          <div className="rounded-[24px] p-8 bg-surface border border-line shadow-soft-md">
            <CheckCircle2 size={32} className="text-ok mx-auto mb-3" />
            <h2 className="font-serif text-[22px] text-ink mb-2">Compra recibida</h2>
            <p className="text-[13px] text-ink-soft mb-2 leading-relaxed">
              El pago está confirmado pero la activación puede tardar unos minutos.
            </p>
            <p className="text-[12.5px] text-accent-deep mb-5 leading-relaxed">
              Entra al dashboard y refresca la página en un par de minutos para ver tu badge Founder.
            </p>
            <p className="text-[11.5px] text-muted mb-5 flex items-center justify-center gap-1.5">
              <Mail size={11} /> ¿Problemas? Escribe a través del feedback del dashboard.
            </p>
            <Link href="/app/dashboard"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-[13px] font-medium bg-ink text-white hover:scale-[1.01] transition-transform">
              Ir al dashboard <ChevronRight size={13} />
            </Link>
          </div>
        )}
      </motion.div>
    </div>
  );
}

export default function FounderBienvenidaPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <Loader2 size={28} className="animate-spin text-accent" />
      </div>
    }>
      <BienvenidaContent />
    </Suspense>
  );
}
