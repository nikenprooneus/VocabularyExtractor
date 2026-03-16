import { useState, useRef } from 'react';
import { Settings as SettingsType, GeneratedResult, ParsedMeaning, ConceptTreeNode, WordWithContext } from '../types/index';
import { generateVocabulary } from '../services/apiService';
import { exportToWebhook } from '../services/exportService';
import { upsertWord, fetchWordsByTerm, fetchLookupTables, reconstructParsedMeaning } from '../services/supabaseService';
import { supabase } from '../lib/supabase';
import { resolveAllLookupIds, rehydrateNoteWithLookupNames } from '../services/lookupService';
import { useAuth } from '../contexts/AuthContext';
import { useConceptContext } from '../contexts/ConceptContext';
import { parseSingleMeaning } from '../utils/parsingUtils';
import toast from 'react-hot-toast';
import { WordInputSection } from './generator/WordInputSection';
import { ResultsDisplay } from './generator/ResultsDisplay';
import { ActionButtons } from './generator/ActionButtons';
import { DisambiguationModal } from './generator/DisambiguationModal';

interface GeneratorProps {
  settings: SettingsType;
  isLoading?: boolean;
}

interface PendingConceptSelection {
  nodes: ConceptTreeNode[];
  selectedNames: Set<string>;
  conceptLink: string;
  contextDefinition: string;
}

