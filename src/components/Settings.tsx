import { useState, useEffect } from 'react';
import { Plus, Trash2, Loader, GripVertical, Copy, Lock } from 'lucide-react';
import { Settings as SettingsType, OutputField, FlashcardConfig } from '../types/index';
import { testConnection } from '../services/apiService';
import { fetchUserSettings, upsertUserSettings, fetchOutputFields, saveOutputFields } from '../services/supabaseService';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { getMarkerTag } from '../utils/parsingUtils';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface SettingsProps {
  settings: SettingsType;
  onSave: (settings: SettingsType) => void;
}

interface SortableFieldItemProps {
  field: OutputField;
  onRemove: (id: string) => void;
  isDefinitionField?: boolean;
}

function SortableFieldItem({ field, onRemove, isDefinitionField = false }: SortableFieldItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: field.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const markerTag = getMarkerTag(field.name);

  const handleCopyTag = () => {
    navigator.clipboard.writeText(markerTag);
    toast.success('Tag copied to clipboard!');
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-gray-50 p-3 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
    >
      <div className="flex items-center gap-3">
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Drag handle"
        >
          <GripVertical size={20} />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-gray-800 font-medium block">{field.name}</span>
            {isDefinitionField && (
              <>
                <Lock size={14} className="text-gray-400" />
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-medium">Required</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <code className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded font-mono">
              {markerTag}
            </code>
            <button
              onClick={handleCopyTag}
              className="text-gray-500 hover:text-gray-700 transition-colors"
              aria-label={`Copy tag for ${field.name}`}
              title="Copy tag"
            >
              <Copy size={14} />
            </button>
          </div>
        </div>
        {!isDefinitionField && (
          <button
            onClick={() => onRemove(field.id)}
            className="text-red-600 hover:text-red-800 transition-colors"
            aria-label={`Remove ${field.name}`}
          >
            <Trash2 size={18} />
          </button>
        )}
      </div>
    </div>
  );
}

export function Settings({ settings, onSave }: SettingsProps) {
  const { user } = useAuth();
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

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

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
        } catch (error) {
          console.error('Error updating field order:', error);
          toast.error('Failed to update field order');
          setOutputFields(outputFields);
        }
      }
    }
  };

  useEffect(() => {
    const loadSettings = async () => {
      if (!user) return;

      try {
        setIsLoading(true);
        const [dbSettings, dbFields] = await Promise.all([
          fetchUserSettings(user.id),
          fetchOutputFields(user.id)
        ]);

        if (dbSettings) {
          setApiKey(dbSettings.api_key);
          setBaseUrl(dbSettings.base_url);
          setModel(dbSettings.model);
          setPromptTemplate(dbSettings.prompt_template);
          setWebhookUrl(dbSettings.webhook_url || '');

          const flashcardConfigsData = dbSettings.flashcard_configs || [];
          setFlashcardConfigs(Array.isArray(flashcardConfigsData) ? flashcardConfigsData : []);
        }

        if (dbFields.length > 0) {
          const sortedFields = [...dbFields].sort((a, b) => a.display_order - b.display_order);
          const fields: OutputField[] = sortedFields.map(field => ({
            id: field.id,
            name: field.name
          }));
          setOutputFields(fields);
        }
      } catch (error) {
        console.error('Error loading settings:', error);
        toast.error('Failed to load settings');
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, [user]);

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

  const saveFlashcardConfigs = async (configs: FlashcardConfig[]) => {
    if (!user) return;

    try {
      await upsertUserSettings(user.id, {
        api_key: apiKey,
        base_url: baseUrl,
        model,
        prompt_template: promptTemplate,
        webhook_url: webhookUrl,
        flashcard_configs: configs,
      });

      onSave({
        apiKey,
        baseUrl,
        model,
        outputFields,
        promptTemplate,
        webhookUrl,
        flashcardConfigs: configs,
      });
    } catch (error) {
      console.error('Error auto-saving flashcard configs:', error);
      toast.error('Failed to save flashcard configuration');
      throw error;
    }
  };

  const handleAddCard = async () => {
    const newCard: FlashcardConfig = {
      id: Date.now().toString(),
      cardOrder: flashcardConfigs.length,
      frontFieldId: '',
      backFieldIds: [],
    };
    const newConfigs = [...flashcardConfigs, newCard];
    setFlashcardConfigs(newConfigs);

    try {
      await saveFlashcardConfigs(newConfigs);
      toast.success('Card added');
    } catch (error) {
      setFlashcardConfigs(flashcardConfigs);
    }
  };

  const handleDeleteCard = async (cardId: string) => {
    const newConfigs = flashcardConfigs.filter(c => c.id !== cardId);
    setFlashcardConfigs(newConfigs);

    try {
      await saveFlashcardConfigs(newConfigs);
      toast.success('Card deleted');
    } catch (error) {
      setFlashcardConfigs(flashcardConfigs);
    }
  };

  const handleRemoveFieldFromCard = async (cardId: string, fieldId: string, location: 'front' | 'back') => {
    const newConfigs = flashcardConfigs.map(config => {
      if (config.id !== cardId) return config;

      if (location === 'front') {
        return { ...config, frontFieldId: '' };
      } else {
        return { ...config, backFieldIds: config.backFieldIds.filter(id => id !== fieldId) };
      }
    });
    setFlashcardConfigs(newConfigs);

    try {
      await saveFlashcardConfigs(newConfigs);
      toast.success('Field removed');
    } catch (error) {
      setFlashcardConfigs(flashcardConfigs);
    }
  };

  const handleFieldDropOnCard = async (cardId: string, fieldId: string, location: 'front' | 'back', _slotIndex?: number) => {
    const newConfigs = flashcardConfigs.map(config => {
      if (config.id !== cardId) return config;

      if (location === 'front') {
        if (config.frontFieldId) {
          toast.error('Front slot already occupied');
          return config;
        }
        return { ...config, frontFieldId: fieldId };
      } else {
        if (config.backFieldIds.length >= 3) {
          toast.error('Back slots are full (maximum 3)');
          return config;
        }
        return { ...config, backFieldIds: [...config.backFieldIds, fieldId] };
      }
    });

    const hasChanges = JSON.stringify(newConfigs) !== JSON.stringify(flashcardConfigs);
    setFlashcardConfigs(newConfigs);

    if (hasChanges) {
      try {
        await saveFlashcardConfigs(newConfigs);
        toast.success('Field assigned');
      } catch (error) {
        setFlashcardConfigs(flashcardConfigs);
      }
    }
  };

  const handleFrontFieldChange = async (cardId: string, newFieldId: string) => {
    const newConfigs = flashcardConfigs.map(c =>
      c.id === cardId ? { ...c, frontFieldId: newFieldId } : c
    );
    setFlashcardConfigs(newConfigs);

    try {
      await saveFlashcardConfigs(newConfigs);
      toast.success('Front field updated');
    } catch (error) {
      setFlashcardConfigs(flashcardConfigs);
    }
  };

  const handleBackFieldAdd = async (cardId: string, newFieldId: string) => {
    if (!newFieldId) return;

    const newConfigs = flashcardConfigs.map(c =>
      c.id === cardId ? { ...c, backFieldIds: [...c.backFieldIds, newFieldId] } : c
    );
    setFlashcardConfigs(newConfigs);

    try {
      await saveFlashcardConfigs(newConfigs);
      toast.success('Back field added');
    } catch (error) {
      setFlashcardConfigs(flashcardConfigs);
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
        flashcard_configs: flashcardConfigs,
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
    } catch (error) {
      console.error('Error saving settings:', error);
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
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">LLM Configuration</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              API Key <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Base URL <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="https://api.openai.com/v1"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Supports OpenAI-compatible APIs. URL should end with <code className="bg-gray-100 px-1 py-0.5 rounded">/v1</code>
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Model <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="gpt-3.5-turbo"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Examples: gpt-3.5-turbo, gpt-4, gpt-4-turbo, claude-3-opus-20240229
            </p>
          </div>
          <button
            onClick={handleTestConnection}
            disabled={isTestingConnection}
            className="w-full bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white py-2 px-4 rounded-lg font-medium transition flex items-center justify-center gap-2"
          >
            {isTestingConnection ? (
              <>
                <Loader size={16} className="animate-spin" />
                Testing...
              </>
            ) : (
              'Test Connection'
            )}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Dynamic Output Fields</h2>
        <div className="space-y-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={newFieldName}
              onChange={(e) => setNewFieldName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddField()}
              placeholder="e.g., Phonetic, Vietnamese Meaning"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleAddField}
              className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg font-medium transition flex items-center gap-2"
            >
              <Plus size={18} />
              Add
            </button>
          </div>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {outputFields.length === 0 ? (
              <p className="text-gray-500 text-sm py-4 text-center">No fields added yet</p>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={outputFields.map((field) => field.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-2">
                    {outputFields.map((field) => (
                      <SortableFieldItem
                        key={field.id}
                        field={field}
                        onRemove={handleRemoveField}
                        isDefinitionField={field.name === 'Definition'}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </div>
          <div className="text-xs text-gray-600 bg-blue-50 p-3 rounded-lg border border-blue-200">
            <p className="font-medium mb-1">Use Marker Tags in your prompt:</p>
            <p>Each field has a marker tag displayed below its name. Copy these tags and use them in your prompt template to extract specific values from the AI's response. The AI can provide detailed explanations alongside these tags.</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Prompt Template</h2>
        <div className="space-y-4">
          <textarea
            value={promptTemplate}
            onChange={(e) => setPromptTemplate(e.target.value)}
            placeholder="Enter your custom prompt template. Use {{Word}} and {{Example}} for dynamic variables, and marker tags for output fields."
            rows={6}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
          />
          <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded-lg">
            <p className="font-medium mb-2">Available variables:</p>
            <ul className="list-disc list-inside space-y-1 mb-3">
              <li>
                <code className="bg-white px-1 py-0.5 rounded">{'{{Word}}'}</code> - The English
                word to extract vocabulary for
              </li>
              <li>
                <code className="bg-white px-1 py-0.5 rounded">{'{{Example}}'}</code> - The example
                sentence (optional)
              </li>
            </ul>
            <p className="font-medium mb-1">How to use marker tags:</p>
            <p className="mb-2">Include marker tags from your output fields in your prompt. The AI will embed values within these tags. Example:</p>
            <code className="block bg-white px-2 py-1 rounded text-xs">
              &Phonetic&{`{/səˈrɛndɪpɪti/}`}
            </code>
            <p className="mt-2">The AI can provide detailed explanations and reasoning alongside the tagged values.</p>
          </div>
          <p className="text-xs text-gray-500">
            Character count: {promptTemplate.length}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Google Sheets Webhook</h2>
        <div className="space-y-4">
          <input
            type="text"
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
            placeholder="https://hooks.zapier.com/hooks/catch/..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-500">
            Leave empty to disable exports. Paste your webhook URL from Zapier or Make (formerly
            Integromat).
          </p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Flashcard Builder</h2>
        <p className="text-sm text-gray-600 mb-4">
          Create flashcards by assigning fields to front and back. Definition field will always display separately at the top.
        </p>

        <div className="space-y-4">
          <button
            onClick={handleAddCard}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg font-medium transition flex items-center justify-center gap-2"
          >
            <Plus size={18} />
            Add New Card
          </button>

          {flashcardConfigs.length === 0 ? (
            <p className="text-gray-500 text-sm py-4 text-center">No flashcards created yet</p>
          ) : (
            <div className="space-y-4">
              {flashcardConfigs.map((config, index) => {
                const frontField = outputFields.find(f => f.id === config.frontFieldId);
                const backFields = config.backFieldIds.map(id => outputFields.find(f => f.id === id)).filter(Boolean);
                const availableForThis = getAvailableFields();
                const availableForFront = config.frontFieldId ? availableForThis : [...availableForThis, frontField].filter(Boolean);
                const availableForBack = config.backFieldIds.length > 0 ? [...availableForThis, ...backFields] : availableForThis;

                return (
                  <div key={config.id} className="border border-gray-300 rounded-lg p-4 bg-gray-50">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-gray-900">Card {index + 1}</h3>
                      <button
                        onClick={() => handleDeleteCard(config.id)}
                        className="text-red-600 hover:text-red-800 transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Front Field <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={config.frontFieldId}
                          onChange={(e) => handleFrontFieldChange(config.id, e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Select a field...</option>
                          {availableForFront.map(field => (
                            <option key={field.id} value={field.id}>{field.name}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Back Fields (up to 3)
                        </label>
                        {config.backFieldIds.length < 3 && (
                          <select
                            value=""
                            onChange={(e) => handleBackFieldAdd(config.id, e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
                          >
                            <option value="">Add a field...</option>
                            {availableForBack.map(field => (
                              <option key={field.id} value={field.id}>{field.name}</option>
                            ))}
                          </select>
                        )}
                        <div className="space-y-2">
                          {backFields.map((field) => (
                            <div key={field.id} className="flex items-center justify-between bg-white px-3 py-2 rounded border border-gray-200">
                              <span className="text-gray-800 text-sm">{field.name}</span>
                              <button
                                onClick={() => handleRemoveFieldFromCard(config.id, field.id, 'back')}
                                className="text-red-600 hover:text-red-800 transition-colors"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          ))}
                          {config.backFieldIds.length === 0 && (
                            <p className="text-gray-400 text-xs">No back fields added yet</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

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
