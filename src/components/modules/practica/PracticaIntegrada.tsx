'use client';

import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Eye, Target, X } from 'lucide-react';
import { tokens } from '@/lib/tokens';
import { TechnicalCard3D } from '@/components/modules/ficha/TechnicalCard3D';
import { Simulator576, type FieldStatus } from '@/components/modules/simulador/Simulator576';
import type { Vehicle as TechnicalCardVehicle, VehicleField } from '@/data/technical-card';
import type {
  SimulatorFieldAccess,
  SimulatorMode,
  TaxCalculation,
  VehicleInput,
} from '@/domain/registration';

export interface PracticaIntegradaProps {
  mode: SimulatorMode;
  vehicle: VehicleInput;
  caseId?: string;
  fieldAccess?: SimulatorFieldAccess;
  initialCalculation?: TaxCalculation;
  onCalculationChange?: (calculation: TaxCalculation) => void;
}

const MODE_HEADER: Record<SimulatorMode, { badge: string; title: string; description: string }> = {
  practice: {
    badge: 'Práctica ficticia',
    title: 'Lectura técnica × cálculo fiscal guiado',
    description: 'Contrasta un documento recreado y recorre nueve pasos: ruta, clasificación, valoración, minoración, epígrafe y casillas del Modelo 576.',
  },
  case: {
    badge: 'Expediente real',
    title: 'Documento técnico × preparación fiscal',
    description: 'Revisa los datos del expediente frente al documento original y completa el flujo fiscal antes de trasladar las casillas a la AEAT.',
  },
};

