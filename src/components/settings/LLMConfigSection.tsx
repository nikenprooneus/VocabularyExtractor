import { Loader } from 'lucide-react';

interface LLMConfigSectionProps {
  apiKey: string;
  baseUrl: string;
  model: string;
  isTestingConnection: boolean;
  onApiKeyChange: (value: string) => void;
  onBaseUrlChange: (value: string) => void;
  onModelChange: (value: string) => void;
  onTestConnection: () => void;
}

export function LLMConfigSection({
  apiKey,
  baseUrl,
  model,
  isTestingConnection,
  onApiKeyChange,
  onBaseUrlChange,
  onModelChange,
  onTestConnection,
}: LLMConfigSectionProps) {
  return (
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
            onChange={(e) => onApiKeyChange(e.target.value)}
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
            onChange={(e) => onBaseUrlChange(e.target.value)}
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
            onChange={(e) => onModelChange(e.target.value)}
            placeholder="gpt-3.5-turbo"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-500 mt-1">
            Examples: gpt-3.5-turbo, gpt-4, gpt-4-turbo, claude-3-opus-20240229
          </p>
        </div>
        <button
          onClick={onTestConnection}
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
  );
}
