import { supabase } from '../lib/supabase';
import { DatabaseSettings, DatabaseFlashcardConfig, FlashcardConfig, OutputField, OutputFieldDB, VocabularyEntry, GeneratedResult, UserProfile } from '../types';

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
    concept_tree_prompt_template: string;
    concept_tree_output_fields: OutputField[];
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

export const fetchFlashcardConfigs = async (userId: string): Promise<DatabaseFlashcardConfig[]> => {
  const { data, error } = await supabase
    .from('flashcard_configs')
    .select('*')
    .eq('user_id', userId)
    .order('card_order', { ascending: true });

  if (error) throw error;
  return data || [];
};

export const upsertFlashcardConfig = async (
  userId: string,
  config: FlashcardConfig
): Promise<DatabaseFlashcardConfig> => {
  const { data, error } = await supabase
    .from('flashcard_configs')
    .upsert(
      {
        id: config.id,
        user_id: userId,
        card_order: config.cardOrder,
        front_field_id: config.frontFieldId,
        back_field_ids: config.backFieldIds,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    )
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const deleteFlashcardConfig = async (configId: string): Promise<void> => {
  const { error } = await supabase
    .from('flashcard_configs')
    .delete()
    .eq('id', configId);

  if (error) throw error;
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
  fields: { id?: string; name: string; display_order: number }[]
): Promise<OutputFieldDB[]> => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const existingFieldIds = fields
    .filter((f) => f.id && uuidRegex.test(f.id))
    .map((f) => f.id as string);

  const currentFields = await fetchOutputFields(userId);
  const currentIds = currentFields.map((f) => f.id);
  const idsToDelete = currentIds.filter((id) => !existingFieldIds.includes(id));

  if (idsToDelete.length > 0) {
    const { error: deleteError } = await supabase
      .from('output_fields')
      .delete()
      .in('id', idsToDelete);
    if (deleteError) throw deleteError;
  }

  if (fields.length === 0) return [];

  const fieldsToUpsert = fields.map((field) => {
    const isExistingUuid = field.id && uuidRegex.test(field.id);
    return {
      ...(isExistingUuid ? { id: field.id } : {}),
      user_id: userId,
      name: field.name,
      display_order: field.display_order,
    };
  });

  const existingToUpsert = fieldsToUpsert.filter((f) => f.id);
  const newToInsert = fieldsToUpsert.filter((f) => !f.id);

  const results: OutputFieldDB[] = [];

  if (existingToUpsert.length > 0) {
    const { data, error } = await supabase
      .from('output_fields')
      .upsert(existingToUpsert, { onConflict: 'id' })
      .select();
    if (error) throw error;
    results.push(...(data || []));
  }

  if (newToInsert.length > 0) {
    const { data, error } = await supabase
      .from('output_fields')
      .insert(newToInsert)
      .select();
    if (error) throw error;
    results.push(...(data || []));
  }

  return results;
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
