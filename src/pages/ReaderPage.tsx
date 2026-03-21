import { useRef, useCallback, useEffect } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import { useEpubReader } from '../hooks/useEpubReader';
import { ReaderLayout } from '../components/reader/ReaderLayout';
import { BookshelfPanel } from '../components/reader/BookshelfPanel';
import { AnnotationPopover } from '../components/reader/AnnotationPopover';

export default function ReaderPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    state,
    readMode,
    setReadMode,
    setViewer,
    loadBook,
    goTo,
    goToFraction,
    nextPage,
    prevPage,
    closeBook,
    annotations,
    pendingSelection,
    activeAnnotation,
    handleSave,
    handleAnnotationColorChange,
    handleAnnotationNoteChange,
    handleAnnotationDelete,
    dismissPopover,
  } = useEpubReader();

  const viewerRef = useCallback(
    (el: HTMLElement | null) => {
      setViewer(el);
    },
    [setViewer]
  );

  const handleOpenFilePicker = () => fileInputRef.current?.click();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) loadBook(file);
    e.target.value = '';
  };

  const handleClose = async () => {
    await closeBook();
  };

  const handleToggleReadMode = () => {
    setReadMode(readMode === 'paginated' ? 'scrolled' : 'paginated');
  };

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

  const showPopover = pendingSelection !== null || activeAnnotation !== null;

  return (
    <div
      className="h-full flex flex-col overflow-hidden"
      style={{ background: '#16140f' }}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".epub"
        className="hidden"
        onChange={handleFileChange}
      />

      <ReaderLayout
        title={state.bookTitle}
        author={state.bookAuthor}
        percentage={state.percentage}
        currentCfi={state.currentCfi}
        isLoaded={state.isLoaded}
        readMode={readMode}
        tocItems={state.toc}
        annotations={annotations}
        onOpenFilePicker={handleOpenFilePicker}
        onClose={handleClose}
        onToggleReadMode={handleToggleReadMode}
        onNavigate={goTo}
        onPrev={prevPage}
        onNext={nextPage}
        onGoToFraction={goToFraction}
      >
        {state.error && (
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
        )}

        {state.isLoading && !state.error && (
          <div className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <Loader2 size={28} className="text-[#c9a96e] animate-spin" />
              <p className="text-xs text-[#6b6762]">Opening book…</p>
            </div>
          </div>
        )}

        {!state.isLoaded && !state.isLoading && !state.error && (
          <BookshelfPanel onOpenFile={loadBook} />
        )}

        <div
          className={`flex-1 flex flex-col overflow-hidden transition-opacity duration-300 ${
            state.isLoaded && !state.isLoading
              ? 'opacity-100'
              : 'opacity-0 pointer-events-none absolute inset-0'
          }`}
          style={{ background: '#faf9f7' }}
        >
          <div className="flex-1 relative">
            <foliate-view
              ref={viewerRef}
              className="absolute inset-0 w-full h-full"
            />
          </div>
        </div>
      </ReaderLayout>

      {showPopover && pendingSelection && (
        <AnnotationPopover
          mode="new"
          selection={pendingSelection}
          onSave={handleSave}
          onDismiss={dismissPopover}
        />
      )}

      {showPopover && activeAnnotation && !pendingSelection && (
        <AnnotationPopover
          mode="existing"
          annotation={activeAnnotation.annotation}
          rect={activeAnnotation.rect}
          onColorChange={handleAnnotationColorChange}
          onNoteChange={handleAnnotationNoteChange}
          onDelete={handleAnnotationDelete}
          onDismiss={dismissPopover}
        />
      )}
    </div>
  );
}
