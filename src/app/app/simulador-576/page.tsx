'use client';

import Link from 'next/link';
import { ChevronLeft, Calculator } from 'lucide-react';
import { PracticaIntegrada } from '@/components/modules/practica/PracticaIntegrada';
import { ModuleGate } from '@/components/access/ModuleGate';

export default function Simulador576Page() {
  return (
    <ModuleGate
      moduleId="simulador"
      requiresFounder
      moduleName="Simulador Modelo 576"
      moduleCode="M.02"
      description="Practica el formulario del Modelo 576 que vas a presentar en Hacienda. Corrección campo a campo, fichas aleatorias, casos por dificultad."
      icon={Calculator}
    >
      <div className="min-h-screen bg-bg">
        <div className="px-5 lg:px-8 pt-6 max-w-[1400px] mx-auto">
          <Link href="/app/dashboard" className="inline-flex items-center gap-2 text-[12.5px] text-muted hover:text-ink">
            <ChevronLeft size={14} /> Volver al centro de control
          </Link>
        </div>
        <PracticaIntegrada />
      </div>
    </ModuleGate>
  );
}
