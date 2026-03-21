import { useRef, useCallback, useEffect } from 'react';
import { ReactReader, ReactReaderStyle } from 'react-reader';
import type { IReactReaderStyle } from 'react-reader';
import { AlertCircle, Loader2, BookOpen, X, Upload, ChevronLeft, ChevronRight } from 'lucide-react';
import { useEpubReader } from '../hooks/useEpubReader';
import { BookshelfPanel } from '../components/reader/BookshelfPanel';
import { AnnotationPopover } from '../components/reader/AnnotationPopover';

const darkTaupeReaderStyles: IReactReaderStyle = {
  ...ReactReaderStyle,
  container: {
    ...ReactReaderStyle.container,
    background: '#1c1a18',
  },
  readerArea: {
    ...ReactReaderStyle.readerArea,
    background: '#1c1a18',
    transition: 'none',
  },
  containerExpanded: {
    ...ReactReaderStyle.containerExpanded,
    background: '#1c1a18',
  },
  titleArea: {
    ...ReactReaderStyle.titleArea,
    display: 'none',
  },
  reader: {
    ...ReactReaderStyle.reader,
    background: '#1c1a18',
  },
  swipeWrapper: {
    ...ReactReaderStyle.swipeWrapper,
    background: '#1c1a18',
  },
  prev: {
    ...ReactReaderStyle.prev,
    background: 'transparent',
    color: '#6b6762',
    border: 'none',
  },
  next: {
    ...ReactReaderStyle.next,
    background: 'transparent',
    color: '#6b6762',
    border: 'none',
  },
  arrow: {
    ...ReactReaderStyle.arrow,
    color: '#6b6762',
    fontSize: '1.5rem',
  },
  arrowHover: {
    ...ReactReaderStyle.arrowHover,
    color: '#c9a96e',
  },
  tocBackground: {
    ...ReactReaderStyle.tocBackground,
    background: 'rgba(16, 14, 11, 0.85)',
  },
  toc: {
    ...ReactReaderStyle.toc,
    background: '#232119',
    borderRight: '1px solid #3a3835',
  },
  tocArea: {
    ...ReactReaderStyle.tocArea,
    background: '#232119',
  },
  tocAreaButton: {
    ...ReactReaderStyle.tocAreaButton,
    color: '#b8b4ae',
    background: 'transparent',
  },
  tocButton: {
    ...ReactReaderStyle.tocButton,
    background: '#232119',
    color: '#c9a96e',
    border: '1px solid #3a3835',
    borderRadius: '8px',
    top: '72px',
  },
  tocButtonExpanded: {
    ...ReactReaderStyle.tocButtonExpanded,
    background: '#2e2c29',
  },
  tocButtonBar: {
    ...ReactReaderStyle.tocButtonBar,
    background: '#c9a96e',
  },
  tocButtonBarTop: {
    ...ReactReaderStyle.tocButtonBarTop,
    background: '#c9a96e',
  },
  tocButtonBottom: {
    ...ReactReaderStyle.tocButtonBottom,
    background: '#c9a96e',
  },
  loadingView: {
    ...ReactReaderStyle.loadingView,
    background: '#1c1a18',
    color: '#6b6762',
  },
  errorView: {
    ...ReactReaderStyle.errorView,
    background: '#1c1a18',
    color: '#e8e4de',
  },
};

export default function ReaderPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    state,
    location,
    bookUrl,
    onLocationChanged,
    getRendition,
    renditionRef,
    loadBook,
    closeBook,
    pendingSelection,
    activeAnnotation,
    handleSave,
    handleAnnotationColorChange,
    handleAnnotationNoteChange,
    handleAnnotationDelete,
    dismissPopover,
  } = useEpubReader();

  const handleOpenFilePicker = () => fileInputRef.current?.click();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) loadBook(file);
    e.target.value = '';
  };

  const handleClose = async () => {
    await closeBook();
  };

  const nextPage = useCallback(() => {
    if (renditionRef.current) {
      try {
        renditionRef.current.next();
      } catch {
        // non-fatal
      }
    }
  }, [renditionRef]);

  const prevPage = useCallback(() => {
    if (renditionRef.current) {
      try {
        renditionRef.current.prev();
      } catch {
        // non-fatal
      }
    }
  }, [renditionRef]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!state.isLoaded) return;
      if (e.key === 'Escape') { dismissPopover(); return; }
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') nextPage();
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') prevPage();
    },
    [state.isLoaded, nextPage, prevPage, dismissPopover]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const showAnnotationPopover = pendingSelection !== null || activeAnnotation !== null;

  const percentageDisplay = state.percentage > 0
    ? `${Math.round(state.percentage * 100)}%`
    : null;

  return (
    <div className="h-full flex flex-col overflow-hidden" style={{ background: '#1c1a18' }}>
      <input
        ref={fileInputRef}
        type="file"
        accept=".epub"
        className="hidden"
        onChange={handleFileChange}
      />

      {state.isLoaded && bookUrl ? (
        <div className="flex-1 flex flex-col overflow-hidden relative">
          <div
            className="absolute top-0 left-0 right-0 z-10 flex items-center gap-3 px-4 h-14"
            style={{
              background: 'linear-gradient(to bottom, rgba(28,26,24,0.98) 60%, rgba(28,26,24,0))',
              pointerEvents: 'none',
            }}
          >
            <div className="flex items-center gap-2 flex-1 min-w-0" style={{ pointerEvents: 'auto' }}>
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

          <div className="flex-1 overflow-hidden">
            <ReactReader
              key={state.bookId ?? undefined}
              url={bookUrl!}
              location={location}
              locationChanged={onLocationChanged}
              getRendition={getRendition}
              readerStyles={darkTaupeReaderStyles}
              showToc={true}
              loadingView={
                <div className="flex items-center justify-center h-full" style={{ background: '#1c1a18' }}>
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 size={28} className="text-[#c9a96e] animate-spin" />
                    <p className="text-xs text-[#6b6762]">Opening book…</p>
                  </div>
                </div>
              }
            />
          </div>

          <div
            className="absolute bottom-0 left-0 right-0 z-10 flex items-center gap-3 px-4 h-10"
            style={{
              background: 'linear-gradient(to top, rgba(28,26,24,0.98) 60%, rgba(28,26,24,0))',
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
        </div>
      ) : (
        <div className="flex-1 flex flex-col overflow-hidden">
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

      {showAnnotationPopover && pendingSelection && (
        <AnnotationPopover
          mode="new"
          selection={pendingSelection}
          onSave={handleSave}
          onDismiss={dismissPopover}
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
    </div>
  );
}
