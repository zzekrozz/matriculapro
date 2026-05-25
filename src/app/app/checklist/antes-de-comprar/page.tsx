import { ChecklistScreen } from '@/components/modules/checklist/ChecklistScreen';
import { CHECKLIST_ANTES_COMPRAR } from '@/data/checklists';

export default function Page() {
  return <ChecklistScreen checklist={CHECKLIST_ANTES_COMPRAR} />;
}
