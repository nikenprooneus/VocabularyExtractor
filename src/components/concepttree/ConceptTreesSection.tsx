import { GitBranch } from 'lucide-react';
import { ParsedMeaning } from '../../types';
import { MeaningTreeCard } from './MeaningTreeCard';

interface ConceptTreesSectionProps {
  parsedMeanings: ParsedMeaning[];
  word: string;
}

export function ConceptTreesSection({ parsedMeanings, word }: ConceptTreesSectionProps) {
  const hasTierData = parsedMeanings.some(
    (m) => m['Tier1']?.trim() || m['Tier2']?.trim() || m['Tier3']?.trim()
  );

  if (!hasTierData) return null;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center gap-2 mb-5">
        <GitBranch size={18} className="text-gray-500" />
        <h2 className="text-lg font-semibold text-gray-900">Concept Tree</h2>
        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full ml-1">
          {parsedMeanings.length} {parsedMeanings.length === 1 ? 'meaning' : 'meanings'}
        </span>
      </div>

      <div className="mb-4 text-xs text-gray-500 bg-gray-50 rounded-lg p-3 border border-gray-100">
        <span className="inline-flex items-center gap-1.5 mr-3">
          <span className="w-2 h-2 rounded-full bg-slate-300 inline-block" />
          Existing concept
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
          New concept (check to save)
        </span>
      </div>

      <div className={`grid gap-4 ${parsedMeanings.length > 1 ? 'md:grid-cols-2' : 'grid-cols-1'}`}>
        {parsedMeanings.map((meaning, idx) => (
          <MeaningTreeCard
            key={idx}
            meaning={meaning}
            word={word}
            meaningIndex={idx + 1}
            totalMeanings={parsedMeanings.length}
          />
        ))}
      </div>
    </div>
  );
}
