import { BookOpen, ChevronLeft, ChevronRight, List, X, Upload, RotateCcw } from 'lucide-react';

interface ReaderToolbarProps {
  title: string;
  author: string;
  percentage: number;
  isLoaded: boolean;
  isTocOpen: boolean;
  onToggleToc: () => void;
  onPrev: () => void;
  onNext: () => void;
  onClose: () => void;
  onOpenFilePicker: () => void;
}

export function ReaderToolbar({
  title,
  author,
  percentage,
  isLoaded,
  isTocOpen,
  onToggleToc,
  onPrev,
  onNext,
  onClose,
  onOpenFilePicker,
}: ReaderToolbarProps) {
  const pct = Math.round(percentage * 100);

  return (
    <header className="flex-shrink-0 flex items-center gap-2 px-3 h-12 bg-[#1c1a18] border-b border-[#2e2c29] z-20 select-none">
      {isLoaded && (
        <button
          onClick={onToggleToc}
          title="Table of contents"
          className={`p-1.5 rounded transition-colors ${
            isTocOpen
              ? 'bg-[#3a3835] text-[#e8e4de]'
              : 'text-[#8a8680] hover:text-[#e8e4de] hover:bg-[#2e2c29]'
          }`}
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
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="hidden sm:flex items-center gap-1.5">
            <div className="w-20 h-1 bg-[#2e2c29] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#c9a96e] rounded-full transition-all duration-300"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-[10px] text-[#6b6762] w-8 text-right">{pct}%</span>
          </div>

          <div className="flex items-center gap-0.5">
            <button
              onClick={onPrev}
              title="Previous page"
              className="p-1.5 rounded text-[#8a8680] hover:text-[#e8e4de] hover:bg-[#2e2c29] transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={onNext}
              title="Next page"
              className="p-1.5 rounded text-[#8a8680] hover:text-[#e8e4de] hover:bg-[#2e2c29] transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center gap-1 flex-shrink-0">
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
            className="p-1.5 rounded text-[#8a8680] hover:text-[#e8e4de] hover:bg-[#2e2c29] transition-colors"
          >
            <RotateCcw size={15} />
          </button>
        )}
      </div>
    </header>
  );
}
