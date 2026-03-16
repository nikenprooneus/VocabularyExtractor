import { useState } from 'react';
import { Settings as SettingsType } from '../types/index';
import { useVocabularyGenerator } from '../hooks/useVocabularyGenerator';
import { WordInputSection } from './generator/WordInputSection';
import { ResultsDisplay } from './generator/ResultsDisplay';
import { ActionButtons } from './generator/ActionButtons';
import { DisambiguationModal } from './generator/DisambiguationModal';

interface GeneratorProps {
  settings: SettingsType;
  isLoading?: boolean;
}

export function Generator({ settings, isLoading: settingsLoading = false }: GeneratorProps) {
  const [word, setWord] = useState('');
  const [example, setExample] = useState('');
  const [showRawOutput, setShowRawOutput] = useState(true);

  const {
    results,
    parsedMeaning,
    conceptTreeRawOutput,
    isLoading,
    isSaving,
    isExporting,
    disambiguationContexts,
    handleGenerate,
    handleDisambiguationSelectExisting,
    handleDisambiguationGenerateNew,
    handleSaveComplete,
    handleExport,
    handleClear,
    handleCopyRawOutput,
    handleConceptSelectionChange,
    clearDisambiguation,
  } = useVocabularyGenerator(settings);

  const isLLMConfigured = !!(settings.apiKey && settings.outputFields.length > 0);
  const hasFlashcardConfig = settings.flashcardConfigs.length > 0;
  const isSettingsConfigured = isLLMConfigured && hasFlashcardConfig;

  const onClear = () => {
    setWord('');
    setExample('');
    handleClear();
  };

  return (
    <div className="space-y-6">
      {disambiguationContexts && (
        <DisambiguationModal
          word={word}
          existingContexts={disambiguationContexts}
          onSelectExisting={(existing) => handleDisambiguationSelectExisting(existing, word, example)}
          onGenerateNew={() => handleDisambiguationGenerateNew(word, example)}
          onClose={clearDisambiguation}
        />
      )}

      {!settingsLoading && !isLLMConfigured && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm text-yellow-800">
            <span className="font-semibold">Setup required:</span> Please configure your API Key,
            Base URL, and at least one output field in the Settings tab before generating.
          </p>
        </div>
      )}

      {!settingsLoading && isLLMConfigured && !hasFlashcardConfig && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <p className="text-sm text-amber-800">
            <span className="font-semibold">Flashcard setup required:</span> Please configure at
            least one Flashcard in the Settings tab before generating.
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
        onGenerate={() => handleGenerate(word, example)}
        onClear={onClear}
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
            parsedMeaning={parsedMeaning}
            word={word}
            conceptTreeRawOutput={conceptTreeRawOutput}
            onConceptSelectionChange={handleConceptSelectionChange}
          />

          <ActionButtons
            isSaving={isSaving}
            isExporting={isExporting}
            webhookUrl={settings.webhookUrl}
            onSave={() => handleSaveComplete(word, example)}
            onExport={() => handleExport(word, example)}
          />
        </>
      )}
    </div>
  );
}
