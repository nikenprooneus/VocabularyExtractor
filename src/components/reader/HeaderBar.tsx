import clsx from 'clsx';
import { List, BookOpen, AlignJustify, BookMarked, Upload, X, Pin, PinOff } from 'lucide-react';
import type { ReadMode } from '../../hooks/useEpubReader';
import { useReaderUIStore } from '../../store/readerUIStore';

interface HeaderBarProps {
  title: string;
  author: string;
  percentage: number;
  isLoaded: boolean;
  readMode: ReadMode;
  onOpenFilePicker: () => void;
  onClose: () => void;
  onToggleReadMode: () => void;
}

export function HeaderBar({
  title,
  author,
  percentage,
  isLoaded,
  readMode,
  onOpenFilePicker,
  onClose,
  onToggleReadMode,
}: HeaderBarProps) {
  const { isSidebarVisible, isSidebarPinned, toggleSidebar, isBarsHovered } = useReaderUIStore();
  const pct = Math.round(percentage * 100);

  return (
    <header
      className={clsx(
        'reader-header absolute top-0 left-0 right-0 z-20 flex items-center gap-2 px-3 h-12',
        'bg-[#1c1a18]/95 backdrop-blur-sm border-b border-[#2e2c29] select-none',
        'transition-all duration-300',
        isBarsHovered ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-full pointer-events-none'
      )}
    >
      {isLoaded && (
        <button
          onClick={toggleSidebar}
          title="Table of contents"
          className={clsx(
            'p-1.5 rounded transition-colors flex-shrink-0',
            isSidebarVisible
              ? 'bg-[#3a3835] text-[#e8e4de]'
              : 'text-[#8a8680] hover:text-[#e8e4de] hover:bg-[#2e2c29]'
          )}
        >
          <List size={16} />
        </button>
      )}

      <div className="flex items-center gap-2 min-w-0 flex-1">
        <BookOpen size={15} className="flex-shrink-0 text-[#6b6762]" />
        {isLoaded ? (
          <div className="min-w-0">
            <p className="text-xs font-medium text-[#e8e4de] truncate leading-tight">{title}</p>
            {author && (
              <p className="text-[10px] text-[#6b6762] truncate leading-tight">{author}</p>
            )}
          </div>
        ) : (
          <p className="text-xs text-[#6b6762]">No book open</p>
        )}
      </div>

      {isLoaded && (
        <div className="hidden sm:flex items-center gap-1.5 flex-shrink-0">
          <div className="w-24 h-0.5 bg-[#2e2c29] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#c9a96e] rounded-full transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-[10px] text-[#6b6762] w-8 text-right tabular-nums">{pct}%</span>
        </div>
      )}

      <div className="flex items-center gap-0.5 flex-shrink-0">
        {isLoaded && (
          <>
            <button
              onClick={onToggleReadMode}
              title={readMode === 'paginated' ? 'Switch to scroll mode' : 'Switch to paginated mode'}
              className={clsx(
                'p-1.5 rounded transition-colors',
                readMode === 'scrolled'
                  ? 'bg-[#3a3835] text-[#c9a96e]'
                  : 'text-[#8a8680] hover:text-[#e8e4de] hover:bg-[#2e2c29]'
              )}
            >
              {readMode === 'paginated' ? <AlignJustify size={15} /> : <BookMarked size={15} />}
            </button>

            {isSidebarVisible && (
              <button
                onClick={() => useReaderUIStore.getState().toggleSidebarPinned()}
                title={isSidebarPinned ? 'Unpin sidebar' : 'Pin sidebar'}
                className={clsx(
                  'p-1.5 rounded transition-colors',
                  isSidebarPinned
                    ? 'bg-[#3a3835] text-[#c9a96e]'
                    : 'text-[#8a8680] hover:text-[#e8e4de] hover:bg-[#2e2c29]'
                )}
              >
                {isSidebarPinned ? <Pin size={15} /> : <PinOff size={15} />}
              </button>
            )}
          </>
        )}

        <button
          onClick={onOpenFilePicker}
          title="Open EPUB file"
          className="p-1.5 rounded text-[#8a8680] hover:text-[#e8e4de] hover:bg-[#2e2c29] transition-colors"
        >
          <Upload size={15} />
        </button>

        {isLoaded && (
          <button
            onClick={onClose}
            title="Close book"
            className="p-1.5 rounded text-[#8a8680] hover:text-red-400 hover:bg-[#2e2c29] transition-colors"
          >
            <X size={15} />
          </button>
        )}
      </div>
    </header>
  );
}
