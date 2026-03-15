import { ConceptNodeStatus } from '../../types';

interface ConceptNodeProps {
  name: string;
  status: ConceptNodeStatus;
  isSelected?: boolean;
  onToggle?: () => void;
  tier: 'word' | 1 | 2 | 3;
}

const tierStyles: Record<string | number, string> = {
  1: 'bg-slate-100 border-slate-300 text-slate-700',
  2: 'bg-slate-50 border-slate-200 text-slate-600',
  3: 'bg-gray-50 border-gray-200 text-gray-600',
  word: 'bg-blue-50 border-blue-300 text-blue-800 font-semibold',
};

const newStyles: Record<string | number, string> = {
  1: 'bg-emerald-100 border-emerald-400 text-emerald-800',
  2: 'bg-emerald-50 border-emerald-300 text-emerald-700',
  3: 'bg-green-50 border-green-200 text-green-700',
  word: 'bg-blue-50 border-blue-300 text-blue-800 font-semibold',
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
          className="w-3.5 h-3.5 rounded border-emerald-400 text-emerald-600 cursor-pointer flex-shrink-0 accent-emerald-600"
        />
      )}
      <span
        className={`inline-flex items-center px-2.5 py-1 rounded-full border text-sm whitespace-nowrap ${baseStyle} ${isNew ? 'ring-1 ring-emerald-300/50' : ''}`}
      >
        {name}
      </span>
    </div>
  );
}
