import { supabase } from '../lib/supabase';
import { DatabaseSettings, FlashcardConfig, OutputFieldDB, VocabularyEntry, GeneratedResult, UserProfile } from '../types';

export const fetchUserSettings = async (userId: string): Promise<DatabaseSettings | null> => {
  const { data, error } = await supabase
    .from('settings')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  return data;
};

export const upsertUserSettings = async (
  userId: string,
  settings: {
    api_key: string;
    base_url: string;
    model: string;
    prompt_template: string;
    webhook_url: string;
    flashcard_configs?: FlashcardConfig[];
  }
): Promise<DatabaseSettings> => {
  const { data, error } = await supabase
    .from('settings')
    .upsert(
      {
        user_id: userId,
        ...settings,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    )
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const fetchOutputFields = async (userId: string): Promise<OutputFieldDB[]> => {
  const { data, error } = await supabase
    .from('output_fields')
    .select('*')
    .eq('user_id', userId)
    .order('display_order', { ascending: true });

  if (error) throw error;
  return data || [];
};

export const saveOutputFields = async (
  userId: string,
  fields: { name: string; display_order: number }[]
): Promise<void> => {
  const { error: deleteError } = await supabase
    .from('output_fields')
    .delete()
    .eq('user_id', userId);

  if (deleteError) throw deleteError;

  if (fields.length > 0) {
    const fieldsToInsert = fields.map((field) => ({
      user_id: userId,
      name: field.name,
      display_order: field.display_order,
    }));

    const { error: insertError } = await supabase
      .from('output_fields')
      .insert(fieldsToInsert);

    if (insertError) throw insertError;
  }
};

export const saveVocabularyEntry = async (
  userId: string,
  word: string,
  example: string,
  results: GeneratedResult
): Promise<VocabularyEntry> => {
  const { data, error } = await supabase
    .from('vocabulary_data')
    .insert({
      user_id: userId,
      word,
      example,
      results,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const fetchVocabularyHistory = async (userId: string, limit = 50): Promise<VocabularyEntry[]> => {
  const { data, error } = await supabase
    .from('vocabulary_data')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
};

export const deleteVocabularyEntry = async (entryId: string): Promise<void> => {
  const { error } = await supabase
    .from('vocabulary_data')
    .delete()
    .eq('id', entryId);

  if (error) throw error;
};

export const fetchAllProfiles = async (): Promise<UserProfile[]> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
};

export const updateUserRole = async (userId: string, newRole: 'user' | 'admin'): Promise<void> => {
  const { error } = await supabase
    .from('profiles')
    .update({ role: newRole, updated_at: new Date().toISOString() })
    .eq('id', userId);

  if (error) throw error;
};
