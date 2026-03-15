import { useState } from 'react';
import { X, ArrowRight, ChevronDown, ChevronUp } from 'lucide-react';
import { WordGraphPayload, LookupTables } from '../../types';

interface WordDetailPanelProps {
  payload: WordGraphPayload | null;
  onClose: () => void;
  lookupTables: LookupTables;
}

function resolveName(id: string | null, items: { id: string; name: string }[]): string | null {
  if (!id) return null;
  return items.find((i) => i.id === id)?.name ?? null;
}

export function WordDetailPanel({ payload, onClose, lookupTables }: WordDetailPanelProps) {
  const [notesExpanded, setNotesExpanded] = useState(false);

  if (!payload) return null;

  const tone = resolveName(payload.toneId, lookupTables.tones);
  const dialect = resolveName(payload.dialectId, lookupTables.dialects);
  const mode = resolveName(payload.modeId, lookupTables.modes);
  const nuance = resolveName(payload.nuanceId, lookupTables.nuances);
  const register = resolveName(payload.registerId, lookupTables.registers);

  const noteEntries = Object.entries(payload.note).filter(
    ([k, v]) => k !== 'rawOutput' && v && String(v).trim() !== ''
  );

  const tmrndAttrs: { label: string; value: string | null; color: string }[] = [
    { label: 'Tone', value: tone, color: 'text-amber-400' },
    { label: 'Dialect', value: dialect, color: 'text-sky-400' },
    { label: 'Mode', value: mode, color: 'text-emerald-400' },
    { label: 'Nuance', value: nuance, color: 'text-rose-400' },
    { label: 'Register', value: register, color: 'text-violet-400' },
  ].filter((a) => a.value !== null);

  return (
    <aside
      className="w-80 flex-shrink-0 h-full bg-slate-900 border-l border-slate-700/60 flex flex-col overflow-hidden transition-transform duration-300"
    >
      <div className="flex items-start justify-between px-5 py-4 border-b border-slate-700/60">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-100">{payload.word}</h2>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-900/60 text-emerald-400 border border-emerald-700/50">
              Word
            </span>
          </div>
          {payload.wordLinkName && (
            <div className="flex items-center gap-1.5 mt-1.5">
              <ArrowRight size={12} className="text-slate-500" />
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-900/50 text-blue-300 border border-blue-700/40">
                {payload.wordLinkName}
              </span>
            </div>
          )}
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-slate-800 transition-colors flex-shrink-0 mt-0.5"
        >
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Example Sentence</p>
          <p className="text-sm text-slate-300 italic leading-relaxed pl-3 border-l-2 border-slate-700">
            {payload.example}
          </p>
        </div>

        {payload.contextDefinition && (
          <>
            <div className="border-t border-slate-800" />
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Context</p>
              <p className="text-sm text-slate-300 leading-relaxed">{payload.contextDefinition}</p>
            </div>
          </>
        )}

        {tmrndAttrs.length > 0 && (
          <>
            <div className="border-t border-slate-800" />
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">TMRND Attributes</p>
              <div className="space-y-2">
                {tmrndAttrs.map(({ label, value, color }) => (
                  <div key={label} className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">{label}</span>
                    <span className={`text-xs font-medium ${color}`}>{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {noteEntries.length > 0 && (
          <>
            <div className="border-t border-slate-800" />
            <div>
              <button
                onClick={() => setNotesExpanded((p) => !p)}
                className="w-full flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 hover:text-slate-300 transition-colors"
              >
                <span>Analysis ({noteEntries.length} fields)</span>
                {notesExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
              {notesExpanded && (
                <div className="space-y-2.5">
                  {noteEntries.map(([key, value]) => (
                    <div key={key}>
                      <p className="text-xs text-slate-500 mb-0.5">{key}</p>
                      <p className="text-sm text-slate-300 leading-relaxed">{value}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </aside>
  );
}
