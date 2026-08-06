'use client';

import { Wrench } from 'lucide-react';
import { ChecklistScreen } from '@/components/modules/checklist/ChecklistScreen';
import { CHECKLIST_PRE_ITV } from '@/data/checklists';
import { ModuleGate } from '@/components/access/ModuleGate';

export default function Page() {
  return (
    <ModuleGate
      requiredCapability="use_advanced_simulators"
      requiredTier="particular"
      moduleName="Checklist pre-ITV"
      moduleCode="M.05"
      description="Repasa luces, interior, ruedas y motor antes de ir a la ITV de matriculación."
      icon={Wrench}
    >
      <ChecklistScreen checklist={CHECKLIST_PRE_ITV} />
    </ModuleGate>
  );
}
