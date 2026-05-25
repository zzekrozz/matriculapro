import { ChecklistScreen } from '@/components/modules/checklist/ChecklistScreen';
import { CHECKLIST_PRE_DGT } from '@/data/checklists';

export default function Page() {
  return <ChecklistScreen checklist={CHECKLIST_PRE_DGT} />;
}
