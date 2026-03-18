import { useState } from 'react';
import { Plus, Trash2, Eye, EyeOff, Loader, Check, ChevronRight, Pencil } from 'lucide-react';
import type { LLMProvider, LLMProviderProfile, LLMApiParams } from '../../types';
import { testConnection } from '../../services/apiService';
import toast from 'react-hot-toast';

interface ProviderMeta {
  id: LLMProvider;
  label: string;
  shortLabel: string;
  models: string[];
  keyPlaceholder: string;
  baseUrlRequired: boolean;
}

const PROVIDERS: ProviderMeta[] = [
  {
    id: 'openai',
    label: 'OpenAI',
    shortLabel: 'OpenAI',
    models: ['gpt-4.1-mini', 'gpt-4.1', 'gpt-4.1-nano', 'gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo'],
    keyPlaceholder: 'sk-...',
    baseUrlRequired: false,
  },
  {
    id: 'anthropic',
    label: 'Anthropic (Claude)',
    shortLabel: 'Claude',
    models: [
      'claude-opus-4-5',
      'claude-sonnet-4-5',
      'claude-3-5-sonnet-20241022',
      'claude-3-5-haiku-20241022',
      'claude-3-opus-20240229',
    ],
    keyPlaceholder: 'sk-ant-...',
    baseUrlRequired: false,
  },
  {
    id: 'google',
    label: 'Google (Gemini)',
    shortLabel: 'Gemini',
    models: ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-1.5-flash'],
    keyPlaceholder: 'AIza...',
    baseUrlRequired: false,
  },
  {
    id: 'deepseek',
    label: 'DeepSeek',
    shortLabel: 'DeepSeek',
    models: ['deepseek-chat', 'deepseek-reasoner'],
    keyPlaceholder: 'sk-...',
    baseUrlRequired: false,
  },
  {
    id: 'openai-compatible',
    label: 'OpenAI-Compatible',
    shortLabel: 'Custom',
    models: [],
    keyPlaceholder: 'sk-...',
    baseUrlRequired: true,
  },
];

const PROVIDER_BADGE_COLORS: Record<LLMProvider, string> = {
  openai: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  anthropic: 'bg-amber-50 text-amber-700 border-amber-200',
  google: 'bg-blue-50 text-blue-700 border-blue-200',
  deepseek: 'bg-sky-50 text-sky-700 border-sky-200',
  'openai-compatible': 'bg-slate-50 text-slate-700 border-slate-200',
  custom: 'bg-slate-50 text-slate-700 border-slate-200',
};

