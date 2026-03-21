import { useEffect, useState } from 'react';
import { X, Loader2, Wand2, BookMarked, Trash2 } from 'lucide-react';
import { useVocabularyGenerator } from '../../hooks/useVocabularyGenerator';
import { useSettings } from '../../contexts/SettingsContext';
import { ResultsDisplay } from '../generator/ResultsDisplay';

interface ReaderDictionaryModalProps {
  word: string;
  contextText: string;
  onClose: () => void;
}

export function ReaderDictionaryModal({ word, contextText, onClose }: ReaderDictionaryModalProps) {
  const { settings } = useSettings();
  const [showRawOutput, setShowRawOutput] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const {
    results,
    parsedMeaning,
    conceptTreeRawOutput,
    isLoading,
    isSaving,
    handleGenerate,
    handleSaveComplete,
    handleConceptSelectionChange,
    handleCopyRawOutput,
  } = useVocabularyGenerator(settings);

  useEffect(() => {
    handleGenerate(word, contextText);
  }, []);

  const handleSave = async () => {
    await handleSaveComplete(word, contextText);
    setIsSaved(true);
    setTimeout(onClose, 600);
  };

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center p-4"
      style={{ background: 'rgba(0, 0, 0, 0.85)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl border border-[#3a3835] shadow-2xl overflow-hidden"
        style={{ background: '#23211d' }}
      >
        <div className="flex items-center gap-3 px-5 py-4 border-b border-[#3a3835]">
          <div className="w-8 h-8 rounded-lg bg-[#c9a96e]/15 flex items-center justify-center flex-shrink-0">
            <Wand2 size={15} className="text-[#c9a96e]" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold text-[#e8e4de] leading-tight capitalize">{word}</h2>
            <p className="text-[10px] text-[#6b6762] uppercase tracking-widest font-medium">Vocabulary Extract</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#6b6762] hover:text-[#e8e4de] hover:bg-[#3a3835] transition-all flex-shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-5 py-3 border-b border-[#3a3835]/60">
          <blockquote className="border-l-2 border-[#c9a96e]/40 pl-3">
            <p className="text-[11px] text-[#8a8680] italic leading-relaxed line-clamp-3">
              {contextText.length > 300 ? `${contextText.slice(0, 300)}…` : contextText}
            </p>
          </blockquote>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <div className="relative">
                <div className="w-12 h-12 rounded-full border-2 border-[#3a3835]" />
                <Loader2 size={24} className="text-[#c9a96e] animate-spin absolute inset-0 m-auto" />
              </div>
              <p className="text-[12px] text-[#6b6762]">Extracting vocabulary…</p>
            </div>
          )}

          {!isLoading && results && (
            <div className="space-y-4">
              <ResultsDisplay
                results={results}
                settings={settings}
                showRawOutput={showRawOutput}
                onToggleRawOutput={() => setShowRawOutput(v => !v)}
                onCopyRawOutput={handleCopyRawOutput}
                parsedMeaning={parsedMeaning}
                word={word}
                conceptTreeRawOutput={conceptTreeRawOutput}
                onConceptSelectionChange={handleConceptSelectionChange}
              />
            </div>
          )}
        </div>

        {!isLoading && results && (
          <div className="flex items-center gap-2 px-5 py-3.5 border-t border-[#3a3835]">
            <button
              onClick={onClose}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-transparent border border-[#3a3835] text-[#8a8680] text-[12px] font-medium hover:text-[#e8e4de] hover:border-[#4a4845] transition-all"
            >
              <Trash2 size={13} />
              Discard
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || isSaved}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-[#c9a96e] text-[#1c1a18] text-[12px] font-semibold hover:bg-[#d4b47a] disabled:opacity-60 disabled:cursor-not-allowed transition-all"
            >
              {isSaving ? (
                <Loader2 size={13} className="animate-spin" />
              ) : isSaved ? (
                <>
                  <BookMarked size={13} />
                  Saved!
                </>
              ) : (
                <>
                  <BookMarked size={13} />
                  Save to Vocabulary
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
