'use client';

import Link from 'next/link';
import { ChevronLeft, Calculator } from 'lucide-react';
import { PracticaIntegrada } from '@/components/modules/practica/PracticaIntegrada';
import { ModuleGate } from '@/components/access/ModuleGate';
import {
  PRACTICE_REGISTRATION_CASE,
  calculateRegistrationTaxEstimate,
  determineRegistrationTaxRoute,
} from '@/domain/registration';

const PRACTICE_CALCULATION = calculateRegistrationTaxEstimate(
  PRACTICE_REGISTRATION_CASE,
  determineRegistrationTaxRoute(PRACTICE_REGISTRATION_CASE),
);

export default function Simulador576Page() {
  return (
    <ModuleGate
      requiredCapability="run_fiscal_calculations"
      moduleId="simulador"
      requiredTier="particular"
      moduleName="Simulador Modelo 576"
      moduleCode="M.02"
      description="Practica un cálculo fiscal trazable en nueve pasos y aprende de dónde sale cada casilla. No reproduce ni presenta el formulario oficial."
      icon={Calculator}
    >
      <div className="min-h-screen bg-bg">
        <div className="px-5 lg:px-8 pt-6 max-w-[1400px] mx-auto">
          <Link href="/app/dashboard" className="inline-flex items-center gap-2 text-[12.5px] text-muted hover:text-ink">
            <ChevronLeft size={14} /> Volver al centro de control
          </Link>
        </div>
        <PracticaIntegrada
          mode="practice"
          vehicle={PRACTICE_REGISTRATION_CASE.vehicle}
          initialCalculation={PRACTICE_CALCULATION}
        />
      </div>
    </ModuleGate>
  );
}
