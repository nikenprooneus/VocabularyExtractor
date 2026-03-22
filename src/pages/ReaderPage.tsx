import { useRef, useCallback, useEffect, useState } from 'react';
import { AlertCircle, Loader2, BookOpen, X, Upload, ChevronLeft, ChevronRight, Settings2, List } from 'lucide-react';
import { useEpubReader } from '../hooks/useEpubReader';
import { FoliateView } from '../components/reader/FoliateView';
import { BookshelfPanel } from '../components/reader/BookshelfPanel';
import { AnnotationPopover } from '../components/reader/AnnotationPopover';
import { ReaderDictionaryModal } from '../components/reader/ReaderDictionaryModal';
import { TocPanel } from '../components/reader/TocPanel';

const FONT_FAMILIES = ['System Default', 'Serif', 'Sans-Serif', 'Monospace'] as const;

export default function ReaderPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);
  const [dictionarySelection, setDictionarySelection] = useState<{ word: string; contextText: string } | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isTocOpen, setIsTocOpen] = useState(false);

  const {
    state,
    viewRef,
    loadBook,
    closeBook,
    pendingSelection,
    activeAnnotation,
    handleSave,
    handleAnnotationColorChange,
    handleAnnotationNoteChange,
    handleAnnotationDelete,
    dismissPopover,
    onRelocate,
    onSelection,
    onAnnotationClick,
    onBookReady,
    onLoad,
    onViewReady,
    readMode,
    setReadMode,
    fontSize,
    setFontSize,
    fontFamily,
    setFontFamily,
    prevPage,
    nextPage,
    goToTocItem,
  } = useEpubReader();

  const handleOpenFilePicker = () => fileInputRef.current?.click();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) loadBook(file);
    e.target.value = '';
  };

  const handleClose = async () => {
    setIsTocOpen(false);
    await closeBook();
  };

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!state.isLoaded) return;
      if (e.key === 'Escape') { dismissPopover(); setIsSettingsOpen(false); return; }
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') nextPage();
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') prevPage();
    },
    [state.isLoaded, nextPage, prevPage, dismissPopover]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    if (!isSettingsOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setIsSettingsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isSettingsOpen]);

  const showAnnotationPopover = pendingSelection !== null || activeAnnotation !== null;

  const percentageDisplay = state.percentage > 0
    ? `${Math.round(state.percentage * 100)}%`
    : null;

  return (
    <div className="h-full flex flex-col" style={{ background: '#1c1a18' }}>
      <input
        ref={fileInputRef}
        type="file"
        accept=".epub"
        className="hidden"
        onChange={handleFileChange}
      />

      <div className="flex-1 flex overflow-hidden relative">
        {state.isLoaded && isTocOpen && state.toc.length > 0 && (
          <TocPanel
            items={state.toc}
            onNavigate={(href) => { goToTocItem(href); setIsTocOpen(false); }}
            onClose={() => setIsTocOpen(false)}
          />
        )}

        <div className="flex-1 flex flex-col relative overflow-hidden">
          {state.isLoaded && (
            <div
              className="absolute top-0 left-0 right-0 z-10 flex items-center gap-3 px-4 h-9"
              style={{
                background: 'linear-gradient(to bottom, rgba(28,26,24,0.98) 50%, rgba(28,26,24,0))',
                pointerEvents: 'none',
              }}
            >
              <div className="flex items-center gap-2 flex-1 min-w-0" style={{ pointerEvents: 'auto' }}>
                {state.toc.length > 0 && (
                  <button
                    onClick={() => setIsTocOpen(v => !v)}
                    title="Table of contents"
                    className={`p-1.5 rounded-lg transition-all flex-shrink-0 ${isTocOpen ? 'text-[#c9a96e] bg-[#2e2c29]' : 'text-[#6b6762] hover:text-[#e8e4de] hover:bg-[#2e2c29]'}`}
                  >
                    <List size={14} />
                  </button>
                )}
                <div className="flex items-center gap-1.5 min-w-0">
                  <BookOpen size={14} className="text-[#c9a96e] flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[#e8e4de] truncate leading-tight">
                      {state.bookTitle}
                    </p>
                    {state.bookAuthor && (
                      <p className="text-[10px] text-[#6b6762] truncate leading-tight">
                        {state.bookAuthor}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0" style={{ pointerEvents: 'auto' }}>
                {percentageDisplay && (
                  <span className="text-[11px] text-[#6b6762] tabular-nums font-medium">
                    {percentageDisplay}
                  </span>
                )}

                <div className="relative" ref={settingsRef}>
                  <button
                    onClick={() => setIsSettingsOpen(v => !v)}
                    title="Reader settings"
                    className={`p-1.5 rounded-lg transition-all ${isSettingsOpen ? 'text-[#c9a96e] bg-[#2e2c29]' : 'text-[#6b6762] hover:text-[#e8e4de] hover:bg-[#2e2c29]'}`}
                  >
                    <Settings2 size={14} />
                  </button>

                  {isSettingsOpen && (
                    <div
                      className="absolute right-0 top-full mt-2 z-50 rounded-xl shadow-2xl"
                      style={{
                        width: '240px',
                        background: '#232119',
                        border: '1px solid #3a3835',
                      }}
                    >
                      <div className="p-4 space-y-5">
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-widest text-[#6b6762] mb-2">
                            Read Mode
                          </p>
                          <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid #3a3835' }}>
                            {(['paginated', 'scrolled'] as const).map((mode) => (
                              <button
                                key={mode}
                                onClick={() => setReadMode(mode)}
                                className="flex-1 py-1.5 text-xs font-medium transition-all"
                                style={{
                                  background: readMode === mode ? '#c9a96e' : 'transparent',
                                  color: readMode === mode ? '#1c1a18' : '#8a8680',
                                }}
                              >
                                {mode === 'paginated' ? 'Pages' : 'Scroll'}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-widest text-[#6b6762] mb-2">
                            Font Size
                          </p>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setFontSize(s => Math.max(70, s - 10))}
                              className="w-8 h-8 flex items-center justify-center rounded-lg text-sm font-bold transition-all"
                              style={{ background: '#2e2c29', color: '#b8b4ae', border: '1px solid #3a3835' }}
                              title="Decrease font size"
                            >
                              A<span className="text-[8px] align-bottom">-</span>
                            </button>
                            <span className="flex-1 text-center text-xs font-medium tabular-nums" style={{ color: '#e8e4de' }}>
                              {fontSize}%
                            </span>
                            <button
                              onClick={() => setFontSize(s => Math.min(200, s + 10))}
                              className="w-8 h-8 flex items-center justify-center rounded-lg text-sm font-bold transition-all"
                              style={{ background: '#2e2c29', color: '#b8b4ae', border: '1px solid #3a3835' }}
                              title="Increase font size"
                            >
                              A<span className="text-[10px] align-bottom">+</span>
                            </button>
                          </div>
                        </div>

                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-widest text-[#6b6762] mb-2">
                            Font Family
                          </p>
                          <select
                            value={fontFamily}
                            onChange={e => setFontFamily(e.target.value)}
                            className="w-full px-3 py-1.5 rounded-lg text-xs font-medium appearance-none cursor-pointer transition-all"
                            style={{
                              background: '#2e2c29',
                              color: '#e8e4de',
                              border: '1px solid #3a3835',
                              outline: 'none',
                            }}
                          >
                            {FONT_FAMILIES.map(f => (
                              <option key={f} value={f} style={{ background: '#232119' }}>{f}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <button
                  onClick={handleOpenFilePicker}
                  title="Open another book"
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-[#8a8680] hover:text-[#e8e4de] hover:bg-[#2e2c29] transition-all"
                >
                  <Upload size={12} />
                  Open
                </button>
                <button
                  onClick={handleClose}
                  title="Close book"
                  className="p-1.5 rounded-lg text-[#6b6762] hover:text-red-400 hover:bg-red-900/20 transition-all"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          )}

          <div className="flex-1 relative overflow-hidden">
            <FoliateView
              ref={viewRef}
              onRelocate={onRelocate}
              onLoad={onLoad}
              onSelection={onSelection}
              onAnnotationClick={onAnnotationClick}
              onBookReady={onBookReady}
              onReady={onViewReady}
              flow={readMode}
              fontSize={fontSize}
              fontFamily={fontFamily}
            />

            {!state.isLoaded && (
              <div className="absolute inset-0 flex flex-col overflow-hidden" style={{ background: '#1c1a18' }}>
                {state.error ? (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="flex flex-col items-center gap-3 text-center px-8 max-w-sm">
                      <div className="w-12 h-12 rounded-full bg-red-900/30 flex items-center justify-center">
                        <AlertCircle size={20} className="text-red-400" />
                      </div>
                      <p className="text-sm text-red-300">{state.error}</p>
                      <button
                        onClick={handleOpenFilePicker}
                        className="mt-1 text-xs text-[#c9a96e] hover:underline"
                      >
                        Try another file
                      </button>
                    </div>
                  </div>
                ) : state.isLoading ? (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 size={28} className="text-[#c9a96e] animate-spin" />
                      <p className="text-xs text-[#6b6762]">Opening book…</p>
                    </div>
                  </div>
                ) : (
                  <BookshelfPanel onOpenFile={loadBook} />
                )}
              </div>
            )}
          </div>

          {state.isLoaded && (
            <div
              className="absolute bottom-0 left-0 right-0 z-10 flex items-center gap-3 px-4 h-8"
              style={{
                background: 'linear-gradient(to top, rgba(28,26,24,0.98) 50%, rgba(28,26,24,0))',
                pointerEvents: 'none',
              }}
            >
              <div className="flex items-center gap-2 flex-1" style={{ pointerEvents: 'auto' }}>
                <button
                  onClick={prevPage}
                  className="p-1 rounded text-[#6b6762] hover:text-[#c9a96e] transition-colors"
                  title="Previous page"
                >
                  <ChevronLeft size={14} />
                </button>
                <div className="flex-1 h-0.5 rounded-full overflow-hidden" style={{ background: '#2e2c29' }}>
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.round(state.percentage * 100)}%`,
                      background: 'linear-gradient(to right, #c9a96e, #d4b47a)',
                    }}
                  />
                </div>
                <button
                  onClick={nextPage}
                  className="p-1 rounded text-[#6b6762] hover:text-[#c9a96e] transition-colors"
                  title="Next page"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {showAnnotationPopover && pendingSelection && (
        <AnnotationPopover
          mode="new"
          selection={pendingSelection}
          onSave={handleSave}
          onDismiss={dismissPopover}
          onExtract={() => {
            setDictionarySelection({ word: pendingSelection.text, contextText: pendingSelection.contextText });
            dismissPopover();
          }}
        />
      )}

      {showAnnotationPopover && activeAnnotation && !pendingSelection && (
        <AnnotationPopover
          mode="existing"
          annotation={activeAnnotation.annotation}
          onColorChange={handleAnnotationColorChange}
          onNoteChange={handleAnnotationNoteChange}
          onDelete={handleAnnotationDelete}
          onDismiss={dismissPopover}
        />
      )}

      {dictionarySelection && (
        <ReaderDictionaryModal
          word={dictionarySelection.word}
          contextText={dictionarySelection.contextText}
          onClose={() => setDictionarySelection(null)}
        />
      )}
    </div>
  );
}
