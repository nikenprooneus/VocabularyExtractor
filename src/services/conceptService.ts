import { supabase } from '../lib/supabase';
import { Concept } from '../types';

const normalize = (name: string) => name.toLowerCase().trim();

export const fetchUserConcepts = async (userId: string): Promise<Concept[]> => {
  const { data, error } = await supabase
    .from('concepts')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data || []).map((row) => ({
    id: row.id,
    userId: row.user_id,
    name: row.name,
    parentId: row.parent_id,
    createdAt: row.created_at,
  }));
};

export const insertConcept = async (
  userId: string,
  name: string,
  parentId?: string | null
): Promise<Concept> => {
  const { data, error } = await supabase
    .from('concepts')
    .insert({
      user_id: userId,
      name: normalize(name),
      parent_id: parentId ?? null,
    })
    .select()
    .single();

  if (error) throw error;
  return {
    id: data.id,
    userId: data.user_id,
    name: data.name,
    parentId: data.parent_id,
    createdAt: data.created_at,
  };
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
