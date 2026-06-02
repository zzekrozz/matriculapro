'use client';

import React, { useRef, useState, useMemo } from 'react';
import { motion, useSpring, useMotionValue, useTransform, AnimatePresence } from 'framer-motion';
import { RotateCcw, MousePointer2, Target, Info, CheckCircle2, XCircle, type LucideIcon } from 'lucide-react';
import { tokens } from '@/lib/tokens';
import { DEMO_VEHICLE, FIELD_POSITIONS_BACK, type Vehicle, type VehicleField } from '@/data/demo-vehicle';

export type FieldStatus = 'correct' | 'incorrect' | 'shake';

interface TechnicalCard3DProps {
  vehicle?: Vehicle;
  fieldStatus?: Record<string, FieldStatus>;
  missionField?: string | null;
  selectedField?: string | null;
  onFieldClick?: (fieldKey: string) => void;
  flipped?: boolean;
  onFlipChange?: (flipped: boolean) => void;
}

export function TechnicalCard3D({
  vehicle = DEMO_VEHICLE,
  fieldStatus = {},
  missionField = null,
  selectedField = null,
  onFieldClick,
  flipped: flippedProp,
  onFlipChange,
}: TechnicalCard3DProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [internalFlipped, setInternalFlipped] = useState(false);
  const flipped = flippedProp ?? internalFlipped;

  const toggleFlip = () => {
    const next = !flipped;
    if (flippedProp === undefined) setInternalFlipped(next);
    onFlipChange?.(next);
  };

  // Tilt con mousemove (springs)
  const rx = useSpring(0, { stiffness: 150, damping: 18 });
  const ry = useSpring(0, { stiffness: 150, damping: 18 });
  const glowX = useMotionValue(50);
  const glowY = useMotionValue(50);

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    rx.set((0.5 - y) * 10);
    ry.set((x - 0.5) * 14);
    glowX.set(x * 100);
    glowY.set(y * 100);
  };

  const handleLeave = () => {
    rx.set(0); ry.set(0);
    glowX.set(50); glowY.set(50);
  };

  const glowBg = useTransform(
    [glowX, glowY] as const,
    ([x, y]: number[]) => `radial-gradient(circle at ${x}% ${y}%, rgba(255, 251, 240, 0.55) 0%, rgba(255, 251, 240, 0.18) 25%, transparent 55%)`
  );

  const isShaking = Object.values(fieldStatus).some(s => s === 'shake');

  return (
    <div className="w-full" style={{ perspective: 1500 }}>
      <motion.div
        ref={cardRef}
        onMouseMove={handleMove}
        onMouseLeave={handleLeave}
        style={{
          rotateX: rx, rotateY: ry,
          transformStyle: 'preserve-3d',
        }}
        animate={isShaking ? { x: [0, -6, 6, -4, 4, 0] } : { x: 0 }}
        transition={isShaking ? { duration: 0.4 } : {}}
        className="relative w-full aspect-[1.55/1] max-w-[640px] mx-auto"
      >
        {/* Sombra proyectada */}
        <div className="absolute -inset-4 rounded-[32px] -z-10 blur-2xl opacity-50"
             style={{ background: 'radial-gradient(ellipse at center, rgba(11,31,58,0.25) 0%, transparent 70%)' }} />

        {/* Cara FRONTAL */}
        <motion.div
          animate={{ rotateY: flipped ? 180 : 0 }}
          transition={{ duration: 0.7, type: 'spring', stiffness: 80, damping: 14 }}
          className="absolute inset-0 rounded-[20px] overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, #FBFAF6 0%, #F4F1E8 100%)',
            border: `1px solid ${tokens.color.line}`,
            boxShadow: tokens.shadow.card3d,
            backfaceVisibility: 'hidden',
            transformStyle: 'preserve-3d',
          }}
        >
          {/* Glow dinámico */}
          <motion.div className="absolute inset-0 pointer-events-none mix-blend-overlay"
                      style={{ background: glowBg }} />

          {/* Paper texture */}
          <svg className="absolute inset-0 w-full h-full opacity-[0.18]" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="paper-texture" width="200" height="200" patternUnits="userSpaceOnUse">
                <filter id="paper-noise"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2"/></filter>
                <rect width="200" height="200" filter="url(#paper-noise)"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#paper-texture)"/>
          </svg>

          {/* Contenido frontal */}
          <div className="relative h-full p-7 flex flex-col" style={{ transform: 'translateZ(20px)' }}>
            <div className="flex items-start justify-between">
              <div>
                <div className="text-[9.5px] tracking-[0.3em] uppercase mb-1.5" style={{ color: tokens.color.muted }}>
                  Ficha técnica · Demo
                </div>
                <h3 style={{ fontFamily: 'Instrument Serif, serif', fontSize: 32, color: tokens.color.ink, letterSpacing: '-0.01em', lineHeight: 1 }}>
                  {vehicle.brand}
                </h3>
                <div className="mt-1 text-[14px]" style={{ color: tokens.color.inkSoft }}>
                  {vehicle.model}
                </div>
              </div>
              {/* Sello */}
              <div className="w-[88px] h-[88px] rounded-full flex items-center justify-center text-center"
                   style={{ border: `2px dashed ${tokens.color.accent}`, transform: 'rotate(-8deg)' }}>
                <div>
                  <div className="text-[8px] tracking-[0.2em] uppercase" style={{ color: tokens.color.accentDeep }}>Origen</div>
                  <div className="text-[12px] font-semibold mt-0.5"
                       style={{ color: tokens.color.accentDeep, fontFamily: 'Instrument Serif, serif', fontStyle: 'italic' }}>
                    {vehicle.origin}
                  </div>
                </div>
              </div>
            </div>

            {/* Datos rápidos */}
            <div className="mt-auto grid grid-cols-3 gap-4 pb-2">
              {([
                { k: 'V.7', label: 'CO₂' },
                { k: 'P.2', label: 'Potencia' },
                { k: 'B',   label: '1ª matric.' },
              ] as const).map(({ k, label }) => {
                const f = vehicle.fields[k];
                return (
                  <div key={k} className="border-t pt-2" style={{ borderColor: 'rgba(11,31,58,0.15)' }}>
                    <div className="text-[9px] font-mono tracking-wider mb-0.5" style={{ color: tokens.color.accentDeep }}>{k}</div>
                    <div className="text-[9.5px] tracking-[0.15em] uppercase mb-0.5" style={{ color: tokens.color.muted }}>{label}</div>
                    <div className="flex items-baseline gap-1">
                      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 18, color: tokens.color.ink }}>
                        {f.value}
                      </span>
                      {f.unit && <span className="text-[10px]" style={{ color: tokens.color.muted }}>{f.unit}</span>}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="absolute bottom-3 right-4 flex items-center gap-1 text-[9.5px] tracking-[0.15em] uppercase"
                 style={{ color: tokens.color.muted }}>
              <RotateCcw size={10} /> Pulsa "Girar"
            </div>
          </div>
        </motion.div>

        {/* Cara TRASERA */}
        <motion.div
          animate={{ rotateY: flipped ? 0 : -180 }}
          transition={{ duration: 0.7, type: 'spring', stiffness: 80, damping: 14 }}
          className="absolute inset-0 rounded-[20px] overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, #FEFDF9 0%, #F7F4EA 100%)',
            border: `1px solid ${tokens.color.line}`,
            boxShadow: tokens.shadow.card3d,
            backfaceVisibility: 'hidden',
            transformStyle: 'preserve-3d',
          }}
        >
          <motion.div className="absolute inset-0 pointer-events-none mix-blend-overlay"
                      style={{ background: glowBg }} />

          <svg className="absolute inset-0 w-full h-full opacity-[0.15]" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="paper-texture-b" width="200" height="200" patternUnits="userSpaceOnUse">
                <filter id="paper-noise-b"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2"/></filter>
                <rect width="200" height="200" filter="url(#paper-noise-b)"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#paper-texture-b)"/>
          </svg>

          <div className="relative h-full p-5 flex flex-col" style={{ transform: 'translateZ(20px)' }}>
            <div className="flex items-center justify-between mb-2.5 pb-2 border-b" style={{ borderColor: 'rgba(11,31,58,0.12)' }}>
              <div className="flex items-baseline gap-2">
                <div className="text-[9px] tracking-[0.25em] uppercase" style={{ color: tokens.color.muted }}>Datos técnicos</div>
                <div className="text-[9px] font-mono" style={{ color: tokens.color.accentDeep }}>· ID {vehicle.id}</div>
              </div>
              {missionField && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px]"
                  style={{ background: tokens.color.accentSoft, color: tokens.color.accentDeep }}>
                  <Target size={10} /> Misión: localiza {missionField}
                </motion.div>
              )}
            </div>

            {/* Grid de campos */}
            <div className="flex-1 grid grid-cols-2 gap-x-3 gap-y-1.5 content-start">
              {Object.entries(vehicle.fields).map(([key, data]) => {
                const pos = FIELD_POSITIONS_BACK[key];
                return (
                  <FieldCell
                    key={key}
                    fieldKey={key}
                    data={data}
                    fullWidth={pos?.col === 'full'}
                    status={fieldStatus[key]}
                    isMission={missionField === key}
                    isSelected={selectedField === key}
                    onClick={() => onFieldClick?.(key)}
                  />
                );
              })}
            </div>

            <div className="mt-2 pt-2 border-t flex items-center justify-between text-[9px] tracking-[0.15em] uppercase"
                 style={{ borderColor: 'rgba(11,31,58,0.12)', color: tokens.color.muted }}>
              <span>Ficha simulada · uso formativo</span>
              <span style={{ color: tokens.color.accentDeep }}>Ivan Imports · MatriculaPRO</span>
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Controles */}
      <div className="flex items-center justify-center gap-2 mt-5">
        <button onClick={toggleFlip}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-[12px] font-medium rounded-full transition-all hover:scale-[1.02]"
          style={{ background: tokens.color.ink, color: '#fff', boxShadow: tokens.shadow.md }}>
          <RotateCcw size={13} /> {flipped ? 'Ver frontal' : 'Girar ficha'}
        </button>
        <div className="hidden md:flex items-center gap-1.5 px-3 py-2 text-[11px] rounded-full"
             style={{ background: tokens.color.surface, border: `1px solid ${tokens.color.line}`, color: tokens.color.muted }}>
          <MousePointer2 size={11} /> Mueve el ratón para inclinar la ficha
        </div>
      </div>
    </div>
  );
}

