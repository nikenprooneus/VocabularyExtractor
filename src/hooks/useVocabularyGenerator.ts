import { useState, useRef, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Settings, GeneratedResult, ParsedMeaning, ConceptTreeNode, WordWithContext } from '../types/index';
import { generateVocabulary } from '../services/apiService';
import { exportToWebhook } from '../services/exportService';
import { upsertWord, fetchWordsByTerm, fetchLookupTables, reconstructParsedMeaning } from '../services/supabaseService';
import { supabase } from '../lib/supabase';
import { resolveAllLookupIds, rehydrateNoteWithLookupNames } from '../services/lookupService';
import { useAuth } from '../contexts/AuthContext';
import { useConceptContext } from '../contexts/ConceptContext';
import { parseSingleMeaning, parseStructuredOutput } from '../utils/parsingUtils';
import { buildApiJsonSchema, buildZodSchema } from '../utils/schemaBuilder';

interface PendingConceptSelection {
  nodes: ConceptTreeNode[];
  selectedNames: Set<string>;
  conceptLink: string;
  contextDefinition: string;
}

export interface VocabularyGeneratorState {
  results: GeneratedResult | null;
  parsedMeaning: ParsedMeaning | null;
  conceptTreeRawOutput: string | undefined;
  isLoading: boolean;
  isSaving: boolean;
  isExporting: boolean;
  disambiguationContexts: WordWithContext[] | null;
  handleGenerate: (word: string, example: string) => Promise<void>;
  handleDisambiguationSelectExisting: (existing: WordWithContext, word: string, example: string) => Promise<void>;
  handleDisambiguationGenerateNew: (word: string, example: string) => Promise<void>;
  handleSaveComplete: (word: string, example: string) => Promise<void>;
  handleExport: (word: string, example: string) => Promise<void>;
  handleClear: () => void;
  handleCopyRawOutput: () => void;
  handleConceptSelectionChange: (nodes: ConceptTreeNode[], selectedNames: Set<string>, conceptLink: string, contextDefinition: string) => void;
  clearDisambiguation: () => void;
}

export function useVocabularyGenerator(settings: Settings): VocabularyGeneratorState {
  const { user } = useAuth();
  const { conceptBank, saveConceptsFromMeaning } = useConceptContext();

  const [results, setResults] = useState<GeneratedResult | null>(null);
  const [parsedMeaning, setParsedMeaning] = useState<ParsedMeaning | null>(null);
  const [conceptTreeRawOutput, setConceptTreeRawOutput] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [disambiguationContexts, setDisambiguationContexts] = useState<WordWithContext[] | null>(null);
  const pendingConceptSelection = useRef<PendingConceptSelection | null>(null);

  const activeProfile = settings.llmProfiles.find((p) => p.id === settings.activeLlmProfileId)
    ?? settings.llmProfiles[0]
    ?? null;

  const PROVIDER_BASE_URLS: Record<string, string> = {
    openai: 'https://api.openai.com/v1',
    anthropic: 'https://api.anthropic.com',
    google: 'https://generativelanguage.googleapis.com',
    deepseek: 'https://api.deepseek.com/v1',
  };

  const resolvedBaseUrl = activeProfile
    ? (activeProfile.baseURL?.trim()
        ? activeProfile.baseURL
        : (PROVIDER_BASE_URLS[activeProfile.provider] ?? ''))
    : '';

  const resolvedProvider = activeProfile?.provider === 'openai-compatible' ? 'custom' : (activeProfile?.provider ?? 'openai');

  const apiConfig = {
    apiKey: activeProfile?.apiKey ?? '',
    baseUrl: resolvedBaseUrl,
    model: activeProfile?.model ?? '',
    provider: resolvedProvider as import('../types/index').LLMProvider,
    temperature: settings.temperature ?? 0.7,
    maxTokens: settings.llmMaxTokens ?? 2000,
  };

  const isSettingsConfigured = !!(
    activeProfile?.apiKey &&
    settings.outputFields.length > 0 &&
    settings.flashcardConfigs.length > 0
  );

  const runApiCalls = useCallback(async (wordVal: string, exampleVal: string): Promise<{ tmrndResult: GeneratedResult; ctMeaning: ParsedMeaning | null; ctRaw: string | undefined }> => {
    const hasCtConfig =
      settings.conceptTreePromptTemplate.trim().length > 0 &&
      settings.conceptTreeOutputFields.length > 0;

    const ctPrompt = hasCtConfig
      ? settings.conceptTreePromptTemplate.replace(/\{\{Concept Bank\}\}/gi, conceptBank)
      : null;

    const tmrndSchema = buildApiJsonSchema(settings.outputFields);
    const tmrndZod = buildZodSchema(settings.outputFields);

    const ctSchema = hasCtConfig ? buildApiJsonSchema(settings.conceptTreeOutputFields) : undefined;
    const ctZod = hasCtConfig ? buildZodSchema(settings.conceptTreeOutputFields) : undefined;

    const [tmrndRaw, ctRaw] = await Promise.all([
      generateVocabulary(wordVal, exampleVal, settings.promptTemplate, settings.outputFields, apiConfig, tmrndSchema),
      ctPrompt
        ? generateVocabulary(wordVal, exampleVal, ctPrompt, settings.conceptTreeOutputFields, apiConfig, ctSchema)
        : Promise.resolve(null),
    ]);

    const tmrndResult = parseStructuredOutput(tmrndRaw.rawOutput ?? '', tmrndZod, settings.outputFields);

    let ctMeaning: ParsedMeaning | null = null;
    let ctRawOutput: string | undefined;
    if (ctRaw?.rawOutput) {
      ctMeaning = parseSingleMeaning(ctRaw.rawOutput, settings.conceptTreeOutputFields, ctZod);
      ctRawOutput = ctRaw.rawOutput;
    }

    return { tmrndResult, ctMeaning, ctRaw: ctRawOutput };
  }, [settings, conceptBank, apiConfig]);

  const handleGenerate = useCallback(async (word: string, example: string): Promise<void> => {
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
  }, [user, isSettingsConfigured, runApiCalls]);

  const handleDisambiguationSelectExisting = useCallback(async (existing: WordWithContext, word: string, example: string): Promise<void> => {
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
  }, [user]);

  const handleDisambiguationGenerateNew = useCallback(async (word: string, example: string): Promise<void> => {
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
  }, [isSettingsConfigured, runApiCalls]);

  const handleConceptSelectionChange = useCallback((
    nodes: ConceptTreeNode[],
    selectedNames: Set<string>,
    conceptLink: string,
    contextDefinition: string
  ) => {
    pendingConceptSelection.current = { nodes, selectedNames, conceptLink, contextDefinition };
  }, []);

  const handleSaveComplete = useCallback(async (word: string, example: string): Promise<void> => {
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
  }, [user, results, saveConceptsFromMeaning]);

  const handleExport = useCallback(async (word: string, example: string): Promise<void> => {
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
  }, [settings.webhookUrl, results]);

  const handleClear = useCallback(() => {
    setResults(null);
    setParsedMeaning(null);
    setConceptTreeRawOutput(undefined);
    pendingConceptSelection.current = null;
  }, []);

  const handleCopyRawOutput = useCallback(() => {
    if (results?.rawOutput) {
      navigator.clipboard.writeText(results.rawOutput);
      toast.success('Full analysis copied to clipboard!');
    }
  }, [results]);

  const clearDisambiguation = useCallback(() => {
    setDisambiguationContexts(null);
  }, []);

  return {
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
  };
}
