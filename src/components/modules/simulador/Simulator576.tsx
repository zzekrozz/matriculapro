'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Calculator,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileCheck2,
  Info,
  Loader2,
  LockKeyhole,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import {
  AUTONOMOUS_COMMUNITIES,
  classifyVatVehicleStatus,
  type AutonomousCommunity,
  type RegistrationTaxRoute,
  type SimulatorFieldAccess,
  type SimulatorMode,
  type TaxCalculation,
  type VehicleCategory,
  type VehicleInput,
} from '@/domain/registration';
import type {
  FiscalTerritory,
  Model576Calculation,
  ValuationMethod,
} from '@/domain/registration/fiscal/types';
import { addCalendarMonthsClamped, fullCalendarMonthsBetween, parseStrictIsoDate } from '@/domain/registration/fiscal/date-utils';
import type { Model576ApiRequest, Model576ApiResponse } from '@/lib/fiscal/calculation-api';
import type { FiscalCatalogVehicle } from '@/lib/fiscal/catalog-api';
import { cn } from '@/lib/cn';
import { useAccess } from '@/providers/AccessProvider';
import { FiscalCatalogPicker } from './FiscalCatalogPicker';
import { FiscalResultPanel } from './FiscalResultPanel';

export type FieldStatus = 'correct' | 'incorrect' | 'shake';

export interface Simulator576Props {
  mode: SimulatorMode;
  vehicle: VehicleInput;
  caseId?: string;
  registrationTaxRoute?: RegistrationTaxRoute;
  fieldAccess?: SimulatorFieldAccess;
  readOnly?: boolean;
  initialCalculation?: TaxCalculation;
  onCalculationChange?: (calculation: TaxCalculation) => void;
  onFiscalCalculationChange?: (calculation: Model576Calculation, request: Model576ApiRequest) => void;
  onFieldFocus?: (fieldKey: string | null) => void;
  onFieldStatusChange?: (status: Record<string, FieldStatus>) => void;
  onMission?: (fieldKey: string) => void;
  hideHeader?: boolean;
}

const STEPS = [
  'Ruta fiscal',
  'Nuevo o usado',
  'Método',
  'Valor',
  'Depreciación',
  'Minoración',
  'Epígrafe',
  'Casillas',
  'Revisión',
] as const;

type StepNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
type HistoricalMode = 'automatic' | 'user-provided';
type VehicleKind = 'standard' | 'quad' | 'motorcycle' | 'motorhome' | 'other';
type ProfessionalUsePeriodEvaluation =
  | { valid: true; durationMonths: number; message: string }
  | { valid: false; durationMonths: number | null; message: string };

const MODE_COPY: Record<SimulatorMode, { eyebrow: string; title: string; description: string }> = {
  case: {
    eyebrow: 'Expediente real',
    title: 'Preparador profesional del Modelo 576',
    description: 'Determina el método, explica cada cifra y conserva bloqueos antes de preparar la autoliquidación. MatriculaPro no presenta el modelo.',
  },
  practice: {
    eyebrow: 'Práctica ficticia',
    title: 'Entrenamiento fiscal guiado',
    description: 'Contrasta el documento recreado y recorre una preparación de nueve pasos. Ningún resultado corresponde a una obligación real.',
  },
};

