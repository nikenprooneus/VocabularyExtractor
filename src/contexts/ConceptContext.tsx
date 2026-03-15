import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Concept, ConceptContextType, ConceptTreeNode } from '../types';
import { fetchUserConcepts, insertConcept, updateConceptParent } from '../services/conceptService';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

const ConceptContext = createContext<ConceptContextType | null>(null);

function buildConceptBank(concepts: Concept[]): string {
  if (concepts.length === 0) return '';

  const byId = new Map<string, Concept>(concepts.map((c) => [c.id, c]));

  const getAncestry = (concept: Concept): string => {
    const path: string[] = [concept.name];
    let current = concept;
    while (current.parentId) {
      const parent = byId.get(current.parentId);
      if (!parent) break;
      path.unshift(parent.name);
      current = parent;
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
    async (nodes: ConceptTreeNode[], wordName: string, selectedNames: Set<string>) => {
      if (!user) return;

      const normalizeStr = (s: string) => s.toLowerCase().trim();
      const allNodes = [...nodes, { name: wordName, status: 'EXISTING' as const, tier: 'word' as const }];

      const currentConcepts = await fetchUserConcepts(user.id);
      const byName = new Map<string, Concept>(
        currentConcepts.map((c) => [normalizeStr(c.name), c])
      );

      let savedCount = 0;
      let existingCount = 0;
      const resolvedIds = new Map<string, string>();

      for (const node of allNodes) {
        const normalizedName = normalizeStr(node.name);
        const isWord = node.tier === 'word';
        const isSelected = selectedNames.has(node.name) || isWord;

        const existing = byName.get(normalizedName);

        if (existing) {
          resolvedIds.set(normalizedName, existing.id);
          existingCount++;

          const parentNode = allNodes[allNodes.indexOf(node) - 1];
          if (existing.parentId === null && parentNode) {
            const parentNorm = normalizeStr(parentNode.name);
            const resolvedParentId = resolvedIds.get(parentNorm);
            if (resolvedParentId) {
              await updateConceptParent(existing.id, resolvedParentId);
            }
          }
          continue;
        }

        if (!isSelected) continue;

        const parentNode = allNodes[allNodes.indexOf(node) - 1];
        let parentId: string | null = null;
        if (parentNode) {
          const parentNorm = normalizeStr(parentNode.name);
          parentId = resolvedIds.get(parentNorm) ?? null;
        }

        try {
          const created = await insertConcept(user.id, normalizedName, parentId);
          resolvedIds.set(normalizedName, created.id);
          byName.set(normalizedName, created);
          savedCount++;
        } catch {
          // Concept may have been inserted by a race condition; try to look it up
          const fresh = await fetchUserConcepts(user.id);
          const found = fresh.find((c) => normalizeStr(c.name) === normalizedName);
          if (found) {
            resolvedIds.set(normalizedName, found.id);
            byName.set(normalizedName, found);
          }
        }
      }

      await refreshConcepts();

      if (savedCount > 0) {
        toast.success(
          `Saved ${savedCount} new concept${savedCount !== 1 ? 's' : ''}` +
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
