import { useState } from 'react';
import { Copy, ChevronDown, ChevronUp } from 'lucide-react';
import { Settings as SettingsType, GeneratedResult, ParsedMeaning } from '../../types/index';
import { FlashcardItem } from '../FlashcardItem';
import { ConceptTreesSection } from '../concepttree/ConceptTreesSection';

interface ResultsDisplayProps {
  results: GeneratedResult;
  settings: SettingsType;
  showRawOutput: boolean;
  onToggleRawOutput: () => void;
  onCopyRawOutput: () => void;
  parsedMeanings?: ParsedMeaning[] | null;
  word?: string;
  conceptTreeRawOutput?: string;
}

export function ResultsDisplay({
  results,
  settings,
  showRawOutput,
  onToggleRawOutput,
  onCopyRawOutput,
  parsedMeanings,
  word,
  conceptTreeRawOutput,
}: ResultsDisplayProps) {
  const hasBothOutputs = !!(results.rawOutput && conceptTreeRawOutput);

  return (
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

      {parsedMeanings && parsedMeanings.length > 0 && word && (
        <ConceptTreesSection parsedMeanings={parsedMeanings} word={word} />
      )}

      {hasBothOutputs ? (
        <div className="bg-white rounded-lg shadow p-6 space-y-3">
          <h2 className="text-lg font-semibold text-gray-900">Full AI Analysis</h2>
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
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Full AI Analysis</h2>
            <div className="flex gap-2">
              <button
                onClick={onCopyRawOutput}
                className="text-gray-600 hover:text-gray-800 transition-colors flex items-center gap-1 text-sm"
                title="Copy full analysis"
              >
                <Copy size={16} />
                Copy
              </button>
              <button
                onClick={onToggleRawOutput}
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
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <div className="flex gap-2">
          <button
            onClick={onCopy}
            className="text-gray-500 hover:text-gray-700 transition-colors flex items-center gap-1 text-xs"
            title={`Copy ${label}`}
          >
            <Copy size={14} />
            Copy
          </button>
          <button
            onClick={() => setOpen(v => !v)}
            className="text-gray-500 hover:text-gray-700 transition-colors flex items-center gap-1 text-xs"
          >
            {open ? (
              <>
                <ChevronUp size={14} />
                Hide
              </>
            ) : (
              <>
                <ChevronDown size={14} />
                Show
              </>
            )}
          </button>
        </div>
      </div>
      {open && (
        <div className="bg-white p-4 max-h-72 overflow-y-auto border-t border-gray-200">
          <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">
            {rawOutput}
          </pre>
        </div>
      )}
    </div>
  );
}
