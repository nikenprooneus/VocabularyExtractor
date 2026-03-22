import { useState, useCallback, useEffect } from 'react';
import { BookOpen } from 'lucide-react';
import { ParsedMeaning, ConceptTreeNode } from '../../types';
import { ConceptNode } from './ConceptNode';
import { useConceptContext } from '../../contexts/ConceptContext';

interface MeaningTreeCardProps {
  meaning: ParsedMeaning;
  word: string;
  onSelectionChange: (nodes: ConceptTreeNode[], selectedNames: Set<string>, conceptLink: string, contextDefinition: string) => void;
}

export function buildNodes(meaning: ParsedMeaning, existingConceptNames: Set<string>): ConceptTreeNode[] {
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

export function MeaningTreeCard({ meaning, word, onSelectionChange }: MeaningTreeCardProps) {
  const { concepts, conceptWords } = useConceptContext();

  const existingConceptNames = new Set(
    concepts.map((c) => c.name.toLowerCase().trim())
  );
  const nodes = buildNodes(meaning, existingConceptNames);

  const contextDefinition = meaning['Context Definition'] || meaning['Definition'] || '';
  const conceptLink = meaning['ConceptLink']?.trim() || '';

  const lastTierName = nodes[nodes.length - 1]?.name.toLowerCase().trim() ?? null;
  const wordParentConcept = lastTierName
    ? concepts.find((c) => c.name.toLowerCase().trim() === lastTierName)
    : null;
  const wordAlreadyExists = conceptWords.some(
    (w) => w.conceptId === (wordParentConcept?.id ?? null)
  );

  const newNodes = nodes.filter((n) => n.status === 'NEW');
  const hasNewWord = !wordAlreadyExists;
  const hasAnythingNew = newNodes.length > 0 || hasNewWord;

  const [selectedNames, setSelectedNames] = useState<Set<string>>(
    () => new Set(newNodes.map((n) => n.name))
  );

  useEffect(() => {
    onSelectionChange(nodes, selectedNames, conceptLink, contextDefinition);
  }, [nodes, selectedNames, conceptLink, contextDefinition, onSelectionChange]);

  const handleToggle = useCallback((name: string) => {
    setSelectedNames((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      onSelectionChange(nodes, next, conceptLink, contextDefinition);
      return next;
    });
  }, [nodes, conceptLink, contextDefinition, onSelectionChange]);

  const newCount = newNodes.length + (hasNewWord ? 1 : 0);
  const existingConceptCount = nodes.filter((n) => n.status === 'EXISTING').length;
  const existingCount = existingConceptCount + (wordAlreadyExists ? 1 : 0);
  const hasAnyNodes = nodes.length > 0;

  return (
    <div className="bg-card border border-border rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <BookOpen size={15} className="text-muted-foreground" />
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Meaning
          </span>
        </div>
        {hasAnythingNew && (
          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center gap-1 text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-700/50 px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
              {newCount} new
            </span>
          </div>
        )}
      </div>

      {hasAnyNodes ? (
        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-2 mb-4">
          {nodes.map((node, idx) => (
            <>
              <ConceptNode
                key={node.name}
                name={node.name}
                status={node.status}
                tier={node.tier}
                isSelected={selectedNames.has(node.name)}
                onToggle={() => handleToggle(node.name)}
              />
              {idx < nodes.length - 1 && (
                <span key={`arrow-${idx}`} className="text-border text-sm font-light select-none">›</span>
              )}
              {idx === nodes.length - 1 && (
                <>
                  <span key={`arrow-last`} className="text-border text-sm font-light select-none">›</span>
                  {conceptLink ? (
                    <span key="concept-link" className="text-xs italic text-muted-foreground bg-secondary border border-border px-2 py-0.5 rounded-full select-none">
                      {conceptLink}
                    </span>
                  ) : (
                    <span key="concept-dots" className="text-xs text-muted-foreground font-mono px-1 select-none">···</span>
                  )}
                  <span key="arrow-word" className="text-border text-sm font-light select-none">›</span>
                  <ConceptNode
                    key="word-node"
                    name={word}
                    status={wordAlreadyExists ? 'EXISTING' : 'NEW'}
                    tier="word"
                  />
                </>
              )}
            </>
          ))}
          {nodes.length === 0 && (
            <ConceptNode name={word} status={wordAlreadyExists ? 'EXISTING' : 'NEW'} tier="word" />
          )}
        </div>
      ) : (
        <div className="mb-4">
          <ConceptNode name={word} status={wordAlreadyExists ? 'EXISTING' : 'NEW'} tier="word" />
        </div>
      )}

      {contextDefinition && (
        <p className="text-sm text-muted-foreground leading-relaxed mb-4 pl-1 border-l-2 border-border">
          {contextDefinition}
        </p>
      )}

      <div className="flex items-center pt-3 border-t border-border">
        <div className="flex gap-3 text-xs text-muted-foreground">
          {existingCount > 0 && (
            <span>{existingCount} existing</span>
          )}
          {newCount > 0 && (
            <span className="text-emerald-400">{newCount} new</span>
          )}
          {!hasAnythingNew && (
            <span className="italic">All concepts exist</span>
          )}
        </div>
      </div>
    </div>
  );
}
