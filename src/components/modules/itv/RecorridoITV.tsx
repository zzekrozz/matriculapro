'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Car, ChevronLeft, ChevronRight, FileText, ScrollText, ShieldCheck, Volume2,
  Lightbulb, ChevronsLeftRight, Disc, Gauge, Wind, Flag, Lock, Pause, Play,
  CheckCircle2, AlertTriangle, GraduationCap, Crown, type LucideIcon
} from 'lucide-react';
import { tokens } from '@/lib/tokens';
import { ITV_STEPS as ITV_STEPS_DATA } from '@/data/itv-steps';
import type { ITVStep } from '@/lib/types';

/* ============================================================
   RECORRIDO ITV · Maqueta didáctica integrada
   ============================================================ */

// Mapa de nombres de icono (strings desde data) a componentes lucide
const ICON_MAP: Record<string, LucideIcon> = {
  FileText, ScrollText, ShieldCheck, Volume2, Lightbulb,
  ChevronsLeftRight, Disc, Gauge, Wind, Flag, Car,
};

interface ITVStepRuntime extends ITVStep {
  iconComponent: LucideIcon;
}

const ITV_STEPS: ITVStepRuntime[] = ITV_STEPS_DATA.map(s => ({
  ...s,
  iconComponent: ICON_MAP[s.icon] ?? FileText,
}));


/* ============================================================
   GARAGE SVG — con etiquetas, luces visibles, medidor de frenos
   ============================================================ */

interface ITVGarageProps {
  activeZones?: string[];
  labels?: Record<string, string>;
  stepId: string;
  brakeMeterPhase?: BrakePhase;
  onZoneClick?: (zoneId: string) => void;
  hoveredZone: string | null;
  setHoveredZone: (zoneId: string | null) => void;
}

type FrontLightsMode = 'on' | 'all' | null;
type RearLightsMode = 'on' | null;
type BrakePhase = 'idle' | 'accel' | 'hold' | 'brake';

