import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Concept, ConceptContextType, ConceptTreeNode } from '../types';
import {
  fetchUserConcepts,
  findConceptByNameAndType,
  insertConcept,
  updateConceptParent,
} from '../services/conceptService';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

const ConceptContext = createContext<ConceptContextType | null>(null);

function buildConceptBank(concepts: Concept[]): string {
  if (concepts.length === 0) return '';

  const byId = new Map<string, Concept>(concepts.map((c) => [c.id, c]));

  const getAncestry = (concept: Concept): string => {
    const path: string[] = [];
    let current: Concept | undefined = concept;

    while (current) {
      if (current.nodeType === 'word' && current.conceptLink) {
        path.unshift(`[${current.conceptLink}] ${current.name}`);
      } else {
        path.unshift(current.name);
      }
      current = current.parentId ? byId.get(current.parentId) : undefined;
    }

    return path.join(' > ');
  };

  return concepts.map(getAncestry).join('\n');
}

export function ConceptProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [concepts, setConcepts] = useState<Concept[]>([]);

  const refreshConcepts = useCallback(async () => {
    if (!user) return;
    const data = await fetchUserConcepts(user.id);
    setConcepts(data);
  }, [user]);

  useEffect(() => {
    if (user) {
      refreshConcepts().catch(() => {});
    } else {
      setConcepts([]);
    }
  }, [user, refreshConcepts]);

  const saveConceptsFromMeaning = useCallback(
    async (
      nodes: ConceptTreeNode[],
      wordName: string,
      selectedNames: Set<string>,
      conceptLink?: string
    ) => {
      if (!user) return;

      const normalizeStr = (s: string) => s.toLowerCase().trim();
      let savedCount = 0;
      let existingCount = 0;
      const resolvedIds = new Map<string, string>();

      for (const node of nodes) {
        const normalizedName = normalizeStr(node.name);
        const isSelected = selectedNames.has(node.name);

        const parentNode = nodes[nodes.indexOf(node) - 1];
        const parentNorm = parentNode ? normalizeStr(parentNode.name) : null;
        const resolvedParentId = parentNorm ? (resolvedIds.get(parentNorm) ?? null) : null;

        const existing = await findConceptByNameAndType(user.id, normalizedName, 'concept');

        if (existing) {
          resolvedIds.set(normalizedName, existing.id);
          existingCount++;

          if (existing.parentId === null && resolvedParentId) {
            await updateConceptParent(existing.id, resolvedParentId);
          }
          continue;
        }

        if (!isSelected) continue;

        try {
          const created = await insertConcept(user.id, normalizedName, resolvedParentId, 'concept');
          resolvedIds.set(normalizedName, created.id);
          savedCount++;
        } catch {
          const found = await findConceptByNameAndType(user.id, normalizedName, 'concept');
          if (found) {
            resolvedIds.set(normalizedName, found.id);
          }
        }
      }

      const lastConceptNode = nodes[nodes.length - 1];
      const wordParentNorm = lastConceptNode ? normalizeStr(lastConceptNode.name) : null;
      const wordParentId = wordParentNorm ? (resolvedIds.get(wordParentNorm) ?? null) : null;
      const normalizedWord = normalizeStr(wordName);
      const link = conceptLink?.trim() || null;

      const existingWord = await findConceptByNameAndType(user.id, normalizedWord, 'word', wordParentId);

      if (!existingWord) {
        try {
          await insertConcept(user.id, normalizedWord, wordParentId, 'word', link);
          savedCount++;
        } catch {
          const found = await findConceptByNameAndType(user.id, normalizedWord, 'word', wordParentId);
          if (!found) {
            console.error('Failed to insert word node for', normalizedWord);
          }
        }
      } else {
        existingCount++;
      }

      await refreshConcepts();

      if (savedCount > 0) {
        toast.success(
          `Saved ${savedCount} new node${savedCount !== 1 ? 's' : ''}` +
            (existingCount > 0 ? ` (${existingCount} already existed)` : '')
        );
      } else {
        toast(`All selected concepts already exist in your bank`, { icon: 'ℹ️' });
      }
    },
    [user, refreshConcepts]
  );

  const conceptBank = buildConceptBank(concepts);

  return (
    <ConceptContext.Provider value={{ concepts, conceptBank, refreshConcepts, saveConceptsFromMeaning }}>
      {children}
    </ConceptContext.Provider>
  );
}

export function useConceptContext(): ConceptContextType {
  const ctx = useContext(ConceptContext);
  if (!ctx) throw new Error('useConceptContext must be used within ConceptProvider');
  return ctx;
}
