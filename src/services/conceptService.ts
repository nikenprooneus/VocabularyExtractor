import { supabase } from '../lib/supabase';
import { Concept } from '../types';

const normalize = (name: string) => name.toLowerCase().trim();

const mapRow = (row: Record<string, unknown>): Concept => ({
  id: row.id as string,
  userId: row.user_id as string,
  name: row.name as string,
  parentId: (row.parent_id as string) ?? null,
  nodeType: (row.node_type as 'concept' | 'word') ?? 'concept',
  conceptLink: (row.concept_link as string) ?? null,
  contextDefinition: (row.context_definition as string) ?? null,
  createdAt: row.created_at as string,
});

export const fetchUserConcepts = async (userId: string): Promise<Concept[]> => {
  const { data, error } = await supabase
    .from('concepts')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data || []).map(mapRow);
};

export const findConceptByNameAndType = async (
  userId: string,
  name: string,
  nodeType: 'concept' | 'word',
  parentId?: string | null
): Promise<Concept | null> => {
  let query = supabase
    .from('concepts')
    .select('*')
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
  conceptLink?: string | null,
  contextDefinition?: string | null
): Promise<Concept> => {
  const { data, error } = await supabase
    .from('concepts')
    .insert({
      user_id: userId,
      name: normalize(name),
      parent_id: parentId ?? null,
      node_type: nodeType,
      concept_link: conceptLink ?? null,
      context_definition: contextDefinition ?? null,
    })
    .select()
    .single();

  if (error) throw error;
  return mapRow(data);
};

export const updateConceptParent = async (
  conceptId: string,
  parentId: string | null
): Promise<void> => {
  const { error } = await supabase
    .from('concepts')
    .update({ parent_id: parentId })
    .eq('id', conceptId);

  if (error) throw error;
};