const ITVGarage: React.FC<ITVGarageProps> = ({ activeZones = [], labels = {}, stepId, onZoneClick, hoveredZone, setHoveredZone }) => {
  const isActive = (id: string) => activeZones.includes(id);
  const isHovered = (id: string) => hoveredZone === id;
  const accent = tokens.color.accent;
  const accentDeep = tokens.color.accentDeep;

  // ¿Qué luces específicas están activas?
  const frontLightsMode: FrontLightsMode = isActive('lights-front-active') ? (stepId === 'lights-front' ? 'all' : 'on') : null;
  const rearLightsMode: RearLightsMode = isActive('lights-rear-active') ? 'on' : null;

  return (
    <svg viewBox="0 0 800 500" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <defs>
        <linearGradient id="wall" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#E8ECF3" />
          <stop offset="1" stopColor="#CFD7E3" />
        </linearGradient>
        <linearGradient id="floor" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#C5CDDA" />
          <stop offset="1" stopColor="#8893AB" />
        </linearGradient>
        <linearGradient id="body-side" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#FAFBFD" />
          <stop offset="1" stopColor="#C9D2E0" />
        </linearGradient>
        <linearGradient id="body-top" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="1" stopColor="#E1E6EF" />
        </linearGradient>
        <linearGradient id="windshield" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#1A2A40" />
          <stop offset="1" stopColor="#2A4063" />
        </linearGradient>
        <linearGradient id="door-window" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#3A4F6F" />
          <stop offset="1" stopColor="#2A3F58" />
        </linearGradient>
        <linearGradient id="tire" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#2C2F36" />
          <stop offset="1" stopColor="#15171C" />
        </linearGradient>
        <radialGradient id="rim">
          <stop offset="0" stopColor="#9AA3B5" />
          <stop offset="0.6" stopColor="#6E7889" />
          <stop offset="1" stopColor="#4A5466" />
        </radialGradient>
        <radialGradient id="hl-bulb">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="40%" stopColor="#FFF2A8" />
          <stop offset="100%" stopColor="#FFD86A" />
        </radialGradient>
        <radialGradient id="tail-bulb">
          <stop offset="0%" stopColor="#FFEAE0" />
          <stop offset="50%" stopColor="#FF8060" />
          <stop offset="100%" stopColor="#C8331A" />
        </radialGradient>
        <radialGradient id="amber-pulse">
          <stop offset="0%" stopColor={accent} stopOpacity="0.4" />
          <stop offset="100%" stopColor={accent} stopOpacity="0" />
        </radialGradient>
        <filter id="soft-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="3" />
          <feOffset dx="0" dy="3" result="o" />
          <feComponentTransfer><feFuncA type="linear" slope="0.25" /></feComponentTransfer>
          <feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <pattern id="roller-pattern" x="0" y="0" width="14" height="14" patternUnits="userSpaceOnUse">
          <rect width="14" height="14" fill="#2C2F36" />
          <circle cx="7" cy="7" r="3" fill="#4A5466" />
        </pattern>
      </defs>

      {/* PARED */}
      <rect x="0" y="0" width="800" height="320" fill="url(#wall)" />
      <g opacity="0.4">
        {[60, 120, 180, 240].map(y => <line key={y} x1="0" y1={y} x2="800" y2={y} stroke="#B4BECE" strokeWidth="0.5" strokeDasharray="2 4" />)}
      </g>

      {/* Cartel */}
      <g transform="translate(60, 40)">
        <rect x="0" y="0" width="180" height="56" fill={tokens.color.ink} rx="6" filter="url(#soft-shadow)" />
        <rect x="6" y="6" width="168" height="44" fill="none" stroke={accent} strokeWidth="1.5" rx="3" strokeDasharray="3 3" />
        <text x="90" y="24" textAnchor="middle" fill="#7A869A" fontSize="9" fontFamily="Geist, sans-serif" letterSpacing="2">ESTACIÓN ITV</text>
        <text x="90" y="44" textAnchor="middle" fill="#fff" fontSize="18" fontFamily="Instrument Serif, serif" fontStyle="italic">Línea 03</text>
      </g>

      {/* Panel de pruebas / pantalla */}
      <g transform="translate(680, 80)">
        <rect x="0" y="0" width="90" height="120" fill="#1A2230" rx="4" filter="url(#soft-shadow)" />
        <rect x="4" y="4" width="82" height="60" fill="#0F1620" rx="2" />
        <line x1="10" y1="14" x2="60" y2="14" stroke={isActive('rollers') || isActive('gas-probe') ? accent : "#3A4F6F"} strokeWidth="1.5" />
        <line x1="10" y1="22" x2="50" y2="22" stroke="#3A4F6F" strokeWidth="1" />
        <line x1="10" y1="30" x2="65" y2="30" stroke={isActive('rollers') ? accent : "#3A4F6F"} strokeWidth="1.5" />
        <line x1="10" y1="38" x2="45" y2="38" stroke="#3A4F6F" strokeWidth="1" />
        <line x1="10" y1="46" x2="58" y2="46" stroke={isActive('rollers') || isActive('gas-probe') ? accent : "#3A4F6F"} strokeWidth="1.5" />
        {(isActive('rollers') || isActive('gas-probe')) && (
          <circle cx="78" cy="12" r="2.5" fill={accent}>
            <animate attributeName="opacity" values="1;0.3;1" dur="1s" repeatCount="indefinite" />
          </circle>
        )}
        {[78, 92, 106].map((y, i) => <circle key={i} cx="20" cy={y} r="4" fill="#2A3F58" />)}
        {[78, 92, 106].map((y, i) => <circle key={i} cx="40" cy={y} r="4" fill="#2A3F58" />)}
        <rect x="55" y="74" width="28" height="38" fill="#2A3F58" rx="2" />
      </g>

      {/* SUELO */}
      <rect x="0" y="320" width="800" height="180" fill="url(#floor)" />
      <line x1="0" y1="340" x2="800" y2="340" stroke="#D4A33E" strokeWidth="2" strokeDasharray="14 8" opacity="0.85" />
      <line x1="0" y1="470" x2="800" y2="470" stroke="#D4A33E" strokeWidth="2" strokeDasharray="14 8" opacity="0.7" />

      {/* FOSO */}
      <g opacity={isActive('rollers') ? 1 : 0.5}>
        <polygon points="180,380 620,380 600,420 200,420" fill="#1A2230" />
        <polygon points="180,380 620,380 615,388 185,388" fill="#0F1620" />
      </g>

      {/* RODILLOS */}
      <AnimateGroup show={isActive('rollers')}>
        <g transform="translate(260, 388)">
          <rect x="0" y="0" width="56" height="20" fill="url(#roller-pattern)" rx="2" />
          <rect x="0" y="0" width="56" height="20" fill="none" stroke={accent} strokeWidth="1.5" rx="2" />
        </g>
        <g transform="translate(484, 388)">
          <rect x="0" y="0" width="56" height="20" fill="url(#roller-pattern)" rx="2" />
          <rect x="0" y="0" width="56" height="20" fill="none" stroke={accent} strokeWidth="1.5" rx="2" />
        </g>
      </AnimateGroup>

      {/* PROYECCIÓN LUCES DELANTERAS EN SUELO */}
      {frontLightsMode && (
        <>
          <ellipse cx="620" cy="385" rx="100" ry="14" fill="#FFF2A8" opacity="0.35">
            <animate attributeName="opacity" values="0.25;0.45;0.25" dur="2.4s" repeatCount="indefinite" />
          </ellipse>
          <ellipse cx="620" cy="385" rx="70" ry="10" fill="#FFFFFF" opacity="0.3" />
        </>
      )}

      {/* PROYECCIÓN LUCES TRASERAS EN SUELO (rojo tenue) */}
      {rearLightsMode && (
        <ellipse cx="170" cy="395" rx="50" ry="10" fill="#FF8060" opacity="0.3">
          <animate attributeName="opacity" values="0.2;0.4;0.2" dur="2s" repeatCount="indefinite" />
        </ellipse>
      )}

      {/* ============ COCHE ============ */}
      <g transform="translate(200, 230)">
        <ellipse cx="200" cy="195" rx="200" ry="14" fill="rgba(11,31,58,0.22)" />

        {/* RUEDA TRASERA IZQUIERDA */}
        <Wheel x={80} y={170} radius={28} id="wheel-rl"
               isActive={isActive('wheel-rl')} isHovered={isHovered('wheel-rl')}
               onClick={() => onZoneClick?.('wheel-rl')}
               onHover={() => setHoveredZone?.('wheel-rl')} onLeave={() => setHoveredZone?.(null)} />

        {/* Cuerpo */}
        <path d="M 30 130 L 30 165 L 60 175 L 350 175 L 380 165 L 380 130 Z"
              fill="url(#body-side)" stroke="#A8B2C2" strokeWidth="1.5" />
        <path d="M 70 130 L 95 75 Q 110 55 145 50 L 290 50 Q 320 50 340 80 L 365 130 Z"
              fill="url(#body-top)" stroke="#A8B2C2" strokeWidth="1.5" />

        {/* Parabrisas */}
        <path d="M 105 100 Q 120 70 150 65 L 220 65 L 215 105 Z"
              fill="url(#windshield)" stroke="#0B1F3A" strokeWidth="1" opacity="0.95" />

        {/* VIN visible */}
        {(isActive('vin-plate') || isActive('windshield')) && (
          <g>
            <rect x="155" y="100" width="50" height="14" fill={accent} rx="2"
                  style={{ animation: 'pulseSoft 1.5s infinite' }} />
            <text x="180" y="111" textAnchor="middle" fill={tokens.color.ink} fontSize="9"
                  fontFamily="JetBrains Mono, monospace" fontWeight="700">VIN</text>
          </g>
        )}

        {/* Ventanillas laterales */}
        <path d="M 220 65 L 290 65 Q 315 65 335 90 L 345 125 L 220 110 Z"
              fill="url(#door-window)" stroke="#0B1F3A" strokeWidth="1" opacity="0.92" />
        <line x1="270" y1="65" x2="282" y2="120" stroke="#A8B2C2" strokeWidth="2" />

        {/* Volante / interior */}
        <SteeringWheel x={175} y={120}
          isActive={isActive('steering-wheel') || isActive('interior') || isActive('horn')}
          isHorn={isActive('horn')} isSteering={isActive('steering-wheel')} />

        {/* Cinturón */}
        {isActive('belt') && (
          <motion.path initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
            transition={{ duration: 1, repeat: Infinity, repeatType: 'reverse' }}
            d="M 240 75 L 260 110" stroke={accent} strokeWidth="3" strokeLinecap="round" fill="none" />
        )}

        {/* Manijas */}
        <rect x="180" y="148" width="14" height="3" fill="#7A869A" rx="1" />
        <rect x="305" y="148" width="14" height="3" fill="#7A869A" rx="1" />

        {/* === FARO DELANTERO === */}
        <FaroDelantero x={365} y={135} mode={frontLightsMode}
          isHovered={isHovered('headlight-l')}
          onClick={() => onZoneClick?.('headlight-l')}
          onHover={() => setHoveredZone?.('headlight-l')} onLeave={() => setHoveredZone?.(null)} />

        {/* === INTERMITENTE DELANTERO === */}
        {frontLightsMode === 'all' && (
          <motion.circle cx={360} cy={155} r="5" fill="#FFB938"
            animate={{ opacity: [0.2, 1, 0.2] }} transition={{ duration: 0.7, repeat: Infinity }} />
        )}

        {/* Rejilla */}
        <rect x="345" y="138" width="22" height="20" fill="#1A2230" rx="2" />
        {[140, 144, 148, 152, 156].map(y => (
          <line key={y} x1="347" y1={y} x2="365" y2={y} stroke="#3A4F6F" strokeWidth="0.5" />
        ))}

        {/* Matrícula */}
        <g onClick={() => onZoneClick?.('plate')}
           onMouseEnter={() => setHoveredZone?.('plate')}
           onMouseLeave={() => setHoveredZone?.(null)}
           style={{ cursor: 'pointer' }}>
          <rect x="320" y="163" width="38" height="10" fill="#FFFFFF"
                stroke={isActive('plate-light') ? accent : "#A8B2C2"}
                strokeWidth={isActive('plate-light') ? 2 : 1} rx="1.5" />
          <text x="339" y="171" textAnchor="middle" fontSize="8"
                fontFamily="JetBrains Mono, monospace" fontWeight="700" fill={tokens.color.ink}>0000 ABC</text>
          {isActive('plate-light') && (
            <>
              <ellipse cx="339" cy="168" rx="24" ry="9" fill="#FFF2A8" opacity="0.55">
                <animate attributeName="opacity" values="0.35;0.7;0.35" dur="1.5s" repeatCount="indefinite" />
              </ellipse>
              <ellipse cx="339" cy="168" rx="22" ry="6" fill="#FFFFFF" opacity="0.4" />
            </>
          )}
        </g>

        {/* RUEDA DELANTERA */}
        <Wheel x={320} y={170} radius={28} id="wheel-fr"
               isActive={isActive('wheel-fr')} isHovered={isHovered('wheel-fr')}
               onClick={() => onZoneClick?.('wheel-fr')}
               onHover={() => setHoveredZone?.('wheel-fr')} onLeave={() => setHoveredZone?.(null)} />
      </g>

      {/* PILOTO TRASERO */}
      <PilotoTrasero x={168} y={358} mode={rearLightsMode}
        showReverse={rearLightsMode === 'on' && stepId === 'lights-rear'} />

      {/* ESCAPE */}
      <g transform="translate(220, 405)"
         onClick={() => onZoneClick?.('exhaust')}
         onMouseEnter={() => setHoveredZone?.('exhaust')}
         onMouseLeave={() => setHoveredZone?.(null)}
         style={{ cursor: 'pointer' }}>
        <rect x="-12" y="-3" width="24" height="6" rx="2"
              fill={isActive('exhaust') ? accent : "#5A6170"}
              stroke={isActive('exhaust') ? accentDeep : "#3A3F4A"} strokeWidth="1.5" />
        {isActive('gas-probe') && (
          <g>
            <rect x="-25" y="-1" width="14" height="3" fill={accent} />
            <circle cx="-30" cy="0.5" r="3" fill={tokens.color.ink} />
            <motion.line x1="-30" y1="0.5" x2="-60" y2="-20"
              stroke={accent} strokeWidth="2"
              animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 1, repeat: Infinity }} />
          </g>
        )}
        {isActive('exhaust') && (
          <>
            <motion.circle cx="-15" cy="0" r="4" fill="#9AA3B5" opacity="0.6"
              animate={{ cx: [-15, -45], cy: [0, -15], opacity: [0.6, 0] }}
              transition={{ duration: 2.5, repeat: Infinity }} />
            <motion.circle cx="-18" cy="2" r="3" fill="#9AA3B5" opacity="0.5"
              animate={{ cx: [-18, -50], cy: [2, -10], opacity: [0.5, 0] }}
              transition={{ duration: 2.5, repeat: Infinity, delay: 0.8 }} />
          </>
        )}
      </g>

      {/* VENTANILLA */}
      <g transform="translate(260, 100)">
        <DocsCounter active={isActive('docs-zone')} />
      </g>

      {/* SELLO RESULTADO */}
      {isActive('result-stamp') && (
        <motion.g initial={{ scale: 0, rotate: -25, opacity: 0 }}
          animate={{ scale: 1, rotate: -10, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 14 }}
          transform="translate(610, 210)">
          <rect x="-55" y="-25" width="110" height="50" rx="6"
                fill="none" stroke={tokens.color.ok} strokeWidth="3" strokeDasharray="3 2" />
          <text x="0" y="-2" textAnchor="middle" fontSize="9"
                fontFamily="Geist, sans-serif" letterSpacing="2"
                fill={tokens.color.ok} fontWeight="700">RESULTADO</text>
          <text x="0" y="16" textAnchor="middle" fontSize="16"
                fontFamily="Instrument Serif, serif" fontStyle="italic"
                fill={tokens.color.ok} fontWeight="700">Favorable</text>
        </motion.g>
      )}

      {/* ============ ETIQUETAS FLOTANTES ============ */}
      <ZoneLabels activeZones={activeZones} labels={labels} stepId={stepId} />

      <style>{`
        @keyframes pulseSoft {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.65; }
        }
      `}</style>
    </svg>
  );
};

