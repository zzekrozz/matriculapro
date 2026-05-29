'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Sparkles, ShieldCheck, Heart, Mail, Eye, EyeOff,
  CheckCircle2, ChevronRight, FlaskConical, Crown, Loader2, User
} from 'lucide-react';
import { useAccess, formatFounderNumber } from '@/providers/AccessProvider';
import { useAuth } from '@/providers/AuthProvider';

interface FounderUpgradeModalProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Fases del flujo:
 * 1. auth     → si el usuario no está logueado, pide email/contraseña
 * 2. pitch    → propuesta Founder Beta 49€
 * 3. payment  → spinner simulado (en producción: Stripe Checkout)
 * 4. welcome  → bienvenida con número asignado
 */
type Phase = 'auth' | 'pitch' | 'payment' | 'welcome';

export function FounderUpgradeModal({ open, onClose }: FounderUpgradeModalProps) {
  const router = useRouter();
  const { activateFounder } = useAccess();
  const { user, signIn, signUp } = useAuth();

  const [phase, setPhase] = useState<Phase>(() => user ? 'pitch' : 'auth');
  const [aliasInput, setAliasInput] = useState('');
  const [assignedNumber, setAssignedNumber] = useState<number | null>(null);

  // Auth state
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Reiniciar al abrir
  const resetState = () => {
    setPhase(user ? 'pitch' : 'auth');
    setAliasInput('');
    setAssignedNumber(null);
    setAuthEmail('');
    setAuthPassword('');
    setAuthError(null);
    setAuthLoading(false);
  };

  // Manejar auth (login o registro)
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthLoading(true);
    try {
      if (authMode === 'login') {
        const { error } = await signIn(authEmail, authPassword);
        if (error) { setAuthError(error); return; }
      } else {
        const { error } = await signUp(authEmail, authPassword);
        if (error) { setAuthError(error); return; }
        // Si es registro, mostrar mensaje de confirmar email
        setAuthError('¡Revisa tu email! Confirma tu cuenta y vuelve para continuar.');
        return;
      }
      setPhase('pitch');
    } finally {
      setAuthLoading(false);
    }
  };

  // Activar Founder mock
  const handleActivate = () => {
    setPhase('payment');
    setTimeout(() => {
      const num = activateFounder({ alias: aliasInput.trim() || undefined });
      setAssignedNumber(num);
      setPhase('welcome');
    }, 1200);
  };

  // Cerrar y navegar al dashboard cuando ya es Founder
  const handleFinish = () => {
    onClose();
    resetState();
    // Navegar siempre al dashboard — nunca a la landing
    router.push('/app/dashboard');
  };

  // Cerrar sin completar el flujo
  const handleDismiss = () => {
    onClose();
    setTimeout(resetState, 300);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[70] flex items-center justify-center p-4 overflow-y-auto"
          style={{ background: 'rgba(11, 31, 58, 0.7)', backdropFilter: 'blur(6px)' }}
          onClick={phase !== 'payment' ? handleDismiss : undefined}>

          <motion.div
            initial={{ scale: 0.94, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.96, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            onClick={e => e.stopPropagation()}
            className="bg-surface rounded-[24px] max-w-[640px] w-full max-h-[90vh] overflow-y-auto shadow-soft-xl border border-line relative">

            {/* Banner DEV — solo en development */}
            {process.env.NODE_ENV !== 'production' && (
              <div className="px-5 py-2 flex items-center justify-between gap-2 bg-accent-soft border-b border-accent">
                <div className="flex items-center gap-1.5 text-[10.5px] tracking-[0.15em] uppercase font-semibold text-accent-deep">
                  <FlaskConical size={11} />
                  Flujo simulado · No es pago real
                </div>
                {phase !== 'payment' && (
                  <button onClick={handleDismiss} aria-label="Cerrar"
                    className="w-7 h-7 rounded-full flex items-center justify-center text-accent-deep hover:bg-accent/20 transition-colors">
                    <X size={13} />
                  </button>
                )}
              </div>
            )}

            {/* Botón cerrar en producción */}
            {process.env.NODE_ENV === 'production' && phase !== 'payment' && (
              <button onClick={handleDismiss} aria-label="Cerrar"
                className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full flex items-center justify-center text-muted hover:bg-bg-deep transition-colors">
                <X size={14} />
              </button>
            )}

            <AnimatePresence mode="wait">
              {/* ── FASE AUTH ── */}
              {phase === 'auth' && (
                <motion.div key="auth"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="p-7 lg:p-9">

                  <div className="flex items-center gap-2 mb-5">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-accent text-ink shrink-0">
                      <User size={18} />
                    </div>
                    <div>
                      <div className="text-[10.5px] tracking-[0.22em] uppercase font-semibold text-accent-deep">
                        Paso previo al acceso Founder
                      </div>
                      <h2 className="font-serif text-ink text-[22px] leading-[1.1] tracking-tight">
                        {authMode === 'login' ? 'Entra con tu cuenta' : 'Crea tu cuenta'}
                      </h2>
                    </div>
                  </div>

                  <p className="text-[13px] text-ink-soft mb-5 leading-relaxed">
                    {authMode === 'login'
                      ? 'Identifícate para continuar con el acceso Founder.'
                      : 'Crea tu cuenta gratis y después activa el acceso Founder.'}
                  </p>

                  <form onSubmit={handleAuth} className="space-y-3">
                    <div>
                      <label className="block text-[10.5px] tracking-[0.18em] uppercase text-muted mb-1.5">Email</label>
                      <input type="email" value={authEmail} onChange={e => setAuthEmail(e.target.value)}
                        required placeholder="tu@email.com"
                        className="w-full px-3.5 py-2.5 rounded-lg text-[13.5px] outline-none bg-surface border border-line focus:border-ink transition-colors" />
                    </div>
                    <div>
                      <label className="block text-[10.5px] tracking-[0.18em] uppercase text-muted mb-1.5">Contraseña</label>
                      <div className="relative">
                        <input type={showPw ? 'text' : 'password'} value={authPassword}
                          onChange={e => setAuthPassword(e.target.value)}
                          required placeholder="Mínimo 8 caracteres" minLength={8}
                          className="w-full px-3.5 py-2.5 rounded-lg text-[13.5px] outline-none bg-surface border border-line focus:border-ink transition-colors pr-10" />
                        <button type="button" onClick={() => setShowPw(v => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink"
                          aria-label="Mostrar/ocultar contraseña">
                          {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </div>
                    </div>

                    {authError && (
                      <p className={`rounded-lg px-3 py-2 text-[12px] ${authError.includes('email') || authError.includes('Revisa') ? 'bg-ok-soft text-ok' : 'bg-danger-soft text-danger'}`}>
                        {authError}
                      </p>
                    )}

                    <button type="submit" disabled={authLoading || !authEmail || !authPassword}
                      className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full text-[13.5px] font-medium disabled:opacity-40 disabled:cursor-not-allowed bg-ink text-white shadow-soft-md hover:scale-[1.01] transition-transform">
                      {authLoading ? <><Loader2 size={14} className="animate-spin" /> Procesando…</> : (authMode === 'login' ? 'Entrar' : 'Crear cuenta')}
                    </button>
                  </form>

                  <div className="mt-4 flex items-center justify-between">
                    <button onClick={() => { setAuthMode(m => m === 'login' ? 'register' : 'login'); setAuthError(null); }}
                      className="text-[12px] text-accent-deep hover:underline">
                      {authMode === 'login' ? '¿No tienes cuenta? Crear acceso' : '¿Ya tienes cuenta? Entrar'}
                    </button>
                    <button onClick={handleDismiss} className="text-[11px] text-muted hover:text-ink">
                      Cancelar
                    </button>
                  </div>
                </motion.div>
              )}

              {/* ── FASE PITCH ── */}
              {phase === 'pitch' && (
                <motion.div key="pitch"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="p-7 lg:p-9">

                  <div className="flex items-center gap-1.5 mb-3">
                    <Crown size={13} className="text-accent" />
                    <span className="text-[10.5px] tracking-[0.22em] uppercase font-semibold text-accent-deep">
                      Acceso Fundador Beta
                    </span>
                  </div>

                  <h2 className="font-serif text-ink leading-[1.05] tracking-tight mb-3"
                      style={{ fontSize: 'clamp(28px, 3.4vw, 38px)' }}>
                    Entras <span className="italic text-accent">temprano</span> y mantienes el acceso aunque MatriculaPRO suba a 199 €.
                  </h2>

                  <p className="text-[14px] leading-relaxed text-ink-soft mb-5">
                    MatriculaPRO está en beta. Los fundadores que entran ahora conservan el <strong className="text-ink">acceso de por vida</strong> a todo lo que se construya después.
                  </p>

                  {/* Precio */}
                  <div className="rounded-2xl p-5 mb-5 bg-bg-deep border border-line">
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="font-serif text-ink leading-none" style={{ fontSize: 52 }}>49</span>
                      <span className="text-accent text-[22px]">€</span>
                      <span className="text-[12px] text-muted ml-2">pago único · acceso de por vida</span>
                    </div>
                    <p className="text-[12.5px] text-ink-soft italic">
                      49 € no porque valga poco, sino porque estás entrando antes.
                    </p>
                  </div>

                  {/* Beneficios */}
                  <ul className="space-y-2.5 mb-6">
                    {[
                      { icon: Sparkles, text: 'Acceso Founder a todo lo disponible en la beta: ruta, simulador 576, ficha técnica 3D, recorrido ITV, checklists, casos prácticos, biblioteca, plantillas.' },
                      { icon: ShieldCheck, text: 'Acceso de por vida, también a futuras versiones (89 €, 129 €, 199 € — siempre incluido sin pagar más).' },
                      { icon: Crown, text: 'Tu número de Fundador correlativo y tu sitio en el Garaje Fundador.' },
                      { icon: Heart, text: 'Leeré personalmente tu feedback durante la beta.' },
                    ].map(({ icon: Icon, text }, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-[13px] leading-relaxed text-ink-soft">
                        <Icon size={14} className="shrink-0 mt-0.5 text-accent" />
                        <span>{text}</span>
                      </li>
                    ))}
                  </ul>

                  {/* Alias opcional */}
                  <div className="mb-5">
                    <label className="block text-[10.5px] tracking-[0.18em] uppercase text-muted mb-1.5">
                      Alias para el Garaje Fundador (opcional)
                    </label>
                    <input value={aliasInput} onChange={e => setAliasInput(e.target.value)}
                      placeholder="ej: Iván desde Almería" maxLength={32}
                      className="w-full px-3 py-2.5 rounded-lg text-[13px] outline-none bg-surface border border-line focus:border-ink transition-colors" />
                    <p className="text-[10.5px] mt-1 text-muted">
                      Puedes elegir más tarde: nombre, iniciales, alias o anónimo.
                    </p>
                  </div>

                  <button onClick={handleActivate}
                    className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full text-[14px] font-medium transition-transform hover:scale-[1.01] bg-ink text-white shadow-soft-md">
                    Entrar como Founder por 49 € <ChevronRight size={14} />
                  </button>
                  <p className="mt-3 text-center text-[10.5px] text-muted">
                    {process.env.NODE_ENV !== 'production'
                      ? 'Flujo simulado — en producción conectará con Stripe.'
                      : 'Acceso de por vida · Pago único · Sin suscripción.'}
                  </p>
                </motion.div>
              )}

              {/* ── FASE PAYMENT ── */}
              {phase === 'payment' && (
                <motion.div key="payment"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="p-10 text-center">
                  <div className="w-14 h-14 rounded-full mx-auto mb-4 bg-bg-deep flex items-center justify-center">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      className="w-7 h-7 rounded-full border-2 border-line border-t-accent" />
                  </div>
                  <h3 className="font-serif text-ink text-[22px] leading-[1.1] mb-1">Activando tu acceso…</h3>
                  <p className="text-[12.5px] text-muted">
                    {process.env.NODE_ENV !== 'production' ? 'Simulación. En producción: Stripe Checkout.' : 'Procesando…'}
                  </p>
                </motion.div>
              )}

              {/* ── FASE WELCOME ── */}
              {phase === 'welcome' && assignedNumber !== null && (
                <motion.div key="welcome"
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="p-7 lg:p-9 text-center">

                  <div className="relative w-24 h-24 mx-auto mb-5">
                    <motion.div
                      initial={{ scale: 0 }} animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 200, damping: 14 }}
                      className="w-24 h-24 rounded-2xl flex items-center justify-center bg-accent text-ink">
                      <Crown size={36} />
                    </motion.div>
                    <div className="absolute inset-0 rounded-2xl bg-accent opacity-30 blur-xl -z-10" />
                  </div>

                  <div className="text-[10.5px] tracking-[0.22em] uppercase font-semibold text-accent-deep mb-2">
                    Bienvenido a MatriculaPRO
                  </div>

                  <h2 className="font-serif text-ink leading-[1.05] tracking-tight mb-2"
                      style={{ fontSize: 'clamp(28px, 3.4vw, 38px)' }}>
                    Eres <span className="italic text-accent">Founder {formatFounderNumber(assignedNumber)}</span>
                  </h2>

                  <p className="text-[14px] leading-relaxed text-ink-soft mb-6 max-w-[440px] mx-auto">
                    Tu sitio en el Garaje Fundador está reservado. Ya puedes practicar, guardar progreso y usar todas las herramientas.
                  </p>

                  <div className="rounded-2xl p-5 mb-6 bg-bg-deep border border-line text-left">
                    <div className="text-[10.5px] tracking-[0.22em] uppercase text-accent-deep mb-2">Lo que se desbloquea</div>
                    <ul className="space-y-1.5">
                      {[
                        'Marcar pasos de la ruta como completados',
                        'Simulador 576, ficha técnica 3D, recorrido ITV completo',
                        'Casos prácticos, checklists, biblioteca y plantillas',
                        'Progreso guardado · Badge Founder en sidebar',
                      ].map((t, i) => (
                        <li key={i} className="flex items-start gap-2 text-[12.5px] text-ink-soft leading-relaxed">
                          <CheckCircle2 size={11} className="shrink-0 mt-0.5 text-accent" />
                          <span>{t}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* BOTÓN PRINCIPAL — siempre al dashboard */}
                  <button onClick={handleFinish}
                    className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full text-[14px] font-medium transition-transform hover:scale-[1.01] bg-ink text-white shadow-soft-md">
                    Ir al dashboard <ChevronRight size={14} />
                  </button>

                  <p className="mt-4 text-[10.5px] text-muted flex items-center justify-center gap-1">
                    <Mail size={10} /> Leeré personalmente tu feedback durante la beta.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
