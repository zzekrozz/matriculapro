'use client';

import { CheckSquare } from 'lucide-react';
import { ChecklistScreen } from '@/components/modules/checklist/ChecklistScreen';
import { CHECKLIST_ANTES_COMPRAR } from '@/data/checklists';
import { ModuleGate } from '@/components/access/ModuleGate';

export default function Page() {
  return (
    <ModuleGate
      requiresFounder
      moduleName="Checklist antes de comprar"
      moduleCode="M.04"
      description="Lista crítica antes de cerrar la compra: documentación, verificación técnica, legal y fiscal."
      icon={CheckSquare}
    >
      <ChecklistScreen checklist={CHECKLIST_ANTES_COMPRAR} />
    </ModuleGate>
  );
}