/* ============================================================
   COMPONENTES SVG SECUNDARIOS
   ============================================================ */

interface ZoneLabelsProps {
  activeZones: string[];
  labels: Record<string, string>;
  stepId: string;
}

interface ZonePosition {
  x: number;
  y: number;
  lineTo: { x: number; y: number };
}

const ZoneLabels: React.FC<ZoneLabelsProps> = ({ activeZones, labels }) => {
  // Posiciones (x, y) sobre el SVG (viewBox 800x500) — apuntan a la zona y muestran etiqueta
  const positions: Record<string, ZonePosition> = {
    'docs-zone':      { x: 350, y: 90, lineTo: { x: 350, y: 130 } },
    'vin-plate':      { x: 460, y: 220, lineTo: { x: 380, y: 340 } },
    'belt':           { x: 540, y: 210, lineTo: { x: 460, y: 320 } },
    'horn':           { x: 250, y: 220, lineTo: { x: 365, y: 345 } },
    'headlight-l':    { x: 660, y: 330, lineTo: { x: 565, y: 365 } },
    'taillight-l':    { x: 110, y: 330, lineTo: { x: 168, y: 358 } },
    'plate-light':    { x: 580, y: 425, lineTo: { x: 540, y: 395 } },
    'steering-wheel': { x: 240, y: 215, lineTo: { x: 375, y: 350 } },
    'wheel-fl':       { x: 540, y: 460, lineTo: { x: 520, y: 400 } },
    'rollers':        { x: 250, y: 470, lineTo: { x: 290, y: 410 } },
    'exhaust':        { x: 380, y: 470, lineTo: { x: 420, y: 405 } },
    'result-stamp':   { x: 660, y: 280, lineTo: { x: 610, y: 220 } },
  };

  const visible = Object.keys(labels).filter(k => activeZones.includes(k) && positions[k]);

  return (
    <g>
      {visible.map(zoneId => {
        const pos = positions[zoneId];
        const text = labels[zoneId];
        return (
          <motion.g key={zoneId}
            initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}>
            {/* Línea conectora dashed */}
            <line x1={pos.x} y1={pos.y} x2={pos.lineTo.x} y2={pos.lineTo.y}
              stroke={tokens.color.accent} strokeWidth="1.5" strokeDasharray="3 3" opacity="0.7" />
            {/* Punto en el extremo */}
            <circle cx={pos.lineTo.x} cy={pos.lineTo.y} r="3" fill={tokens.color.accent} />
            {/* Etiqueta */}
            <g transform={`translate(${pos.x}, ${pos.y})`}>
              <rect
                x={-text.length * 3.2 - 8} y={-10} width={text.length * 6.4 + 16} height={20}
                rx="10" fill={tokens.color.accent} filter="url(#soft-shadow)" />
              <text x="0" y="3" textAnchor="middle" fontSize="9.5"
                fontFamily="Geist, sans-serif" fontWeight="700" letterSpacing="1"
                fill={tokens.color.ink}>{text}</text>
            </g>
          </motion.g>
        );
      })}
    </g>
  );
};