function ProviderIcon({ provider, selected }: { provider: LLMProvider; selected: boolean }) {
  const cls = `w-5 h-5 ${selected ? 'opacity-100' : 'opacity-55'}`;
  if (provider === 'openai') {
    return (
      <svg viewBox="0 0 24 24" className={cls} fill="currentColor">
        <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.896zm16.597 3.855l-5.843-3.371 2.02-1.168a.076.076 0 0 1 .071 0l4.83 2.786a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.402-.674zm2.01-3.023l-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135l-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08L8.704 5.46a.795.795 0 0 0-.393.681zm1.097-2.365l2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z" />
      </svg>
    );
  }
  if (provider === 'anthropic') {
    return (
      <svg viewBox="0 0 24 24" className={cls} fill="currentColor">
        <path d="M13.827 3.52h3.603L24 20h-3.603l-6.57-16.48zm-3.654 0H6.57L0 20h3.603l1.378-3.504h6.17l1.378 3.504h3.572L10.173 3.52zm-3.676 10.35 2.07-5.273 2.07 5.273H6.497z" />
      </svg>
    );
  }
  if (provider === 'google') {
    return (
      <svg viewBox="0 0 24 24" className={cls} fill="currentColor">
        <path d="M12 11.5v3h5.2c-.4 2.3-2.4 3.9-5.2 3.9-3.2 0-5.8-2.6-5.8-5.9s2.6-5.9 5.8-5.9c1.5 0 2.8.6 3.8 1.5l2.2-2.2C16.4 4.4 14.3 3.5 12 3.5 7 3.5 3 7.5 3 12.5S7 21.5 12 21.5c5.5 0 9-3.9 9-9.5 0-.6-.1-1.2-.2-1.5H12z" />
      </svg>
    );
  }
  if (provider === 'deepseek') {
    return (
      <svg viewBox="0 0 24 24" className={cls} fill="currentColor">
        <path d="M23.748 11.01c-.14-.054-.28-.107-.42-.158-.185-.065-.37-.129-.554-.19C21.444 6.937 18.1 4.24 14.12 3.6c-4.618-.743-9.104 1.606-11.118 5.665C.989 12.322 1.576 17.01 4.47 20.04c2.892 3.03 7.52 3.886 11.373 2.097 3.853-1.788 5.99-5.795 5.356-9.979.104.024.208.047.312.069.258.057.517.11.777.157.63.11 1.25.195 1.862.254-.043-1.023-.18-2.04-.402-3.628z" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253" />
    </svg>
  );
}

const DEFAULT_API_PARAMS: LLMApiParams = {
  useTemperature: true,
  useMaxTokens: true,
  useJsonSchema: true,
};

function makeBlankProfile(): LLMProviderProfile {
  return {
    id: crypto.randomUUID(),
    name: '',
    provider: 'openai',
    apiKey: '',
    baseURL: '',
    model: 'gpt-4.1-mini',
    isCustomModel: false,
    maxTokens: undefined,
    apiParams: { ...DEFAULT_API_PARAMS },
  };
}

interface ProfileFormProps {
  profile: LLMProviderProfile;
  temperature: number;
  maxTokens: number;
  onSave: (profile: LLMProviderProfile) => Promise<void>;
  onDelete?: () => void;
  onCancel: () => void;
}

function ProfileForm({ profile, temperature, maxTokens, onSave, onDelete, onCancel }: ProfileFormProps) {
  const [form, setForm] = useState<LLMProviderProfile>({
    ...profile,
    apiParams: profile.apiParams ?? { ...DEFAULT_API_PARAMS },
  });
  const [showKey, setShowKey] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  const apiParams = form.apiParams ?? DEFAULT_API_PARAMS;

  const setApiParam = (key: keyof LLMApiParams, value: boolean) => {
    setForm((f) => ({
      ...f,
      apiParams: { ...(f.apiParams ?? DEFAULT_API_PARAMS), [key]: value },
    }));
  };

  const providerMeta = PROVIDERS.find((p) => p.id === form.provider) ?? PROVIDERS[0];
  const isCompatible = form.provider === 'openai-compatible';
  const useTextModel = isCompatible || !!form.isCustomModel;

  const handleProviderChange = (provider: LLMProvider) => {
    const meta = PROVIDERS.find((p) => p.id === provider)!;
    setForm((f) => ({
      ...f,
      provider,
      model: meta.models[0] ?? '',
      isCustomModel: provider === 'openai-compatible',
    }));
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Profile name is required'); return; }
    if (!form.apiKey.trim()) { toast.error('API Key is required'); return; }
    if (isCompatible && !form.baseURL?.trim()) { toast.error('Base URL is required for OpenAI-Compatible'); return; }
    if (!form.model.trim()) { toast.error('Model is required'); return; }
    setIsSaving(true);
    try {
      await onSave(form);
      toast.success('Profile saved');
    } catch {
      // error handled by caller
    } finally {
      setIsSaving(false);
    }
  };

  const handleTest = async () => {
    if (!form.apiKey.trim()) { toast.error('API Key is required'); return; }
    if (isCompatible && !form.baseURL?.trim()) { toast.error('Base URL is required'); return; }
    setIsTesting(true);
    try {
      const baseUrl = isCompatible
        ? (form.baseURL ?? '')
        : (form.provider === 'openai' ? 'https://api.openai.com/v1'
          : form.provider === 'anthropic' ? 'https://api.anthropic.com'
          : form.provider === 'google' ? 'https://generativelanguage.googleapis.com'
          : form.provider === 'deepseek' ? 'https://api.deepseek.com/v1'
          : '');
      await testConnection({
        apiKey: form.apiKey,
        baseUrl,
        model: form.model,
        provider: form.provider === 'openai-compatible' ? 'custom' : form.provider,
        temperature,
        maxTokens: form.maxTokens ?? maxTokens,
        apiParams: form.apiParams,
      });
      toast.success('Connection successful!');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Connection test failed.';
      toast.error(message);
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Profile Name</label>
        <input
          type="text"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          placeholder='e.g. "My Work OpenAI Key"'
          className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Provider</label>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {PROVIDERS.map((p) => {
            const isSelected = form.provider === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => handleProviderChange(p.id)}
                className={`relative flex flex-col items-center justify-center px-2 py-2.5 rounded-lg border-2 text-xs font-medium transition-all duration-150 ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <ProviderIcon provider={p.id} selected={isSelected} />
                <span className="mt-1 leading-tight text-center text-[11px]">{p.shortLabel}</span>
                {isSelected && <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-blue-500" />}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
          API Key <span className="text-red-400">*</span>
        </label>
        <div className="relative">
          <input
            type={showKey ? 'text' : 'password'}
            value={form.apiKey}
            onChange={(e) => setForm((f) => ({ ...f, apiKey: e.target.value }))}
            placeholder={providerMeta.keyPlaceholder}
            className="w-full pr-10 px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
          />
          <button
            type="button"
            onClick={() => setShowKey((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
          >
            {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>
      </div>

      {(isCompatible || form.baseURL) && (
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
            Base URL {isCompatible && <span className="text-red-400">*</span>}
          </label>
          <input
            type="text"
            value={form.baseURL ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, baseURL: e.target.value }))}
            placeholder="https://my-proxy.example.com/v1"
            className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
          />
          <p className="text-xs text-slate-400 mt-1">OpenAI-compatible endpoint. URL should end with <code className="bg-slate-100 px-1 rounded">/v1</code></p>
        </div>
      )}

      {!isCompatible && !form.baseURL && (
        <button
          type="button"
          onClick={() => setForm((f) => ({ ...f, baseURL: '' }))}
          className="text-xs text-blue-600 hover:text-blue-700 underline underline-offset-2"
        >
          + Add custom Base URL override
        </button>
      )}

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Model <span className="text-red-400">*</span>
          </label>
          {!isCompatible && (
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, isCustomModel: !f.isCustomModel, model: f.isCustomModel ? (providerMeta.models[0] ?? '') : f.model }))}
              className="text-xs text-blue-600 hover:text-blue-700 underline underline-offset-2"
            >
              {form.isCustomModel ? 'Use dropdown' : 'Type custom model'}
            </button>
          )}
        </div>
        {useTextModel ? (
          <input
            type="text"
            value={form.model}
            onChange={(e) => setForm((f) => ({ ...f, model: e.target.value }))}
            placeholder="e.g. gpt-5-mini or my-custom-model-v2"
            className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
          />
        ) : (
          <select
            value={form.model}
            onChange={(e) => setForm((f) => ({ ...f, model: e.target.value }))}
            className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
          >
            {providerMeta.models.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        )}
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
          Max Completion Tokens
        </label>
        <input
          type="number"
          min={1}
          max={200000}
          value={form.maxTokens ?? ''}
          onChange={(e) => {
            const val = e.target.value;
            setForm((f) => ({ ...f, maxTokens: val === '' ? undefined : Math.max(1, parseInt(val, 10)) }));
          }}
          placeholder={`Global default (${maxTokens})`}
          className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <p className="text-xs text-slate-400 mt-1">Leave blank to use the global default. Overrides per profile for models with specific limits.</p>
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
          API Parameters
        </label>
        <p className="text-xs text-slate-400 mb-3">Uncheck parameters your model does not support (e.g. some reasoning models reject temperature or structured output).</p>
        <div className="space-y-2.5">
          {([
            { key: 'useTemperature' as const, label: 'Include temperature', desc: 'Sends the temperature value with each request' },
            { key: 'useMaxTokens' as const, label: 'Include max tokens limit', desc: 'Sends max_completion_tokens / max_tokens with each request' },
            { key: 'useJsonSchema' as const, label: 'Use structured JSON output', desc: 'Sends response_format / tool schema for structured extraction' },
          ]).map(({ key, label, desc }) => (
            <label key={key} className="flex items-start gap-3 cursor-pointer group">
              <div className="relative mt-0.5 shrink-0">
                <input
                  type="checkbox"
                  checked={apiParams[key]}
                  onChange={(e) => setApiParam(key, e.target.checked)}
                  className="sr-only"
                />
                <div
                  className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${
                    apiParams[key]
                      ? 'bg-blue-500 border-blue-500'
                      : 'bg-white border-slate-300 group-hover:border-slate-400'
                  }`}
                >
                  {apiParams[key] && (
                    <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 10 8">
                      <path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
              </div>
              <div>
                <span className="text-sm font-medium text-slate-700">{label}</span>
                <p className="text-xs text-slate-400 mt-0.5">{desc}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2 pt-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="flex-1 bg-slate-800 hover:bg-slate-900 disabled:bg-slate-400 text-white py-2.5 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2"
        >
          {isSaving ? <Loader size={14} className="animate-spin" /> : <Check size={14} />}
          {isSaving ? 'Saving...' : 'Save Profile'}
        </button>
        <button
          type="button"
          onClick={handleTest}
          disabled={isTesting}
          className="flex-1 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 py-2.5 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2"
        >
          {isTesting ? <Loader size={14} className="animate-spin" /> : null}
          {isTesting ? 'Testing...' : 'Test Connection'}
        </button>
        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            className="p-2.5 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition-all"
            title="Delete profile"
          >
            <Trash2 size={15} />
          </button>
        )}
        <button
          type="button"
          onClick={onCancel}
          className="p-2.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 transition-all"
          title="Cancel"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

interface LLMConfigSectionProps {
  profiles: LLMProviderProfile[];
  activeLlmProfileId: string;
  temperature: number;
  maxTokens: number;
  onSaveProfile: (profile: LLMProviderProfile) => Promise<void>;
  onDeleteProfile: (profileId: string) => Promise<void>;
  onSetActive: (profileId: string) => Promise<void>;
}

export function LLMConfigSection({
  profiles,
  activeLlmProfileId,
  temperature,
  maxTokens,
  onSaveProfile,
  onDeleteProfile,
  onSetActive,
}: LLMConfigSectionProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newProfile, setNewProfile] = useState<LLMProviderProfile>(makeBlankProfile());

  const editingProfile = profiles.find((p) => p.id === editingId) ?? null;

  const handleSaveNew = async (profile: LLMProviderProfile) => {
    await onSaveProfile(profile);
    setIsCreating(false);
    setNewProfile(makeBlankProfile());
  };

  const handleSaveEdit = async (profile: LLMProviderProfile) => {
    await onSaveProfile(profile);
    setEditingId(null);
  };

  const handleDelete = async (profileId: string) => {
    await onDeleteProfile(profileId);
    if (editingId === profileId) setEditingId(null);
  };

  const handleSetActive = async (profileId: string) => {
    await onSetActive(profileId);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-900">LLM Profiles</h2>
          <p className="text-sm text-slate-500 mt-0.5">Manage API credentials and provider configurations</p>
        </div>
        {!isCreating && (
          <button
            type="button"
            onClick={() => { setNewProfile(makeBlankProfile()); setIsCreating(true); setEditingId(null); }}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-sm font-medium transition-all"
          >
            <Plus size={14} />
            Add Profile
          </button>
        )}
      </div>

      <div className="p-6 space-y-4">
        {profiles.length === 0 && !isCreating && (
          <div className="text-center py-10 text-slate-400">
            <p className="text-sm">No profiles yet.</p>
            <button
              type="button"
              onClick={() => { setNewProfile(makeBlankProfile()); setIsCreating(true); }}
              className="mt-3 text-sm text-blue-600 hover:text-blue-700 underline underline-offset-2"
            >
              Create your first profile
            </button>
          </div>
        )}

        {profiles.map((profile) => {
          const isActive = profile.id === activeLlmProfileId;
          const isEditing = profile.id === editingId;
          const badge = PROVIDER_BADGE_COLORS[profile.provider] ?? PROVIDER_BADGE_COLORS['custom'];

          return (
            <div
              key={profile.id}
              className={`rounded-xl border transition-all duration-150 ${
                isActive ? 'border-blue-300 bg-blue-50/40' : 'border-slate-200 bg-white'
              }`}
            >
              {!isEditing ? (
                <div className="flex items-center gap-3 px-4 py-3">
                  <button
                    type="button"
                    onClick={() => handleSetActive(profile.id)}
                    className={`w-4 h-4 shrink-0 rounded-full border-2 transition-all ${
                      isActive
                        ? 'border-blue-500 bg-blue-500'
                        : 'border-slate-300 hover:border-blue-400'
                    } flex items-center justify-center`}
                  >
                    {isActive && <span className="w-1.5 h-1.5 rounded-full bg-white block" />}
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-slate-800 truncate">{profile.name || 'Unnamed'}</span>
                      <span className={`text-[11px] font-medium px-1.5 py-0.5 rounded border ${badge}`}>
                        {PROVIDERS.find((p) => p.id === profile.provider)?.shortLabel ?? profile.provider}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5 font-mono truncate">{profile.model}</p>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {isActive && (
                      <span className="text-xs font-medium text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full mr-1">Active</span>
                    )}
                    <button
                      type="button"
                      onClick={() => { setEditingId(profile.id); setIsCreating(false); }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all"
                      title="Edit"
                    >
                      <Pencil size={14} />
                    </button>
                    <ChevronRight size={14} className="text-slate-300" />
                  </div>
                </div>
              ) : (
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-sm font-semibold text-slate-700">Editing: {profile.name || 'Profile'}</span>
                  </div>
                  <ProfileForm
                    profile={profile}
                    temperature={temperature}
                    maxTokens={maxTokens}
                    onSave={handleSaveEdit}
                    onDelete={() => handleDelete(profile.id)}
                    onCancel={() => setEditingId(null)}
                  />
                </div>
              )}
            </div>
          );
        })}

        {isCreating && (
          <div className="rounded-xl border-2 border-dashed border-blue-200 bg-blue-50/30 p-5">
            <p className="text-sm font-semibold text-slate-700 mb-4">New Profile</p>
            <ProfileForm
              profile={newProfile}
              temperature={temperature}
              maxTokens={maxTokens}
              onSave={handleSaveNew}
              onCancel={() => { setIsCreating(false); setNewProfile(makeBlankProfile()); }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
