'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RefreshCw, Lock, CheckCircle2, XCircle, AlertTriangle, Check, Crosshair, Info
} from 'lucide-react';
import { tokens } from '@/lib/tokens';
import {
  DEMO_VEHICLE, DEMO_ACTIVE_FIELDS, SIM_FIELDS, type SimField as SimFieldDef
} from '@/data/demo-vehicle';

export type FieldStatus = 'correct' | 'incorrect' | 'shake';

interface Simulator576Props {
  /** Notifica al padre el campo enfocado (para resaltar en la ficha) */
  onFieldFocus?: (fieldKey: string | null) => void;
  /** Notifica al padre los estados de los campos (correct/incorrect/shake) */
  onFieldStatusChange?: (status: Record<string, FieldStatus>) => void;
  /** Notifica al padre que se ha activado modo misión */
  onMission?: (fieldKey: string) => void;
  /** Si true, oculta el header (útil cuando va dentro de Práctica integrada) */
  hideHeader?: boolean;
}

export function Simulator576({
  onFieldFocus,
  onFieldStatusChange,
  onMission,
  hideHeader = false,
}: Simulator576Props) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<Record<string, FieldStatus>>({});
  const [hasChecked, setHasChecked] = useState(false);

  const setVal = (k: string, v: string) => {
    setValues(prev => ({ ...prev, [k]: v }));
    if (status[k]) {
      const next = { ...status };
      delete next[k];
      setStatus(next);
      onFieldStatusChange?.(next);
    }
  };

  const check = () => {
    const next: Record<string, FieldStatus> = {};
    DEMO_ACTIVE_FIELDS.forEach(k => {
      const expected = String(DEMO_VEHICLE.fields[k].value).trim().toLowerCase();
      const got = String(values[k] ?? '').trim().toLowerCase();
      next[k] = got === expected ? 'correct' : 'shake';
    });
    setStatus(next);
    setHasChecked(true);
    onFieldStatusChange?.(next);
    // Tras shake → incorrect estable
    setTimeout(() => {
      setStatus(prev => {
        const stable: Record<string, FieldStatus> = { ...prev };
        Object.keys(stable).forEach(k => {
          if (stable[k] === 'shake') stable[k] = 'incorrect';
        });
        onFieldStatusChange?.(stable);
        return stable;
      });
    }, 600);
  };

  const reset = () => {
    setValues({});
    setStatus({});
    setHasChecked(false);
    onFieldStatusChange?.({});
  };

  const score = useMemo(() => {
    const correct = DEMO_ACTIVE_FIELDS.filter(k => status[k] === 'correct').length;
    return { correct, total: DEMO_ACTIVE_FIELDS.length };
  }, [status]);

  const allCorrect = score.correct === score.total && hasChecked;

  return (
    <div className="rounded-[20px] overflow-hidden flex flex-col h-full"
         style={{ background: tokens.color.surface, border: `1px solid ${tokens.color.line}`, boxShadow: tokens.shadow.md }}>
      {/* Header */}
      {!hideHeader && (
        <div className="px-6 pt-5 pb-4 border-b" style={{ borderColor: tokens.color.line }}>
          <div className="flex items-start justify-between mb-2">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-mono tracking-wider" style={{ color: tokens.color.muted }}>M.02 · DEMO</span>
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[10.5px] font-medium tracking-[0.04em] uppercase rounded-full"
                      style={{ color: tokens.color.accentDeep, background: tokens.color.accentSoft }}>
                  <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: tokens.color.accent }} />
                  Modo demo
                </span>
              </div>
              <h2 style={{ fontFamily: 'Instrument Serif, serif', fontSize: 26, color: tokens.color.ink, letterSpacing: '-0.01em', lineHeight: 1.1 }}>
                Simulador Modelo 576
              </h2>
            </div>
            <button onClick={reset}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] rounded-md transition-colors hover:bg-line-soft"
              style={{ background: tokens.color.bgDeep, color: tokens.color.inkSoft }}>
              <RefreshCw size={11} /> Reiniciar
            </button>
          </div>
          <p className="text-[12.5px] leading-relaxed" style={{ color: tokens.color.inkSoft }}>
            En la demo sólo están activos <strong>3 campos</strong>: bastidor (E), fecha 1ª matriculación (B) y CO₂ (V.7).
            Copia los datos desde la ficha técnica.
          </p>
        </div>
      )}

      {/* Body: fields */}
      <div className="flex-1 px-6 py-5 space-y-2.5 overflow-y-auto">
        {SIM_FIELDS.map(f => (
          <SimField
            key={f.key}
            field={f}
            value={values[f.key] ?? ''}
            status={status[f.key]}
            expectedHint={hasChecked && status[f.key] === 'incorrect' ? DEMO_VEHICLE.fields[f.key]?.value : null}
            onChange={(v) => setVal(f.key, v)}
            onFocus={() => onFieldFocus?.(f.key)}
            onBlur={() => onFieldFocus?.(null)}
          />
        ))}

        {/* CTA bloqueada */}
        <div className="mt-3 rounded-xl p-3.5 flex items-start gap-3"
             style={{ background: tokens.color.bgDeep, border: `1px dashed ${tokens.color.line}` }}>
          <Lock size={14} className="shrink-0 mt-0.5" style={{ color: tokens.color.muted }} />
          <div className="text-[11.5px] leading-relaxed" style={{ color: tokens.color.inkSoft }}>
            <strong style={{ color: tokens.color.ink }}>Con acceso Founder Beta</strong> podrás practicar con fichas aleatorias, casos por dificultad (fácil, medio, alerta) y corrección paso a paso de los 10 campos.
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t flex flex-col gap-3" style={{ borderColor: tokens.color.line }}>
        <AnimatePresence>
          {hasChecked && (
            <motion.div
              initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="rounded-lg p-3 flex items-center gap-3"
              style={{
                background: allCorrect ? tokens.color.okSoft : tokens.color.warnSoft,
                color: allCorrect ? tokens.color.ok : tokens.color.warn,
              }}>
              {allCorrect ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
              <div className="text-[12.5px]">
                <strong>{score.correct}/{score.total}</strong> campos correctos.{' '}
                {allCorrect
                  ? '¡Perfecto! Has localizado los 3 campos clave de la demo.'
                  : 'Revisa la ficha y corrige los campos resaltados en rojo.'}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <button onClick={check}
          className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-[13px] font-medium transition-transform hover:scale-[1.01]"
          style={{ background: tokens.color.ink, color: '#fff', boxShadow: tokens.shadow.md }}>
          <Check size={15} /> Comprobar práctica
        </button>

        <div className="flex items-center justify-between text-[10.5px]" style={{ color: tokens.color.muted }}>
          <button onClick={() => onMission?.('V.7')}
            className="inline-flex items-center gap-1.5 hover:underline"
            style={{ color: tokens.color.accentDeep }}>
            <Crosshair size={11} /> Modo misión: localiza V.7
          </button>
          <span>Demo · 3/10 campos activos</span>
        </div>
      </div>
    </div>
  );
}

/* ----- SimField ----- */

interface SimFieldProps {
  field: SimFieldDef;
  value: string;
  status?: FieldStatus;
  expectedHint: string | null;
  onChange: (v: string) => void;
  onFocus: () => void;
  onBlur: () => void;
}

function SimField({ field, value, status, expectedHint, onChange, onFocus, onBlur }: SimFieldProps) {
  const isLocked = field.locked;
  const borderColor = isLocked
    ? tokens.color.line
    : status === 'correct' ? tokens.color.ok
    : status === 'incorrect' || status === 'shake' ? tokens.color.danger
    : tokens.color.line;
  const bgColor = isLocked
    ? tokens.color.bgDeep
    : status === 'correct' ? 'rgba(31, 122, 77, 0.05)'
    : status === 'incorrect' || status === 'shake' ? 'rgba(168, 52, 28, 0.04)'
    : tokens.color.surface;

  const codeLabelColor = isLocked
    ? tokens.color.mutedSoft
    : status === 'correct' ? tokens.color.ok
    : status === 'incorrect' || status === 'shake' ? tokens.color.danger
    : tokens.color.accentDeep;

  return (
    <motion.div
      animate={status === 'shake' ? { x: [0, -5, 5, -3, 3, 0] } : { x: 0 }}
      transition={{ duration: 0.4 }}
      className="relative"
    >
      <div className="flex items-center justify-between mb-1">
        <label className="flex items-baseline gap-1.5 text-[11px]"
               style={{ color: isLocked ? tokens.color.mutedSoft : tokens.color.inkSoft }}>
          <span className="font-mono font-semibold text-[10px]" style={{ color: codeLabelColor }}>
            {field.key.length <= 4 ? field.key : ''}
          </span>
          <span>{field.label}</span>
        </label>
        {isLocked && <Lock size={10} style={{ color: tokens.color.mutedSoft }} />}
        {status === 'correct' && <CheckCircle2 size={12} style={{ color: tokens.color.ok }} />}
        {(status === 'incorrect' || status === 'shake') && <XCircle size={12} style={{ color: tokens.color.danger }} />}
      </div>
      <div className="relative">
        <input
          type={field.type === 'number' ? 'text' : field.type}
          value={value}
          placeholder={field.placeholder}
          disabled={isLocked}
          onChange={e => onChange(e.target.value)}
          onFocus={onFocus}
          onBlur={onBlur}
          className="w-full px-3 py-2 rounded-lg text-[13px] outline-none transition-colors"
          style={{
            background: bgColor,
            border: `1px solid ${borderColor}`,
            color: isLocked ? tokens.color.mutedSoft : tokens.color.ink,
            fontFamily: field.mono ? 'JetBrains Mono, monospace' : 'Geist, sans-serif',
          }}
        />
        {field.unit && !isLocked && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10.5px]"
                style={{ color: tokens.color.muted }}>
            {field.unit}
          </span>
        )}

        {status === 'correct' && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: [0, 0.5, 0] }} transition={{ duration: 1 }}
            className="absolute inset-0 rounded-lg pointer-events-none"
            style={{ boxShadow: `0 0 0 4px ${tokens.color.ok}20` }} />
        )}
      </div>

      {status === 'incorrect' && expectedHint && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
          className="mt-1 text-[10.5px] flex items-center gap-1.5"
          style={{ color: tokens.color.danger }}>
          <Info size={10} /> Valor esperado en la ficha: <span className="font-mono font-medium">{expectedHint}</span>
        </motion.div>
      )}
    </motion.div>
  );
}

export default Simulator576;
