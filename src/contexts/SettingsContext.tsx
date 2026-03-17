import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Settings, OutputField, FlashcardConfig, LLMProvider } from '../types/index';
import { useAuth } from './AuthContext';
import { fetchUserSettings, upsertUserSettings, fetchOutputFields, saveOutputFields, fetchFlashcardConfigs } from '../services/supabaseService';
import toast from 'react-hot-toast';

const DEFAULT_SETTINGS: Settings = {
  apiKey: '',
  baseUrl: '',
  model: 'gpt-5-mini',
  llmProvider: 'openai' as LLMProvider,
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
      const [dbSettings, dbOutputFields, dbFlashcardConfigs] = await Promise.all([
        fetchUserSettings(user.id),
        fetchOutputFields(user.id),
        fetchFlashcardConfigs(user.id),
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

      if (dbSettings) {
        setSettings({
          apiKey: dbSettings.api_key,
          baseUrl: dbSettings.base_url ?? '',
          model: dbSettings.model,
          llmProvider: (dbSettings.llm_provider as LLMProvider) ?? 'openai',
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
        setSettings((prev) => ({ ...prev, outputFields, flashcardConfigs }));
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
        api_key: newSettings.apiKey,
        base_url: newSettings.baseUrl,
        model: newSettings.model,
        llm_provider: newSettings.llmProvider,
        temperature: newSettings.temperature,
        llm_max_tokens: newSettings.llmMaxTokens,
        prompt_template: newSettings.promptTemplate,
        webhook_url: newSettings.webhookUrl,
        concept_tree_prompt_template: newSettings.conceptTreePromptTemplate,
        concept_tree_output_fields: newSettings.conceptTreeOutputFields,
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

  const syncFlashcardConfigs = (configs: FlashcardConfig[]) => {
    setSettings((prev) => ({ ...prev, flashcardConfigs: configs }));
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, syncFlashcardConfigs, isLoading }}>
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
