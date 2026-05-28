'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FlaskConical, ChevronUp, X, Sparkles } from 'lucide-react';
import { useAccess, type AccessLevel, formatFounderNumber } from '@/providers/AccessProvider';

const LEVELS: { value: AccessLevel; label: string; description: string }[] = [
  { value: 'visitor',  label: 'Visitante',   description: 'Solo landing pública' },
  { value: 'explorer', label: 'Explorer',    description: 'App con acceso limitado' },
  { value: 'founder',  label: 'Founder',     description: 'Beta de pago 49€' },
  { value: 'full',     label: 'Full',        description: 'Producto completo (futuro)' },
];

export function DevModeSwitcher() {
  const [open, setOpen] = useState(false);
  const { level, setLevel, founderNumber, activateFounder, reset } = useAccess();

  return (
    <div className="fixed bottom-4 left-4 z-[60] pointer-events-none">
      <div className="pointer-events-auto">
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.96 }}
              transition={{ duration: 0.2 }}
              className="mb-2 rounded-2xl p-4 w-[280px] bg-surface border border-line shadow-soft-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <FlaskConical size={14} className="text-accent-deep" />
                  <span className="text-[10.5px] tracking-[0.18em] uppercase font-semibold text-accent-deep">Dev mode</span>
                </div>
                <button onClick={() => setOpen(false)} aria-label="Cerrar" className="text-muted hover:text-ink">
                  <X size={14} />
                </button>
              </div>
              <p className="text-[11px] leading-relaxed text-ink-soft mb-3">
                Cambia el nivel de acceso para probar la UX. <strong>No es pago real</strong>, todo es local. Se quitará cuando conectemos auth.
              </p>

              <div className="space-y-1.5 mb-3">
                {LEVELS.map(lv => {
                  const isActive = level === lv.value;
                  return (
                    <button key={lv.value}
                      onClick={() => {
                        if (lv.value === 'founder' && !founderNumber) {
                          activateFounder();
                        } else {
                          setLevel(lv.value);
                        }
                      }}
                      className="w-full text-left rounded-lg p-2.5 transition-colors border"
                      style={{
                        background: isActive ? 'var(--color-ink)' : 'var(--color-surface)',
                        color: isActive ? '#fff' : 'var(--color-ink)',
                        borderColor: isActive ? 'var(--color-ink)' : 'var(--color-line)',
                      }}>
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <div className="text-[12px] font-medium leading-tight">{lv.label}</div>
                          <div className="text-[10.5px] mt-0.5"
                               style={{ color: isActive ? '#B4BECE' : 'var(--color-muted)' }}>
                            {lv.description}
                          </div>
                        </div>
                        {isActive && <Sparkles size={11} className="text-accent shrink-0" />}
                      </div>
                    </button>
                  );
                })}
              </div>

              {level === 'founder' && founderNumber && (
                <div className="text-[10.5px] mb-2 px-2.5 py-1.5 rounded-md bg-accent-soft text-accent-deep">
                  Founder activo: {formatFounderNumber(founderNumber)}
                </div>
              )}

              <button onClick={reset}
                className="w-full text-[10.5px] py-1.5 rounded-md text-muted hover:text-ink hover:bg-bg-deep transition-colors">
                Reset (volver a visitor)
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <button onClick={() => setOpen(o => !o)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10.5px] font-medium transition-all hover:scale-[1.03]"
          style={{
            background: 'rgba(11, 31, 58, 0.92)',
            color: '#fff',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(200, 134, 46, 0.4)',
            boxShadow: '0 8px 20px rgba(11, 31, 58, 0.15)',
          }}>
          <FlaskConical size={11} className="text-accent" />
          Dev mode · {level}
          <ChevronUp size={11} className="text-muted-soft" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
        </button>
      </div>
    </div>
  );
}