export function PracticaIntegrada({
  mode,
  vehicle,
  caseId,
  fieldAccess,
  initialCalculation,
  onCalculationChange,
}: PracticaIntegradaProps) {
  const [fieldStatus, setFieldStatus] = useState<Record<string, FieldStatus>>({});
  const [selectedField, setSelectedField] = useState<string | null>(null);
  const [missionField, setMissionField] = useState<string | null>(null);
  const technicalCardVehicle = useMemo(() => toTechnicalCardVehicle(vehicle), [vehicle]);
  const selectedFieldData = selectedField ? technicalCardVehicle.fields[selectedField] : null;
  const header = MODE_HEADER[mode];

  return (
    <div className="px-5 lg:px-8 pt-6 pb-12 max-w-[1400px] mx-auto">
      <div className="mb-7 flex items-end justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10.5px] font-mono tracking-wider" style={{ color: tokens.color.muted }}>Preparador fiscal</span>
            <span
              className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[10.5px] font-medium tracking-[0.04em] uppercase rounded-full"
              style={{ color: tokens.color.accentDeep, background: tokens.color.accentSoft }}
            >
              <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: tokens.color.accent }} />
              {header.badge}
            </span>
          </div>
          <h1 style={{ fontFamily: tokens.font.serif, fontSize: 'clamp(32px, 3.5vw, 46px)', color: tokens.color.ink, letterSpacing: '-0.01em', lineHeight: 1 }}>
            {header.title}
          </h1>
          <p className="mt-3 max-w-[680px] text-[14px] leading-relaxed" style={{ color: tokens.color.inkSoft }}>
            {header.description}
          </p>
        </div>

        {missionField && mode === 'practice' && (
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-2 px-3 py-2 rounded-lg"
            style={{ background: tokens.color.accentSoft, color: tokens.color.accentDeep, border: `1px solid ${tokens.color.accent}` }}
          >
            <Target size={13} />
            <div className="text-[11.5px]">Localiza <strong className="font-mono">{missionField}</strong></div>
            <button type="button" onClick={() => setMissionField(null)} aria-label="Cancelar misión" className="ml-1">
              <X size={12} />
            </button>
          </motion.div>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[0.92fr_1.08fr] gap-6 items-start">
        <div
          className="rounded-[20px] p-5 lg:p-7 xl:sticky xl:top-6"
          style={{ background: tokens.color.surface, border: `1px solid ${tokens.color.line}`, boxShadow: tokens.shadow.md }}
        >
          <div className="flex items-center justify-between mb-5">
            <div>
              <div className="text-[10.5px] font-mono tracking-wider mb-1" style={{ color: tokens.color.muted }}>
                {mode === 'case' ? 'Datos técnicos del expediente' : 'Documento técnico recreado'}
              </div>
              <h2 style={{ fontFamily: tokens.font.serif, fontSize: 22, color: tokens.color.ink }}>Lectura interactiva</h2>
            </div>
            <div className="hidden md:flex items-center gap-1.5 text-[10.5px]" style={{ color: tokens.color.muted }}>
              <Eye size={11} /> Pulsa cualquier dato
            </div>
          </div>

          <TechnicalCard3D
            mode={mode}
            vehicle={technicalCardVehicle}
            fieldStatus={fieldStatus}
            missionField={mode === 'practice' ? missionField : null}
            selectedField={selectedField}
            onFieldClick={(key) => {
              setSelectedField(key);
              if (missionField === key) setTimeout(() => setMissionField(null), 700);
            }}
          />

          <AnimatePresence mode="wait">
            {selectedField && selectedFieldData && (
              <motion.div
                key={selectedField}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="mt-6 rounded-xl p-4"
                style={{ background: tokens.color.bgDeep, border: `1px solid ${tokens.color.line}` }}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="font-mono text-[11px] font-semibold px-1.5 py-0.5 rounded" style={{ background: tokens.color.accent, color: tokens.color.ink }}>
                    {selectedField}
                  </span>
                  <span className="text-[12px] font-medium" style={{ color: tokens.color.ink }}>{selectedFieldData.label}</span>
                  <button type="button" onClick={() => setSelectedField(null)} aria-label="Cerrar" className="ml-auto">
                    <X size={12} style={{ color: tokens.color.muted }} />
                  </button>
                </div>
                <p className="text-[12.5px] leading-relaxed" style={{ color: tokens.color.inkSoft }}>{selectedFieldData.hint}</p>
                {mode === 'case' && (
                  <p className="mt-2 text-[10.5px]" style={{ color: tokens.color.warn }}>
                    Contrasta este dato con el documento original; esta vista no acredita su validez.
                  </p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <Simulator576
          mode={mode}
          vehicle={vehicle}
          caseId={caseId}
          fieldAccess={fieldAccess}
          initialCalculation={initialCalculation}
          onCalculationChange={onCalculationChange}
          onFieldFocus={setSelectedField}
          onFieldStatusChange={setFieldStatus}
          onMission={mode === 'practice' ? setMissionField : undefined}
        />
      </div>

      <div
        className="mt-6 rounded-xl p-4 flex items-start gap-3 text-[11.5px] leading-relaxed"
        style={{ background: tokens.color.warnSoft, color: tokens.color.warn, border: `1px solid ${tokens.color.accentSoft}` }}
      >
        <AlertTriangle size={14} className="shrink-0 mt-0.5" />
        <span>
          {mode === 'case'
            ? 'Herramienta de preparación y estimación. No presenta impuestos, no valida documentos y no sustituye la comprobación en AEAT, ITV o DGT.'
            : 'Caso y documento ficticios para aprendizaje. La puntuación evalúa lectura documental; no calcula una obligación tributaria real.'}
        </span>
      </div>
    </div>
  );
}

function toTechnicalCardVehicle(vehicle: VehicleInput): TechnicalCardVehicle {
  const fields: Record<string, VehicleField> = {
    E: field('N.º de bastidor (VIN)', vehicle.vin || 'Pendiente', 'Debe coincidir en vehículo, documentos extranjeros, CoC y tarjeta ITV.', undefined, true),
    B: field('Fecha de 1.ª matriculación', vehicle.firstRegistrationDate ?? 'Pendiente', 'Fecha de primera puesta en servicio; no debe confundirse con la fecha de compra.', undefined, true),
    'V.7': field('Emisiones de CO₂', numberLabel(vehicle.co2GKm), 'Contrasta el valor y el método de medición con la tarjeta ITV española antes de calcular.', vehicle.co2GKm === null ? undefined : 'g/km', true),
    'P.1': field('Cilindrada', numberLabel(vehicle.engineCc), 'Dato técnico del motor procedente de la documentación contrastada.', vehicle.engineCc === null ? undefined : 'cm³', true),
    'P.2': field('Potencia neta máxima', numberLabel(vehicle.powerKw), 'Potencia homologada en kW; no es la potencia fiscal del IVTM.', vehicle.powerKw === null ? undefined : 'kW', true),
    'P.3': field('Combustible', vehicle.fuel ?? 'Pendiente', 'Combustible o fuente de energía consignado en la documentación técnica.'),
    K: field('Contraseña de homologación', vehicle.fieldK ?? vehicle.approvalNumber ?? 'Pendiente', 'Ayuda a identificar la homologación, pero requiere comprobar variante, versión y VIN.', undefined, true),
    G: field('Masa en servicio', numberLabel(vehicle.massKg), 'Masa documentada del vehículo. Confirma la casilla concreta en la tarjeta ITV.', vehicle.massKg === null ? undefined : 'kg', true),
    S1: field('Plazas', numberLabel(vehicle.seats), 'Número de plazas, incluida la del conductor, según documentación técnica.', undefined, true),
    J: field('Categoría del vehículo', vehicle.category, 'La categoría condiciona la ruta técnica y fiscal; el preparador ordinario automatiza M1.'),
  };

  return {
    id: vehicle.id ?? maskVin(vehicle.vin),
    brand: vehicle.brand || 'Marca pendiente',
    model: vehicle.model || 'Modelo pendiente',
    variant: 'Datos importados del expediente',
    origin: vehicle.registrationCountry || 'Pendiente',
    fields,
  };
}

function field(label: string, value: string, hint: string, unit?: string, mono?: boolean): VehicleField {
  return { label, value, hint, unit, mono };
}

function numberLabel(value: number | null): string {
  return value === null ? 'Pendiente' : String(value);
}

function maskVin(vin: string): string {
  if (!vin) return 'sin-referencia';
  return vin.length > 8 ? `${vin.slice(0, 4)}…${vin.slice(-4)}` : vin;
}

export default PracticaIntegrada;
