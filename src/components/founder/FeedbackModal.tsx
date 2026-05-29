'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Heart, Check, Crown, Lock, Loader2 } from 'lucide-react';
import { useAccess, formatFounderNumber } from '@/providers/AccessProvider';
import { useAuth } from '@/providers/AuthProvider';
import { useFounderModal } from '@/providers/FounderModalProvider';

interface FeedbackModalProps {
  open: boolean;
  onClose: () => void;
}

export function FeedbackModal({ open, onClose }: FeedbackModalProps) {
  const { isFounder, founderNumber, level } = useAccess();
  const { user } = useAuth();
  const { openFounderModal } = useFounderModal();
  const [text, setText] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSend = async () => {
    if (!text.trim() || text.trim().length < 5) return;
    setStatus('loading');
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text.trim(),
          founderNumber: founderNumber ?? undefined,
          userEmail: user?.email ?? undefined,
          accessLevel: level,
        }),
      });
      if (!res.ok) throw new Error('Error de servidor');
      setStatus('ok');
      setTimeout(() => {
        setText('');
        setStatus('idle');
        onClose();
      }, 2200);
    } catch {
      setStatus('error');
      setErrorMsg('No se pudo enviar. Inténtalo de nuevo más tarde.');
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-[70] flex items-center justify-center p-4"
          style={{ background: 'rgba(11, 31, 58, 0.7)', backdropFilter: 'blur(6px)' }}>

          <motion.div
            initial={{ scale: 0.95, y: 16, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.96, opacity: 0 }}
            transition={{ duration: 0.22 }}
            onClick={e => e.stopPropagation()}
            className="bg-surface rounded-[20px] max-w-[560px] w-full shadow-soft-xl border border-line p-7 lg:p-8">

            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-accent text-ink">
                  <Heart size={16} />
                </div>
                <div>
                  <div className="text-[10.5px] tracking-[0.22em] uppercase font-semibold text-accent-deep">
                    Feedback Founder
                  </div>
                  <h2 className="font-serif text-ink leading-[1.1] tracking-tight" style={{ fontSize: 22 }}>
                    Enviar idea o problema
                  </h2>
                </div>
              </div>
              <button onClick={onClose} aria-label="Cerrar"
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-bg-deep transition-colors">
                <X size={14} className="text-muted" />
              </button>
            </div>

            {/* Solo Founders pueden enviar */}
            {!isFounder ? (
              <div className="rounded-xl p-5 text-center bg-bg-deep border border-line">
                <Lock size={22} className="text-muted mx-auto mb-2" />
                <p className="text-[13px] text-ink-soft mb-3">
                  El feedback directo está disponible para Founders. Accede como Founder para enviar ideas y reportar problemas.
                </p>
                <button onClick={() => { onClose(); openFounderModal(); }}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-[12.5px] font-medium bg-ink text-white hover:scale-[1.02] transition-transform">
                  <Crown size={13} className="text-accent" /> Activar acceso Founder · 49 €
                </button>
              </div>
            ) : status === 'ok' ? (
              <motion.div
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="rounded-xl p-5 text-center bg-ok-soft border border-ok">
                <Check size={24} className="text-ok mx-auto mb-2" />
                <div className="text-[14px] font-medium text-ok">¡Gracias!</div>
                <p className="text-[12px] mt-1 text-ok leading-relaxed">
                  He recibido tu feedback. Lo leeré personalmente.
                </p>
              </motion.div>
            ) : (
              <>
                <p className="text-[13px] leading-relaxed text-ink-soft mb-5">
                  Lo leeré personalmente durante la beta para priorizar mejoras reales.
                  {founderNumber && (
                    <span className="ml-1 font-mono text-[12px] text-accent-deep">
                      Enviando como Founder {formatFounderNumber(founderNumber)}.
                    </span>
                  )}
                </p>

                <textarea
                  value={text}
                  onChange={e => setText(e.target.value)}
                  placeholder="Cuéntame qué has encontrado, qué falta o qué se podría mejorar…"
                  rows={5}
                  disabled={status === 'loading'}
                  className="w-full px-4 py-3 rounded-xl text-[13px] outline-none bg-bg-deep border border-line focus:border-ink transition-colors resize-none"
                />

                {status === 'error' && (
                  <p className="mt-2 text-[11.5px] text-danger">{errorMsg}</p>
                )}

                <div className="mt-4 flex items-center justify-end">
                  <button
                    onClick={handleSend}
                    disabled={!text.trim() || status === 'loading'}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-[12.5px] font-medium transition-transform hover:scale-[1.02] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 bg-ink text-white shadow-soft-md">
                    {status === 'loading'
                      ? <><Loader2 size={13} className="animate-spin" /> Enviando…</>
                      : <><Heart size={13} /> Enviar feedback</>}
                  </button>
                </div>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