/* Faro delantero detallado */
interface FaroDelanteroProps {
  x: number;
  y: number;
  mode: FrontLightsMode;
  isHovered: boolean;
  onClick?: () => void;
  onHover?: () => void;
  onLeave?: () => void;
}

const FaroDelantero: React.FC<FaroDelanteroProps> = ({ x, y, mode, isHovered, onClick, onHover, onLeave }) => {
  const isOn = mode === 'on' || mode === 'all';
  return (
    <g onClick={onClick} onMouseEnter={onHover} onMouseLeave={onLeave}
       style={{ cursor: onClick ? 'pointer' : 'default' }}>
      {/* Carcasa */}
      <ellipse cx={x} cy={y} rx="14" ry="9"
        fill={isOn ? '#FFFEEB' : '#E1E6EF'}
        stroke={isOn ? tokens.color.accentDeep : '#A8B2C2'} strokeWidth="2" />
      {/* Reflector */}
      <ellipse cx={x - 1} cy={y - 1} rx="9" ry="6"
        fill={isOn ? 'url(#hl-bulb)' : '#F4F6FA'}
        stroke={isOn ? '#FFE08A' : '#CFD7E3'} strokeWidth="0.5" />
      {/* Bombilla */}
      <circle cx={x - 2} cy={y - 1} r="2.5" fill={isOn ? '#FFFFFF' : '#9AA3B5'} />
      {/* Halo pulsante */}
      {isOn && (
        <ellipse cx={x} cy={y} rx="14" ry="9" fill="#FFF2A8" opacity="0.5">
          <animate attributeName="opacity" values="0.3;0.7;0.3" dur="1.6s" repeatCount="indefinite" />
        </ellipse>
      )}
      {/* Haces de luz */}
      {isOn && (
        <>
          <path d={`M ${x + 12} ${y - 5} L ${x + 90} ${y - 30} L ${x + 90} ${y + 30} L ${x + 12} ${y + 5} Z`}
            fill="#FFF2A8" opacity="0.25" />
          <path d={`M ${x + 12} ${y - 3} L ${x + 70} ${y - 18} L ${x + 70} ${y + 18} L ${x + 12} ${y + 3} Z`}
            fill="#FFFFFF" opacity="0.35" />
        </>
      )}
      {/* Hover */}
      {isHovered && !isOn && (
        <ellipse cx={x} cy={y} rx="17" ry="12" fill="none" stroke={tokens.color.accent}
          strokeWidth="1.5" strokeDasharray="3 3" opacity="0.6" />
      )}
    </g>
  );
};

/* Piloto trasero detallado */
interface PilotoTraseroProps {
  x: number;
  y: number;
  mode: RearLightsMode;
  showReverse?: boolean;
}

const PilotoTrasero: React.FC<PilotoTraseroProps> = ({ x, y, mode, showReverse }) => {
  const isOn = mode === 'on';
  return (
    <g transform={`translate(${x}, ${y})`}>
      {/* Carcasa */}
      <ellipse cx="0" cy="0" rx="11" ry="16"
        fill={isOn ? 'url(#tail-bulb)' : '#A8331E'}
        stroke="#7A1D10" strokeWidth="1.5" />
      {/* División del piloto */}
      <line x1="-10" y1="0" x2="10" y2="0" stroke="#7A1D10" strokeWidth="0.8" />
      {/* Brillo del freno */}
      {isOn && (
        <ellipse cx="0" cy="-5" rx="6" ry="3" fill="#FFEAE0" opacity="0.8" />
      )}
      {/* Marcha atrás (blanco) */}
      {showReverse && (
        <motion.g animate={{ opacity: [0.6, 1, 0.6] }} transition={{ duration: 1.2, repeat: Infinity }}>
          <ellipse cx="0" cy="10" rx="5" ry="3" fill="#FFFFFF" />
          <ellipse cx="0" cy="10" rx="8" ry="4" fill="#FFFFFF" opacity="0.4" />
        </motion.g>
      )}
      {/* Halo */}
      {isOn && (
        <ellipse cx="0" cy="0" rx="14" ry="20" fill="#FF8060" opacity="0.4">
          <animate attributeName="opacity" values="0.25;0.5;0.25" dur="1.5s" repeatCount="indefinite" />
        </ellipse>
      )}
    </g>
  );
};

interface WheelProps {
  x: number;
  y: number;
  radius?: number;
  id?: string;
  isActive: boolean;
  isHovered: boolean;
  onClick?: () => void;
  onHover?: () => void;
  onLeave?: () => void;
}

const Wheel: React.FC<WheelProps> = ({ x, y, radius = 28, isActive, isHovered, onClick, onHover, onLeave }) => (
  <g onClick={onClick} onMouseEnter={onHover} onMouseLeave={onLeave}
     style={{ cursor: onClick ? 'pointer' : 'default' }}>
    {isActive && (
      <circle cx={x} cy={y} r={radius + 8} fill="url(#amber-pulse)">
        <animate attributeName="r" values={`${radius + 4};${radius + 12};${radius + 4}`} dur="1.8s" repeatCount="indefinite" />
      </circle>
    )}
    {isHovered && !isActive && (
      <circle cx={x} cy={y} r={radius + 4} fill="none" stroke={tokens.color.accent}
        strokeWidth="1.5" opacity="0.5" strokeDasharray="3 3" />
    )}
    <circle cx={x} cy={y} r={radius} fill="url(#tire)" stroke="#0A0C10" strokeWidth="2" />
    <circle cx={x} cy={y} r={radius - 4} fill="none" stroke="#3A3F4A" strokeWidth="0.5" />
    <circle cx={x} cy={y} r={radius - 8} fill="none" stroke="#3A3F4A" strokeWidth="0.5" />
    <circle cx={x} cy={y} r={radius - 11} fill="url(#rim)" stroke="#3A3F4A" strokeWidth="0.8" />
    {[0, 72, 144, 216, 288].map(angle => {
      const rad = (angle * Math.PI) / 180;
      const x1 = x + Math.cos(rad) * 5, y1 = y + Math.sin(rad) * 5;
      const x2 = x + Math.cos(rad) * (radius - 13), y2 = y + Math.sin(rad) * (radius - 13);
      return <line key={angle} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#4A5466" strokeWidth="2.5" strokeLinecap="round" />;
    })}
    <circle cx={x} cy={y} r="4" fill="#2C2F36" />
    {isActive && <circle cx={x} cy={y} r={radius + 2} fill="none" stroke={tokens.color.accent} strokeWidth="2.5" />}
  </g>
);

