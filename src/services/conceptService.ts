import { supabase } from '../lib/supabase';
import { ConceptWord, WordLink } from '../types';

const normalize = (name: string) => name.toLowerCase().trim();

type ConceptWordRow = Record<string, unknown> & {
  word_links?: { name: string } | null;
};

const mapRow = (row: ConceptWordRow): ConceptWord => ({
  id: row.id as string,
  userId: row.user_id as string,
  name: row.name as string,
  parentId: (row.parent_id as string) ?? null,
  nodeType: (row.node_type as 'concept' | 'word') ?? 'concept',
  wordLinkId: (row.word_link_id as string) ?? null,
  wordLinkName: row.word_links?.name ?? undefined,
  contextDefinition: (row.context_definition as string) ?? null,
  createdAt: row.created_at as string,
});

export const fetchUserConcepts = async (userId: string): Promise<ConceptWord[]> => {
  const { data, error } = await supabase
    .from('concept_words')
    .select('*, word_links(name)')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data || []).map(mapRow);
};

export const fetchWordLinks = async (): Promise<WordLink[]> => {
  const { data, error } = await supabase
    .from('word_links')
    .select('id, name')
    .order('name', { ascending: true });

  if (error) throw error;
  return (data || []) as WordLink[];
};

export const findConceptByNameAndType = async (
  userId: string,
  name: string,
  nodeType: 'concept' | 'word',
  parentId?: string | null
): Promise<ConceptWord | null> => {
  let query = supabase
    .from('concept_words')
    .select('*, word_links(name)')
    .eq('user_id', userId)
    .eq('name', normalize(name))
    .eq('node_type', nodeType);

  if (nodeType === 'word' && parentId !== undefined) {
    if (parentId === null) {
      query = query.is('parent_id', null);
    } else {
      query = query.eq('parent_id', parentId);
    }
  }

  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  return data ? mapRow(data) : null;
};

export const insertConcept = async (
  userId: string,
  name: string,
  parentId: string | null,
  nodeType: 'concept' | 'word' = 'concept',
  wordLinkId?: string | null,
  contextDefinition?: string | null
): Promise<ConceptWord> => {
  const { data, error } = await supabase
    .from('concept_words')
    .insert({
      user_id: userId,
      name: normalize(name),
      parent_id: parentId ?? null,
      node_type: nodeType,
      word_link_id: wordLinkId ?? null,
      context_definition: contextDefinition ?? null,
    })
    .select('*, word_links(name)')
    .single();

  if (error) throw error;
  return mapRow(data);
};

export const updateConceptParent = async (
  conceptId: string,
  parentId: string | null
): Promise<void> => {
  const { error } = await supabase
    .from('concept_words')
    .update({ parent_id: parentId })
    .eq('id', conceptId);

  if (error) throw error;
};
