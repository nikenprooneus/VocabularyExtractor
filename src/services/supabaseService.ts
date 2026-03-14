import { supabase } from '../lib/supabase';
import { DatabaseSettings, OutputFieldDB, VocabularyEntry, GeneratedResult, UserProfile } from '../types';

export const fetchUserSettings = async (userId: string): Promise<DatabaseSettings | null> => {
  try {
    const { data, error } = await supabase
      .from('settings')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching user settings:', error);
    throw error;
  }
};

export const upsertUserSettings = async (
  userId: string,
  settings: {
    api_key: string;
    base_url: string;
    model: string;
    prompt_template: string;
    webhook_url: string;
    flashcard_configs?: any;
  }
): Promise<DatabaseSettings> => {
  try {
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
  } catch (error) {
    console.error('Error upserting user settings:', error);
    throw error;
  }
};

export const fetchOutputFields = async (userId: string): Promise<OutputFieldDB[]> => {
  try {
    const { data, error } = await supabase
      .from('output_fields')
      .select('*')
      .eq('user_id', userId)
      .order('display_order', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching output fields:', error);
    throw error;
  }
};

export const saveOutputFields = async (
  userId: string,
  fields: { name: string; display_order: number }[]
): Promise<void> => {
  try {
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
  } catch (error) {
    console.error('Error saving output fields:', error);
    throw error;
  }
};

export const saveVocabularyEntry = async (
  userId: string,
  word: string,
  example: string,
  results: GeneratedResult
): Promise<VocabularyEntry> => {
  try {
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
  } catch (error) {
    console.error('Error saving vocabulary entry:', error);
    throw error;
  }
};

export const fetchVocabularyHistory = async (userId: string, limit = 50): Promise<VocabularyEntry[]> => {
  try {
    const { data, error } = await supabase
      .from('vocabulary_data')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching vocabulary history:', error);
    throw error;
  }
};

export const deleteVocabularyEntry = async (entryId: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('vocabulary_data')
      .delete()
      .eq('id', entryId);

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting vocabulary entry:', error);
    throw error;
  }
};

export const fetchAllProfiles = async (): Promise<UserProfile[]> => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching all profiles:', error);
    throw error;
  }
};

export const updateUserRole = async (userId: string, newRole: 'user' | 'admin'): Promise<void> => {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole, updated_at: new Date().toISOString() })
      .eq('id', userId);

    if (error) throw error;
  } catch (error) {
    console.error('Error updating user role:', error);
    throw error;
  }
};