interface SteeringWheelProps {
  x: number;
  y: number;
  isActive: boolean;
  isHorn: boolean;
  isSteering: boolean;
}

const SteeringWheel: React.FC<SteeringWheelProps> = ({ x, y, isActive, isHorn, isSteering }) => (
  <g>
    {isActive && (
      <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
        <motion.g
          animate={isSteering ? { rotate: [0, -25, 25, -15, 15, 0] } : { rotate: 0 }}
          transition={isSteering ? { duration: 3, repeat: Infinity, ease: 'easeInOut' } : {}}
          style={{ transformOrigin: `${x}px ${y}px`, transformBox: 'view-box' }}>
          <circle cx={x} cy={y} r="10" fill="none" stroke="#0B1F3A" strokeWidth="2.5" />
          <line x1={x - 9} y1={y} x2={x + 9} y2={y} stroke="#0B1F3A" strokeWidth="2" />
          <line x1={x} y1={y} x2={x} y2={y + 9} stroke="#0B1F3A" strokeWidth="2" />
          <circle cx={x} cy={y} r="3" fill={isHorn ? tokens.color.accent : '#0B1F3A'}>
            {isHorn && <animate attributeName="r" values="3;5;3" dur="0.4s" repeatCount="indefinite" />}
          </circle>
        </motion.g>
        {isHorn && (
          <>
            <motion.circle cx={x} cy={y} r="14" fill="none" stroke={tokens.color.accent} strokeWidth="2"
              animate={{ r: [12, 22, 12], opacity: [0.8, 0, 0.8] }}
              transition={{ duration: 0.8, repeat: Infinity }} />
            <motion.circle cx={x} cy={y} r="16" fill="none" stroke={tokens.color.accent} strokeWidth="1.5"
              animate={{ r: [14, 26, 14], opacity: [0.5, 0, 0.5] }}
              transition={{ duration: 0.8, repeat: Infinity, delay: 0.2 }} />
          </>
        )}
      </motion.g>
    )}
  </g>
);

const DocsCounter: React.FC<{ active: boolean }> = ({ active }) => (
  <g>
    <rect x="0" y="0" width="180" height="80" fill="#FFFFFF"
      stroke={active ? tokens.color.accent : '#A8B2C2'}
      strokeWidth={active ? 2 : 1.5} rx="4" filter="url(#soft-shadow)" />
    <rect x="6" y="6" width="168" height="22" fill="#0B1F3A" rx="2" />
    <text x="90" y="20" textAnchor="middle" fill="#FFFFFF" fontSize="9"
      fontFamily="Geist, sans-serif" letterSpacing="2" fontWeight="600">VENTANILLA · DOCUMENTACIÓN</text>
    <g transform="translate(20, 36)">
      {[0, 1, 2].map(i => (
        <g key={i} transform={`translate(${i * 12}, ${-i * 2})`}>
          <rect x="0" y="0" width="36" height="44" fill="#FFFFFF" stroke="#A8B2C2" strokeWidth="1" rx="2" filter="url(#soft-shadow)" />
          {[8, 14, 20, 26, 32, 38].map(yy => (
            <line key={yy} x1="4" y1={yy} x2={yy < 12 ? 32 : 28} y2={yy} stroke={yy < 12 ? "#7A869A" : "#B4BECE"} strokeWidth={yy < 12 ? 1 : 0.8} />
          ))}
        </g>
      ))}
    </g>
    {active && (
      <motion.g initial={{ x: 80, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ duration: 0.6 }}
        transform="translate(110, 42)">
        <path d="M 0 0 Q 10 -6 28 -2 L 40 4 L 40 18 L 10 18 Z" fill="#E8B894" stroke="#9C7256" strokeWidth="1" />
        <ellipse cx="6" cy="-2" rx="4" ry="6" fill="#E8B894" stroke="#9C7256" strokeWidth="1" />
      </motion.g>
    )}
    {active && (
      <rect x="0" y="0" width="180" height="80" fill="none" stroke={tokens.color.accent} strokeWidth="2" rx="4">
        <animate attributeName="stroke-opacity" values="1;0.3;1" dur="1.5s" repeatCount="indefinite" />
      </rect>
    )}
  </g>
);

const AnimateGroup: React.FC<{ show: boolean; children: React.ReactNode }> = ({ show, children }) => (
  <AnimatePresence>
    {show && (
      <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
        {children}
      </motion.g>
    )}
  </AnimatePresence>
);

/* ============================================================
   MEDIDOR DE FRENOS (aguja + zona amarilla)
   ============================================================ */

