'use client';

import { useState } from 'react';
import { Heart, ChevronRight } from 'lucide-react';
import { FeedbackModal } from '@/components/founder/FeedbackModal';

export function FeedbackCard({ variant = 'card' }: { variant?: 'card' | 'inline' }) {
  const [open, setOpen] = useState(false);

  if (variant === 'inline') {
    return (
      <>
        <button onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-[12px] font-medium transition-colors bg-bg-deep text-ink-soft hover:bg-line">
          <Heart size={12} /> Enviar feedback
        </button>
        <FeedbackModal open={open} onClose={() => setOpen(false)} />
      </>
    );
  }

  return (
    <>
      <button onClick={() => setOpen(true)}
        className="w-full text-left rounded-2xl p-5 bg-surface border border-line hover:border-accent hover:shadow-soft-md transition-all group">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-accent-soft text-accent-deep">
            <Heart size={16} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[10.5px] tracking-[0.22em] uppercase mb-1 text-accent-deep">
              Ayuda a mejorar MatriculaPRO
            </div>
            <h3 className="text-[14.5px] font-medium text-ink leading-tight mb-1">
              Leeré personalmente tu feedback
            </h3>
            <p className="text-[12px] leading-relaxed text-ink-soft">
              Durante la beta priorizo las mejoras según lo que cuenten los primeros usuarios.
            </p>
            <div className="mt-3 inline-flex items-center gap-1 text-[11.5px] font-medium text-ink group-hover:text-accent transition-colors">
              Enviar idea o problema <ChevronRight size={12} />
            </div>
          </div>
        </div>
      </button>
      <FeedbackModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
