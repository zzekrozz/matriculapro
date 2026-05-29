'use client';

import { Stamp } from 'lucide-react';
import { ChecklistScreen } from '@/components/modules/checklist/ChecklistScreen';
import { CHECKLIST_PRE_DGT } from '@/data/checklists';
import { ModuleGate } from '@/components/access/ModuleGate';

export default function Page() {
  return (
    <ModuleGate
      requiresFounder
      moduleName="Checklist pre-DGT"
      moduleCode="M.07"
      description="Lista de documentación obligatoria antes de presentar el expediente en Tráfico."
      icon={Stamp}
    >
      <ChecklistScreen checklist={CHECKLIST_PRE_DGT} />
    </ModuleGate>
  );
}