const BrakeMeter: React.FC<{ phase?: BrakePhase }> = ({ phase = 'idle' }) => {
  // phase: 'idle' | 'accel' | 'hold' | 'brake'
  const angles: Record<BrakePhase, number> = { idle: -85, accel: -35, hold: -20, brake: 70 };
  const targetAngle = angles[phase];

  return (
    <div className="rounded-2xl p-5"
         style={{ background: 'linear-gradient(135deg, #0B1F3A 0%, #16335E 100%)', color: '#fff', boxShadow: tokens.shadow.md }}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-[9.5px] tracking-[0.22em] uppercase mb-0.5" style={{ color: '#7A869A' }}>Medidor de frenos</div>
          <div className="text-[13px] font-medium" style={{ color: '#fff' }}>Fuerza aplicada</div>
        </div>
        <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px]"
             style={{
               background: phase === 'brake' ? tokens.color.danger
                         : phase === 'hold'  ? tokens.color.accent
                         : phase === 'accel' ? 'rgba(31, 122, 77, 0.8)'
                         : 'rgba(255,255,255,0.1)',
               color: '#fff', fontWeight: 600
             }}>
          {phase === 'brake' ? 'FRENA' : phase === 'hold' ? 'MANTÉN' : phase === 'accel' ? 'ACELERA' : 'EN ESPERA'}
        </div>
      </div>

      {/* Velocímetro */}
      <div className="relative aspect-[2/1] flex items-end justify-center">
        <svg viewBox="0 0 200 110" className="w-full">
          <defs>
            <linearGradient id="meter-arc" x1="0" x2="1">
              <stop offset="0" stopColor="#1F7A4D" />
              <stop offset="0.45" stopColor="#1F7A4D" />
              <stop offset="0.55" stopColor="#C8862E" />
              <stop offset="0.75" stopColor="#C8862E" />
              <stop offset="0.85" stopColor="#A8341C" />
              <stop offset="1" stopColor="#A8341C" />
            </linearGradient>
          </defs>

          {/* Arco gris de fondo */}
          <path d="M 20 100 A 80 80 0 0 1 180 100"
                fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="18" strokeLinecap="round" />

          {/* Arco con gradiente */}
          <path d="M 20 100 A 80 80 0 0 1 180 100"
                fill="none" stroke="url(#meter-arc)" strokeWidth="18" strokeLinecap="round" opacity="0.85" />

          {/* Marcas tick */}
          {Array.from({ length: 11 }).map((_, i) => {
            const angle = -90 + (i / 10) * 180;
            const rad = (angle * Math.PI) / 180;
            const x1 = 100 + Math.cos(rad) * 64, y1 = 100 + Math.sin(rad) * 64;
            const x2 = 100 + Math.cos(rad) * 70, y2 = 100 + Math.sin(rad) * 70;
            return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#fff" strokeWidth="1" opacity="0.5" />;
          })}

          {/* Zona "MANTÉN" amarilla destacada — calculada sobre el arco real */}
          {(() => {
            // Arco va de -90° (izquierda) a +90° (derecha). Zona amarilla: 0.55-0.75 normalizada
            // que en ángulos del arco (180°) corresponde a ángulos 9° a 45° desde el norte
            const r = 80;
            const innerR = 64;
            const outerR = 90;
            const angleStart = (-90 + 0.55 * 180) * Math.PI / 180; // 9° desde el norte
            const angleEnd = (-90 + 0.75 * 180) * Math.PI / 180;   // 45° desde el norte
            // Convertir a coordenadas SVG (centro 100,100), donde rotación va desde -90 (arriba) a 90 (derecha)
            // El arco está en la parte superior, así que: x = 100 + r*sin(angle), y = 100 - r*cos(angle)
            const x1 = 100 + innerR * Math.sin(angleStart);
            const y1 = 100 - innerR * Math.cos(angleStart);
            const x2 = 100 + outerR * Math.sin(angleStart);
            const y2 = 100 - outerR * Math.cos(angleStart);
            const x3 = 100 + outerR * Math.sin(angleEnd);
            const y3 = 100 - outerR * Math.cos(angleEnd);
            const x4 = 100 + innerR * Math.sin(angleEnd);
            const y4 = 100 - innerR * Math.cos(angleEnd);
            // Posición del label ZONA en el centro de la zona, fuera del arco
            const angleMid = (angleStart + angleEnd) / 2;
            const labelX = 100 + (outerR + 10) * Math.sin(angleMid);
            const labelY = 100 - (outerR + 10) * Math.cos(angleMid);
            return (
              <>
                <path
                  d={`M ${x1} ${y1} L ${x2} ${y2} A ${outerR} ${outerR} 0 0 1 ${x3} ${y3} L ${x4} ${y4} A ${innerR} ${innerR} 0 0 0 ${x1} ${y1} Z`}
                  fill={tokens.color.accent} opacity={phase === 'hold' ? 0.55 : 0.22}
                />
                <text x={labelX} y={labelY} textAnchor="middle" fill={tokens.color.accent} fontSize="7"
                      fontFamily="Geist, sans-serif" fontWeight="700" letterSpacing="1.5">ZONA</text>
              </>
            );
          })()}

          {/* Aguja — rotada desde un grupo para que el origin funcione en SVG */}
          <motion.g
            style={{ transformOrigin: '100px 100px', transformBox: 'view-box' }}
            animate={{ rotate: targetAngle }}
            transition={{ type: 'spring', stiffness: 60, damping: 12 }}
          >
            <line x1="100" y1="100" x2="100" y2="32" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
          </motion.g>
          <circle cx="100" cy="100" r="7" fill={tokens.color.accent} stroke="#fff" strokeWidth="2" />

          {/* Labels */}
          <text x="20" y="105" fontSize="9" fill="#7A869A" fontFamily="Geist, sans-serif">0</text>
          <text x="100" y="108" textAnchor="middle" fontSize="7" fill="#fff" fontFamily="JetBrains Mono, monospace" fontWeight="600" opacity="0.6">kN</text>
          <text x="178" y="105" fontSize="9" fill="#7A869A" fontFamily="Geist, sans-serif">MAX</text>
        </svg>
      </div>

      {/* Instrucciones */}
      <div className="mt-4 grid grid-cols-3 gap-2 text-[10.5px]">
        <div className="flex items-center gap-1.5">
          <div className={`w-2 h-2 rounded-full transition-all ${phase === 'accel' ? 'scale-150' : 'opacity-30'}`} style={{ background: '#3FB97A' }} />
          <span style={{ color: phase === 'accel' ? '#fff' : '#7A869A' }}>1. Acelera</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className={`w-2 h-2 rounded-full transition-all ${phase === 'hold' ? 'scale-150' : 'opacity-30'}`} style={{ background: tokens.color.accent }} />
          <span style={{ color: phase === 'hold' ? '#fff' : '#7A869A' }}>2. Mantén</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className={`w-2 h-2 rounded-full transition-all ${phase === 'brake' ? 'scale-150' : 'opacity-30'}`} style={{ background: '#E84A2C' }} />
          <span style={{ color: phase === 'brake' ? '#fff' : '#7A869A' }}>3. Frena</span>
        </div>
      </div>
    </div>
  );
};

/* ============================================================
   PANTALLA COMPLETA
   ============================================================ */

interface RecorridoITVProps {
  onBack?: () => void;
}

