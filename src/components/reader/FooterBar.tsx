import clsx from 'clsx';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useReaderUIStore } from '../../store/readerUIStore';
import type { EpubTocItem } from '../../types';

interface FooterBarProps {
  percentage: number;
  isLoaded: boolean;
  tocItems: EpubTocItem[];
  currentCfi: string | null;
  onPrev: () => void;
  onNext: () => void;
  onGoToFraction: (fraction: number) => void;
}

function findCurrentChapter(items: EpubTocItem[], cfi: string | null): string {
  if (!cfi || items.length === 0) return '';
  let found = '';
  function search(list: EpubTocItem[]): boolean {
    for (const item of list) {
      if (cfi!.includes(item.href.split('#')[0]!)) {
        found = item.label;
      }
      if (item.subitems && search(item.subitems)) return true;
    }
    return false;
  }
  search(items);
  return found;
}

export function FooterBar({
  percentage,
  isLoaded,
  tocItems,
  currentCfi,
  onPrev,
  onNext,
  onGoToFraction,
}: FooterBarProps) {
  const { isBarsHovered } = useReaderUIStore();
  const pct = Math.round(percentage * 100);
  const chapterLabel = findCurrentChapter(tocItems, currentCfi);

  if (!isLoaded) return null;

  return (
    <footer
      className={clsx(
        'reader-footer absolute bottom-0 left-0 right-0 z-20',
        'bg-[#1c1a18]/95 backdrop-blur-sm border-t border-[#2e2c29]',
        'transition-all duration-300',
        isBarsHovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-full pointer-events-none'
      )}
    >
      <div className="flex items-center gap-2 px-3 py-2">
        <button
          onClick={onPrev}
          title="Previous page"
          className="p-1.5 rounded text-[#6b6762] hover:text-[#e8e4de] hover:bg-[#2e2c29] transition-colors flex-shrink-0"
        >
          <ChevronLeft size={16} />
        </button>

        <div className="flex-1 flex flex-col gap-1.5 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] text-[#6b6762] truncate min-w-0 leading-none">
              {chapterLabel || '\u00A0'}
            </span>
            <span className="text-[10px] text-[#8a8680] flex-shrink-0 tabular-nums leading-none">
              {pct}%
            </span>
          </div>

          <div className="relative h-1 group">
            <div className="absolute inset-0 bg-[#2e2c29] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#c9a96e] rounded-full transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={pct}
              onChange={(e) => onGoToFraction(Number(e.target.value) / 100)}
              className="absolute inset-0 w-full opacity-0 cursor-pointer h-full"
              title={`${pct}% — drag to seek`}
            />
          </div>
        </div>

        <button
          onClick={onNext}
          title="Next page"
          className="p-1.5 rounded text-[#6b6762] hover:text-[#e8e4de] hover:bg-[#2e2c29] transition-colors flex-shrink-0"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </footer>
  );
}
