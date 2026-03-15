import { supabase } from '../lib/supabase';
import { Concept, ConceptConcept, ConceptWord, WordLink, GraphData, GraphNode, GraphLink, LookupTables } from '../types';
import { fetchLookupTables } from './supabaseService';

const normalize = (s: string) => s.toLowerCase().trim();

// ─── Row mappers ─────────────────────────────────────────────────────────────

type ConceptRow = Record<string, unknown>;
type ConceptWordRow = ConceptRow & { word_links?: { name: string } | null };

const mapConceptRow = (row: ConceptRow): Concept => ({
  id: row.id as string,
  userId: row.user_id as string,
  name: row.name as string,
  createdAt: row.created_at as string,
});

const mapConceptConceptRow = (row: ConceptRow): ConceptConcept => ({
  id: row.id as string,
  userId: row.user_id as string,
  parentId: row.parent_id as string,
  childId: row.child_id as string,
});

const mapConceptWordRow = (row: ConceptWordRow): ConceptWord => ({
  id: row.id as string,
  userId: row.user_id as string,
  wordId: row.word_id as string,
  conceptId: (row.concept_id as string) ?? null,
  wordLinkId: (row.word_link_id as string) ?? null,
  wordLinkName: row.word_links?.name ?? undefined,
  contextDefinition: (row.context_definition as string) ?? null,
  createdAt: row.created_at as string,
});

// ─── Fetch ────────────────────────────────────────────────────────────────────

