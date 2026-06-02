'use client';

import { Car } from 'lucide-react';
import RecorridoITV from '@/components/modules/itv/RecorridoITV';
import { ModuleGate } from '@/components/access/ModuleGate';
import { useAccess } from '@/providers/AccessProvider';

export default function RecorridoITVPage() {
  const { isExplorer } = useAccess();

  return (
    <ModuleGate
      moduleId="itv"
      requiresFounder
      moduleName="Recorrido ITV interactivo"
      moduleCode="M.06"
      description="Maqueta de estación ITV con luces, rodillos y medidor de frenos. Te decimos qué te piden, qué haces y qué revisar antes."
      icon={Car}
    >
      {/* Explorer: modo demo (5 pasos). Founder: completo (11 pasos) */}
      <RecorridoITV isDemo={isExplorer} />
    </ModuleGate>
  );
}