const RecorridoITVScreen: React.FC<RecorridoITVProps> = ({ onBack }) => {
  const [stepIdx, setStepIdx] = useState(0);
  const [autoPlay, setAutoPlay] = useState(false);
  const [hoveredZone, setHoveredZone] = useState<string | null>(null);
  const [brakePhase, setBrakePhase] = useState<BrakePhase>('idle');
  const [showNoviceBanner, setShowNoviceBanner] = useState(true);
  const [showMobileDetails, setShowMobileDetails] = useState(false);
  const visibleSteps = useMemo(() => ITV_STEPS, []);
  const step = visibleSteps[stepIdx];
  const isLast = stepIdx === visibleSteps.length - 1;
  const StepIcon = step.iconComponent;

  const next = useCallback(() => setStepIdx(i => Math.min(i + 1, visibleSteps.length - 1)), [visibleSteps.length]);
  const prev = () => setStepIdx(i => Math.max(i - 1, 0));

  // Animación del medidor de frenos en el paso 9
  useEffect(() => {
    if (!step.showBrakeMeter) { setBrakePhase('idle'); return; }
    const sequence: BrakePhase[] = ['idle', 'accel', 'hold', 'hold', 'brake', 'idle'];
    let i = 0;
    setBrakePhase(sequence[0]);
    const interval = setInterval(() => {
      i = (i + 1) % sequence.length;
      setBrakePhase(sequence[i]);
    }, 2200);
    return () => clearInterval(interval);
  }, [step.id, step.showBrakeMeter]);

  useEffect(() => {
    if (!autoPlay) return;
    if (isLast) { setAutoPlay(false); return; }
    const t = setTimeout(() => next(), 5000);
    return () => clearTimeout(t);
  }, [autoPlay, stepIdx, isLast, next]);

  useEffect(() => {
    setShowMobileDetails(false);
  }, [step.id]);

  return (
    <div className="min-h-screen overflow-x-hidden" style={{ background: tokens.color.bg, fontFamily: 'Geist, system-ui, sans-serif' }}>
      <div className="px-4 sm:px-5 lg:px-8 pt-6 pb-12 max-w-[1400px] mx-auto">
        {onBack && (
          <button onClick={onBack} className="mb-4 inline-flex items-center gap-2 text-[12.5px]" style={{ color: tokens.color.muted }}>
            <ChevronLeft size={14} /> Volver al centro de control
          </button>
        )}

        {/* Header */}
        <div className="mb-5 flex items-end justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10.5px] font-mono tracking-wider" style={{ color: tokens.color.muted }}>M.06</span>
            </div>
            <h1 style={{ fontFamily: 'Instrument Serif, serif', fontSize: 'clamp(32px, 3.6vw, 48px)', color: tokens.color.ink, letterSpacing: '-0.01em', lineHeight: 1 }}>
              Recorrido <span style={{ fontStyle: 'italic', color: tokens.color.accent }}>ITV</span> interactivo
            </h1>
            <p className="mt-3 max-w-[640px] text-[14px] leading-relaxed" style={{ color: tokens.color.inkSoft }}>
              Te llevamos por la línea de inspección paso a paso. En cada paso te decimos qué te piden, qué tienes que hacer y qué revisar antes de ir.
            </p>
          </div>
        </div>

        {/* BANNER MODO NOVATO */}
        <AnimatePresence>
          {showNoviceBanner && (
            <motion.div
              initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              className="mb-5 rounded-2xl p-4 flex items-start gap-3"
              style={{
                background: 'linear-gradient(135deg, #F5E9D4 0%, #FBEAD0 100%)',
                border: `1px solid ${tokens.color.accent}`,
              }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: tokens.color.accent, color: tokens.color.ink }}>
                <GraduationCap size={18} />
              </div>
              <div className="flex-1">
                <div className="text-[10.5px] tracking-[0.22em] uppercase mb-1" style={{ color: tokens.color.accentDeep }}>
                  Modo principiante · Lee esto antes
                </div>
                <p className="text-[12.5px] leading-relaxed" style={{ color: tokens.color.accentDeep }}>
                  Esto no es una ITV real exacta. Es una <strong>simulación guiada</strong> para que entiendas qué pueden pedirte y llegues con menos miedo el día de la inspección. Cada estación tiene sus tiempos y sus matices, pero la mecánica es esta.
                </p>
              </div>
              <button onClick={() => setShowNoviceBanner(false)} className="shrink-0 text-[11px]" style={{ color: tokens.color.accentDeep }}>
                Entendido
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Layout principal */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-4 sm:gap-6 items-start">

          {/* ESCENARIO */}
          <div className="space-y-4">
            <div className="rounded-[20px] overflow-hidden" style={{ background: tokens.color.surface, border: `1px solid ${tokens.color.line}`, boxShadow: tokens.shadow.md }}>
              <div className="px-4 sm:px-5 py-3 border-b flex items-center justify-between gap-3" style={{ borderColor: tokens.color.line, background: tokens.color.surfaceAlt }}>
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: tokens.color.bgDeep, color: tokens.color.ink }}>
                    <Car size={14} />
                  </div>
                  <div>
                    <div className="text-[9.5px] tracking-[0.22em] uppercase" style={{ color: tokens.color.muted }}>Maqueta interactiva</div>
                    <div className="text-[11.5px] font-medium" style={{ color: tokens.color.ink }}>Línea 03 · Paso {step.n} de {visibleSteps.length}</div>
                  </div>
                </div>
                <button onClick={() => setAutoPlay(a => !a)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium"
                  style={{ background: autoPlay ? tokens.color.accent : tokens.color.bgDeep, color: autoPlay ? tokens.color.ink : tokens.color.inkSoft }}>
                  {autoPlay ? <><Pause size={11} /> Pausar</> : <><Play size={11} /> Auto-recorrido</>}
                </button>
              </div>

              <div className="relative px-2 sm:px-3 lg:px-0 pb-3 lg:pb-0" style={{ background: 'linear-gradient(180deg, #F0F3F8 0%, #DDE3ED 100%)' }}>
                <div className="relative mx-auto w-full max-w-[860px] aspect-[16/11] sm:aspect-[16/10]">
                  <ITVGarage activeZones={step.zones} labels={step.labels || {}} stepId={step.id}
                    brakeMeterPhase={brakePhase}
                    hoveredZone={hoveredZone} setHoveredZone={setHoveredZone} />
                </div>

                <div
                  className="lg:hidden mx-1 mt-3 rounded-2xl p-3.5"
                  style={{
                    background: 'rgba(11, 31, 58, 0.95)', color: '#fff',
                    boxShadow: '0 16px 40px rgba(11, 31, 58, 0.18)',
                    border: `1px solid rgba(200, 134, 46, 0.25)`,
                  }}>
                  <div className="flex items-start gap-3">
                    <div className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
                         style={{ background: tokens.color.accent, color: tokens.color.ink }}>
                      <span style={{ fontFamily: 'Instrument Serif, serif', fontSize: 16, fontStyle: 'italic' }}>{step.n}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[9px] tracking-[0.22em] uppercase mb-0.5" style={{ color: tokens.color.accent }}>
                        Inspector ITV
                      </div>
                      <p className="text-[12px] leading-snug" style={{ color: '#fff', fontStyle: 'italic' }}>
                        «{step.inspector}»
                      </p>
                    </div>
                  </div>
                </div>

                {/* Bocadillo inspector */}
                <AnimatePresence mode="wait">
                  <motion.div key={step.id}
                    initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -5 }} transition={{ duration: 0.35 }}
                    className="hidden lg:block absolute bottom-4 left-4 right-4 lg:right-auto lg:max-w-[400px] rounded-2xl p-3.5"
                    style={{
                      background: 'rgba(11, 31, 58, 0.95)', color: '#fff',
                      boxShadow: '0 16px 40px rgba(11, 31, 58, 0.25)',
                      border: `1px solid rgba(200, 134, 46, 0.25)`,
                      backdropFilter: 'blur(8px)',
                    }}>
                    <div className="flex items-start gap-3">
                      <div className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
                           style={{ background: tokens.color.accent, color: tokens.color.ink }}>
                        <span style={{ fontFamily: 'Instrument Serif, serif', fontSize: 16, fontStyle: 'italic' }}>{step.n}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[9px] tracking-[0.22em] uppercase mb-0.5" style={{ color: tokens.color.accent }}>
                          Inspector ITV
                        </div>
                        <p className="text-[12.5px] leading-snug" style={{ color: '#fff', fontStyle: 'italic' }}>
                          «{step.inspector}»
                        </p>
                      </div>
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Stepper */}
              <div className="px-3 sm:px-5 py-3 sm:py-4 border-t flex items-center gap-1.5 overflow-x-auto" style={{ borderColor: tokens.color.line, background: tokens.color.surfaceAlt }}>
                {visibleSteps.map((s, i) => {
                  const isDone = i < stepIdx;
                  const isCurrent = i === stepIdx;
                  return (
                    <React.Fragment key={s.id}>
                      <button onClick={() => setStepIdx(i)} className="shrink-0">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] transition-all"
                          style={{
                            background: isDone ? tokens.color.ok : isCurrent ? tokens.color.accent : tokens.color.bgDeep,
                            color: isDone || isCurrent ? '#fff' : tokens.color.inkSoft,
                            fontFamily: isCurrent ? 'Instrument Serif, serif' : 'Geist, sans-serif',
                            fontStyle: isCurrent ? 'italic' : 'normal',
                            fontSize: isCurrent ? 13 : 10,
                            fontWeight: isCurrent ? 'normal' : 600,
                            transform: isCurrent ? 'scale(1.15)' : 'scale(1)',
                          }}>
                          {isDone ? <CheckCircle2 size={11} /> : s.n}
                        </div>
                      </button>
                      {i < visibleSteps.length - 1 && <div className="h-[2px] w-4 shrink-0" style={{ background: isDone ? tokens.color.ok : tokens.color.lineSoft }} />}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>

            {/* MEDIDOR DE FRENOS (visible solo en paso 9) */}
            {step.showBrakeMeter && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <BrakeMeter phase={brakePhase} />
              </motion.div>
            )}
          </div>

          {/* PANEL DERECHO — ESTRUCTURA DIDÁCTICA */}
          <motion.div key={step.id} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.25 }}
            className="rounded-[20px] overflow-hidden"
            style={{ background: tokens.color.surface, border: `1px solid ${tokens.color.line}`, boxShadow: tokens.shadow.md }}>

            {/* Header */}
            <div className="p-5 sm:p-6 pb-4 border-b" style={{ borderColor: tokens.color.line }}>
              <div className="flex items-start gap-4">
                <div className="shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: tokens.color.ink, color: '#fff' }}>
                  <StepIcon size={24} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[10.5px] font-mono tracking-wider mb-1" style={{ color: tokens.color.muted }}>
                    PASO {step.n} DE {visibleSteps.length}
                  </div>
                  <h2 style={{ fontFamily: 'Instrument Serif, serif', fontSize: 24, color: tokens.color.ink, letterSpacing: '-0.01em', lineHeight: 1.15 }}>
                    {step.title}
                  </h2>
                </div>
              </div>
              <div className="lg:hidden mt-4">
                <button
                  type="button"
                  onClick={() => setShowMobileDetails(v => !v)}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-full text-[12.5px] font-medium"
                  style={{ background: tokens.color.bgDeep, color: tokens.color.ink }}
                >
                  {showMobileDetails ? 'Ocultar explicación' : 'Ver explicación completa'}
                  <ChevronRight size={13} style={{ transform: showMobileDetails ? 'rotate(90deg)' : 'none' }} />
                </button>
              </div>
            </div>

            {/* BLOQUE 1: QUÉ TE PIDEN */}
            <div className={showMobileDetails ? 'block' : 'hidden lg:block'}>
            <div className="p-5 border-b" style={{ borderColor: tokens.color.line, background: tokens.color.surfaceAlt }}>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: tokens.color.accent, color: tokens.color.ink }}>
                  <span style={{ fontFamily: 'Instrument Serif, serif', fontSize: 13, fontStyle: 'italic', fontWeight: 600 }}>1</span>
                </div>
                <div className="text-[10.5px] tracking-[0.22em] uppercase font-medium" style={{ color: tokens.color.accentDeep }}>
                  Qué te piden
                </div>
              </div>
              <p className="text-[13px] leading-relaxed pl-8" style={{ color: tokens.color.ink, fontWeight: 500 }}>
                {step.pide}
              </p>
            </div>

            {/* BLOQUE 2: QUÉ TIENES QUE HACER */}
            <div className="p-5 border-b" style={{ borderColor: tokens.color.line }}>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: tokens.color.accent, color: tokens.color.ink }}>
                  <span style={{ fontFamily: 'Instrument Serif, serif', fontSize: 13, fontStyle: 'italic', fontWeight: 600 }}>2</span>
                </div>
                <div className="text-[10.5px] tracking-[0.22em] uppercase font-medium" style={{ color: tokens.color.accentDeep }}>
                  Qué tienes que hacer
                </div>
              </div>
              <p className="text-[13px] leading-relaxed pl-8" style={{ color: tokens.color.inkSoft }}>
                {step.haces}
              </p>
            </div>

            {/* BLOQUE 3: QUÉ REVISAR ANTES DE IR */}
            <div className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: tokens.color.accent, color: tokens.color.ink }}>
                  <span style={{ fontFamily: 'Instrument Serif, serif', fontSize: 13, fontStyle: 'italic', fontWeight: 600 }}>3</span>
                </div>
                <div className="text-[10.5px] tracking-[0.22em] uppercase font-medium" style={{ color: tokens.color.accentDeep }}>
                  Qué revisar antes
                </div>
              </div>
              <ul className="pl-8 space-y-1.5">
                {step.revisas.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-[12.5px]" style={{ color: tokens.color.inkSoft }}>
                    <CheckCircle2 size={12} className="shrink-0 mt-0.5" style={{ color: tokens.color.ok }} />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            </div>

            {/* Controles */}
            <div className="px-5 sm:px-6 pb-5 sm:pb-6 pt-3 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <button onClick={prev} disabled={stepIdx === 0}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-full text-[12px] disabled:opacity-40"
                style={{ background: tokens.color.bgDeep, color: tokens.color.inkSoft }}>
                <ChevronLeft size={13} /> Anterior
              </button>
              {!isLast ? (
                <button onClick={next}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-full text-[13px] font-medium transition-transform hover:scale-[1.02]"
                  style={{ background: tokens.color.ink, color: '#fff', boxShadow: tokens.shadow.md }}>
                  Siguiente paso <ChevronRight size={14} />
                </button>
              ) : (
                <div className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-full text-[12.5px]"
                     style={{ background: tokens.color.okSoft, color: tokens.color.ok }}>
                  <CheckCircle2 size={14} /> Recorrido completado
                </div>
              )}
            </div>

          </motion.div>
        </div>

        {/* Legal */}
        <div className="mt-5 rounded-xl p-4 flex items-start gap-3 text-[11.5px] leading-relaxed" style={{ background: tokens.color.warnSoft, color: tokens.color.warn, border: `1px solid ${tokens.color.accentSoft}` }}>
          <AlertTriangle size={14} className="shrink-0 mt-0.5" />
          <span>Contenido formativo y orientativo. El proceso real puede variar entre estaciones ITV. No sustituye a la inspección oficial.</span>
        </div>
      </div>
    </div>
  );
};

export { RecorridoITVScreen };
export default RecorridoITVScreen;
