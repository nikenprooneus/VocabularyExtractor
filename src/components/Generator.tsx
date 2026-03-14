import { useState } from 'react';
import { Loader, Zap, Send, RotateCcw, Save, Copy, ChevronDown, ChevronUp } from 'lucide-react';
import { Settings as SettingsType, GeneratedResult } from '../types/index';
import { FlashcardItem } from './FlashcardItem';
import { generateVocabulary } from '../services/apiService';
import { exportToWebhook } from '../services/exportService';
import { saveVocabularyEntry } from '../services/supabaseService';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

interface GeneratorProps {
  settings: SettingsType;
}

export function Generator({ settings }: GeneratorProps) {
  const { user } = useAuth();
  const [word, setWord] = useState('');
  const [example, setExample] = useState('');
  const [results, setResults] = useState<GeneratedResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showRawOutput, setShowRawOutput] = useState(true);

  const isSettingsConfigured =
    settings.apiKey && settings.baseUrl && settings.outputFields.length > 0;

  const handleGenerate = async () => {
    if (!word.trim()) {
      toast.error('Please enter an English word');
      return;
    }

    if (!isSettingsConfigured) {
      toast.error('Settings not configured. Please check the Settings tab.');
      return;
    }

    setIsLoading(true);
    try {
      const result = await generateVocabulary(
        word,
        example,
        settings.promptTemplate,
        settings.outputFields,
        { apiKey: settings.apiKey, baseUrl: settings.baseUrl, model: settings.model },
      );
      setResults(result);
      toast.success('Vocabulary extracted successfully!');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate vocabulary';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = async () => {
    if (!settings.webhookUrl) {
      toast.error('Webhook URL not configured');
      return;
    }

    if (!results) {
      toast.error('No results to export');
      return;
    }

    setIsExporting(true);
    try {
      await exportToWebhook(word, example, results, settings.webhookUrl);
      toast.success('Successfully exported to Google Sheets!');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Export failed';
      toast.error(`Export failed: ${errorMessage}`);
    } finally {
      setIsExporting(false);
    }
  };

  const handleSaveToHistory = async () => {
    if (!user) {
      toast.error('User not authenticated');
      return;
    }

    if (!results) {
      toast.error('No results to save');
      return;
    }

    setIsSaving(true);
    try {
      await saveVocabularyEntry(user.id, word, example, results);
      toast.success('Saved to history!');
    } catch (error) {
      console.error('Error saving to history:', error);
      toast.error('Failed to save to history');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClear = () => {
    setWord('');
    setExample('');
    setResults(null);
  };

  const handleCopyRawOutput = () => {
    if (results?.rawOutput) {
      navigator.clipboard.writeText(results.rawOutput);
      toast.success('Full analysis copied to clipboard!');
    }
  };

  return (
    <div className="space-y-6">
      {!isSettingsConfigured && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm text-yellow-800">
            <span className="font-semibold">Setup required:</span> Please configure your settings
            (API Key, Base URL, and at least one output field) before generating vocabulary.
          </p>
        </div>
      )}

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
              onChange={(e) => setWord(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleGenerate()}
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
              onChange={(e) => setExample(e.target.value)}
              placeholder="e.g., Finding that old book in the library was pure serendipity."
              rows={3}
              disabled={isLoading}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
            />
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleGenerate}
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
              onClick={handleClear}
              disabled={isLoading || (!word && !example && !results)}
              className="bg-gray-300 hover:bg-gray-400 disabled:bg-gray-200 text-gray-800 py-2 px-4 rounded-lg font-medium transition flex items-center gap-2"
            >
              <RotateCcw size={18} />
              Clear
            </button>
          </div>
        </div>
      </div>

      {results && (
        <>
          {results['Definition'] && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-sm font-medium text-gray-600 mb-2">Definition</h2>
              <p className="text-lg leading-relaxed text-gray-900 font-normal">
                {results['Definition']}
              </p>
            </div>
          )}

          {settings.flashcardConfigs && settings.flashcardConfigs.length > 0 ? (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Flashcards</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {settings.flashcardConfigs
                  .filter(config => config.frontFieldId)
                  .sort((a, b) => a.cardOrder - b.cardOrder)
                  .map((config) => (
                    <FlashcardItem
                      key={config.id}
                      config={config}
                      results={results}
                      outputFields={settings.outputFields}
                    />
                  ))}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Extracted Fields</h2>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {settings.outputFields
                  .filter(field => field.name !== 'Definition')
                  .map((field) => (
                    <div key={field.id}>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {field.name}
                      </label>
                      <textarea
                        readOnly
                        value={results[field.name] || ''}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 cursor-default"
                      />
                    </div>
                  ))}
              </div>
            </div>
          )}

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex gap-3">
              <button
                onClick={handleSaveToHistory}
                disabled={isSaving}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-2 px-4 rounded-lg font-medium transition flex items-center justify-center gap-2"
              >
                {isSaving ? (
                  <>
                    <Loader size={18} className="animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save size={18} />
                    Save to History
                  </>
                )}
              </button>
              <button
                onClick={handleExport}
                disabled={isExporting || !settings.webhookUrl}
                className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white py-2 px-4 rounded-lg font-medium transition flex items-center justify-center gap-2"
              >
                {isExporting ? (
                  <>
                    <Loader size={18} className="animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Send size={18} />
                    Export to Google Sheets
                  </>
                )}
              </button>
            </div>
            {!settings.webhookUrl && (
              <p className="text-xs text-gray-500 mt-2">
                Webhook URL not configured. Configure it in Settings to enable exports.
              </p>
            )}
          </div>

          {results.rawOutput && (
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Full AI Analysis</h2>
                <div className="flex gap-2">
                  <button
                    onClick={handleCopyRawOutput}
                    className="text-gray-600 hover:text-gray-800 transition-colors flex items-center gap-1 text-sm"
                    title="Copy full analysis"
                  >
                    <Copy size={16} />
                    Copy
                  </button>
                  <button
                    onClick={() => setShowRawOutput(!showRawOutput)}
                    className="text-gray-600 hover:text-gray-800 transition-colors flex items-center gap-1 text-sm"
                  >
                    {showRawOutput ? (
                      <>
                        <ChevronUp size={16} />
                        Hide
                      </>
                    ) : (
                      <>
                        <ChevronDown size={16} />
                        Show
                      </>
                    )}
                  </button>
                </div>
              </div>
              {showRawOutput && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 max-h-96 overflow-y-auto">
                  <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">
                    {results.rawOutput}
                  </pre>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {!results && !isLoading && (
        <div className="bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
          <p className="text-gray-500">No results yet. Enter a word and click Generate to start.</p>
        </div>
      )}
    </div>
  );
}
