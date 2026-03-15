import { useState, useEffect } from 'react';
import { Loader } from 'lucide-react';
import { Settings as SettingsType, OutputField, FlashcardConfig } from '../types/index';
import { testConnection } from '../services/apiService';
import { upsertUserSettings, saveOutputFields, upsertFlashcardConfig, deleteFlashcardConfig } from '../services/supabaseService';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import toast from 'react-hot-toast';
import { arrayMove } from '@dnd-kit/sortable';
import { DragEndEvent } from '@dnd-kit/core';
import { LLMConfigSection } from './settings/LLMConfigSection';
import { OutputFieldsSection } from './settings/OutputFieldsSection';
import { PromptTemplateSection } from './settings/PromptTemplateSection';
import { WebhookSection } from './settings/WebhookSection';
import { FlashcardBuilderSection } from './settings/FlashcardBuilderSection';

interface SettingsProps {
  settings: SettingsType;
  onSave: (settings: SettingsType) => void;
}

export function Settings({ settings, onSave }: SettingsProps) {
  const { user } = useAuth();
  const { syncFlashcardConfigs } = useSettings();
  const [apiKey, setApiKey] = useState(settings.apiKey);
  const [baseUrl, setBaseUrl] = useState(settings.baseUrl);
  const [model, setModel] = useState(settings.model);
  const [outputFields, setOutputFields] = useState<OutputField[]>(settings.outputFields);
  const [newFieldName, setNewFieldName] = useState('');
  const [promptTemplate, setPromptTemplate] = useState(settings.promptTemplate);
  const [webhookUrl, setWebhookUrl] = useState(settings.webhookUrl);
  const [flashcardConfigs, setFlashcardConfigs] = useState<FlashcardConfig[]>(settings.flashcardConfigs || []);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = outputFields.findIndex((field) => field.id === active.id);
      const newIndex = outputFields.findIndex((field) => field.id === over.id);

      const reorderedFields = arrayMove(outputFields, oldIndex, newIndex);
      setOutputFields(reorderedFields);

      if (user) {
        try {
          await saveOutputFields(
            user.id,
            reorderedFields.map((field, index) => ({
              name: field.name,
              display_order: index,
            }))
          );
          toast.success('Field order updated');
        } catch {
          toast.error('Failed to update field order');
          setOutputFields(outputFields);
        }
      }
    }
  };

  useEffect(() => {
    setApiKey(settings.apiKey);
    setBaseUrl(settings.baseUrl);
    setModel(settings.model);
    setPromptTemplate(settings.promptTemplate);
    setWebhookUrl(settings.webhookUrl || '');
    setOutputFields(settings.outputFields);
    setFlashcardConfigs(settings.flashcardConfigs || []);
    setIsLoading(false);
  }, [settings]);

  const handleAddField = () => {
    if (!newFieldName.trim()) {
      toast.error('Field name cannot be empty');
      return;
    }
    if (outputFields.some((f) => f.name === newFieldName.trim())) {
      toast.error('Field already exists');
      return;
    }
    const newField: OutputField = {
      id: Date.now().toString(),
      name: newFieldName.trim(),
    };
    setOutputFields([...outputFields, newField]);
    setNewFieldName('');
  };

  const handleRemoveField = (id: string) => {
    const field = outputFields.find((f) => f.id === id);
    if (field && field.name === 'Definition') {
      toast.error('Definition field is mandatory and cannot be deleted');
      return;
    }
    setOutputFields(outputFields.filter((f) => f.id !== id));
  };

  const getAvailableFields = () => {
    const assignedFieldIds = new Set<string>();
    flashcardConfigs.forEach(config => {
      if (config.frontFieldId) assignedFieldIds.add(config.frontFieldId);
      config.backFieldIds.forEach(id => assignedFieldIds.add(id));
    });

    return outputFields.filter(field =>
      field.name !== 'Definition' && !assignedFieldIds.has(field.id)
    );
  };

  const handleAddCard = async () => {
    if (!user) return;

    const newCard: FlashcardConfig = {
      id: crypto.randomUUID(),
      cardOrder: flashcardConfigs.length,
      frontFieldId: '',
      backFieldIds: [],
    };
    const newConfigs = [...flashcardConfigs, newCard];
    setFlashcardConfigs(newConfigs);

    try {
      await upsertFlashcardConfig(user.id, newCard);
      syncFlashcardConfigs(newConfigs);
      toast.success('Card added');
    } catch {
      setFlashcardConfigs(flashcardConfigs);
      toast.error('Failed to add card');
    }
  };

  const handleDeleteCard = async (cardId: string) => {
    if (!user) return;

    const newConfigs = flashcardConfigs.filter(c => c.id !== cardId);
    setFlashcardConfigs(newConfigs);

    try {
      await deleteFlashcardConfig(cardId);
      syncFlashcardConfigs(newConfigs);
      toast.success('Card deleted');
    } catch {
      setFlashcardConfigs(flashcardConfigs);
      toast.error('Failed to delete card');
    }
  };

  const handleRemoveFieldFromCard = async (cardId: string, fieldId: string, location: 'front' | 'back') => {
    if (!user) return;

    const updatedCard = flashcardConfigs.find(c => c.id === cardId);
    if (!updatedCard) return;

    const newCard: FlashcardConfig = location === 'front'
      ? { ...updatedCard, frontFieldId: '' }
      : { ...updatedCard, backFieldIds: updatedCard.backFieldIds.filter(id => id !== fieldId) };

    const newConfigs = flashcardConfigs.map(c => c.id === cardId ? newCard : c);
    setFlashcardConfigs(newConfigs);

    try {
      await upsertFlashcardConfig(user.id, newCard);
      syncFlashcardConfigs(newConfigs);
      toast.success('Field removed');
    } catch {
      setFlashcardConfigs(flashcardConfigs);
      toast.error('Failed to remove field');
    }
  };

  const handleFrontFieldChange = async (cardId: string, newFieldId: string) => {
    if (!user) return;

    const updatedCard = flashcardConfigs.find(c => c.id === cardId);
    if (!updatedCard) return;

    const newCard: FlashcardConfig = { ...updatedCard, frontFieldId: newFieldId };
    const newConfigs = flashcardConfigs.map(c => c.id === cardId ? newCard : c);
    setFlashcardConfigs(newConfigs);

    try {
      await upsertFlashcardConfig(user.id, newCard);
      syncFlashcardConfigs(newConfigs);
      toast.success('Front field updated');
    } catch {
      setFlashcardConfigs(flashcardConfigs);
      toast.error('Failed to update front field');
    }
  };

  const handleBackFieldAdd = async (cardId: string, newFieldId: string) => {
    if (!newFieldId || !user) return;

    const updatedCard = flashcardConfigs.find(c => c.id === cardId);
    if (!updatedCard) return;

    const newCard: FlashcardConfig = { ...updatedCard, backFieldIds: [...updatedCard.backFieldIds, newFieldId] };
    const newConfigs = flashcardConfigs.map(c => c.id === cardId ? newCard : c);
    setFlashcardConfigs(newConfigs);

    try {
      await upsertFlashcardConfig(user.id, newCard);
      syncFlashcardConfigs(newConfigs);
      toast.success('Back field added');
    } catch {
      setFlashcardConfigs(flashcardConfigs);
      toast.error('Failed to add back field');
    }
  };

  const handleTestConnection = async () => {
    if (!apiKey.trim()) {
      toast.error('API Key is required');
      return;
    }
    if (!baseUrl.trim()) {
      toast.error('Base URL is required');
      return;
    }

    setIsTestingConnection(true);
    try {
      const success = await testConnection({ apiKey, baseUrl, model });
      if (success) {
        toast.success('Connection successful!');
      } else {
        toast.error('Connection failed. Check your API key and Base URL.');
      }
    } catch {
      toast.error('Connection test failed. Please check your settings.');
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleSave = async () => {
    if (!user) {
      toast.error('User not authenticated');
      return;
    }

    if (!apiKey.trim()) {
      toast.error('API Key is required');
      return;
    }
    if (!baseUrl.trim()) {
      toast.error('Base URL is required');
      return;
    }
    if (outputFields.length === 0) {
      toast.error('At least one output field is required');
      return;
    }

    setIsSaving(true);
    try {
      await upsertUserSettings(user.id, {
        api_key: apiKey,
        base_url: baseUrl,
        model,
        prompt_template: promptTemplate,
        webhook_url: webhookUrl,
      });

      await saveOutputFields(
        user.id,
        outputFields.map((field, index) => ({
          name: field.name,
          display_order: index,
        }))
      );

      const updatedSettings: SettingsType = {
        apiKey,
        baseUrl,
        model,
        outputFields,
        promptTemplate,
        webhookUrl,
        flashcardConfigs,
      };
      onSave(updatedSettings);
      toast.success('Settings saved successfully!');
    } catch {
      toast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-2" />
          <p className="text-slate-600">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <LLMConfigSection
        apiKey={apiKey}
        baseUrl={baseUrl}
        model={model}
        isTestingConnection={isTestingConnection}
        onApiKeyChange={setApiKey}
        onBaseUrlChange={setBaseUrl}
        onModelChange={setModel}
        onTestConnection={handleTestConnection}
      />

      <OutputFieldsSection
        outputFields={outputFields}
        newFieldName={newFieldName}
        onNewFieldNameChange={setNewFieldName}
        onAddField={handleAddField}
        onRemoveField={handleRemoveField}
        onDragEnd={handleDragEnd}
      />

      <PromptTemplateSection
        promptTemplate={promptTemplate}
        onPromptTemplateChange={setPromptTemplate}
      />

      <WebhookSection
        webhookUrl={webhookUrl}
        onWebhookUrlChange={setWebhookUrl}
      />

      <FlashcardBuilderSection
        flashcardConfigs={flashcardConfigs}
        outputFields={outputFields}
        getAvailableFields={getAvailableFields}
        onAddCard={handleAddCard}
        onDeleteCard={handleDeleteCard}
        onFrontFieldChange={handleFrontFieldChange}
        onBackFieldAdd={handleBackFieldAdd}
        onRemoveFieldFromCard={handleRemoveFieldFromCard}
      />

      <button
        onClick={handleSave}
        disabled={isSaving}
        className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white py-3 px-4 rounded-lg font-semibold transition flex items-center justify-center gap-2"
      >
        {isSaving ? (
          <>
            <Loader size={18} className="animate-spin" />
            Saving...
          </>
        ) : (
          'Save Settings'
        )}
      </button>
    </div>
  );
}
