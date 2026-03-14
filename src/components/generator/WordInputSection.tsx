import { Loader, Zap, RotateCcw } from 'lucide-react';

interface WordInputSectionProps {
  word: string;
  example: string;
  isLoading: boolean;
  isSettingsConfigured: boolean;
  onWordChange: (value: string) => void;
  onExampleChange: (value: string) => void;
  onGenerate: () => void;
  onClear: () => void;
  hasClearableContent: boolean;
}

export function WordInputSection({
  word,
  example,
  isLoading,
  isSettingsConfigured,
  onWordChange,
  onExampleChange,
  onGenerate,
  onClear,
  hasClearableContent,
}: WordInputSectionProps) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <Zap size={20} className="text-blue-600" />
        Input
      </h2>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            English Word <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={word}
            onChange={(e) => onWordChange(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onGenerate()}
            placeholder="e.g., serendipity"
            disabled={isLoading}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Example Sentence <span className="text-gray-400">(optional)</span>
          </label>
          <textarea
            value={example}
            onChange={(e) => onExampleChange(e.target.value)}
            placeholder="e.g., Finding that old book in the library was pure serendipity."
            rows={3}
            disabled={isLoading}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
          />
        </div>
        <div className="flex gap-3">
          <button
            onClick={onGenerate}
            disabled={isLoading || !isSettingsConfigured}
            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white py-2 px-4 rounded-lg font-medium transition flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader size={18} className="animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Zap size={18} />
                Generate
              </>
            )}
          </button>
          <button
            onClick={onClear}
            disabled={isLoading || !hasClearableContent}
            className="bg-gray-300 hover:bg-gray-400 disabled:bg-gray-200 text-gray-800 py-2 px-4 rounded-lg font-medium transition flex items-center gap-2"
          >
            <RotateCcw size={18} />
            Clear
          </button>
        </div>
      </div>
    </div>
  );
}
