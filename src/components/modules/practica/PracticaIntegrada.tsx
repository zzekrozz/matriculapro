'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, Target, X, Lock, AlertTriangle } from 'lucide-react';
import { tokens } from '@/lib/tokens';
import { TechnicalCard3D, type FieldStatus } from '@/components/modules/ficha/TechnicalCard3D';
import { Simulator576 } from '@/components/modules/simulador/Simulator576';
import { DEMO_VEHICLE, DEMO_ACTIVE_FIELDS } from '@/data/demo-vehicle';

/**
 * Pantalla que combina la ficha técnica 3D y el simulador 576.
 * Integración bidireccional:
 *  - Al enfocar un campo en el simulador, se resalta en la ficha (selectedField).
 *  - Al comprobar el simulador, los estados (correct/incorrect/shake) se propagan a la ficha.
 *  - Al activar "Modo misión" desde el simulador, el campo objetivo se marca en la ficha.
 *  - Al pulsar un campo en la ficha, se muestra la explicación del campo.
 */
export function PracticaIntegrada() {
  const [fieldStatus, setFieldStatus] = useState<Record<string, FieldStatus>>({});
  const [selectedField, setSelectedField] = useState<string | null>(null);
  const [missionField, setMissionField] = useState<string | null>(null);

  // Sólo propagar a la ficha los estados de los campos activos en demo
  const cardFieldStatus = useMemo(() => {
    const out: Record<string, FieldStatus> = {};
    DEMO_ACTIVE_FIELDS.forEach(k => {
      if (fieldStatus[k]) out[k] = fieldStatus[k];
    });
    return out;
  }, [fieldStatus]);

  const selectedFieldData = selectedField ? DEMO_VEHICLE.fields[selectedField] : null;
  const isSelectedLocked = selectedField ? !(DEMO_ACTIVE_FIELDS as readonly string[]).includes(selectedField) : false;

  return (
    <div className="px-5 lg:px-8 pt-6 pb-12 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="mb-7 flex items-end justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10.5px] font-mono tracking-wider" style={{ color: tokens.color.muted }}>M.02 · M.03</span>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[10.5px] font-medium tracking-[0.04em] uppercase rounded-full"
                  style={{ color: tokens.color.accentDeep, background: tokens.color.accentSoft }}>
              <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: tokens.color.accent }} />
              Práctica integrada
            </span>
          </div>
          <h1 style={{ fontFamily: 'Instrument Serif, serif', fontSize: 'clamp(32px, 3.5vw, 46px)', color: tokens.color.ink, letterSpacing: '-0.01em', lineHeight: 1 }}>
            Ficha técnica <span style={{ fontStyle: 'italic', color: tokens.color.accent }}>×</span> Modelo 576
          </h1>
          <p className="mt-3 max-w-[640px] text-[14px] leading-relaxed" style={{ color: tokens.color.inkSoft }}>
            Aprende a leer una ficha técnica y a rellenar el Modelo 576. Mueve el ratón sobre la ficha, gírala, pulsa los campos para entender qué significa cada uno y luego copia los datos al formulario.
          </p>
        </div>

        {missionField && (
          <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-2 px-3 py-2 rounded-lg"
            style={{ background: tokens.color.accentSoft, color: tokens.color.accentDeep, border: `1px solid ${tokens.color.accent}` }}>
            <Target size={13} />
            <div className="text-[11.5px]">
              Misión activa: <strong className="font-mono">{missionField}</strong>
            </div>
            <button onClick={() => setMissionField(null)} aria-label="Cancelar misión"
              className="ml-1" style={{ color: tokens.color.accentDeep }}>
              <X size={12} />
            </button>
          </motion.div>
        )}
      </div>

      {/* Layout 2 columnas */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.05fr_1fr] gap-6 items-start">
        {/* IZQUIERDA: ficha */}
        <div className="rounded-[20px] p-6 lg:p-8"
             style={{ background: tokens.color.surface, border: `1px solid ${tokens.color.line}`, boxShadow: tokens.shadow.md }}>
          <div className="flex items-center justify-between mb-5">
            <div>
              <div className="text-[10.5px] font-mono tracking-wider mb-1" style={{ color: tokens.color.muted }}>M.03 · Ficha técnica</div>
              <h2 style={{ fontFamily: 'Instrument Serif, serif', fontSize: 22, color: tokens.color.ink, letterSpacing: '-0.01em' }}>
                Documento interactivo
              </h2>
            </div>
            <div className="hidden md:flex items-center gap-1.5 text-[10.5px]" style={{ color: tokens.color.muted }}>
              <Eye size={11} /> Pulsa cualquier campo
            </div>
          </div>

          <TechnicalCard3D
            vehicle={DEMO_VEHICLE}
            fieldStatus={cardFieldStatus}
            missionField={missionField}
            selectedField={selectedField}
            onFieldClick={(k) => {
              setSelectedField(k);
              if (missionField === k) {
                // Misión cumplida
                setTimeout(() => setMissionField(null), 800);
              }
            }}
          />

          {/* Selected field info */}
          <AnimatePresence mode="wait">
            {selectedField && selectedFieldData && (
              <motion.div
                key={selectedField}
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}
                className="mt-6 rounded-xl p-4"
                style={{ background: tokens.color.bgDeep, border: `1px solid ${tokens.color.line}` }}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="font-mono text-[11px] font-semibold px-1.5 py-0.5 rounded"
                        style={{ background: tokens.color.accent, color: tokens.color.ink }}>
                    {selectedField}
                  </span>
                  <span className="text-[12px] font-medium" style={{ color: tokens.color.ink }}>
                    {selectedFieldData.label}
                  </span>
                  <button onClick={() => setSelectedField(null)} aria-label="Cerrar"
                          className="ml-auto">
                    <X size={12} style={{ color: tokens.color.muted }} />
                  </button>
                </div>
                <p className="text-[12.5px] leading-relaxed" style={{ color: tokens.color.inkSoft }}>
                  {selectedFieldData.hint}
                </p>
                {isSelectedLocked && (
                  <div className="mt-2.5 flex items-center gap-1.5 text-[10.5px]" style={{ color: tokens.color.accentDeep }}>
                    <Lock size={10} /> Este campo está bloqueado en la demo del simulador.
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* DERECHA: simulador */}
        <Simulator576
          onFieldFocus={setSelectedField}
          onFieldStatusChange={setFieldStatus}
          onMission={(k) => setMissionField(k)}
        />
      </div>

      {/* Aviso legal */}
      <div className="mt-6 rounded-xl p-4 flex items-start gap-3 text-[11.5px] leading-relaxed"
           style={{ background: tokens.color.warnSoft, color: tokens.color.warn, border: `1px solid ${tokens.color.accentSoft}` }}>
        <AlertTriangle size={14} className="shrink-0 mt-0.5" />
        <span>Simulador educativo. No calcula el impuesto real. No sustituye la presentación oficial del Modelo 576 ante la Agencia Tributaria.</span>
      </div>
    </div>
  );
}

export default PracticaIntegrada;
