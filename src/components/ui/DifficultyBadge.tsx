import { Sparkles, Zap, AlertTriangle } from 'lucide-react';
import type { Difficulty } from '@/data/practical-cases';
import { DIFFICULTY_LABEL } from '@/data/practical-cases';

const STYLES: Record<Difficulty, { bg: string; text: string }> = {
  easy:   { bg: 'bg-ok-soft',     text: 'text-ok' },
  medium: { bg: 'bg-accent-soft', text: 'text-accent-deep' },
  alert:  { bg: 'bg-danger-soft', text: 'text-danger' },
};

const ICONS: Record<Difficulty, typeof Sparkles> = {
  easy:   Sparkles,
  medium: Zap,
  alert:  AlertTriangle,
};

export function DifficultyBadge({ difficulty }: { difficulty: Difficulty }) {
  const Icon = ICONS[difficulty];
  const s = STYLES[difficulty];
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9.5px] tracking-[0.04em] uppercase font-semibold ${s.bg} ${s.text}`}>
      <Icon size={9} />
      {DIFFICULTY_LABEL[difficulty]}
    </span>
  );
}