export function Simulator576({
  mode,
  vehicle,
  caseId,
  registrationTaxRoute: suggestedRoute,
  fieldAccess,
  readOnly: forcedReadOnly = false,
  initialCalculation,
  onCalculationChange,
  onFiscalCalculationChange,
  onFieldFocus,
  onFieldStatusChange,
  onMission,
  hideHeader = false,
}: Simulator576Props) {
  const { readOnly: expiredAccess } = useAccess();
  const initialDate = initialCalculation?.calculatedAt.slice(0, 10) ?? '';
  const practice = mode === 'practice';
  const readOnly = expiredAccess || forcedReadOnly || fieldAccess?.editableBlocks?.length === 0;
  const [step, setStep] = useState<StepNumber>(1);
  const [route, setRoute] = useState<RegistrationTaxRoute | ''>('');
  const [registrationTaxSubjectConfirmed, setRegistrationTaxSubjectConfirmed] = useState(false);
  const [firstRegistrationDate, setFirstRegistrationDate] = useState(practice ? '' : vehicle.firstRegistrationDate ?? '');
  const [differentFirstService, setDifferentFirstService] = useState(false);
  const [firstServiceDate, setFirstServiceDate] = useState('');
  const [firstServiceEvidenceConfirmed, setFirstServiceEvidenceConfirmed] = useState(false);
  const [firstServiceSource, setFirstServiceSource] = useState('');
  const [deliveryDate, setDeliveryDate] = useState(initialDate);
  const [accrualDate, setAccrualDate] = useState(initialDate);
  const [mileageKm, setMileageKm] = useState(practice ? '' : numberInput(vehicle.mileageKm));
  const [valuationMethod, setValuationMethod] = useState<ValuationMethod | ''>('');
  const [vatTaxableBase, setVatTaxableBase] = useState(numberInput(initialCalculation?.taxableBase ?? null));
  const [vatBaseSource, setVatBaseSource] = useState('');
  const [newVehicleCurrency, setNewVehicleCurrency] = useState('EUR');
  const [exchangeRateToEur, setExchangeRateToEur] = useState('');
  const [netPrice, setNetPrice] = useState('');
  const [discounts, setDiscounts] = useState('');
  const [accessoryCosts, setAccessoryCosts] = useState('');
  const [indirectTaxAmount, setIndirectTaxAmount] = useState('');
  const [acquisitionTerritory, setAcquisitionTerritory] = useState('');
  const [invoicePrice, setInvoicePrice] = useState('');
  const [identityBrand, setIdentityBrand] = useState(vehicle.brand);
  const [identityModel, setIdentityModel] = useState(vehicle.model);
  const [identityVersion, setIdentityVersion] = useState('');
  const [identityFuel, setIdentityFuel] = useState(vehicle.fuel ?? '');
  const [identityEngineCc, setIdentityEngineCc] = useState(numberInput(vehicle.engineCc));
  const [identityPowerKw, setIdentityPowerKw] = useState(numberInput(vehicle.powerKw));
  const [selectedVehicle, setSelectedVehicle] = useState<FiscalCatalogVehicle | null>(null);
  const [, setCatalogVersion] = useState<string | null>(null);
  const [justifiedValue, setJustifiedValue] = useState('');
  const [valuationDate, setValuationDate] = useState('');
  const [valuationDescription, setValuationDescription] = useState('');
  const [valuationSource, setValuationSource] = useState('');
  const [valuationReason, setValuationReason] = useState('');
  const [supportingDocument, setSupportingDocument] = useState('');
  const [historicalMode, setHistoricalMode] = useState<HistoricalMode>('automatic');
  const [territory, setTerritory] = useState<FiscalTerritory>(territoryForCommunity(initialCalculation?.autonomousCommunity ?? null));
  const [noOtherIndirectTaxes, setNoOtherIndirectTaxes] = useState(false);
  const [historicalVatRate, setHistoricalVatRate] = useState('');
  const [historicalIedmtRate, setHistoricalIedmtRate] = useState('');
  const [otherIndirectTaxRates, setOtherIndirectTaxRates] = useState('');
  const [historicalSource, setHistoricalSource] = useState('');
  const [category, setCategory] = useState<VehicleCategory | ''>(practice ? '' : vehicle.category);
  const [co2GKm, setCo2GKm] = useState(practice ? '' : numberInput(vehicle.co2GKm));
  const [co2Verified, setCo2Verified] = useState(practice ? false : vehicle.co2Verified);
  const [community, setCommunity] = useState<AutonomousCommunity | ''>(initialCalculation?.autonomousCommunity ?? '');
  const [vehicleKind, setVehicleKind] = useState<VehicleKind>('standard');
  const [singleNonCombustionEngine, setSingleNonCombustionEngine] = useState(false);
  const [largeFamilyClaimed, setLargeFamilyClaimed] = useState(false);
  const [largeFamilyStatus, setLargeFamilyStatus] = useState<'granted' | 'pending' | 'not-requested'>('not-requested');
  const [largeFamilyEvidence, setLargeFamilyEvidence] = useState('');
  const [motorhomeReductionClaimed, setMotorhomeReductionClaimed] = useState(false);
  const [motorhomeEligibilityConfirmed, setMotorhomeEligibilityConfirmed] = useState(false);
  const [motorhomeEvidence, setMotorhomeEvidence] = useState('');
  const [professionalUseClaimed, setProfessionalUseClaimed] = useState(false);
  const [professionalActivity, setProfessionalActivity] = useState<'taxi' | 'rental' | 'driving-school'>('taxi');
  const [professionalStartDate, setProfessionalStartDate] = useState('');
  const [professionalEndDate, setProfessionalEndDate] = useState('');
  const [professionalExclusive, setProfessionalExclusive] = useState(false);
  const [professionalEvidence, setProfessionalEvidence] = useState('');
  const [professionalConfirmed, setProfessionalConfirmed] = useState(false);
  const [technicalConfirmed, setTechnicalConfirmed] = useState(false);
  const [calculation, setCalculation] = useState<Model576Calculation | null>(null);
  const [submittedRequest, setSubmittedRequest] = useState<Model576ApiRequest | null>(null);
  const [calculatedInputHash, setCalculatedInputHash] = useState<string | null>(null);
  const [calculationError, setCalculationError] = useState<string | null>(null);
  const [calculating, setCalculating] = useState(false);
  const [reviewConfirmed, setReviewConfirmed] = useState(false);
  const [practiceStatus, setPracticeStatus] = useState<Record<string, FieldStatus>>({});

  const parsedMileage = parseNumber(mileageKm);
  const parsedCo2 = parseNumber(co2GKm);
  const documentedFirstServiceComplete = differentFirstService
    && Boolean(firstServiceDate && firstServiceEvidenceConfirmed && firstServiceSource.trim());
  const fiscalStartDate = differentFirstService
    ? (documentedFirstServiceComplete ? firstServiceDate : null)
    : (firstRegistrationDate || null);
  const professionalPeriod = useMemo(() => evaluateProfessionalUsePeriod({
    startDate: professionalStartDate,
    endDate: professionalEndDate,
    fiscalStartDate,
    accrualDate: accrualDate || null,
  }), [accrualDate, fiscalStartDate, professionalEndDate, professionalStartDate]);
  const vatStatus = useMemo(() => classifyVatVehicleStatus({
    firstRegistrationDate: fiscalStartDate,
    mileageKm: parsedMileage,
    referenceDate: deliveryDate || null,
  }), [deliveryDate, fiscalStartDate, parsedMileage]);
  const caseIdentity = useMemo(() => ({
    brand: identityBrand,
    model: identityModel,
    version: optionalText(identityVersion),
    fuelType: optionalText(identityFuel),
    engineCapacityCc: parseNumber(identityEngineCc),
    powerKw: parseNumber(identityPowerKw),
    co2Gkm: parsedCo2 ?? vehicle.co2GKm,
    firstRegistrationDate,
  }), [firstRegistrationDate, identityBrand, identityEngineCc, identityFuel, identityModel, identityPowerKw, identityVersion, parsedCo2, vehicle.co2GKm]);
  const request = useMemo(() => buildRequest({
    route,
    registrationTaxSubjectConfirmed,
    deliveryDate,
    accrualDate,
    firstRegistrationDate,
    differentFirstService,
    firstServiceDate,
    firstServiceEvidenceConfirmed,
    firstServiceSource,
    parsedMileage,
    community,
    vehicle,
    identityBrand,
    identityModel,
    identityVersion,
    identityFuel,
    identityEngineCc,
    identityPowerKw,
    category,
    parsedCo2,
    co2Verified,
    singleNonCombustionEngine,
    vehicleKind,
    valuationMethod,
    vatTaxableBase,
    vatBaseSource,
    newVehicleCurrency,
    exchangeRateToEur,
    netPrice,
    discounts,
    accessoryCosts,
    indirectTaxAmount,
    acquisitionTerritory,
    selectedVehicle,
    invoicePrice,
    justifiedValue,
    valuationDate,
    valuationDescription,
    valuationSource,
    valuationReason,
    supportingDocument,
    historicalMode,
    territory,
    noOtherIndirectTaxes,
    historicalVatRate,
    historicalIedmtRate,
    otherIndirectTaxRates,
    historicalSource,
    largeFamilyClaimed,
    largeFamilyStatus,
    largeFamilyEvidence,
    motorhomeReductionClaimed,
    motorhomeEligibilityConfirmed,
    motorhomeEvidence,
    professionalUseClaimed,
    professionalActivity,
    professionalStartDate,
    professionalEndDate,
    professionalExclusive,
    professionalEvidence,
    professionalConfirmed,
  }), [
    accrualDate, category, co2Verified, community, deliveryDate, firstRegistrationDate,
    differentFirstService, firstServiceDate, firstServiceEvidenceConfirmed, firstServiceSource,
    historicalIedmtRate, historicalMode, historicalSource, historicalVatRate, identityBrand,
    identityEngineCc, identityFuel, identityModel, identityPowerKw, identityVersion, invoicePrice,
    justifiedValue, largeFamilyClaimed, largeFamilyEvidence, largeFamilyStatus,
    motorhomeEligibilityConfirmed, motorhomeEvidence, motorhomeReductionClaimed,
    professionalActivity, professionalConfirmed, professionalStartDate, professionalEndDate,
    professionalEvidence, professionalExclusive, professionalUseClaimed,
    noOtherIndirectTaxes, otherIndirectTaxRates, parsedCo2, parsedMileage,
    registrationTaxSubjectConfirmed, route, selectedVehicle, singleNonCombustionEngine, supportingDocument, territory,
    valuationDate, valuationDescription, valuationMethod, valuationReason, valuationSource,
    accessoryCosts, acquisitionTerritory, discounts, exchangeRateToEur, indirectTaxAmount,
    netPrice, newVehicleCurrency, vatBaseSource, vatTaxableBase, vehicle, vehicleKind,
  ]);
  const requestHash = request ? calculationInputHash(request) : null;
  const resultIsStale = Boolean(calculation && requestHash !== calculatedInputHash);

  useEffect(() => {
    if (!calculation || !submittedRequest || resultIsStale) return;
    const legacyCalculation: TaxCalculation = {
      caseId,
      taxableBase: calculation.box01TaxableBase,
      marketValue: calculation.marketValueAfterDepreciation,
      co2GKm: parsedCo2,
      category: category || 'UNKNOWN',
      autonomousCommunity: community || null,
      epigraph: toLegacyEpigraph(calculation.epigraph),
      rate: calculation.currentIedmtRateForLiquidation,
      estimatedQuota: calculation.box08FinalResult,
      calculatedAt: calculation.calculatedAt,
      sourceIds: calculation.sourceIds,
    };
    onCalculationChange?.(legacyCalculation);
    onFiscalCalculationChange?.(calculation, submittedRequest);
  }, [
    calculation, caseId, category, community, onCalculationChange,
    onFiscalCalculationChange, parsedCo2, resultIsStale, submittedRequest,
  ]);

  const runCalculation = async (reviewed = reviewConfirmed) => {
    if (readOnly) return false;
    const payload = request ? { ...request, confirmation: { reviewedByUser: reviewed, confirmedAt: reviewed ? new Date().toISOString() : null } } : null;
    if (!payload) {
      setCalculationError('Faltan datos básicos para solicitar un cálculo. Revisa fechas, kilometraje, comunidad y método.');
      return false;
    }
    setCalculating(true);
    setCalculationError(null);
    try {
      const response = await fetch('/api/fiscal/model-576', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json() as Model576ApiResponse;
      if (!response.ok || !result.ok) {
        setCalculationError(result.ok ? 'No se ha podido calcular.' : result.message);
        return false;
      }
      setCalculation(result.calculation);
      setSubmittedRequest(payload);
      setCalculatedInputHash(calculationInputHash(payload));
      return true;
    } catch (cause) {
      setCalculationError(cause instanceof Error ? cause.message : 'No se ha podido solicitar el cálculo fiscal.');
      return false;
    } finally {
      setCalculating(false);
    }
  };

  const reset = () => {
    if (readOnly) return;
    setStep(1);
    setRoute('');
    setRegistrationTaxSubjectConfirmed(false);
    setFirstRegistrationDate(practice ? '' : vehicle.firstRegistrationDate ?? '');
    setDifferentFirstService(false);
    setFirstServiceDate('');
    setFirstServiceEvidenceConfirmed(false);
    setFirstServiceSource('');
    setDeliveryDate(initialDate);
    setAccrualDate(initialDate);
    setMileageKm(practice ? '' : numberInput(vehicle.mileageKm));
    setValuationMethod('');
    setVatTaxableBase(numberInput(initialCalculation?.taxableBase ?? null));
    setVatBaseSource('');
    setNewVehicleCurrency('EUR');
    setExchangeRateToEur('');
    setNetPrice('');
    setDiscounts('');
    setAccessoryCosts('');
    setIndirectTaxAmount('');
    setAcquisitionTerritory('');
    setInvoicePrice('');
    setSelectedVehicle(null);
    setCatalogVersion(null);
    setIdentityBrand(vehicle.brand);
    setIdentityModel(vehicle.model);
    setIdentityVersion('');
    setIdentityFuel(vehicle.fuel ?? '');
    setIdentityEngineCc(numberInput(vehicle.engineCc));
    setIdentityPowerKw(numberInput(vehicle.powerKw));
    setJustifiedValue('');
    setValuationDate('');
    setValuationDescription('');
    setValuationSource('');
    setValuationReason('');
    setSupportingDocument('');
    setHistoricalMode('automatic');
    setTerritory(territoryForCommunity(initialCalculation?.autonomousCommunity ?? null));
    setNoOtherIndirectTaxes(false);
    setHistoricalVatRate('');
    setHistoricalIedmtRate('');
    setOtherIndirectTaxRates('');
    setHistoricalSource('');
    setCategory(practice ? '' : vehicle.category);
    setCo2GKm(practice ? '' : numberInput(vehicle.co2GKm));
    setCo2Verified(practice ? false : vehicle.co2Verified);
    setCommunity(initialCalculation?.autonomousCommunity ?? '');
    setVehicleKind('standard');
    setSingleNonCombustionEngine(false);
    setLargeFamilyClaimed(false);
    setLargeFamilyStatus('not-requested');
    setLargeFamilyEvidence('');
    setMotorhomeReductionClaimed(false);
    setMotorhomeEligibilityConfirmed(false);
    setMotorhomeEvidence('');
    setProfessionalUseClaimed(false);
    setProfessionalActivity('taxi');
    setProfessionalStartDate('');
    setProfessionalEndDate('');
    setProfessionalExclusive(false);
    setProfessionalEvidence('');
    setProfessionalConfirmed(false);
    setTechnicalConfirmed(false);
    setCalculation(null);
    setSubmittedRequest(null);
    setCalculatedInputHash(null);
    setCalculationError(null);
    setReviewConfirmed(false);
    setPracticeStatus({});
    onFieldStatusChange?.({});
  };

  const goNext = async () => {
    if (readOnly) {
      setStep((current) => Math.min(9, current + 1) as StepNumber);
      return;
    }
    if (step === 8 && !calculation) {
      const calculated = await runCalculation();
      if (!calculated) return;
    }
    setStep((current) => Math.min(9, current + 1) as StepNumber);
  };

  const finishReview = async () => {
    if (readOnly) return;
    setReviewConfirmed(true);
    const success = await runCalculation(true);
    if (success) setStep(9);
  };

  const checkPractice = () => {
    if (readOnly) return;
    const next: Record<string, FieldStatus> = {
      B: normalizeDate(firstRegistrationDate) === normalizeDate(vehicle.firstRegistrationDate ?? '') ? 'correct' : 'incorrect',
      mileage: parsedMileage === vehicle.mileageKm ? 'correct' : 'incorrect',
      'V.7': parsedCo2 === vehicle.co2GKm ? 'correct' : 'incorrect',
      J: category === vehicle.category ? 'correct' : 'incorrect',
    };
    setPracticeStatus(next);
    onFieldStatusChange?.(next);
  };

  const modeCopy = MODE_COPY[mode];
  const currentStepValid = stepIsValid({
    step,
    route,
    registrationTaxSubjectConfirmed,
    vatOutcome: vatStatus.outcome,
    differentFirstService,
    firstServiceDate,
    firstServiceEvidenceConfirmed,
    firstServiceSource,
    valuationMethod,
    selectedVehicle,
    vatTaxableBase,
    vatBaseSource,
    newVehicleCurrency,
    exchangeRateToEur,
    justifiedValue,
    valuationDate,
    valuationDescription,
    valuationSource,
    valuationReason,
    historicalMode,
    noOtherIndirectTaxes,
    historicalVatRate,
    historicalIedmtRate,
    historicalSource,
    category,
    parsedCo2,
    co2Verified,
    singleNonCombustionEngine,
    community,
    technicalConfirmed,
    professionalUseClaimed,
    professionalPeriod,
    professionalExclusive,
    professionalEvidence,
    professionalConfirmed,
    calculation,
  });

  return (
    <div className="overflow-hidden rounded-[22px] border border-line bg-surface shadow-soft-md">
      {!hideHeader && (
        <header className="border-b border-line px-5 py-5 lg:px-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="mb-1.5 flex items-center gap-2">
                <span className="font-mono text-[10px] tracking-wider text-muted">Herramienta fiscal</span>
                <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[9.5px] font-medium uppercase tracking-[0.08em] text-accent-deep">{modeCopy.eyebrow}</span>
              </div>
              <h2 className="font-serif text-[28px] leading-tight text-ink">{modeCopy.title}</h2>
              {caseId && <div className="mt-1 font-mono text-[9.5px] text-muted">Expediente {shortReference(caseId)}</div>}
              <p className="mt-3 max-w-[760px] text-[12px] leading-relaxed text-ink-soft">{modeCopy.description}</p>
            </div>
            <button type="button" disabled={readOnly} onClick={reset} className="inline-flex items-center gap-1.5 rounded-lg bg-bg-deep px-3 py-2 text-[10.5px] text-ink-soft disabled:cursor-not-allowed disabled:opacity-50"><RefreshCw size={12} /> {readOnly ? 'Solo lectura' : 'Reiniciar'}</button>
          </div>
        </header>
      )}

      <nav aria-label="Pasos del cálculo fiscal" className="border-b border-line bg-surface-alt px-4 py-4 lg:px-6">
        <ol className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-9">
          {STEPS.map((label, index) => {
            const number = (index + 1) as StepNumber;
            const active = number === step;
            const visited = number < step;
            return (
              <li key={label}>
                <button type="button" onClick={() => (readOnly || number <= step) && setStep(number)} className={cn('w-full rounded-lg px-2 py-2 text-left transition-colors', active ? 'bg-ink text-white' : visited ? 'bg-ok-soft text-ok' : 'bg-bg text-muted')} aria-current={active ? 'step' : undefined}>
                  <span className="block font-mono text-[9px]">{String(number).padStart(2, '0')}</span>
                  <span className="mt-0.5 block truncate text-[9.5px] font-medium">{label}</span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      <div className="p-4 lg:p-6">
        <StepHeader number={step} title={STEPS[step - 1]} />

        {step === 1 && (
          <StepCard title="¿Corresponde realmente el Modelo 576?" description="No se presume la ruta fiscal. Antes de calcular hay que revisar expresamente sujeción, no sujeción y exenciones, y confirmar que el supuesto está sujeto y no exento.">
            {suggestedRoute && <Notice tone="info" title="Orientación previa, no confirmación">El expediente orienta hacia {registrationRouteLabel(suggestedRoute)}, pero esa propuesta no selecciona la ruta ni acredita su procedencia.</Notice>}
            <div className="mt-3">
              <SelectField label="Ruta fiscal revisada" value={route} disabled={readOnly} onChange={(value) => { setRoute(value as RegistrationTaxRoute | ''); setRegistrationTaxSubjectConfirmed(false); }} options={[
              ['', 'Selecciona una ruta'],
              ['model-576', 'Modelo 576 · sujeto y no exento'],
              ['model-05', 'Modelo 05 · reconocimiento previo'],
              ['model-06', 'Modelo 06 · sin reconocimiento previo'],
              ['special-review', 'Revisión fiscal especial'],
              ]} />
            </div>
            {route === 'model-576' && <div className="mt-3"><CheckField label="He revisado sujeción, no sujeción y exenciones, y confirmo expresamente que este caso está sujeto, no exento y corresponde al Modelo 576" checked={registrationTaxSubjectConfirmed} disabled={readOnly} onChange={setRegistrationTaxSubjectConfirmed} /></div>}
            {route && route !== 'model-576' && <Notice tone="warn" title="El cálculo 576 no procede en esta ruta">No se calculará una cuota 576. Revisa el fundamento y prepara el modelo o procedimiento que corresponda.</Notice>}
            {route === 'model-576' && !registrationTaxSubjectConfirmed && <Notice tone="warn" title="Confirmación fiscal pendiente">La mera selección del Modelo 576 no permite calcular. Falta confirmar la revisión de sujeción, no sujeción y exenciones.</Notice>}
            {route === 'model-576' && registrationTaxSubjectConfirmed && <Notice tone="ok" title="Ruta confirmada para este cálculo">La confirmación queda registrada en la entrada fiscal; no sustituye la autoliquidación ni la comprobación de la AEAT.</Notice>}
          </StepCard>
        )}

        {step === 2 && (
          <StepCard title="¿Es nuevo o usado a efectos fiscales?" description="La fecha de entrega se compara con el aniversario exacto de seis meses. El kilometraje es una condición independiente.">
            <div className="grid gap-3 sm:grid-cols-2">
              <InputField label="Primera matriculación extranjera" type="date" value={firstRegistrationDate} disabled={readOnly} status={practiceStatus.B} onFocus={() => onFieldFocus?.('B')} onBlur={() => onFieldFocus?.(null)} onChange={(value) => setFirstRegistrationDate(value)} mission={() => onMission?.('B')} />
              <InputField label="Fecha de entrega o adquisición" type="date" value={deliveryDate} disabled={readOnly} onChange={setDeliveryDate} />
              <InputField label="Kilometraje documental" type="number" value={mileageKm} suffix="km" disabled={readOnly} status={practiceStatus.mileage} onChange={setMileageKm} />
              <InputField label="Fecha de devengo del IEDMT" type="date" value={accrualDate} disabled={readOnly} onChange={setAccrualDate} />
            </div>
            <div className="mt-3">
              <CheckField label="Existe una primera puesta en servicio distinta de la primera matriculación y puedo acreditarla documentalmente" checked={differentFirstService} disabled={readOnly} onChange={setDifferentFirstService} />
            </div>
            {differentFirstService && (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <InputField label="Primera puesta en servicio acreditada" type="date" value={firstServiceDate} disabled={readOnly} onChange={setFirstServiceDate} />
                <InputField label="Documento o fuente acreditativa" value={firstServiceSource} placeholder="Documento, referencia y fecha" disabled={readOnly} onChange={setFirstServiceSource} />
                <div className="sm:col-span-2"><CheckField label="He comprobado que la fecha de primera puesta en servicio consta en esa evidencia" checked={firstServiceEvidenceConfirmed} disabled={readOnly} onChange={setFirstServiceEvidenceConfirmed} /></div>
              </div>
            )}
            {differentFirstService && !documentedFirstServiceComplete && <Notice tone="warn" title="Acreditación incompleta">No se clasificará el vehículo hasta indicar la fecha, su fuente y confirmar la evidencia.</Notice>}
            <Notice tone={vatStatus.outcome === 'undetermined' ? 'warn' : 'ok'} title={vatStatus.outcome === 'new' ? 'Vehículo nuevo' : vatStatus.outcome === 'used' ? 'Vehículo usado' : 'Clasificación pendiente'}>{vatStatus.reason}</Notice>
            <details className="rounded-xl bg-bg p-3 text-[10px] leading-relaxed text-ink-soft"><summary className="cursor-pointer font-medium text-ink">¿Dónde está exactamente la frontera?</summary><p className="mt-2">Para considerarse usado deben no cumplirse ninguna de las dos condiciones de vehículo nuevo: la entrega ya no se produce antes de los seis meses y el kilometraje supera los 6.000 km. Seis meses exactos ya no es “antes de seis meses”.</p></details>
          </StepCard>
        )}

        {step === 3 && (
          <StepCard title="¿Cómo determinaremos el valor?" description="El método depende de la clasificación anterior. La factura de un usado se conserva para comparar, pero no reemplaza automáticamente el valor de mercado.">
            <div className="grid gap-3 lg:grid-cols-3">
              <MethodCard title="Tabla oficial de Hacienda" badge="Recomendado · usado" description="Selecciona una fila exacta de la Orden HAC/1501/2025, aplica antigüedad y minoración." selected={valuationMethod === 'official-table'} disabled={readOnly || vatStatus.outcome !== 'used'} onClick={() => setValuationMethod('official-table')} />
              <MethodCard title="Base de IVA o equivalente" badge="Sólo vehículo nuevo" description="Utiliza la base imponible de IVA, no el total IVA incluido sin desglose." selected={valuationMethod === 'new-vehicle-vat-base'} disabled={readOnly || vatStatus.outcome !== 'new'} onClick={() => setValuationMethod('new-vehicle-vat-base')} />
              <MethodCard title="Valoración de mercado justificada" badge="Avanzado · usado" description="Registra método, fuente y motivo. MatriculaPro no verifica que Hacienda la acepte." selected={valuationMethod === 'justified-market-value'} disabled={readOnly || vatStatus.outcome !== 'used'} onClick={() => setValuationMethod('justified-market-value')} />
            </div>
          </StepCard>
        )}

        {step === 4 && (
          <StepCard title={valuationMethod === 'official-table' ? 'Seleccionar vehículo oficial' : valuationMethod === 'new-vehicle-vat-base' ? 'Documentar la base del vehículo nuevo' : 'Documentar la valoración aportada'} description="No se calcula con una coincidencia probable ni con campos esenciales vacíos.">
            {valuationMethod === 'official-table' && <><div className="mb-4 grid gap-3 sm:grid-cols-3"><InputField label="Marca a contrastar" value={identityBrand} disabled={readOnly} onChange={(value) => { setIdentityBrand(value); setSelectedVehicle(null); }} /><InputField label="Modelo-tipo literal" value={identityModel} disabled={readOnly} onChange={(value) => { setIdentityModel(value); setSelectedVehicle(null); }} /><InputField label="Versión separada, si consta" value={identityVersion} placeholder="La Orden puede no separarla" disabled={readOnly} onChange={(value) => { setIdentityVersion(value); setSelectedVehicle(null); }} /><InputField label="Código de combustible" value={identityFuel} placeholder="Ej.: G, D, E" disabled={readOnly} onChange={(value) => { setIdentityFuel(value); setSelectedVehicle(null); }} /><InputField label="Cilindrada a contrastar" type="number" value={identityEngineCc} suffix="cm³" disabled={readOnly} onChange={(value) => { setIdentityEngineCc(value); setSelectedVehicle(null); }} /><InputField label="Potencia a contrastar" type="number" value={identityPowerKw} suffix="kW" disabled={readOnly} onChange={(value) => { setIdentityPowerKw(value); setSelectedVehicle(null); }} /></div><FiscalCatalogPicker caseVehicle={caseIdentity} selected={selectedVehicle} disabled={readOnly} onSelect={(row, version) => { setSelectedVehicle(row); setCatalogVersion(version); }} /></>}
            {valuationMethod === 'new-vehicle-vat-base' && <div className="grid gap-3 sm:grid-cols-2"><InputField label="Base imponible de IVA" type="number" value={vatTaxableBase} suffix={newVehicleCurrency} disabled={readOnly} onChange={setVatTaxableBase} /><InputField label="Moneda ISO" value={newVehicleCurrency} placeholder="EUR" disabled={readOnly} onChange={(value) => setNewVehicleCurrency(value.toUpperCase().slice(0, 3))} />{newVehicleCurrency !== 'EUR' && <InputField label="Tipo de cambio a EUR" type="number" value={exchangeRateToEur} placeholder="EUR por unidad de moneda" disabled={readOnly} onChange={setExchangeRateToEur} />}<InputField label="Precio neto" type="number" value={netPrice} suffix={newVehicleCurrency} disabled={readOnly} onChange={setNetPrice} /><InputField label="Descuentos" type="number" value={discounts} suffix={newVehicleCurrency} disabled={readOnly} onChange={setDiscounts} /><InputField label="Gastos accesorios incorporables" type="number" value={accessoryCosts} suffix={newVehicleCurrency} disabled={readOnly} onChange={setAccessoryCosts} /><InputField label="IVA o impuesto equivalente" type="number" value={indirectTaxAmount} suffix={newVehicleCurrency} disabled={readOnly} onChange={setIndirectTaxAmount} /><InputField label="Fecha de adquisición" type="date" value={deliveryDate} disabled={readOnly} onChange={setDeliveryDate} /><InputField label="Territorio de adquisición" value={acquisitionTerritory} placeholder="País y régimen fiscal" disabled={readOnly} onChange={setAcquisitionTerritory} /><div className="sm:col-span-2"><InputField label="Documento y origen del dato" value={vatBaseSource} placeholder="Factura, casilla y desglose" disabled={readOnly} onChange={setVatBaseSource} /></div><div className="sm:col-span-2"><Notice tone="info" title="Importe sin IVA">El motor puede contrastar precio neto − descuentos + gastos accesorios con la base declarada. El IVA se registra, pero no se suma otra vez a la base.</Notice></div></div>}
            {valuationMethod === 'justified-market-value' && <div className="grid gap-3 sm:grid-cols-2"><InputField label="Valor de mercado aportado" type="number" value={justifiedValue} suffix="€" disabled={readOnly} onChange={setJustifiedValue} /><InputField label="Fecha de valoración" type="date" value={valuationDate} disabled={readOnly} onChange={setValuationDate} /><InputField label="Método de valoración" value={valuationDescription} placeholder="Informe pericial, comparables…" disabled={readOnly} onChange={setValuationDescription} /><InputField label="Fuente" value={valuationSource} placeholder="Profesional o documento" disabled={readOnly} onChange={setValuationSource} /><div className="sm:col-span-2"><TextAreaField label="Motivo para no usar tablas" value={valuationReason} disabled={readOnly} onChange={setValuationReason} /></div><InputField label="Referencia del documento de respaldo" value={supportingDocument} disabled={readOnly} onChange={setSupportingDocument} /></div>}
            {vatStatus.outcome === 'used' && <div className="mt-4"><InputField label="Precio pagado, sólo para comparación" type="number" value={invoicePrice} suffix="€" disabled={readOnly} onChange={setInvoicePrice} /><p className="mt-1.5 text-[9.5px] text-muted">El precio pagado no sustituye por sí solo al valor de mercado utilizado en el Modelo 576.</p></div>}
          </StepCard>
        )}

        {step === 5 && (
          <StepCard title="Antigüedad y depreciación" description="El servidor aplica los aniversarios naturales exactos del Anexo IV; no divide días entre 365 ni redondea una edad aproximada.">
            {valuationMethod === 'official-table' && selectedVehicle ? <div className="grid gap-3 sm:grid-cols-3"><DataPoint label="Valor oficial nuevo" value={money(selectedVehicle.newVehicleOfficialValue)} /><DataPoint label="Primera puesta en servicio" value={fiscalStartDate || 'Pendiente'} /><DataPoint label="Fecha de devengo" value={accrualDate || 'Pendiente'} /></div> : <Notice tone="info" title="Método sin depreciación tabular">{valuationMethod === 'new-vehicle-vat-base' ? 'Un vehículo nuevo utiliza la base de IVA; no se aplica depreciación de usado.' : 'La valoración justificada ya aporta el valor de mercado y no se transforma silenciosamente con la tabla.'}</Notice>}
            {calculation?.depreciationPercentage !== null && calculation?.depreciationPercentage !== undefined && <div className="mt-3 grid gap-3 sm:grid-cols-2"><DataPoint label="Porcentaje oficial" value={percent(calculation.depreciationPercentage)} /><DataPoint label="Valor tras depreciación" value={calculation.marketValueAfterDepreciation === null ? 'Pendiente' : money(calculation.marketValueAfterDepreciation)} /></div>}
            {valuationMethod === 'official-table' && (
              <div className="mt-4 border-t border-line-soft pt-4">
                <CheckField label="El vehículo estuvo dedicado exclusivamente a taxi, alquiler sin conductor o autoescuela durante más de seis meses" checked={professionalUseClaimed} disabled={readOnly} onChange={setProfessionalUseClaimed} />
                {professionalUseClaimed && (
                  <>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <SelectField label="Actividad profesional" value={professionalActivity} disabled={readOnly} onChange={(value) => setProfessionalActivity(value as typeof professionalActivity)} options={[["taxi", 'Taxi'], ["rental", 'Alquiler sin conductor'], ["driving-school", 'Autoescuela']]} />
                      <InputField label="Inicio de la dedicación exclusiva" type="date" value={professionalStartDate} disabled={readOnly} onChange={setProfessionalStartDate} />
                      <InputField label="Fin de la dedicación exclusiva" type="date" value={professionalEndDate} disabled={readOnly} onChange={setProfessionalEndDate} />
                      <DataPoint label="Duración calculada" value={professionalPeriod.durationMonths === null ? 'Pendiente' : `${professionalPeriod.durationMonths} meses completos`} />
                      <InputField label="Referencia de la evidencia" value={professionalEvidence} placeholder="Licencia, contrato, registro…" disabled={readOnly} onChange={setProfessionalEvidence} />
                      <CheckField label="La dedicación fue exclusiva durante todo el periodo indicado" checked={professionalExclusive} disabled={readOnly} onChange={setProfessionalExclusive} />
                      <div className="sm:col-span-2"><CheckField label="He comprobado actividad, fechas, exclusividad, duración superior a seis meses y evidencia" checked={professionalConfirmed} disabled={readOnly} onChange={setProfessionalConfirmed} /></div>
                    </div>
                    <Notice tone={professionalPeriod.valid ? 'ok' : 'warn'} title={professionalPeriod.valid ? 'Periodo profesional compatible' : 'Periodo profesional pendiente'}>{professionalPeriod.message}</Notice>
                  </>
                )}
                <Notice tone="info" title="Ajuste profesional del Anexo IV">Si se acredita todo lo anterior, el valor ya depreciado se multiplica por el 70 %. No es la reducción de familia numerosa ni la de autocaravana.</Notice>
              </div>
            )}
            <details className="mt-3 rounded-xl bg-bg p-3 text-[10px] leading-relaxed text-ink-soft"><summary className="cursor-pointer font-medium text-ink">¿De dónde sale?</summary><p className="mt-2">Hacienda publica un valor para la versión cuando era nueva. El porcentaje correspondiente se determina según la antigüedad exacta en la fecha de devengo. La fila oficial y la versión del catálogo quedan registradas.</p></details>
          </StepCard>
        )}

        {step === 6 && (
          <StepCard title="Minoración de impuestos indirectos residuales" description="El tipo histórico utilizado dentro del denominador no es el tipo actual que se aplicará después a la liquidación.">
            {vatStatus.outcome === 'new' ? <Notice tone="info" title="No procede para vehículo nuevo">La base de IVA no se deprecia ni se minora como vehículo usado previamente matriculado en el extranjero.</Notice> : <>
              <div className="grid gap-3 sm:grid-cols-2"><SelectField label="Resolución de tipos históricos" value={historicalMode} disabled={readOnly} onChange={(value) => setHistoricalMode(value as HistoricalMode)} options={[["automatic", 'Cronología trazada a fuentes normativas'], ["user-provided", 'Tipos aportados por el usuario · avanzado']]} /><SelectField label="Territorio fiscal histórico" value={territory} disabled={readOnly || historicalMode !== 'automatic'} onChange={(value) => setTerritory(value as FiscalTerritory)} options={[["peninsula-balearics-common", 'Península y Baleares · régimen común'], ["canary-islands", 'Canarias · revisión territorial'], ["ceuta-melilla", 'Ceuta o Melilla · revisión territorial'], ["navarra", 'Navarra · normativa foral'], ["basque-country", 'País Vasco · normativa foral']]} /></div>
              {historicalMode === 'automatic' ? <label className="mt-3 flex items-start gap-2 rounded-xl border border-line bg-bg p-3 text-[10.5px] leading-relaxed text-ink"><input type="checkbox" checked={noOtherIndirectTaxes} disabled={readOnly} onChange={(event) => setNoOtherIndirectTaxes(event.target.checked)} className="mt-0.5 accent-[#C8862E]" /><span>He revisado el territorio y confirmo que no se ha identificado otro impuesto indirecto incorporado. No se asumirá cero sin esta confirmación.</span></label> : <div className="mt-3 grid gap-3 sm:grid-cols-2"><InputField label="IVA histórico, tanto por uno" value={historicalVatRate} placeholder="Ej.: 0,21" disabled={readOnly} onChange={setHistoricalVatRate} /><InputField label="IEDMT histórico, tanto por uno" value={historicalIedmtRate} placeholder="Ej.: 0,0475" disabled={readOnly} onChange={setHistoricalIedmtRate} /><InputField label="Otros tipos, separados por coma" value={otherIndirectTaxRates} placeholder="Vacío si no procede" disabled={readOnly} onChange={setOtherIndirectTaxRates} /><InputField label="Fuente aportada" value={historicalSource} placeholder="Norma, artículo y fecha" disabled={readOnly} onChange={setHistoricalSource} /></div>}
              <details className="mt-3 rounded-xl bg-bg p-3 text-[10px] leading-relaxed text-ink-soft"><summary className="cursor-pointer font-medium text-ink">Fórmula y significado</summary><p className="mt-2 font-mono">BI = VM / [1 + (IVA histórico + IEDMT histórico + otros)]</p><p className="mt-2">La minoración retira la parte residual de impuestos indirectos incorporada en el valor de mercado; no significa restar literalmente impuestos pagados en otro país.</p></details>
            </>}
          </StepCard>
        )}

        {step === 7 && (
          <StepCard title="Epígrafe, tipo actual y reducciones" description="Las emisiones ayudan a resolver el epígrafe; no determinan por sí solas el valor ni la base imponible.">
            <div className="grid gap-3 sm:grid-cols-2"><SelectField label="Categoría" value={category} disabled={readOnly} onFocus={() => onFieldFocus?.('J')} onBlur={() => onFieldFocus?.(null)} status={practiceStatus.J} onChange={(value) => setCategory(value as VehicleCategory | '')} options={['', 'M1', 'M2', 'M3', 'N1', 'N2', 'N3', 'L', 'O', 'SPECIAL', 'UNKNOWN'].map((value) => [value, value || 'Selecciona categoría'])} /><InputField label="Emisiones acreditadas" type="number" value={co2GKm} suffix="g/km" disabled={readOnly} status={practiceStatus['V.7']} onFocus={() => onFieldFocus?.('V.7')} onBlur={() => onFieldFocus?.(null)} onChange={setCo2GKm} mission={() => onMission?.('V.7')} /><SelectField label="Comunidad autónoma del devengo" value={community} disabled={readOnly} onChange={(value) => { const next = value as AutonomousCommunity | ''; setCommunity(next); if (next) setTerritory(territoryForCommunity(next)); }} options={[["", 'Selecciona comunidad'], ...AUTONOMOUS_COMMUNITIES.map((item) => [item.value, item.label] as [string, string])]} /><SelectField label="Clase fiscal del vehículo" value={vehicleKind} disabled={readOnly} onChange={(value) => setVehicleKind(value as VehicleKind)} options={[["standard", 'Vehículo estándar'], ["motorhome", 'Autocaravana o vehículo vivienda'], ["quad", 'Quad'], ["motorcycle", 'Motocicleta'], ["other", 'Otro · revisión']]} /></div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2"><CheckField label="CO₂ contrastado en documentación válida" checked={co2Verified} disabled={readOnly} onChange={setCo2Verified} /><CheckField label="Un único motor no térmico" checked={singleNonCombustionEngine} disabled={readOnly} onChange={setSingleNonCombustionEngine} /><CheckField label="Categoría, CO₂ y territorio revisados" checked={technicalConfirmed} disabled={readOnly} onChange={setTechnicalConfirmed} /></div>
            <div className="mt-5 border-t border-line-soft pt-4"><h4 className="text-[11.5px] font-semibold text-ink">Reducciones legales, distintas de depreciación y minoración</h4><div className="mt-3 grid gap-3 lg:grid-cols-2"><ReductionCard title="Familia numerosa · base al 50 %" checked={largeFamilyClaimed} disabled={readOnly} onChange={setLargeFamilyClaimed}>{largeFamilyClaimed && <div className="mt-3 space-y-3"><SelectField label="Reconocimiento previo" value={largeFamilyStatus} disabled={readOnly} onChange={(value) => setLargeFamilyStatus(value as typeof largeFamilyStatus)} options={[["not-requested", 'No solicitado'], ["pending", 'Pendiente'], ["granted", 'Concedido']]} /><InputField label="Resolución o evidencia" value={largeFamilyEvidence} disabled={readOnly} onChange={setLargeFamilyEvidence} /></div>}</ReductionCard><ReductionCard title="Autocaravana/vivienda · base al 70 %" checked={motorhomeReductionClaimed} disabled={readOnly} onChange={setMotorhomeReductionClaimed}>{motorhomeReductionClaimed && <div className="mt-3 space-y-3"><CheckField label="Elegibilidad técnica y fiscal confirmada" checked={motorhomeEligibilityConfirmed} disabled={readOnly} onChange={setMotorhomeEligibilityConfirmed} /><InputField label="Evidencia" value={motorhomeEvidence} disabled={readOnly} onChange={setMotorhomeEvidence} /></div>}</ReductionCard></div></div>
            {practice && <div className="mt-4 rounded-xl bg-bg p-3"><div className="flex flex-wrap items-center justify-between gap-3"><div className="text-[10.5px] text-ink-soft">Contrasta B, kilometraje, V.7 y J con el documento recreado.</div><button type="button" disabled={readOnly} onClick={checkPractice} className="rounded-full bg-ink px-3 py-2 text-[10px] text-white disabled:cursor-not-allowed disabled:opacity-50">Comprobar lectura</button></div></div>}
          </StepCard>
        )}

        {step === 8 && (
          <StepCard title="Resultado y casillas del Modelo 576" description="El cálculo se ejecuta en servidor y vuelve a validar la fila oficial elegida. Cada bloque conserva origen, fórmula, fuente y advertencias.">
            <Notice tone="info" title="Casillas 05 y 07 con alcance restringido">La casilla 05 sólo puede contener una deducción respaldada por una medida oficial identificada; esta interfaz no admite importes libres y la mantiene en cero. La casilla 07 sólo procede en una autoliquidación complementaria; ese flujo no está habilitado y exige revisión específica.</Notice>
            <button type="button" disabled={readOnly || calculating || !request} onClick={() => void runCalculation()} className="mb-5 inline-flex items-center justify-center gap-2 rounded-full bg-ink px-5 py-2.5 text-[11.5px] font-medium text-white disabled:cursor-not-allowed disabled:opacity-40">{calculating ? <Loader2 size={14} className="animate-spin" /> : <Calculator size={14} />}{readOnly ? 'Cálculo no disponible en solo lectura' : calculation ? 'Actualizar cálculo trazable' : 'Calcular casillas 01 a 08'}</button>
            {calculationError && <Notice tone="warn" title="No se ha podido calcular">{calculationError}</Notice>}
            {calculation ? <FiscalResultPanel calculation={calculation} selectedVehicle={selectedVehicle} stale={resultIsStale} /> : <EmptyResult />}
          </StepCard>
        )}

        {step === 9 && (
          <StepCard title="Revisión final" description="Comprueba la trazabilidad antes de trasladar los datos a la Sede de la AEAT. Esta acción no presenta, firma ni paga el modelo.">
            {calculation ? <FiscalResultPanel calculation={calculation} selectedVehicle={selectedVehicle} stale={resultIsStale} /> : <EmptyResult />}
            <Notice tone="info" title="Límites de esta preparación">No uses este resultado para una deducción lineal de la casilla 05 ni para una complementaria con casilla 07: ambos supuestos requieren su flujo fiscal específico.</Notice>
            <label className="mt-5 flex items-start gap-2 rounded-xl border border-line bg-bg p-4 text-[10.5px] leading-relaxed text-ink"><input type="checkbox" checked={reviewConfirmed} disabled={readOnly} onChange={(event) => setReviewConfirmed(event.target.checked)} className="mt-0.5 accent-[#C8862E]" /><span>He revisado identidad del vehículo, fechas, documentación del CO₂, método de valoración, tipos históricos, reducciones, casillas y fuentes. Sé que MatriculaPro no presenta el Modelo 576.</span></label>
            <button type="button" disabled={readOnly || !reviewConfirmed || calculating || !calculation || !calculationReadyForPreparation(calculation) || resultIsStale} onClick={() => void finishReview()} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-accent px-5 py-3 text-[12px] font-semibold text-ink disabled:cursor-not-allowed disabled:opacity-40">{calculating ? <Loader2 size={14} className="animate-spin" /> : <FileCheck2 size={15} />} {readOnly ? 'Solo lectura' : 'Revisar datos para preparar el Modelo 576'}</button>
            {calculation && !calculationReadyForPreparation(calculation) && <p className="mt-2 text-center text-[9.5px] text-warn">Resuelve los bloqueos antes de preparar las casillas para su traslado a la AEAT.</p>}
            {calculationError && <p role="alert" className="mt-3 text-[10.5px] text-danger">{calculationError}</p>}
          </StepCard>
        )}

        <footer className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-line-soft pt-4">
          <button type="button" disabled={step === 1 || calculating} onClick={() => setStep((current) => Math.max(1, current - 1) as StepNumber)} className="inline-flex items-center gap-1.5 rounded-full border border-line px-4 py-2 text-[10.5px] text-ink disabled:opacity-30"><ChevronLeft size={13} /> Anterior</button>
          <div className="flex items-center gap-2 text-[9.5px] text-muted"><ShieldCheck size={12} /> Datos manuales · fuentes oficiales · sin presentación automática</div>
          {step < 9 && <button type="button" disabled={calculating || (!readOnly && !currentStepValid)} onClick={() => void goNext()} className="inline-flex items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-[10.5px] text-white disabled:opacity-30">Continuar <ChevronRight size={13} /></button>}
        </footer>
      </div>
    </div>
  );
}

function StepHeader({ number, title }: { number: StepNumber; title: string }) {
  return <div className="mb-4 flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent font-mono text-[11px] font-semibold text-ink">{String(number).padStart(2, '0')}</div><div><div className="text-[9px] uppercase tracking-[0.16em] text-muted">Paso {number} de 9</div><div className="text-[12px] font-semibold text-ink">{title}</div></div></div>;
}

function StepCard({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return <section className="rounded-2xl border border-line bg-surface-alt p-4 lg:p-5"><h3 className="font-serif text-[25px] leading-tight text-ink">{title}</h3><p className="mt-2 max-w-3xl text-[11px] leading-relaxed text-ink-soft">{description}</p><div className="mt-5">{children}</div></section>;
}

function MethodCard({ title, badge, description, selected, disabled, onClick }: { title: string; badge: string; description: string; selected: boolean; disabled: boolean; onClick: () => void }) {
  return <button type="button" disabled={disabled} onClick={onClick} className={cn('rounded-2xl border p-4 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-40', selected ? 'border-accent bg-accent-soft/60' : 'border-line bg-surface hover:border-accent/50')}><div className="flex items-start justify-between gap-3"><span className="text-[9px] uppercase tracking-[0.14em] text-accent-deep">{badge}</span>{selected && <CheckCircle2 size={15} className="text-ok" />}</div><h4 className="mt-3 text-[12.5px] font-semibold text-ink">{title}</h4><p className="mt-2 text-[10px] leading-relaxed text-ink-soft">{description}</p></button>;
}

function ReductionCard({ title, checked, disabled, onChange, children }: { title: string; checked: boolean; disabled: boolean; onChange: (value: boolean) => void; children: React.ReactNode }) {
  return <div className="rounded-xl border border-line bg-surface p-3"><label className="flex items-start gap-2 text-[10.5px] font-medium text-ink"><input type="checkbox" checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked)} className="mt-0.5 accent-[#C8862E]" />{title}</label>{children}</div>;
}

function InputField({ label, value, onChange, type = 'text', suffix, placeholder, disabled = false, status, onFocus, onBlur, mission }: { label: string; value: string; onChange: (value: string) => void; type?: string; suffix?: string; placeholder?: string; disabled?: boolean; status?: FieldStatus; onFocus?: () => void; onBlur?: () => void; mission?: () => void }) {
  return <label className="block"><span className="flex items-center justify-between gap-2 text-[10.5px] font-medium text-ink"><span>{label}</span>{mission && <button type="button" onClick={(event) => { event.preventDefault(); mission(); }} className="text-[9px] text-accent-deep">Localizar</button>}</span><span className="relative mt-1.5 block"><input type={type} min={type === 'number' ? 0 : undefined} step={type === 'number' ? 'any' : undefined} value={value} placeholder={placeholder} disabled={disabled} onFocus={onFocus} onBlur={onBlur} onChange={(event) => onChange(event.target.value)} className={cn(inputClass, suffix && 'pr-12', status === 'correct' && 'border-ok', status === 'incorrect' && 'border-danger')} />{suffix && <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[9.5px] text-muted">{suffix}</span>}</span></label>;
}

function TextAreaField({ label, value, onChange, disabled = false }: { label: string; value: string; onChange: (value: string) => void; disabled?: boolean }) {
  return <label className="block"><span className="text-[10.5px] font-medium text-ink">{label}</span><textarea value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)} rows={3} className={cn(inputClass, 'mt-1.5 resize-y')} /></label>;
}

function SelectField({ label, value, onChange, options, disabled = false, onFocus, onBlur, status }: { label: string; value: string; onChange: (value: string) => void; options: Array<readonly [string, string]>; disabled?: boolean; onFocus?: () => void; onBlur?: () => void; status?: FieldStatus }) {
  return <label className="block"><span className="text-[10.5px] font-medium text-ink">{label}</span><select value={value} disabled={disabled} onFocus={onFocus} onBlur={onBlur} onChange={(event) => onChange(event.target.value)} className={cn(inputClass, 'mt-1.5', status === 'correct' && 'border-ok', status === 'incorrect' && 'border-danger')}>{options.map(([optionValue, optionLabel]) => <option key={optionValue || 'empty'} value={optionValue}>{optionLabel}</option>)}</select></label>;
}

function CheckField({ label, checked, onChange, disabled = false }: { label: string; checked: boolean; onChange: (value: boolean) => void; disabled?: boolean }) {
  return <label className="flex items-start gap-2 rounded-xl border border-line bg-surface p-3 text-[10.5px] leading-relaxed text-ink"><input type="checkbox" checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked)} className="mt-0.5 accent-[#C8862E]" />{label}</label>;
}

function Notice({ tone, title, children }: { tone: 'ok' | 'warn' | 'info'; title: string; children: React.ReactNode }) {
  const style = tone === 'ok' ? 'border-ok/20 bg-ok-soft text-ok' : tone === 'warn' ? 'border-warn/20 bg-warn-soft text-warn' : 'border-line bg-bg text-ink-soft';
  const Icon = tone === 'ok' ? CheckCircle2 : tone === 'warn' ? AlertTriangle : Info;
  return <div className={cn('mt-3 flex gap-2 rounded-xl border p-3 text-[10.5px] leading-relaxed', style)}><Icon size={14} className="mt-0.5 shrink-0" /><div><div className="font-semibold">{title}</div><div className="mt-0.5">{children}</div></div></div>;
}

function DataPoint({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-line bg-surface p-3"><div className="text-[9px] uppercase tracking-[0.13em] text-muted">{label}</div><div className="mt-1.5 text-[12px] font-semibold text-ink">{value}</div></div>;
}

function EmptyResult() {
  return <div className="rounded-2xl border border-dashed border-line bg-bg p-6 text-center"><LockKeyhole size={22} className="mx-auto text-muted" /><h4 className="mt-3 font-serif text-[21px] text-ink">Todavía no hay resultado</h4><p className="mx-auto mt-2 max-w-lg text-[10.5px] leading-relaxed text-ink-soft">Completa los datos y solicita el cálculo. Si existe ambigüedad, aparecerán bloqueos concretos en lugar de una cuota inventada.</p></div>;
}

function buildRequest(input: {
  route: RegistrationTaxRoute | '';
  registrationTaxSubjectConfirmed: boolean;
  deliveryDate: string;
  accrualDate: string;
  firstRegistrationDate: string;
  differentFirstService: boolean;
  firstServiceDate: string;
  firstServiceEvidenceConfirmed: boolean;
  firstServiceSource: string;
  parsedMileage: number | null;
  community: AutonomousCommunity | '';
  vehicle: VehicleInput;
  identityBrand: string;
  identityModel: string;
  identityVersion: string;
  identityFuel: string;
  identityEngineCc: string;
  identityPowerKw: string;
  category: VehicleCategory | '';
  parsedCo2: number | null;
  co2Verified: boolean;
  singleNonCombustionEngine: boolean;
  vehicleKind: VehicleKind;
  valuationMethod: ValuationMethod | '';
  vatTaxableBase: string;
  vatBaseSource: string;
  newVehicleCurrency: string;
  exchangeRateToEur: string;
  netPrice: string;
  discounts: string;
  accessoryCosts: string;
  indirectTaxAmount: string;
  acquisitionTerritory: string;
  selectedVehicle: FiscalCatalogVehicle | null;
  invoicePrice: string;
  justifiedValue: string;
  valuationDate: string;
  valuationDescription: string;
  valuationSource: string;
  valuationReason: string;
  supportingDocument: string;
  historicalMode: HistoricalMode;
  territory: FiscalTerritory;
  noOtherIndirectTaxes: boolean;
  historicalVatRate: string;
  historicalIedmtRate: string;
  otherIndirectTaxRates: string;
  historicalSource: string;
  largeFamilyClaimed: boolean;
  largeFamilyStatus: 'granted' | 'pending' | 'not-requested';
  largeFamilyEvidence: string;
  motorhomeReductionClaimed: boolean;
  motorhomeEligibilityConfirmed: boolean;
  motorhomeEvidence: string;
  professionalUseClaimed: boolean;
  professionalActivity: 'taxi' | 'rental' | 'driving-school';
  professionalStartDate: string;
  professionalEndDate: string;
  professionalExclusive: boolean;
  professionalEvidence: string;
  professionalConfirmed: boolean;
}): Model576ApiRequest | null {
  if (!input.route || !input.registrationTaxSubjectConfirmed || !input.deliveryDate || !input.accrualDate || !input.firstRegistrationDate || input.parsedMileage === null || !input.community || !input.category || !input.valuationMethod) return null;
  if (input.differentFirstService && (!input.firstServiceDate || !input.firstServiceEvidenceConfirmed || !input.firstServiceSource.trim())) return null;
  const professionalPeriod = evaluateProfessionalUsePeriod({
    startDate: input.professionalStartDate,
    endDate: input.professionalEndDate,
    fiscalStartDate: input.differentFirstService ? input.firstServiceDate : input.firstRegistrationDate,
    accrualDate: input.accrualDate,
  });
  if (input.valuationMethod === 'official-table' && input.professionalUseClaimed && (
    !professionalPeriod.valid
    || !input.professionalExclusive
    || !input.professionalEvidence.trim()
    || !input.professionalConfirmed
  )) return null;
  let professionalUseHistory: Model576ApiRequest['professionalUseHistory'] = null;
  if (input.valuationMethod === 'official-table' && input.professionalUseClaimed) {
    if (!professionalPeriod.valid) return null;
    professionalUseHistory = {
      activity: input.professionalActivity,
      startDate: input.professionalStartDate,
      endDate: input.professionalEndDate,
      exclusive: input.professionalExclusive,
      durationMonths: professionalPeriod.durationMonths,
      evidenceReference: input.professionalEvidence.trim(),
      confirmed: input.professionalConfirmed,
    };
  }
  let valuation: Model576ApiRequest['valuation'];
  if (input.valuationMethod === 'official-table') {
    if (!input.selectedVehicle) return null;
    valuation = { method: 'official-table', catalogVehicleId: input.selectedVehicle.id, invoicePrice: optionalDecimal(input.invoicePrice) };
  } else if (input.valuationMethod === 'new-vehicle-vat-base') {
    if (!positiveDecimalText(input.vatTaxableBase) || !input.vatBaseSource.trim()) return null;
    if (input.newVehicleCurrency.trim().length !== 3 || (input.newVehicleCurrency !== 'EUR' && !positiveDecimalText(input.exchangeRateToEur))) return null;
    valuation = { method: 'new-vehicle-vat-base', vatTaxableBase: normalizeDecimalText(input.vatTaxableBase), currency: input.newVehicleCurrency.toUpperCase(), exchangeRateToEur: optionalDecimal(input.exchangeRateToEur), netPrice: optionalDecimal(input.netPrice), discounts: optionalDecimal(input.discounts), taxableAccessoryCosts: optionalDecimal(input.accessoryCosts), indirectTaxAmount: optionalDecimal(input.indirectTaxAmount), acquisitionDate: optionalText(input.deliveryDate), territory: optionalText(input.acquisitionTerritory), sourceDescription: input.vatBaseSource.trim() };
  } else {
    if (!positiveDecimalText(input.justifiedValue) || !input.valuationDate || !input.valuationDescription.trim() || !input.valuationSource.trim() || !input.valuationReason.trim()) return null;
    valuation = { method: 'justified-market-value', marketValue: normalizeDecimalText(input.justifiedValue), valuationDate: input.valuationDate, methodDescription: input.valuationDescription.trim(), sourceDescription: input.valuationSource.trim(), reasonForNotUsingTable: input.valuationReason.trim(), supportingDocument: optionalText(input.supportingDocument), invoicePrice: optionalDecimal(input.invoicePrice) };
  }
  const historicalTaxes = input.valuationMethod === 'new-vehicle-vat-base' ? undefined : input.historicalMode === 'automatic'
    ? { mode: 'automatic' as const, territory: input.territory, otherIndirectTaxesConfirmedNone: input.noOtherIndirectTaxes }
    : { mode: 'user-provided' as const, historicalVatRate: normalizeDecimalText(input.historicalVatRate), historicalIedmtRate: normalizeDecimalText(input.historicalIedmtRate), otherIndirectTaxRates: splitDecimalTexts(input.otherIndirectTaxRates), sourceDescription: input.historicalSource.trim() };
  return {
    registrationTaxRoute: input.route,
    registrationTaxSubjectConfirmed: input.registrationTaxSubjectConfirmed,
    referenceDate: input.deliveryDate,
    accrualDate: input.accrualDate,
    firstRegistrationDate: input.firstRegistrationDate,
    firstService: input.differentFirstService ? {
      date: input.firstServiceDate,
      evidenceConfirmed: input.firstServiceEvidenceConfirmed,
      sourceDescription: input.firstServiceSource.trim(),
    } : null,
    mileageKm: input.parsedMileage,
    currentAutonomousCommunity: input.community,
    vehicle: { brand: input.identityBrand.trim(), model: input.identityModel.trim(), version: optionalText(input.identityVersion), fuelType: optionalText(input.identityFuel), engineCapacityCc: parseNumber(input.identityEngineCc), powerKw: parseNumber(input.identityPowerKw), category: input.category, co2GKm: input.parsedCo2, co2Verified: input.co2Verified, singleNonCombustionEngine: input.singleNonCombustionEngine, kind: input.vehicleKind },
    previouslyRegisteredAbroad: input.vehicle.previouslyRegisteredAbroad,
    professionalUseHistory,
    valuation,
    historicalTaxes,
    reductions: {
      largeFamily: { claimed: input.largeFamilyClaimed, priorRecognitionStatus: input.largeFamilyStatus, resolutionReference: optionalText(input.largeFamilyEvidence), evidenceReference: optionalText(input.largeFamilyEvidence) },
      motorhome: { claimed: input.motorhomeReductionClaimed, eligibilityConfirmed: input.motorhomeEligibilityConfirmed, evidenceReference: optionalText(input.motorhomeEvidence) },
    },
    confirmation: { reviewedByUser: false, confirmedAt: null },
  };
}

function stepIsValid(input: {
  step: StepNumber;
  route: RegistrationTaxRoute | '';
  registrationTaxSubjectConfirmed: boolean;
  vatOutcome: string;
  differentFirstService: boolean;
  firstServiceDate: string;
  firstServiceEvidenceConfirmed: boolean;
  firstServiceSource: string;
  valuationMethod: ValuationMethod | '';
  selectedVehicle: FiscalCatalogVehicle | null;
  vatTaxableBase: string;
  vatBaseSource: string;
  newVehicleCurrency: string;
  exchangeRateToEur: string;
  justifiedValue: string;
  valuationDate: string;
  valuationDescription: string;
  valuationSource: string;
  valuationReason: string;
  historicalMode: HistoricalMode;
  noOtherIndirectTaxes: boolean;
  historicalVatRate: string;
  historicalIedmtRate: string;
  historicalSource: string;
  category: VehicleCategory | '';
  parsedCo2: number | null;
  co2Verified: boolean;
  singleNonCombustionEngine: boolean;
  community: AutonomousCommunity | '';
  technicalConfirmed: boolean;
  professionalUseClaimed: boolean;
  professionalPeriod: ProfessionalUsePeriodEvaluation;
  professionalExclusive: boolean;
  professionalEvidence: string;
  professionalConfirmed: boolean;
  calculation: Model576Calculation | null;
}): boolean {
  switch (input.step) {
    case 1: return input.route === 'model-576' && input.registrationTaxSubjectConfirmed;
    case 2: return (input.vatOutcome === 'new' || input.vatOutcome === 'used') && (!input.differentFirstService || Boolean(input.firstServiceDate && input.firstServiceEvidenceConfirmed && input.firstServiceSource.trim()));
    case 3: return Boolean(input.valuationMethod);
    case 4: return input.valuationMethod === 'official-table' ? Boolean(input.selectedVehicle) : input.valuationMethod === 'new-vehicle-vat-base' ? positiveDecimalText(input.vatTaxableBase) && Boolean(input.vatBaseSource.trim()) && input.newVehicleCurrency.trim().length === 3 && (input.newVehicleCurrency === 'EUR' || positiveDecimalText(input.exchangeRateToEur)) : positiveDecimalText(input.justifiedValue) && Boolean(input.valuationDate && input.valuationDescription.trim() && input.valuationSource.trim() && input.valuationReason.trim());
    case 5: return input.valuationMethod !== 'official-table' || !input.professionalUseClaimed || (input.professionalPeriod.valid && input.professionalExclusive && Boolean(input.professionalEvidence.trim()) && input.professionalConfirmed);
    case 6: return input.valuationMethod === 'new-vehicle-vat-base' || (input.historicalMode === 'automatic' ? input.noOtherIndirectTaxes : Boolean(normalizeDecimalText(input.historicalVatRate) && normalizeDecimalText(input.historicalIedmtRate) && input.historicalSource.trim()));
    case 7: return Boolean(input.category && ((input.parsedCo2 !== null && input.parsedCo2 >= 0 && input.co2Verified) || input.singleNonCombustionEngine) && input.community && input.technicalConfirmed);
    case 8: return Boolean(input.calculation);
    case 9: return Boolean(input.calculation);
  }
}

function evaluateProfessionalUsePeriod(input: {
  startDate: string;
  endDate: string;
  fiscalStartDate: string | null;
  accrualDate: string | null;
}): ProfessionalUsePeriodEvaluation {
  if (!input.startDate || !input.endDate) {
    return { valid: false, durationMonths: null, message: 'Indica las fechas de inicio y fin acreditadas; la duración no se introduce manualmente.' };
  }
  if (!input.fiscalStartDate || !input.accrualDate) {
    return { valid: false, durationMonths: null, message: 'Faltan la primera puesta en servicio o matriculación y la fecha de devengo para comprobar el periodo.' };
  }
  const start = parseStrictIsoDate(input.startDate);
  const end = parseStrictIsoDate(input.endDate);
  const fiscalStart = parseStrictIsoDate(input.fiscalStartDate);
  const accrual = parseStrictIsoDate(input.accrualDate);
  if (!start || !end || !fiscalStart || !accrual) {
    return { valid: false, durationMonths: null, message: 'Las cuatro fechas deben ser válidas y usar el formato AAAA-MM-DD.' };
  }
  if (end < start) {
    return { valid: false, durationMonths: null, message: 'El fin de la dedicación profesional no puede ser anterior al inicio.' };
  }
  const durationMonths = fullCalendarMonthsBetween(start, end);
  if (start < fiscalStart) {
    return { valid: false, durationMonths, message: 'El periodo profesional no puede comenzar antes de la primera puesta en servicio o matriculación utilizada fiscalmente.' };
  }
  if (end > accrual) {
    return { valid: false, durationMonths, message: 'El periodo profesional no puede terminar después de la fecha de devengo.' };
  }
  const sixMonthAnniversary = addCalendarMonthsClamped(start, 6);
  if (end <= sixMonthAnniversary) {
    return { valid: false, durationMonths, message: `El ajuste exige superar seis meses naturales: la fecha final debe ser posterior al ${sixMonthAnniversary.toISOString().slice(0, 10)}.` };
  }
  return {
    valid: true,
    durationMonths,
    message: `${durationMonths} meses completos declarados; la fecha final supera el aniversario natural de seis meses y el periodo queda dentro del intervalo fiscal.`,
  };
}

function registrationRouteLabel(value: RegistrationTaxRoute): string {
  return ({
    'model-576': 'Modelo 576 · sujeto y no exento',
    'model-05': 'Modelo 05 · reconocimiento previo',
    'model-06': 'Modelo 06 · sin reconocimiento previo',
    'special-review': 'revisión fiscal especial',
  })[value];
}

function territoryForCommunity(community: AutonomousCommunity | null): FiscalTerritory {
  if (community === 'canarias') return 'canary-islands';
  if (community === 'ceuta' || community === 'melilla') return 'ceuta-melilla';
  if (community === 'navarra') return 'navarra';
  if (community === 'pais-vasco') return 'basque-country';
  return 'peninsula-balearics-common';
}

function splitDecimalTexts(value: string): string[] {
  return value.split(/[;,]/).map(normalizeDecimalText).filter(Boolean);
}

function normalizeDecimalText(value: string): string {
  return value.trim().replace(',', '.');
}

function positiveDecimalText(value: string): boolean {
  const parsed = Number(normalizeDecimalText(value));
  return Number.isFinite(parsed) && parsed > 0;
}

function optionalText(value: string): string | null {
  return value.trim() || null;
}

function optionalDecimal(value: string): string | null {
  return value.trim() ? normalizeDecimalText(value) : null;
}

function calculationInputHash(request: Model576ApiRequest): string {
  return JSON.stringify({ ...request, confirmation: { reviewedByUser: false, confirmedAt: null } });
}

function parseNumber(value: string): number | null {
  if (!value.trim()) return null;
  const parsed = Number(normalizeDecimalText(value));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function numberInput(value: number | null | undefined): string {
  return value === null || value === undefined ? '' : String(value);
}

function normalizeDate(value: string): string {
  return value.trim().slice(0, 10);
}

function shortReference(value: string): string {
  return value.length > 12 ? `${value.slice(0, 8)}…` : value;
}

function toLegacyEpigraph(value: Model576Calculation['epigraph']): TaxCalculation['epigraph'] {
  return value !== null && value >= 1 && value <= 5 ? value as TaxCalculation['epigraph'] : null;
}

function calculationReadyForPreparation(calculation: Model576Calculation): boolean {
  return calculation.status === 'complete-official-table'
    || calculation.status === 'complete-new-vehicle'
    || calculation.status === 'estimated-justified-market-value';
}

function money(value: number): string {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(value);
}

function percent(value: number): string {
  return new Intl.NumberFormat('es-ES', { style: 'percent', maximumFractionDigits: 2 }).format(value);
}

const inputClass = 'w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-[12px] text-ink outline-none focus:border-accent disabled:opacity-50';

export default Simulator576;
