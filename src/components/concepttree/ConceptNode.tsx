import { ConceptNodeStatus } from '../../types';

interface ConceptNodeProps {
  name: string;
  status: ConceptNodeStatus;
  isSelected?: boolean;
  onToggle?: () => void;
  tier: 'word' | 1 | 2 | 3;
}

const tierStyles: Record<string | number, string> = {
  1: 'bg-secondary border-border text-foreground/80',
  2: 'bg-secondary/70 border-border text-foreground/70',
  3: 'bg-secondary/50 border-border text-foreground/60',
  word: 'bg-primary/10 border-primary/40 text-primary font-semibold',
};

const newStyles: Record<string | number, string> = {
  1: 'bg-emerald-950/40 border-emerald-700 text-emerald-400',
  2: 'bg-emerald-950/30 border-emerald-700/70 text-emerald-400',
  3: 'bg-emerald-950/20 border-emerald-800/60 text-emerald-500',
  word: 'bg-primary/10 border-primary/40 text-primary font-semibold',
};

export function ConceptNode({ name, status, isSelected, onToggle, tier }: ConceptNodeProps) {
  const isNew = status === 'NEW' && tier !== 'word';
  const baseStyle = isNew ? newStyles[tier] : tierStyles[tier];

  return (
    <div className="flex items-center gap-1.5">
      {isNew && onToggle && (
        <input
          type="checkbox"
          checked={isSelected ?? false}
          onChange={onToggle}
          className="w-3.5 h-3.5 rounded border-emerald-600 text-emerald-500 cursor-pointer flex-shrink-0 accent-emerald-500"
        />
      )}
      <span
        className={`inline-flex items-center px-2.5 py-1 rounded-full border text-sm whitespace-nowrap ${baseStyle} ${isNew ? 'ring-1 ring-emerald-700/50' : ''}`}
      >
        {name}
      </span>
    </div>
  );
}
