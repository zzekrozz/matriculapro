'use client';

import { Route } from 'lucide-react';
import { ModuleGate } from '@/components/access/ModuleGate';
import { RutaScreen } from '@/components/modules/ruta/RutaScreen';

export default function RutaPage() {
  return (
    <ModuleGate
      requiredCapability="use_advanced_simulators"
      moduleName="Ruta de matriculación"
      moduleCode="M.01"
      description="Recorre y marca los pasos de la ruta orientativa de matriculación."
      icon={Route}
    >
      <RutaScreen />
    </ModuleGate>
  );
}
