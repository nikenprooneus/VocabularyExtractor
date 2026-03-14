import { useState } from 'react';
import { Settings as SettingsType, GeneratedResult } from '../types/index';
import { generateVocabulary } from '../services/apiService';
import { exportToWebhook } from '../services/exportService';
import { saveVocabularyEntry } from '../services/supabaseService';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { WordInputSection } from './generator/WordInputSection';
import { ResultsDisplay } from './generator/ResultsDisplay';
import { ActionButtons } from './generator/ActionButtons';

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
    } catch {
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

      <WordInputSection
        word={word}
        example={example}
        isLoading={isLoading}
        isSettingsConfigured={!!isSettingsConfigured}
        onWordChange={setWord}
        onExampleChange={setExample}
        onGenerate={handleGenerate}
        onClear={handleClear}
        hasClearableContent={!!(word || example || results)}
      />

      {results && (
        <>
          <ResultsDisplay
            results={results}
            settings={settings}
            showRawOutput={showRawOutput}
            onToggleRawOutput={() => setShowRawOutput(!showRawOutput)}
            onCopyRawOutput={handleCopyRawOutput}
          />

          <ActionButtons
            isSaving={isSaving}
            isExporting={isExporting}
            webhookUrl={settings.webhookUrl}
            onSave={handleSaveToHistory}
            onExport={handleExport}
          />
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
