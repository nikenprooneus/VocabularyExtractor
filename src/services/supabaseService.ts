import { supabase } from '../lib/supabase';
import { DatabaseSettings, DatabaseFlashcardConfig, DatabaseLLMProfile, FlashcardConfig, LLMProviderProfile, OutputField, OutputFieldDB, GeneratedResult, UserProfile, Word, WordWithContext, LookupTables, ResolvedLookupIds, ParsedMeaning } from '../types';

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
    api_key?: string;
    base_url?: string;
    model?: string;
    llm_provider?: string;
    temperature: number;
    llm_max_tokens: number;
    prompt_template: string;
    webhook_url: string;
    concept_tree_prompt_template: string;
    concept_tree_output_fields: OutputField[];
    active_llm_profile_id?: string | null;
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

export const fetchLLMProfiles = async (userId: string): Promise<DatabaseLLMProfile[]> => {
  const { data, error } = await supabase
    .from('llm_profiles')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data || [];
};

export const upsertLLMProfile = async (
  userId: string,
  profile: LLMProviderProfile
): Promise<DatabaseLLMProfile> => {
  const { data, error } = await supabase
    .from('llm_profiles')
    .upsert(
      {
        id: profile.id,
        user_id: userId,
        name: profile.name,
        provider: profile.provider,
        api_key: profile.apiKey,
        base_url: profile.baseURL ?? null,
        model: profile.model,
        is_custom_model: profile.isCustomModel ?? false,
        max_tokens: profile.maxTokens ?? null,
        api_params: profile.apiParams ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    )
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const deleteLLMProfile = async (profileId: string): Promise<void> => {
  const { error } = await supabase
    .from('llm_profiles')
    .delete()
    .eq('id', profileId);

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

const mapWordRow = (row: Record<string, unknown>): Word => ({
  id: row.id as string,
  userId: row.user_id as string,
  word: row.word as string,
  example: row.example as string,
  note: row.note as GeneratedResult,
  toneId: (row.tone_id as string) ?? null,
  dialectId: (row.dialect_id as string) ?? null,
  modeId: (row.mode_id as string) ?? null,
  nuanceId: (row.nuance_id as string) ?? null,
  registerId: (row.register_id as string) ?? null,
  createdAt: row.created_at as string,
});

export const upsertWord = async (
  userId: string,
  word: string,
  example: string,
  note: GeneratedResult,
  lookupIds: ResolvedLookupIds
): Promise<Word> => {
  const { data, error } = await supabase
    .from('words')
    .upsert(
      {
        user_id: userId,
        word: word.toLowerCase().trim(),
        example,
        note,
        tone_id: lookupIds.toneId,
        dialect_id: lookupIds.dialectId,
        mode_id: lookupIds.modeId,
        nuance_id: lookupIds.nuanceId,
        register_id: lookupIds.registerId,
      },
      { onConflict: 'user_id,word,example' }
    )
    .select()
    .single();

  if (error) throw error;
  return mapWordRow(data);
};

export const fetchWordsByTerm = async (
  userId: string,
  word: string
): Promise<WordWithContext[]> => {
  const { data, error } = await supabase
    .from('words')
    .select(`
      *,
      concept_words (
        concept_id,
        word_link_id,
        context_definition
      )
    `)
    .eq('user_id', userId)
    .eq('word', word.toLowerCase().trim())
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (data || []).map((row) => {
    const cw = Array.isArray(row.concept_words) ? row.concept_words[0] : null;
    return {
      ...mapWordRow(row),
      conceptId: cw?.concept_id ?? null,
      wordLinkId: cw?.word_link_id ?? null,
      contextDefinition: cw?.context_definition ?? null,
    };
  });
};

export const fetchWordHistory = async (userId: string, limit = 50): Promise<Word[]> => {
  const { data, error } = await supabase
    .from('words')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data || []).map(mapWordRow);
};

export const deleteWord = async (wordId: string): Promise<void> => {
  const { error } = await supabase
    .from('words')
    .delete()
    .eq('id', wordId);

  if (error) throw error;
};

export const fetchLookupTables = async (): Promise<LookupTables> => {
  const [tonesRes, dialectsRes, modesRes, nuancesRes, registersRes, wordLinksRes] = await Promise.all([
    supabase.from('tones').select('id, name').order('name'),
    supabase.from('dialects').select('id, name').order('name'),
    supabase.from('modes').select('id, name').order('name'),
    supabase.from('nuances').select('id, name').order('name'),
    supabase.from('registers').select('id, name').order('name'),
    supabase.from('word_links').select('id, name').order('name'),
  ]);

  if (tonesRes.error) throw tonesRes.error;
  if (dialectsRes.error) throw dialectsRes.error;
  if (modesRes.error) throw modesRes.error;
  if (nuancesRes.error) throw nuancesRes.error;
  if (registersRes.error) throw registersRes.error;
  if (wordLinksRes.error) throw wordLinksRes.error;

  return {
    tones: tonesRes.data || [],
    dialects: dialectsRes.data || [],
    modes: modesRes.data || [],
    nuances: nuancesRes.data || [],
    registers: registersRes.data || [],
    wordLinks: wordLinksRes.data || [],
  };
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

interface ConceptAncestor {
  id: string;
  name: string;
}

export const fetchConceptAncestors = async (
  conceptId: string
): Promise<ConceptAncestor[]> => {
  const chain: ConceptAncestor[] = [];
  let currentId: string | null = conceptId;

  while (currentId) {
    const { data: conceptData, error: conceptError } = await supabase
      .from('concepts')
      .select('id, name')
      .eq('id', currentId)
      .maybeSingle();

    if (conceptError || !conceptData) break;

    chain.unshift({ id: conceptData.id, name: conceptData.name });

    const { data: parentData, error: parentError } = await supabase
      .from('concept_concepts')
      .select('parent_id')
      .eq('child_id', currentId)
      .maybeSingle();

    if (parentError || !parentData) break;

    currentId = parentData.parent_id;
  }

  return chain;
};

export const reconstructParsedMeaning = async (
  conceptId: string | null,
  wordLinkId: string | null,
  contextDefinition: string | null
): Promise<ParsedMeaning | null> => {
  if (!conceptId) return null;

  const chain = await fetchConceptAncestors(conceptId);
  if (chain.length === 0) return null;

  let wordLinkName = '';
  if (wordLinkId) {
    const { data } = await supabase
      .from('word_links')
      .select('name')
      .eq('id', wordLinkId)
      .maybeSingle();
    wordLinkName = data?.name ?? '';
  }

  const meaning: ParsedMeaning = {};

  if (chain[0]) meaning['Tier1'] = chain[0].name;
  if (chain[1]) meaning['Tier2'] = chain[1].name;
  if (chain[2]) meaning['Tier3'] = chain[2].name;

  if (wordLinkName) meaning['ConceptLink'] = wordLinkName;
  if (contextDefinition) meaning['Context Definition'] = contextDefinition;

  return meaning;
};
