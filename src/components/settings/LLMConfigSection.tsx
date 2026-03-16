import { Loader, Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import type { LLMProvider } from '../../types';

interface ProviderConfig {
  id: LLMProvider;
  label: string;
  shortLabel: string;
  models: string[];
}

const PROVIDERS: ProviderConfig[] = [
  {
    id: 'openai',
    label: 'OpenAI',
    shortLabel: 'OpenAI',
    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo'],
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
  },
  {
    id: 'google',
    label: 'Google (Gemini)',
    shortLabel: 'Gemini',
    models: ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-1.5-flash'],
  },
  {
    id: 'deepseek',
    label: 'DeepSeek',
    shortLabel: 'DeepSeek',
    models: ['deepseek-chat', 'deepseek-reasoner'],
  },
  {
    id: 'custom',
    label: 'Custom Proxy',
    shortLabel: 'Custom',
    models: [],
  },
];

interface LLMConfigSectionProps {
  provider: LLMProvider;
  apiKey: string;
  baseUrl: string;
  model: string;
  temperature: number;
  maxTokens: number;
  isTestingConnection: boolean;
  onProviderChange: (value: LLMProvider) => void;
  onApiKeyChange: (value: string) => void;
  onBaseUrlChange: (value: string) => void;
  onModelChange: (value: string) => void;
  onTemperatureChange: (value: number) => void;
  onMaxTokensChange: (value: number) => void;
  onTestConnection: () => void;
}

export function LLMConfigSection({
  provider,
  apiKey,
  baseUrl,
  model,
  temperature,
  maxTokens,
  isTestingConnection,
  onProviderChange,
  onApiKeyChange,
  onBaseUrlChange,
  onModelChange,
  onTemperatureChange,
  onMaxTokensChange,
  onTestConnection,
}: LLMConfigSectionProps) {
  const [showApiKey, setShowApiKey] = useState(false);

  const selectedProvider = PROVIDERS.find((p) => p.id === provider) ?? PROVIDERS[0];
  const isCustom = provider === 'custom';

  const handleProviderChange = (newProvider: LLMProvider) => {
    onProviderChange(newProvider);
    const config = PROVIDERS.find((p) => p.id === newProvider);
    if (config && config.models.length > 0) {
      onModelChange(config.models[0]);
    } else if (newProvider === 'custom') {
      onModelChange('');
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100">
        <h2 className="text-base font-semibold text-slate-900">LLM Configuration</h2>
        <p className="text-sm text-slate-500 mt-0.5">Select a provider and configure your API credentials</p>
      </div>

      <div className="p-6 space-y-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-3">Provider</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
            {PROVIDERS.map((p) => {
              const isSelected = provider === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleProviderChange(p.id)}
                  className={`relative flex flex-col items-center justify-center px-2 py-3 rounded-lg border-2 text-xs font-medium transition-all duration-150 ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <ProviderIcon provider={p.id} selected={isSelected} />
                  <span className="mt-1.5 leading-tight text-center">{p.shortLabel}</span>
                  {isSelected && (
                    <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-blue-500" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              API Key <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showApiKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => onApiKeyChange(e.target.value)}
                placeholder={
                  provider === 'anthropic'
                    ? 'sk-ant-...'
                    : provider === 'google'
                    ? 'AIza...'
                    : provider === 'deepseek'
                    ? 'sk-...'
                    : 'sk-...'
                }
                className="w-full pr-10 px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
              />
              <button
                type="button"
                onClick={() => setShowApiKey((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              >
                {showApiKey ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {isCustom && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Base URL <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={baseUrl}
                onChange={(e) => onBaseUrlChange(e.target.value)}
                placeholder="https://my-proxy.example.com/v1"
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
              />
              <p className="text-xs text-slate-400 mt-1.5">
                Must be an OpenAI-compatible endpoint. URL should end with{' '}
                <code className="bg-slate-100 px-1 py-0.5 rounded">/v1</code>
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Model <span className="text-red-500">*</span>
            </label>
            {isCustom ? (
              <input
                type="text"
                value={model}
                onChange={(e) => onModelChange(e.target.value)}
                placeholder="e.g. my-custom-model-v2"
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
              />
            ) : (
              <select
                value={model}
                onChange={(e) => onModelChange(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              >
                {selectedProvider.models.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
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
                onChange={(e) => onTemperatureChange(parseFloat(e.target.value))}
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
                value={maxTokens}
                onChange={(e) => onMaxTokensChange(parseInt(e.target.value, 10) || 2000)}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-slate-400 mt-1.5">Max tokens per generation (100–32000)</p>
            </div>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-100">
          <button
            onClick={onTestConnection}
            disabled={isTestingConnection}
            className="w-full bg-slate-700 hover:bg-slate-800 disabled:bg-slate-400 text-white py-2.5 px-4 rounded-lg text-sm font-medium transition-all duration-150 flex items-center justify-center gap-2"
          >
            {isTestingConnection ? (
              <>
                <Loader size={15} className="animate-spin" />
                Testing connection...
              </>
            ) : (
              'Test Connection'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function ProviderIcon({ provider, selected }: { provider: LLMProvider; selected: boolean }) {
  const cls = `w-6 h-6 ${selected ? 'opacity-100' : 'opacity-60'}`;
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
