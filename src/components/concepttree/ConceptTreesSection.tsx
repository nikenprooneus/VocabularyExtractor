import { GitBranch } from 'lucide-react';
import { ParsedMeaning, ConceptTreeNode } from '../../types';
import { MeaningTreeCard } from './MeaningTreeCard';

interface ConceptTreesSectionProps {
  meaning: ParsedMeaning;
  word: string;
  onSelectionChange: (nodes: ConceptTreeNode[], selectedNames: Set<string>, conceptLink: string, contextDefinition: string) => void;
}

export function ConceptTreesSection({ meaning, word, onSelectionChange }: ConceptTreesSectionProps) {
  const hasTierData = !!(meaning['Tier1']?.trim() || meaning['Tier2']?.trim() || meaning['Tier3']?.trim());

  if (!hasTierData) return null;

  return (
    <div className="bg-card border border-border rounded-xl shadow-sm p-4 sm:p-6">
      <div className="flex items-center gap-2 mb-5">
        <GitBranch size={16} className="text-muted-foreground" />
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Concept Tree</p>
      </div>

      <div className="mb-4 text-xs text-muted-foreground bg-secondary rounded-lg p-3 border border-border">
        <span className="inline-flex items-center gap-1.5 mr-3">
          <span className="w-2 h-2 rounded-full bg-muted-foreground/50 inline-block" />
          Existing concept
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
          New concept (will save with analysis)
        </span>
      </div>

      <MeaningTreeCard
        meaning={meaning}
        word={word}
        onSelectionChange={onSelectionChange}
      />
    </div>
  );
}
