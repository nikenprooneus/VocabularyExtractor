import { supabase } from '../lib/supabase';
import { Concept, ConceptConcept, ConceptWord, WordLink } from '../types';

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
  word: row.word as string,
  conceptId: (row.concept_id as string) ?? null,
  wordLinkId: (row.word_link_id as string) ?? null,
  wordLinkName: row.word_links?.name ?? undefined,
  contextDefinition: (row.context_definition as string) ?? null,
  createdAt: row.created_at as string,
});

// ─── Fetch ────────────────────────────────────────────────────────────────────

export const fetchAllUserData = async (
  userId: string
): Promise<{ concepts: Concept[]; conceptConcepts: ConceptConcept[]; conceptWords: ConceptWord[] }> => {
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
      .select('*, word_links(name)')
      .eq('user_id', userId)
      .order('created_at', { ascending: true }),
  ]);

  if (conceptsRes.error) throw conceptsRes.error;
  if (edgesRes.error) throw edgesRes.error;
  if (wordsRes.error) throw wordsRes.error;

  return {
    concepts: (conceptsRes.data || []).map(mapConceptRow),
    conceptConcepts: (edgesRes.data || []).map(mapConceptConceptRow),
    conceptWords: (wordsRes.data || []).map(mapConceptWordRow),
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

export const findWordNode = async (
  userId: string,
  word: string,
  conceptId: string | null
): Promise<ConceptWord | null> => {
  let query = supabase
    .from('concept_words')
    .select('*, word_links(name)')
    .eq('user_id', userId)
    .eq('word', normalize(word));

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
  word: string,
  conceptId: string | null,
  wordLinkId?: string | null,
  contextDefinition?: string | null
): Promise<ConceptWord> => {
  const { data, error } = await supabase
    .from('concept_words')
    .insert({
      user_id: userId,
      word: normalize(word),
      concept_id: conceptId ?? null,
      word_link_id: wordLinkId ?? null,
      context_definition: contextDefinition ?? null,
    })
    .select('*, word_links(name)')
    .single();

  if (error) throw error;
  return mapConceptWordRow(data);
};