/* ----- FIELD CELL ----- */

interface FieldCellProps {
  fieldKey: string;
  data: VehicleField;
  fullWidth: boolean;
  status?: FieldStatus;
  isMission: boolean;
  isSelected: boolean;
  onClick?: () => void;
}

function FieldCell({ fieldKey, data, fullWidth, status, isMission, isSelected, onClick }: FieldCellProps) {
  const [hovered, setHovered] = useState(false);

  const stateStyle = useMemo(() => {
    if (status === 'correct') return { bg: 'rgba(31, 122, 77, 0.10)', border: tokens.color.ok, label: tokens.color.ok };
    if (status === 'incorrect' || status === 'shake') return { bg: 'rgba(168, 52, 28, 0.08)', border: tokens.color.danger, label: tokens.color.danger };
    if (isMission) return { bg: 'rgba(200, 134, 46, 0.12)', border: tokens.color.accent, label: tokens.color.accentDeep };
    if (isSelected) return { bg: 'rgba(11, 31, 58, 0.06)', border: tokens.color.ink, label: tokens.color.ink };
    return { bg: 'transparent', border: 'transparent', label: tokens.color.accentDeep };
  }, [status, isMission, isSelected]);

  const wrapperAnim = status === 'shake'
    ? { x: [0, -3, 3, -2, 2, 0] }
    : status === 'correct'
      ? { scale: [1, 1.04, 1] }
      : { x: 0, scale: 1 };

  return (
    <motion.button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      animate={wrapperAnim}
      transition={{ duration: 0.4 }}
      className={`relative text-left px-2.5 py-1.5 rounded-md transition-colors ${fullWidth ? 'col-span-2' : ''}`}
      style={{
        background: stateStyle.bg,
        border: `1px solid ${stateStyle.border}`,
        cursor: 'pointer',
      }}
    >
      {status === 'correct' && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: [0, 0.6, 0] }}
          transition={{ duration: 1.2 }}
          className="absolute inset-0 rounded-md pointer-events-none"
          style={{ background: `radial-gradient(circle, ${tokens.color.ok}40, transparent 70%)` }}
        />
      )}

      <div className="flex items-baseline justify-between gap-2">
        <div className="flex items-baseline gap-1.5 min-w-0">
          <span className="font-mono text-[9.5px] font-semibold tracking-wider shrink-0"
                style={{ color: stateStyle.label }}>
            {fieldKey}
          </span>
          <span className="text-[9.5px] tracking-[0.08em] uppercase truncate" style={{ color: tokens.color.muted }}>
            {data.label}
          </span>
        </div>
        {status === 'correct' && <CheckCircle2 size={12} style={{ color: tokens.color.ok }} />}
        {(status === 'incorrect' || status === 'shake') && <XCircle size={12} style={{ color: tokens.color.danger }} />}
      </div>
      <div className="flex items-baseline gap-1 mt-0.5">
        <span style={{
          fontFamily: data.mono ? 'JetBrains Mono, monospace' : 'Geist, sans-serif',
          fontSize: 13,
          color: tokens.color.ink,
          fontWeight: 500
        }}>
          {data.value}
        </span>
        {data.unit && <span className="text-[10px]" style={{ color: tokens.color.muted }}>{data.unit}</span>}
      </div>

      {/* Tooltip */}
      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.15 }}
            className="absolute z-30 left-1/2 -translate-x-1/2 bottom-full mb-2 w-[220px] p-2.5 rounded-lg pointer-events-none"
            style={{ background: tokens.color.ink, color: '#fff', boxShadow: tokens.shadow.lg }}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <Info size={10} style={{ color: tokens.color.accent }} />
              <span className="text-[10px] font-mono tracking-wider" style={{ color: tokens.color.accent }}>{fieldKey}</span>
            </div>
            <div className="text-[11px] leading-snug" style={{ color: '#E4E9F2' }}>
              {data.hint}
            </div>
            <div className="absolute left-1/2 -translate-x-1/2 -bottom-1 w-2 h-2 rotate-45"
                 style={{ background: tokens.color.ink }} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  );
}

export default TechnicalCard3D;
