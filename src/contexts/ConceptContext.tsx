import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Concept, ConceptConcept, ConceptWord, WordLink, ConceptContextType, ConceptTreeNode } from '../types';
import {
  fetchAllUserData,
  fetchWordLinks,
  findConceptByName,
  findWordNode,
  insertConceptNode,
  upsertConceptRelationship,
  insertWordNode,
} from '../services/conceptService';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

const ConceptContext = createContext<ConceptContextType | null>(null);

function buildConceptBank(
  concepts: Concept[],
  conceptConcepts: ConceptConcept[],
  conceptWords: ConceptWord[]
): string {
  if (concepts.length === 0 && conceptWords.length === 0) return '';

  const conceptById = new Map<string, Concept>(concepts.map((c) => [c.id, c]));
  const childToParent = new Map<string, string>(
    conceptConcepts.map((e) => [e.childId, e.parentId])
  );

  const getConceptAncestry = (conceptId: string): string => {
    const path: string[] = [];
    let currentId: string | undefined = conceptId;
    while (currentId) {
      const concept = conceptById.get(currentId);
      if (!concept) break;
      path.unshift(concept.name);
      currentId = childToParent.get(currentId);
    }
    return path.join(' > ');
  };

  const lines: string[] = [];

  for (const w of conceptWords) {
    const wordPart = w.wordLinkName ? `[${w.wordLinkName}] ${w.word}` : w.word;
    if (w.conceptId) {
      const ancestry = getConceptAncestry(w.conceptId);
      lines.push(ancestry ? `${ancestry} > ${wordPart}` : wordPart);
    } else {
      lines.push(wordPart);
    }
  }

  return lines.join('\n');
}

export function ConceptProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [concepts, setConcepts] = useState<Concept[]>([]);
  const [conceptConcepts, setConceptConcepts] = useState<ConceptConcept[]>([]);
  const [conceptWords, setConceptWords] = useState<ConceptWord[]>([]);
  const [wordLinks, setWordLinks] = useState<WordLink[]>([]);

  const refreshConcepts = useCallback(async () => {
    if (!user) return;
    const data = await fetchAllUserData(user.id);
    setConcepts(data.concepts);
    setConceptConcepts(data.conceptConcepts);
    setConceptWords(data.conceptWords);
  }, [user]);

  useEffect(() => {
    if (user) {
      refreshConcepts().catch(() => {});
      fetchWordLinks()
        .then(setWordLinks)
        .catch(() => {});
    } else {
      setConcepts([]);
      setConceptConcepts([]);
      setConceptWords([]);
      setWordLinks([]);
    }
  }, [user, refreshConcepts]);

  const resolveWordLinkId = useCallback(
    (conceptLink: string | undefined): string | null => {
      if (!conceptLink) return null;
      const normalized = conceptLink.toLowerCase().trim();
      const match = wordLinks.find((wl) => wl.name.toLowerCase().trim() === normalized);
      return match?.id ?? null;
    },
    [wordLinks]
  );

  const saveConceptsFromMeaning = useCallback(
    async (
      nodes: ConceptTreeNode[],
      wordName: string,
      selectedNames: Set<string>,
      conceptLink?: string,
      contextDefinition?: string
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

        const existing = await findConceptByName(user.id, normalizedName);

        if (existing) {
          resolvedIds.set(normalizedName, existing.id);
          existingCount++;

          if (resolvedParentId) {
            await upsertConceptRelationship(user.id, resolvedParentId, existing.id);
          }
          continue;
        }

        if (!isSelected) continue;

        try {
          const created = await insertConceptNode(user.id, normalizedName);
          resolvedIds.set(normalizedName, created.id);
          savedCount++;

          if (resolvedParentId) {
            await upsertConceptRelationship(user.id, resolvedParentId, created.id);
          }
        } catch {
          const found = await findConceptByName(user.id, normalizedName);
          if (found) {
            resolvedIds.set(normalizedName, found.id);
          }
        }
      }

      const lastConceptNode = nodes[nodes.length - 1];
      const wordParentNorm = lastConceptNode ? normalizeStr(lastConceptNode.name) : null;
      const wordConceptId = wordParentNorm ? (resolvedIds.get(wordParentNorm) ?? null) : null;
      const normalizedWord = normalizeStr(wordName);
      const wordLinkId = resolveWordLinkId(conceptLink);

      const existingWord = await findWordNode(user.id, normalizedWord, wordConceptId);

      if (!existingWord) {
        try {
          await insertWordNode(user.id, normalizedWord, wordConceptId, wordLinkId, contextDefinition ?? null);
          savedCount++;
        } catch {
          const found = await findWordNode(user.id, normalizedWord, wordConceptId);
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
    [user, refreshConcepts, resolveWordLinkId]
  );

  const conceptBank = buildConceptBank(concepts, conceptConcepts, conceptWords);

  return (
    <ConceptContext.Provider
      value={{ concepts, conceptConcepts, conceptWords, wordLinks, conceptBank, refreshConcepts, saveConceptsFromMeaning }}
    >
      {children}
    </ConceptContext.Provider>
  );
}

export function useConceptContext(): ConceptContextType {
  const ctx = useContext(ConceptContext);
  if (!ctx) throw new Error('useConceptContext must be used within ConceptProvider');
  return ctx;
}
