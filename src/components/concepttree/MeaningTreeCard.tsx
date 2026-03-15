import { useState, useCallback } from 'react';
import { Save, BookOpen } from 'lucide-react';
import { ParsedMeaning, ConceptTreeNode } from '../../types';
import { ConceptNode } from './ConceptNode';
import { useConceptContext } from '../../contexts/ConceptContext';

interface MeaningTreeCardProps {
  meaning: ParsedMeaning;
  word: string;
  meaningIndex: number;
  totalMeanings: number;
}

function buildNodes(meaning: ParsedMeaning, existingConceptNames: Set<string>): ConceptTreeNode[] {
  const tierFields = ['Tier1', 'Tier2', 'Tier3'] as const;
  const nodes: ConceptTreeNode[] = [];

  for (let i = 0; i < tierFields.length; i++) {
    const key = tierFields[i];
    const value = meaning[key]?.trim();
    if (!value) break;
    const normalizedValue = value.toLowerCase().trim();
    nodes.push({
      name: value,
      status: existingConceptNames.has(normalizedValue) ? 'EXISTING' : 'NEW',
      tier: (i + 1) as 1 | 2 | 3,
    });
  }

  return nodes;
}

export function MeaningTreeCard({ meaning, word, meaningIndex, totalMeanings }: MeaningTreeCardProps) {
  const { concepts, saveConceptsFromMeaning } = useConceptContext();
  const [isSaving, setIsSaving] = useState(false);

  const existingConceptNames = new Set(concepts.map((c) => c.name.toLowerCase().trim()));
  const nodes = buildNodes(meaning, existingConceptNames);

  const newNodes = nodes.filter((n) => n.status === 'NEW');
  const [selectedNames, setSelectedNames] = useState<Set<string>>(
    () => new Set(newNodes.map((n) => n.name))
  );

  const handleToggle = useCallback((name: string) => {
    setSelectedNames((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await saveConceptsFromMeaning(nodes, word, selectedNames);
    } finally {
      setIsSaving(false);
    }
  };

  const contextDefinition = meaning['Context Definition'] || meaning['Definition'] || '';
  const conceptLink = meaning['ConceptLink']?.trim() || '';
  const hasAnyNodes = nodes.length > 0;
  const hasNewSelected = newNodes.some((n) => selectedNames.has(n.name));

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <BookOpen size={15} className="text-gray-400" />
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            {totalMeanings > 1 ? `Meaning ${meaningIndex}` : 'Meaning'}
          </span>
        </div>
        {newNodes.length > 0 && (
          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
              {newNodes.length} new
            </span>
          </div>
        )}
      </div>

      {hasAnyNodes ? (
        <div className="flex flex-wrap items-center gap-1.5 mb-4">
          {nodes.map((node, idx) => (
            <div key={node.name} className="flex items-center gap-1.5">
              <ConceptNode
                name={node.name}
                status={node.status}
                tier={node.tier}
                isSelected={selectedNames.has(node.name)}
                onToggle={() => handleToggle(node.name)}
              />
              <span className="text-gray-300 text-sm font-light select-none">›</span>
              {idx === nodes.length - 1 && (
                <>
                  {conceptLink ? (
                    <span className="text-xs italic text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full select-none">
                      {conceptLink}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-400 font-mono px-1 select-none">···</span>
                  )}
                  <span className="text-gray-300 text-sm font-light select-none">›</span>
                  <ConceptNode
                    name={word}
                    status="EXISTING"
                    tier="word"
                  />
                </>
              )}
            </div>
          ))}
          {nodes.length === 0 && (
            <ConceptNode name={word} status="EXISTING" tier="word" />
          )}
        </div>
      ) : (
        <div className="mb-4">
          <ConceptNode name={word} status="EXISTING" tier="word" />
        </div>
      )}

      {contextDefinition && (
        <p className="text-sm text-gray-600 leading-relaxed mb-4 pl-1 border-l-2 border-gray-200">
          {contextDefinition}
        </p>
      )}

      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        <div className="flex gap-3 text-xs text-gray-400">
          {nodes.filter((n) => n.status === 'EXISTING').length > 0 && (
            <span>{nodes.filter((n) => n.status === 'EXISTING').length} existing</span>
          )}
          {newNodes.length > 0 && (
            <span className="text-emerald-600">{newNodes.length} new</span>
          )}
        </div>
        {newNodes.length > 0 && (
          <button
            onClick={handleSave}
            disabled={isSaving || !hasNewSelected}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Save size={13} />
            {isSaving ? 'Saving...' : 'Save Selected'}
          </button>
        )}
        {newNodes.length === 0 && (
          <span className="text-xs text-gray-400 italic">All concepts exist</span>
        )}
      </div>
    </div>
  );
}
