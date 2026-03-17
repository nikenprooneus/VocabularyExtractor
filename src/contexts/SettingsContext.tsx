import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Settings, OutputField, FlashcardConfig, LLMProviderProfile } from '../types/index';
import { useAuth } from './AuthContext';
import {
  fetchUserSettings,
  upsertUserSettings,
  fetchOutputFields,
  saveOutputFields,
  fetchFlashcardConfigs,
  fetchLLMProfiles,
  upsertLLMProfile,
  deleteLLMProfile as deleteLLMProfileFromDB,
} from '../services/supabaseService';
import toast from 'react-hot-toast';

const DEFAULT_SETTINGS: Settings = {
  llmProfiles: [],
  activeLlmProfileId: '',
  temperature: 0.7,
  llmMaxTokens: 2000,
  outputFields: [],
  promptTemplate: 'Define the word "{{Word}}" in detail, including pronunciation, parts of speech, meanings, and usage notes.',
  webhookUrl: '',
  flashcardConfigs: [],
  conceptTreePromptTemplate: '',
  conceptTreeOutputFields: [],
};

interface SettingsContextType {
  settings: Settings;
  updateSettings: (newSettings: Settings) => Promise<void>;
  syncFlashcardConfigs: (configs: FlashcardConfig[]) => void;
  saveLLMProfile: (profile: LLMProviderProfile) => Promise<void>;
  removeLLMProfile: (profileId: string) => Promise<void>;
  setActiveLLMProfile: (profileId: string) => Promise<void>;
  isLoading: boolean;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      loadSettings();
    }
  }, [user]);

  const loadSettings = async () => {
    if (!user?.id) return;

    try {
      setIsLoading(true);
      const [dbSettings, dbOutputFields, dbFlashcardConfigs, dbLLMProfiles] = await Promise.all([
        fetchUserSettings(user.id),
        fetchOutputFields(user.id),
        fetchFlashcardConfigs(user.id),
        fetchLLMProfiles(user.id),
      ]);

      const sortedFields = [...dbOutputFields].sort((a, b) => a.display_order - b.display_order);
      const outputFields: OutputField[] = sortedFields.map((field) => ({
        id: field.id,
        name: field.name,
      }));

      const flashcardConfigs: FlashcardConfig[] = dbFlashcardConfigs.map((row) => ({
        id: row.id,
        cardOrder: row.card_order,
        frontFieldId: row.front_field_id,
        backFieldIds: row.back_field_ids,
      }));

      let llmProfiles: LLMProviderProfile[] = dbLLMProfiles.map((row) => ({
        id: row.id,
        name: row.name,
        provider: row.provider as LLMProviderProfile['provider'],
        apiKey: row.api_key,
        baseURL: row.base_url ?? undefined,
        model: row.model,
        isCustomModel: row.is_custom_model,
      }));

      let activeLlmProfileId = dbSettings?.active_llm_profile_id ?? '';

      if (llmProfiles.length === 0 && dbSettings?.api_key) {
        const migratedProfile: LLMProviderProfile = {
          id: crypto.randomUUID(),
          name: 'Default',
          provider: (dbSettings.llm_provider as LLMProviderProfile['provider']) ?? 'openai',
          apiKey: dbSettings.api_key,
          baseURL: dbSettings.base_url || undefined,
          model: dbSettings.model || 'gpt-4.1-mini',
          isCustomModel: dbSettings.llm_provider === 'custom' || dbSettings.llm_provider === 'openai-compatible',
        };
        try {
          const saved = await upsertLLMProfile(user.id, migratedProfile);
          migratedProfile.id = saved.id;
          llmProfiles = [migratedProfile];
          activeLlmProfileId = migratedProfile.id;
          await upsertUserSettings(user.id, {
            temperature: dbSettings.temperature ?? 0.7,
            llm_max_tokens: dbSettings.llm_max_tokens ?? 2000,
            prompt_template: dbSettings.prompt_template ?? '',
            webhook_url: dbSettings.webhook_url ?? '',
            concept_tree_prompt_template: dbSettings.concept_tree_prompt_template ?? '',
            concept_tree_output_fields: Array.isArray(dbSettings.concept_tree_output_fields)
              ? dbSettings.concept_tree_output_fields
              : [],
            active_llm_profile_id: migratedProfile.id,
          });
        } catch {
          // migration failure is non-fatal
        }
      }

      if (dbSettings) {
        setSettings({
          llmProfiles,
          activeLlmProfileId,
          temperature: dbSettings.temperature ?? 0.7,
          llmMaxTokens: dbSettings.llm_max_tokens ?? 2000,
          outputFields,
          promptTemplate: dbSettings.prompt_template,
          webhookUrl: dbSettings.webhook_url,
          flashcardConfigs,
          conceptTreePromptTemplate: dbSettings.concept_tree_prompt_template ?? '',
          conceptTreeOutputFields: Array.isArray(dbSettings.concept_tree_output_fields)
            ? dbSettings.concept_tree_output_fields
            : [],
        });
      } else {
        setSettings((prev) => ({ ...prev, llmProfiles, activeLlmProfileId, outputFields, flashcardConfigs }));
      }
    } catch {
      // Errors are handled by the caller via toast
    } finally {
      setIsLoading(false);
    }
  };

  const updateSettings = async (newSettings: Settings) => {
    if (!user?.id) return;

    try {
      await upsertUserSettings(user.id, {
        temperature: newSettings.temperature,
        llm_max_tokens: newSettings.llmMaxTokens,
        prompt_template: newSettings.promptTemplate,
        webhook_url: newSettings.webhookUrl,
        concept_tree_prompt_template: newSettings.conceptTreePromptTemplate,
        concept_tree_output_fields: newSettings.conceptTreeOutputFields,
        active_llm_profile_id: newSettings.activeLlmProfileId || null,
      });

      const outputFieldsToSave = newSettings.outputFields.map((field, index) => ({
        id: field.id,
        name: field.name,
        display_order: index,
      }));
      const savedFields = await saveOutputFields(user.id, outputFieldsToSave);

      const sortedSaved = [...savedFields].sort((a, b) => a.display_order - b.display_order);
      const outputFields = sortedSaved.map((f) => ({ id: f.id, name: f.name }));

      setSettings({ ...newSettings, outputFields });
      toast.success('Settings saved successfully');
    } catch {
      toast.error('Failed to save settings');
      throw new Error('Failed to save settings');
    }
  };

  const saveLLMProfile = async (profile: LLMProviderProfile) => {
    if (!user?.id) return;
    try {
      const saved = await upsertLLMProfile(user.id, profile);
      const savedProfile: LLMProviderProfile = {
        id: saved.id,
        name: saved.name,
        provider: saved.provider as LLMProviderProfile['provider'],
        apiKey: saved.api_key,
        baseURL: saved.base_url ?? undefined,
        model: saved.model,
        isCustomModel: saved.is_custom_model,
      };
      setSettings((prev) => {
        const exists = prev.llmProfiles.some((p) => p.id === savedProfile.id);
        const llmProfiles = exists
          ? prev.llmProfiles.map((p) => (p.id === savedProfile.id ? savedProfile : p))
          : [...prev.llmProfiles, savedProfile];
        const activeLlmProfileId = prev.activeLlmProfileId || savedProfile.id;
        return { ...prev, llmProfiles, activeLlmProfileId };
      });
    } catch {
      toast.error('Failed to save profile');
      throw new Error('Failed to save profile');
    }
  };

  const removeLLMProfile = async (profileId: string) => {
    if (!user?.id) return;
    try {
      await deleteLLMProfileFromDB(profileId);
      setSettings((prev) => {
        const llmProfiles = prev.llmProfiles.filter((p) => p.id !== profileId);
        const activeLlmProfileId =
          prev.activeLlmProfileId === profileId
            ? (llmProfiles[0]?.id ?? '')
            : prev.activeLlmProfileId;
        return { ...prev, llmProfiles, activeLlmProfileId };
      });
    } catch {
      toast.error('Failed to delete profile');
      throw new Error('Failed to delete profile');
    }
  };

  const setActiveLLMProfile = async (profileId: string) => {
    if (!user?.id) return;
    try {
      await upsertUserSettings(user.id, {
        temperature: settings.temperature,
        llm_max_tokens: settings.llmMaxTokens,
        prompt_template: settings.promptTemplate,
        webhook_url: settings.webhookUrl,
        concept_tree_prompt_template: settings.conceptTreePromptTemplate,
        concept_tree_output_fields: settings.conceptTreeOutputFields,
        active_llm_profile_id: profileId || null,
      });
      setSettings((prev) => ({ ...prev, activeLlmProfileId: profileId }));
    } catch {
      toast.error('Failed to set active profile');
    }
  };

  const syncFlashcardConfigs = (configs: FlashcardConfig[]) => {
    setSettings((prev) => ({ ...prev, flashcardConfigs: configs }));
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, syncFlashcardConfigs, saveLLMProfile, removeLLMProfile, setActiveLLMProfile, isLoading }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
