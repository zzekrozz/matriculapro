'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Heart, Check, ExternalLink } from 'lucide-react';
import { useAccess, formatFounderNumber } from '@/providers/AccessProvider';

const FEEDBACK_EMAIL = 'feedback@ivanimports.es';

interface FeedbackModalProps {
  open: boolean;
  onClose: () => void;
}

export function FeedbackModal({ open, onClose }: FeedbackModalProps) {
  const [text, setText] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const { founderNumber } = useAccess();

  const handleSend = () => {
    const subject = encodeURIComponent(
      `Feedback MatriculaPRO ${founderNumber !== null ? '· Founder ' + formatFounderNumber(founderNumber) : ''}`
    );
    const body = encodeURIComponent(text || '(escribe aquí tu feedback)');
    window.location.href = `mailto:${FEEDBACK_EMAIL}?subject=${subject}&body=${body}`;
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setText('');
      onClose();
    }, 2400);
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
                    Ayuda a mejorar MatriculaPRO
                  </div>
                  <h2 className="font-serif text-ink leading-[1.1] tracking-tight" style={{ fontSize: 22 }}>
                    Leo todo lo que llega.
                  </h2>
                </div>
              </div>
              <button onClick={onClose} aria-label="Cerrar"
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-bg-deep transition-colors">
                <X size={14} className="text-muted" />
              </button>
            </div>

            <p className="text-[13px] leading-relaxed text-ink-soft mb-5">
              Durante la beta leeré personalmente el feedback de los primeros usuarios para priorizar mejoras reales. Cuenta lo que se te ocurra: algo que te ha confundido, una pieza que falta, un error que has encontrado o una idea para mejorar.
            </p>

            {!submitted ? (
              <>
                <textarea
                  value={text}
                  onChange={e => setText(e.target.value)}
                  placeholder="Cuéntame qué te ha pasado, qué has echado en falta o qué se podría mejorar…"
                  rows={6}
                  className="w-full px-4 py-3 rounded-xl text-[13px] outline-none bg-bg-deep border border-line focus:border-ink transition-colors resize-none"
                />

                {founderNumber !== null && (
                  <div className="mt-3 text-[10.5px] text-muted flex items-center gap-1.5">
                    Se enviará identificado como <strong className="font-mono text-ink">Founder {formatFounderNumber(founderNumber)}</strong>.
                  </div>
                )}

                <div className="mt-5 flex items-center justify-between gap-2 flex-wrap">
                  <p className="text-[10.5px] text-muted">
                    Abre tu cliente de email · {FEEDBACK_EMAIL}
                  </p>
                  <button onClick={handleSend} disabled={!text.trim()}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-[12.5px] font-medium transition-transform hover:scale-[1.02] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 bg-ink text-white shadow-soft-md">
                    <Send size={13} /> Enviar feedback <ExternalLink size={11} />
                  </button>
                </div>
              </>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="rounded-xl p-5 text-center bg-ok-soft border border-ok"
                style={{ color: 'var(--color-ok)' }}>
                <Check size={24} className="mx-auto mb-2" />
                <div className="text-[14px] font-medium">Tu cliente de email se ha abierto</div>
                <p className="text-[12px] mt-1 leading-relaxed opacity-80">
                  Revisa el borrador y envíalo cuando estés listo.
                </p>
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
