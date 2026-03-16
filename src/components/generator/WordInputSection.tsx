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
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 sm:p-6">
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              English Word <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={word}
              onChange={(e) => onWordChange(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onGenerate()}
              placeholder="e.g., serendipity"
              disabled={isLoading}
              className="w-full bg-transparent border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Example Sentence <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={example}
              onChange={(e) => onExampleChange(e.target.value)}
              placeholder="e.g., Finding that old book in the library was pure serendipity."
              rows={1}
              disabled={isLoading}
              className="w-full bg-transparent border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition disabled:opacity-50 disabled:cursor-not-allowed resize-none"
            />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2.5">
          <button
            onClick={onGenerate}
            disabled={isLoading || !isSettingsConfigured}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-700 disabled:opacity-50 text-white py-2 px-5 rounded-md text-sm font-medium transition-all"
          >
            {isLoading ? (
              <>
                <Loader size={15} className="animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Zap size={15} />
                Generate
              </>
            )}
          </button>
          <button
            onClick={onClear}
            disabled={isLoading || !hasClearableContent}
            className="w-full sm:w-auto flex items-center justify-center gap-2 border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 text-slate-700 py-2 px-5 rounded-md text-sm font-medium transition-all"
          >
            <RotateCcw size={15} />
            Clear
          </button>
        </div>
      </div>
    </div>
  );
}