export function Generator({ settings, isLoading: settingsLoading = false }: GeneratorProps) {
  const { user } = useAuth();
  const { conceptBank, saveConceptsFromMeaning } = useConceptContext();
  const [word, setWord] = useState('');
  const [example, setExample] = useState('');
  const [results, setResults] = useState<GeneratedResult | null>(null);
  const [parsedMeaning, setParsedMeaning] = useState<ParsedMeaning | null>(null);
  const [conceptTreeRawOutput, setConceptTreeRawOutput] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showRawOutput, setShowRawOutput] = useState(true);
  const [disambiguationContexts, setDisambiguationContexts] = useState<WordWithContext[] | null>(null);
  const pendingConceptSelection = useRef<PendingConceptSelection | null>(null);

  const isLLMConfigured = !!(settings.apiKey && settings.outputFields.length > 0);
  const hasFlashcardConfig = settings.flashcardConfigs.length > 0;
  const isSettingsConfigured = isLLMConfigured && hasFlashcardConfig;

  const apiConfig = {
    apiKey: settings.apiKey,
    baseUrl: settings.baseUrl,
    model: settings.model,
    provider: settings.llmProvider ?? 'openai',
    temperature: settings.temperature ?? 0.7,
    maxTokens: settings.llmMaxTokens ?? 2000,
  };

  const runApiCalls = async (wordVal: string, exampleVal: string): Promise<{ tmrndResult: GeneratedResult; ctMeaning: ParsedMeaning | null; ctRaw: string | undefined }> => {
    const hasCtConfig =
      settings.conceptTreePromptTemplate.trim().length > 0 &&
      settings.conceptTreeOutputFields.length > 0;

    const ctPrompt = hasCtConfig
      ? settings.conceptTreePromptTemplate.replace(/\{\{Concept Bank\}\}/gi, conceptBank)
      : null;

    const [tmrndResult, ctResult] = await Promise.all([
      generateVocabulary(wordVal, exampleVal, settings.promptTemplate, settings.outputFields, apiConfig),
      ctPrompt
        ? generateVocabulary(wordVal, exampleVal, ctPrompt, settings.conceptTreeOutputFields, apiConfig)
        : Promise.resolve(null),
    ]);

    let ctMeaning: ParsedMeaning | null = null;
    let ctRaw: string | undefined;
    if (ctResult?.rawOutput) {
      ctMeaning = parseSingleMeaning(ctResult.rawOutput, settings.conceptTreeOutputFields);
      ctRaw = ctResult.rawOutput;
    }

    return { tmrndResult, ctMeaning, ctRaw };
  };

  const handleGenerate = async () => {
    if (!word.trim()) {
      toast.error('Please enter an English word');
      return;
    }
    if (!isSettingsConfigured) {
      toast.error('Settings not configured. Please check the Settings tab.');
      return;
    }
    if (!user) {
      toast.error('User not authenticated');
      return;
    }

    setIsLoading(true);
    try {
      const existingContexts = await fetchWordsByTerm(user.id, word);

      if (existingContexts.length > 0) {
        const exactMatch = existingContexts.find(
          (ctx) => ctx.example.toLowerCase().trim() === example.toLowerCase().trim()
        );

        if (exactMatch) {
          const lookups = await fetchLookupTables();
          const ids = {
            toneId: exactMatch.toneId,
            dialectId: exactMatch.dialectId,
            modeId: exactMatch.modeId,
            nuanceId: exactMatch.nuanceId,
            registerId: exactMatch.registerId,
          };
          const rehydratedNote = rehydrateNoteWithLookupNames(exactMatch.note as Record<string, unknown>, ids, lookups);
          setResults(rehydratedNote as typeof exactMatch.note);
          setConceptTreeRawOutput(undefined);
          const rebuilt = await reconstructParsedMeaning(
            exactMatch.conceptId,
            exactMatch.wordLinkId,
            exactMatch.contextDefinition
          );
          setParsedMeaning(rebuilt);
          toast.success('Loaded from saved analysis!');
          setIsLoading(false);
          return;
        }

        setDisambiguationContexts(existingContexts);
        setIsLoading(false);
        return;
      }

      const { tmrndResult, ctMeaning, ctRaw } = await runApiCalls(word, example);
      setResults(tmrndResult);
      setParsedMeaning(ctMeaning);
      setConceptTreeRawOutput(ctRaw);
      toast.success('Vocabulary extracted successfully!');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate vocabulary';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisambiguationSelectExisting = async (existing: WordWithContext) => {
    if (!user) return;
    setDisambiguationContexts(null);
    setIsLoading(true);
    try {
      const lookupIds = {
        toneId: existing.toneId,
        dialectId: existing.dialectId,
        modeId: existing.modeId,
        nuanceId: existing.nuanceId,
        registerId: existing.registerId,
      };
      const newWord = await upsertWord(user.id, word, example, existing.note, lookupIds);

      if (existing.conceptId) {
        const { error } = await supabase
          .from('concept_words')
          .insert({
            user_id: user.id,
            word_id: newWord.id,
            concept_id: existing.conceptId,
            word_link_id: existing.wordLinkId ?? null,
            context_definition: existing.contextDefinition ?? null,
          });
        if (error) throw error;
      }

      const lookups = await fetchLookupTables();
      const ids = {
        toneId: existing.toneId,
        dialectId: existing.dialectId,
        modeId: existing.modeId,
        nuanceId: existing.nuanceId,
        registerId: existing.registerId,
      };
      const rehydratedNote = rehydrateNoteWithLookupNames(existing.note as Record<string, unknown>, ids, lookups);
      setResults(rehydratedNote as typeof existing.note);
      setConceptTreeRawOutput(undefined);
      const rebuilt = await reconstructParsedMeaning(
        existing.conceptId,
        existing.wordLinkId,
        existing.contextDefinition
      );
      setParsedMeaning(rebuilt);
      toast.success('Context cloned successfully!');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to clone context';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisambiguationGenerateNew = async () => {
    setDisambiguationContexts(null);
    if (!isSettingsConfigured) return;
    setIsLoading(true);
    try {
      const { tmrndResult, ctMeaning, ctRaw } = await runApiCalls(word, example);
      setResults(tmrndResult);
      setParsedMeaning(ctMeaning);
      setConceptTreeRawOutput(ctRaw);
      toast.success('Vocabulary extracted successfully!');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate vocabulary';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConceptSelectionChange = (
    nodes: ConceptTreeNode[],
    selectedNames: Set<string>,
    conceptLink: string,
    contextDefinition: string
  ) => {
    pendingConceptSelection.current = { nodes, selectedNames, conceptLink, contextDefinition };
  };

  const handleSaveComplete = async () => {
    if (!user) { toast.error('User not authenticated'); return; }
    if (!results) { toast.error('No results to save'); return; }

    setIsSaving(true);
    try {
      const lookups = await fetchLookupTables();
      const lookupIds = resolveAllLookupIds((results as any), lookups);

      const cleanNote = { ...results } as any;
      delete cleanNote['Tone'];
      delete cleanNote['Dialect'];
      delete cleanNote['Dialects'];
      delete cleanNote['Mode'];
      delete cleanNote['Modes'];
      delete cleanNote['Nuance'];
      delete cleanNote['Nuances'];
      delete cleanNote['Register'];

      const savedWord = await upsertWord(user.id, word, example, cleanNote, lookupIds);

      const sel = pendingConceptSelection.current;
      if (sel && (sel.nodes.length > 0 || sel.selectedNames.size > 0)) {
        await saveConceptsFromMeaning(
          sel.nodes,
          savedWord.id,
          word,
          sel.selectedNames,
          sel.conceptLink || undefined,
          sel.contextDefinition || undefined
        );
      }

      toast.success('Analysis saved!');
    } catch {
      toast.error('Failed to save analysis');
    } finally {
      setIsSaving(false);
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

  const handleClear = () => {
    setWord('');
    setExample('');
    setResults(null);
    setParsedMeaning(null);
    setConceptTreeRawOutput(undefined);
    pendingConceptSelection.current = null;
  };

  const handleCopyRawOutput = () => {
    if (results?.rawOutput) {
      navigator.clipboard.writeText(results.rawOutput);
      toast.success('Full analysis copied to clipboard!');
    }
  };

  return (
    <div className="space-y-6">
      {disambiguationContexts && (
        <DisambiguationModal
          word={word}
          existingContexts={disambiguationContexts}
          onSelectExisting={handleDisambiguationSelectExisting}
          onGenerateNew={handleDisambiguationGenerateNew}
          onClose={() => setDisambiguationContexts(null)}
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
            parsedMeaning={parsedMeaning}
            word={word}
            conceptTreeRawOutput={conceptTreeRawOutput}
            onConceptSelectionChange={handleConceptSelectionChange}
          />

          <ActionButtons
            isSaving={isSaving}
            isExporting={isExporting}
            webhookUrl={settings.webhookUrl}
            onSave={handleSaveComplete}
            onExport={handleExport}
          />
        </>
      )}

    </div>
  );
}
