'use client';

import { Stamp } from 'lucide-react';
import { ChecklistScreen } from '@/components/modules/checklist/ChecklistScreen';
import { CHECKLIST_PRE_DGT } from '@/data/checklists';
import { ModuleGate } from '@/components/access/ModuleGate';

export default function Page() {
  return (
    <ModuleGate
      requiredCapability="use_advanced_simulators"
      requiredTier="particular"
      moduleName="Checklist pre-DGT"
      moduleCode="M.07"
      description="Checklist generada desde vendedor, procedencia, ITV y decisión fiscal del expediente activo."
      icon={Stamp}
    >
      <ChecklistScreen checklist={CHECKLIST_PRE_DGT} />
    </ModuleGate>
  );
}
