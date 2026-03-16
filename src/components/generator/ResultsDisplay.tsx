import { useState } from 'react';
import { Copy, ChevronDown, ChevronUp } from 'lucide-react';
import { Settings as SettingsType, GeneratedResult, ParsedMeaning, ConceptTreeNode } from '../../types/index';
import { FlashcardItem } from '../FlashcardItem';
import { ConceptTreesSection } from '../concepttree/ConceptTreesSection';

interface ResultsDisplayProps {
  results: GeneratedResult;
  settings: SettingsType;
  showRawOutput: boolean;
  onToggleRawOutput: () => void;
  onCopyRawOutput: () => void;
  parsedMeaning?: ParsedMeaning | null;
  word?: string;
  conceptTreeRawOutput?: string;
  onConceptSelectionChange?: (nodes: ConceptTreeNode[], selectedNames: Set<string>, conceptLink: string, contextDefinition: string) => void;
}

export function ResultsDisplay({
  results,
  settings,
  showRawOutput,
  onToggleRawOutput,
  onCopyRawOutput,
  parsedMeaning,
  word,
  conceptTreeRawOutput,
  onConceptSelectionChange,
}: ResultsDisplayProps) {
  const hasBothOutputs = !!(results.rawOutput && conceptTreeRawOutput);

  return (
    <>
      {results['Definition'] && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">Definition</p>
          <p className="text-base sm:text-lg leading-relaxed text-slate-900 font-normal">
            {results['Definition']}
          </p>
        </div>
      )}

      {settings.flashcardConfigs && settings.flashcardConfigs.length > 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-4">Flashcards</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
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
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-4">Extracted Fields</p>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {settings.outputFields
              .filter(field => field.name !== 'Definition')
              .map((field) => (
                <div key={field.id}>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    {field.name}
                  </label>
                  <textarea
                    readOnly
                    value={results[field.name] || ''}
                    rows={3}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-sm text-slate-700 cursor-default focus:outline-none"
                  />
                </div>
              ))}
          </div>
        </div>
      )}

      {parsedMeaning && word && onConceptSelectionChange && (
        <ConceptTreesSection
          meaning={parsedMeaning}
          word={word}
          onSelectionChange={onConceptSelectionChange}
        />
      )}

      {hasBothOutputs ? (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 sm:p-6 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Full AI Analysis</p>
          <RawOutputPanel
            label="TMRND Analysis"
            rawOutput={results.rawOutput!}
            onCopy={() => navigator.clipboard.writeText(results.rawOutput!)}
          />
          <RawOutputPanel
            label="Concept Tree Analysis"
            rawOutput={conceptTreeRawOutput!}
            onCopy={() => navigator.clipboard.writeText(conceptTreeRawOutput!)}
          />
        </div>
      ) : results.rawOutput ? (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Full AI Analysis</p>
            <div className="flex gap-3">
              <button
                onClick={onCopyRawOutput}
                className="text-slate-500 hover:text-slate-800 transition-colors flex items-center gap-1 text-xs font-medium"
                title="Copy full analysis"
              >
                <Copy size={13} />
                Copy
              </button>
              <button
                onClick={onToggleRawOutput}
                className="text-slate-500 hover:text-slate-800 transition-colors flex items-center gap-1 text-xs font-medium"
              >
                {showRawOutput ? (
                  <>
                    <ChevronUp size={13} />
                    Hide
                  </>
                ) : (
                  <>
                    <ChevronDown size={13} />
                    Show
                  </>
                )}
              </button>
            </div>
          </div>
          {showRawOutput && (
            <div className="bg-slate-50 border border-slate-200 rounded-md p-4 max-h-96 overflow-y-auto">
              <pre className="text-sm text-slate-700 whitespace-pre-wrap font-mono leading-relaxed">
                {results.rawOutput}
              </pre>
            </div>
          )}
        </div>
      ) : null}
    </>
  );
}

interface RawOutputPanelProps {
  label: string;
  rawOutput: string;
  onCopy: () => void;
}

function RawOutputPanel({ label, rawOutput, onCopy }: RawOutputPanelProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-slate-50">
        <span className="text-sm font-medium text-slate-700">{label}</span>
        <div className="flex gap-3">
          <button
            onClick={onCopy}
            className="text-slate-400 hover:text-slate-700 transition-colors flex items-center gap-1 text-xs font-medium"
            title={`Copy ${label}`}
          >
            <Copy size={13} />
            Copy
          </button>
          <button
            onClick={() => setOpen(v => !v)}
            className="text-slate-400 hover:text-slate-700 transition-colors flex items-center gap-1 text-xs font-medium"
          >
            {open ? (
              <>
                <ChevronUp size={13} />
                Hide
              </>
            ) : (
              <>
                <ChevronDown size={13} />
                Show
              </>
            )}
          </button>
        </div>
      </div>
      {open && (
        <div className="bg-white p-4 max-h-72 overflow-y-auto border-t border-slate-200">
          <pre className="text-sm text-slate-700 whitespace-pre-wrap font-mono leading-relaxed">
            {rawOutput}
          </pre>
        </div>
      )}
    </div>
  );
}
