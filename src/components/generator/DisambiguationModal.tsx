import { useEffect, useRef } from 'react';
import { X, BookOpen, GitBranch, Sparkles } from 'lucide-react';
import { WordWithContext } from '../../types';

interface DisambiguationModalProps {
  word: string;
  existingContexts: WordWithContext[];
  onSelectExisting: (existing: WordWithContext) => void;
  onGenerateNew: () => void;
  onClose: () => void;
}

export function DisambiguationModal({
  word,
  existingContexts,
  onSelectExisting,
  onGenerateNew,
  onClose,
}: DisambiguationModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement;
    modalRef.current?.focus();
    return () => previousFocus?.focus();
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backdropFilter: 'blur(4px)', backgroundColor: 'rgba(0,0,0,0.45)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        ref={modalRef}
        tabIndex={-1}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg outline-none flex flex-col"
        style={{ maxHeight: '85vh' }}
      >
        <div className="flex items-start justify-between p-6 border-b border-gray-100">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <GitBranch size={16} className="text-blue-500" />
              <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider">Word found</span>
            </div>
            <h2 className="text-xl font-bold text-gray-900">
              "{word}" has existing contexts
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Choose an existing meaning to clone, or generate a new analysis.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors ml-4 flex-shrink-0 p-1 rounded-lg hover:bg-gray-100"
          >
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-6 space-y-3">
          {existingContexts.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">No existing contexts found.</p>
          ) : (
            existingContexts.map((ctx, idx) => (
              <button
                key={ctx.id}
                onClick={() => onSelectExisting(ctx)}
                className="w-full text-left border border-gray-200 rounded-xl p-4 hover:border-blue-300 hover:bg-blue-50 transition-all group"
              >
                <div className="flex items-center gap-2 mb-2">
                  <BookOpen size={13} className="text-gray-400 group-hover:text-blue-500 transition-colors flex-shrink-0" />
                  <span className="text-xs font-semibold text-gray-400 group-hover:text-blue-600 uppercase tracking-wider">
                    Context {idx + 1}
                  </span>
                </div>
                {ctx.example && (
                  <p className="text-sm text-gray-700 leading-relaxed mb-2 italic">
                    "{ctx.example}"
                  </p>
                )}
                {ctx.contextDefinition && (
                  <p className="text-sm text-gray-500 leading-relaxed border-l-2 border-gray-200 group-hover:border-blue-200 pl-3 transition-colors">
                    {ctx.contextDefinition}
                  </p>
                )}
                <div className="mt-3 flex items-center justify-end">
                  <span className="text-xs font-medium text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
                    Use this meaning →
                  </span>
                </div>
              </button>
            ))
          )}
        </div>

        <div className="p-6 border-t border-gray-100">
          <button
            onClick={onGenerateNew}
            className="w-full flex items-center justify-center gap-2 bg-gray-900 hover:bg-gray-800 text-white py-3 px-4 rounded-xl font-semibold transition-colors"
          >
            <Sparkles size={16} />
            Generate New Meaning
          </button>
          <p className="text-xs text-gray-400 text-center mt-2">
            This will call the AI and create a distinct context entry.
          </p>
        </div>
      </div>
    </div>
  );
}