export const fetchAllUserData = async (
  userId: string
): Promise<{ concepts: Concept[]; conceptConcepts: ConceptConcept[]; conceptWords: ConceptWord[]; wordTextById: Map<string, string> }> => {
  const [conceptsRes, edgesRes, wordsRes] = await Promise.all([
    supabase
      .from('concepts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true }),
    supabase
      .from('concept_concepts')
      .select('*')
      .eq('user_id', userId),
    supabase
      .from('concept_words')
      .select('*, word_links(name), words(word)')
      .eq('user_id', userId)
      .order('created_at', { ascending: true }),
  ]);

  if (conceptsRes.error) throw conceptsRes.error;
  if (edgesRes.error) throw edgesRes.error;
  if (wordsRes.error) throw wordsRes.error;

  const wordTextById = new Map<string, string>();
  for (const row of (wordsRes.data || [])) {
    const wRow = row as Record<string, unknown> & { words?: { word: string } | null };
    if (wRow.word_id && wRow.words?.word) {
      wordTextById.set(wRow.word_id as string, wRow.words.word);
    }
  }

  return {
    concepts: (conceptsRes.data || []).map(mapConceptRow),
    conceptConcepts: (edgesRes.data || []).map(mapConceptConceptRow),
    conceptWords: (wordsRes.data || []).map(mapConceptWordRow),
    wordTextById,
  };
};

export const fetchWordLinks = async (): Promise<WordLink[]> => {
  const { data, error } = await supabase
    .from('word_links')
    .select('id, name')
    .order('name', { ascending: true });

  if (error) throw error;
  return (data || []) as WordLink[];
};

// ─── Lookups ──────────────────────────────────────────────────────────────────

export const findConceptByName = async (
  userId: string,
  name: string
): Promise<Concept | null> => {
  const { data, error } = await supabase
    .from('concepts')
    .select('*')
    .eq('user_id', userId)
    .eq('name', normalize(name))
    .maybeSingle();

  if (error) throw error;
  return data ? mapConceptRow(data) : null;
};

export const findWordNodeByWordId = async (
  wordId: string,
  conceptId: string | null
): Promise<ConceptWord | null> => {
  let query = supabase
    .from('concept_words')
    .select('*, word_links(name)')
    .eq('word_id', wordId);

  if (conceptId === null) {
    query = query.is('concept_id', null);
  } else {
    query = query.eq('concept_id', conceptId);
  }

  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  return data ? mapConceptWordRow(data) : null;
};

// ─── Inserts ──────────────────────────────────────────────────────────────────

export const insertConceptNode = async (
  userId: string,
  name: string
): Promise<Concept> => {
  const { data, error } = await supabase
    .from('concepts')
    .insert({ user_id: userId, name: normalize(name) })
    .select('*')
    .single();

  if (error) throw error;
  return mapConceptRow(data);
};

export const upsertConceptRelationship = async (
  userId: string,
  parentId: string,
  childId: string
): Promise<void> => {
  const { error } = await supabase
    .from('concept_concepts')
    .upsert(
      { user_id: userId, parent_id: parentId, child_id: childId },
      { onConflict: 'parent_id,child_id', ignoreDuplicates: true }
    );

  if (error) throw error;
};

export const insertWordNode = async (
  userId: string,
  wordId: string,
  conceptId: string | null,
  wordLinkId?: string | null,
  contextDefinition?: string | null
): Promise<ConceptWord> => {
  const { data, error } = await supabase
    .from('concept_words')
    .insert({
      user_id: userId,
      word_id: wordId,
      concept_id: conceptId ?? null,
      word_link_id: wordLinkId ?? null,
      context_definition: contextDefinition ?? null,
    })
    .select('*, word_links(name)')
    .single();

  if (error) throw error;
  return mapConceptWordRow(data);
};

// ─── Knowledge Graph ──────────────────────────────────────────────────────────

type WordRow = Record<string, unknown>;

const mapWordGraphRow = (row: WordRow) => ({
  id: row.id as string,
  word: row.word as string,
  example: row.example as string,
  note: (row.note ?? {}) as Record<string, string | undefined>,
  toneId: (row.tone_id as string) ?? null,
  dialectId: (row.dialect_id as string) ?? null,
  modeId: (row.mode_id as string) ?? null,
  nuanceId: (row.nuance_id as string) ?? null,
  registerId: (row.register_id as string) ?? null,
});

export const fetchGraphData = async (
  userId: string
): Promise<{ graphData: GraphData; lookupTables: LookupTables }> => {
  const [conceptsRes, edgesRes, wordsRes, conceptWordsRes, lookupTables] = await Promise.all([
    supabase.from('concepts').select('*').eq('user_id', userId),
    supabase.from('concept_concepts').select('*').eq('user_id', userId),
    supabase
      .from('words')
      .select('id, word, example, note, tone_id, dialect_id, mode_id, nuance_id, register_id')
      .eq('user_id', userId),
    supabase
      .from('concept_words')
      .select('id, word_id, concept_id, word_link_id, context_definition, word_links(name)')
      .eq('user_id', userId),
    fetchLookupTables(),
  ]);

  if (conceptsRes.error) throw conceptsRes.error;
  if (edgesRes.error) throw edgesRes.error;
  if (wordsRes.error) throw wordsRes.error;
  if (conceptWordsRes.error) throw conceptWordsRes.error;

  const concepts: Concept[] = (conceptsRes.data || []).map(mapConceptRow);
  const conceptConcepts: ConceptConcept[] = (edgesRes.data || []).map(mapConceptConceptRow);
  const words = (wordsRes.data || []).map(mapWordGraphRow);
  const conceptWordRows = (conceptWordsRes.data || []).map((r) => {
    const row = r as Record<string, unknown> & { word_links?: { name: string } | null };
    return {
      wordId: row.word_id as string,
      conceptId: (row.concept_id as string) ?? null,
      wordLinkId: (row.word_link_id as string) ?? null,
      wordLinkName: row.word_links?.name ?? null,
      contextDefinition: (row.context_definition as string) ?? null,
    };
  });

  const cwByWordId = new Map<string, typeof conceptWordRows[0]>();
  for (const cw of conceptWordRows) {
    cwByWordId.set(cw.wordId, cw);
  }

  const nodes: GraphNode[] = [];
  const links: GraphLink[] = [];

  for (const concept of concepts) {
    nodes.push({ id: concept.id, label: concept.name, type: 'concept' });
  }

  for (const edge of conceptConcepts) {
    links.push({ source: edge.parentId, target: edge.childId, linkType: 'concept-concept' });
  }

  for (const word of words) {
    const cw = cwByWordId.get(word.id);
    const payload = {
      wordId: word.id,
      word: word.word,
      example: word.example,
      note: word.note,
      toneId: word.toneId,
      dialectId: word.dialectId,
      modeId: word.modeId,
      nuanceId: word.nuanceId,
      registerId: word.registerId,
      conceptId: cw?.conceptId ?? null,
      wordLinkId: cw?.wordLinkId ?? null,
      wordLinkName: cw?.wordLinkName ?? null,
      contextDefinition: cw?.contextDefinition ?? null,
    };

    nodes.push({ id: word.id, label: word.word, type: 'word', payload });

    if (cw?.conceptId) {
      links.push({
        source: word.id,
        target: cw.conceptId,
        label: cw.wordLinkName ?? undefined,
        linkType: 'word-concept',
      });
    }

    const tmrndLinks: { subType: 'tone' | 'dialect' | 'mode' | 'nuance' | 'register'; id: string | null }[] = [
      { subType: 'tone', id: word.toneId },
      { subType: 'dialect', id: word.dialectId },
      { subType: 'mode', id: word.modeId },
      { subType: 'nuance', id: word.nuanceId },
      { subType: 'register', id: word.registerId },
    ];

    for (const { subType, id } of tmrndLinks) {
      if (!id) continue;
      const nodeId = `${word.id}-tmrnd-${subType}-${id}`;
      const table = lookupTables[`${subType}s` as keyof LookupTables] as { id: string; name: string }[];
      const entry = table.find((t) => t.id === id);
      if (entry) {
        nodes.push({ id: nodeId, label: entry.name, type: 'tmrnd', tmrndSubType: subType });
        links.push({ source: word.id, target: nodeId, linkType: 'word-tmrnd' });
      }
    }
  }

  return { graphData: { nodes, links }, lookupTables };
};
