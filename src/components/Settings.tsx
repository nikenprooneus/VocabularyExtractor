import { useState, useEffect } from 'react';
import { Loader, LayoutList, BrainCircuit, Share2, GitBranch } from 'lucide-react';
import { Settings as SettingsType, OutputField, FlashcardConfig, LLMProviderProfile } from '../types/index';
import { saveOutputFields, upsertFlashcardConfig, deleteFlashcardConfig } from '../services/supabaseService';
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
  isLoading: boolean;
}

export function Settings({ settings, onSave, isLoading }: SettingsProps) {
  const { user } = useAuth();
  const { syncFlashcardConfigs, updateSettings, saveLLMProfile, removeLLMProfile, setActiveLLMProfile } = useSettings();

  const [temperature, setTemperature] = useState(settings.temperature ?? 0.7);
  const [llmMaxTokens, setLlmMaxTokens] = useState(settings.llmMaxTokens ?? 2000);
  const [outputFields, setOutputFields] = useState<OutputField[]>(settings.outputFields);
  const [newFieldName, setNewFieldName] = useState('');
  const [promptTemplate, setPromptTemplate] = useState(settings.promptTemplate);
  const [webhookUrl, setWebhookUrl] = useState(settings.webhookUrl);
  const [flashcardConfigs, setFlashcardConfigs] = useState<FlashcardConfig[]>(settings.flashcardConfigs || []);

  const [conceptTreePromptTemplate, setConceptTreePromptTemplate] = useState(settings.conceptTreePromptTemplate || '');
  const [conceptTreeOutputFields, setConceptTreeOutputFields] = useState<OutputField[]>(settings.conceptTreeOutputFields || []);
  const [newCtFieldName, setNewCtFieldName] = useState('');

  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'TMRND' | 'ConceptTree' | 'AI' | 'Export'>('TMRND');

  const tabs = [
    { key: 'TMRND' as const, label: 'TMRND', icon: LayoutList },
    { key: 'ConceptTree' as const, label: 'Concept Tree', icon: GitBranch },
    { key: 'AI' as const, label: 'AI', icon: BrainCircuit },
    { key: 'Export' as const, label: 'Export', icon: Share2 },
  ];

  useEffect(() => {
    setTemperature(settings.temperature ?? 0.7);
    setLlmMaxTokens(settings.llmMaxTokens ?? 2000);
    setPromptTemplate(settings.promptTemplate);
    setWebhookUrl(settings.webhookUrl || '');
    setOutputFields(settings.outputFields);
    setFlashcardConfigs(settings.flashcardConfigs || []);
    setConceptTreePromptTemplate(settings.conceptTreePromptTemplate || '');
    setConceptTreeOutputFields(settings.conceptTreeOutputFields || []);
  }, [settings]);

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
              id: field.id,
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

  const handleAddField = () => {
    if (!newFieldName.trim()) { toast.error('Field name cannot be empty'); return; }
    if (outputFields.some((f) => f.name === newFieldName.trim())) { toast.error('Field already exists'); return; }
    setOutputFields([...outputFields, { id: crypto.randomUUID(), name: newFieldName.trim() }]);
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

  const handleCtDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = conceptTreeOutputFields.findIndex((f) => f.id === active.id);
      const newIndex = conceptTreeOutputFields.findIndex((f) => f.id === over.id);
      setConceptTreeOutputFields(arrayMove(conceptTreeOutputFields, oldIndex, newIndex));
    }
  };

  const handleAddCtField = () => {
    if (!newCtFieldName.trim()) { toast.error('Field name cannot be empty'); return; }
    if (conceptTreeOutputFields.some((f) => f.name === newCtFieldName.trim())) { toast.error('Field already exists'); return; }
    setConceptTreeOutputFields([...conceptTreeOutputFields, { id: crypto.randomUUID(), name: newCtFieldName.trim() }]);
    setNewCtFieldName('');
  };

  const handleRemoveCtField = (id: string) => {
    const field = conceptTreeOutputFields.find((f) => f.id === id);
    if (field && field.name === 'ConceptLink') {
      toast.error('ConceptLink field is mandatory and cannot be deleted');
      return;
    }
    setConceptTreeOutputFields(conceptTreeOutputFields.filter((f) => f.id !== id));
  };

  const getAvailableFields = () => {
    const assignedFieldIds = new Set<string>();
    flashcardConfigs.forEach(config => {
      if (config.frontFieldId) assignedFieldIds.add(config.frontFieldId);
      config.backFieldIds.forEach(id => assignedFieldIds.add(id));
    });
    return outputFields.filter(field => field.name !== 'Definition' && !assignedFieldIds.has(field.id));
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

  const handleSaveProfile = async (profile: LLMProviderProfile) => {
    await saveLLMProfile(profile);
    if (!settings.activeLlmProfileId) {
      await setActiveLLMProfile(profile.id);
    }
  };

  const handleDeleteProfile = async (profileId: string) => {
    await removeLLMProfile(profileId);
  };

  const handleSave = async () => {
    if (outputFields.length === 0) { toast.error('At least one output field is required'); return; }

    setIsSaving(true);
    try {
      const updatedSettings: SettingsType = {
        llmProfiles: settings.llmProfiles,
        activeLlmProfileId: settings.activeLlmProfileId,
        temperature,
        llmMaxTokens,
        outputFields,
        promptTemplate,
        webhookUrl,
        flashcardConfigs,
        conceptTreePromptTemplate,
        conceptTreeOutputFields,
      };
      await updateSettings(updatedSettings);
      onSave(updatedSettings);
    } catch {
      // error toast is handled by updateSettings
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
    <div className="flex flex-col md:flex-row gap-8 items-start">
      <nav className="w-full md:w-56 shrink-0">
        <ul className="flex flex-row md:flex-col gap-1 flex-wrap">
          {tabs.map(({ key, label, icon: Icon }) => {
            const isActive = activeTab === key;
            return (
              <li key={key} className="flex-1 md:flex-none">
                <button
                  onClick={() => setActiveTab(key)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-150 ${
                    isActive
                      ? 'bg-slate-800 text-white shadow-sm'
                      : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                  }`}
                >
                  <Icon size={16} className={isActive ? 'text-white' : 'text-slate-400'} />
                  <span>{label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="flex-1 flex flex-col gap-6 min-w-0">
        {activeTab === 'TMRND' && (
          <>
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
              mode="tmrnd"
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
          </>
        )}

        {activeTab === 'ConceptTree' && (
          <>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
              <p className="text-sm text-slate-700">
                <span className="font-semibold">Concept Tree Configuration</span> — These settings drive the Concept Tree analysis exclusively. Add fields like <code className="bg-white border border-slate-200 px-1 rounded text-xs">Tier1</code>, <code className="bg-white border border-slate-200 px-1 rounded text-xs">Tier2</code>, <code className="bg-white border border-slate-200 px-1 rounded text-xs">Tier3</code>, and write a dedicated prompt. <code className="bg-white border border-slate-200 px-1 rounded text-xs">ConceptLink</code> is a mandatory field that labels the semantic relationship between Tier 3 and the word — it cannot be deleted. When you click Generate, this runs as a separate parallel API call — keeping your TMRND prompt lean and focused.
              </p>
            </div>

            <OutputFieldsSection
              outputFields={conceptTreeOutputFields}
              newFieldName={newCtFieldName}
              onNewFieldNameChange={setNewCtFieldName}
              onAddField={handleAddCtField}
              onRemoveField={handleRemoveCtField}
              onDragEnd={handleCtDragEnd}
              protectedFieldNames={['ConceptLink']}
            />

            <PromptTemplateSection
              promptTemplate={conceptTreePromptTemplate}
              onPromptTemplateChange={setConceptTreePromptTemplate}
              mode="concepttree"
            />
          </>
        )}

        {activeTab === 'AI' && (
          <>
            <LLMConfigSection
              profiles={settings.llmProfiles}
              activeLlmProfileId={settings.activeLlmProfileId}
              temperature={temperature}
              maxTokens={llmMaxTokens}
              onSaveProfile={handleSaveProfile}
              onDeleteProfile={handleDeleteProfile}
              onSetActive={setActiveLLMProfile}
            />

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100">
                <h2 className="text-base font-semibold text-slate-900">Global Generation Settings</h2>
                <p className="text-sm text-slate-500 mt-0.5">Applied to all profiles when generating</p>
              </div>
              <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-sm font-medium text-slate-700">Temperature</label>
                    <span className="text-sm font-mono font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                      {temperature.toFixed(1)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={2}
                    step={0.1}
                    value={temperature}
                    onChange={(e) => setTemperature(parseFloat(e.target.value))}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                  <div className="flex justify-between text-xs text-slate-400 mt-1">
                    <span>0.0 Precise</span>
                    <span>2.0 Creative</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Max Tokens</label>
                  <input
                    type="number"
                    min={100}
                    max={32000}
                    step={100}
                    value={llmMaxTokens}
                    onChange={(e) => setLlmMaxTokens(parseInt(e.target.value, 10) || 2000)}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="text-xs text-slate-400 mt-1.5">Max tokens per generation (100–32000)</p>
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === 'Export' && (
          <WebhookSection
            webhookUrl={webhookUrl}
            onWebhookUrlChange={setWebhookUrl}
          />
        )}

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
    </div>
  );
}
