import clsx from 'clsx';
import { useCallback } from 'react';
import { useReaderUIStore } from '../../store/readerUIStore';
import { HeaderBar } from './HeaderBar';
import { SideBar } from './SideBar';
import { FooterBar } from './FooterBar';
import type { ReadMode } from '../../hooks/useEpubReader';
import type { EpubTocItem, Annotation } from '../../types';

interface ReaderLayoutProps {
  title: string;
  author: string;
  percentage: number;
  currentCfi: string | null;
  isLoaded: boolean;
  readMode: ReadMode;
  tocItems: EpubTocItem[];
  annotations: Annotation[];
  onOpenFilePicker: () => void;
  onClose: () => void;
  onToggleReadMode: () => void;
  onNavigate: (href: string) => void;
  onAnnotationClick?: (annotation: Annotation) => void;
  onPrev: () => void;
  onNext: () => void;
  onGoToFraction: (fraction: number) => void;
  children: React.ReactNode;
}

export function ReaderLayout({
  title,
  author,
  percentage,
  currentCfi,
  isLoaded,
  readMode,
  tocItems,
  annotations,
  onOpenFilePicker,
  onClose,
  onToggleReadMode,
  onNavigate,
  onAnnotationClick,
  onPrev,
  onNext,
  onGoToFraction,
  children,
}: ReaderLayoutProps) {
  const { isBarsHovered, isSidebarVisible, isSidebarPinned, sidebarWidth, setBarsHovered } =
    useReaderUIStore();

  const handleMouseEnter = useCallback(() => {
    setBarsHovered(true);
  }, [setBarsHovered]);

  const handleMouseLeave = useCallback(() => {
    setBarsHovered(false);
  }, [setBarsHovered]);

  const contentShift = isSidebarVisible && isSidebarPinned ? sidebarWidth : 0;

  return (
    <div
      className="relative flex-1 flex overflow-hidden"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <HeaderBar
        title={title}
        author={author}
        percentage={percentage}
        isLoaded={isLoaded}
        readMode={readMode}
        onOpenFilePicker={onOpenFilePicker}
        onClose={onClose}
        onToggleReadMode={onToggleReadMode}
      />

      <SideBar
        tocItems={tocItems}
        annotations={annotations}
        isLoaded={isLoaded}
        onNavigate={onNavigate}
        onAnnotationClick={onAnnotationClick}
      />

      <main
        className={clsx(
          'flex-1 flex flex-col overflow-hidden transition-all duration-300',
        )}
        style={{ marginLeft: contentShift }}
      >
        {children}
      </main>

      <FooterBar
        percentage={percentage}
        isLoaded={isLoaded}
        tocItems={tocItems}
        currentCfi={currentCfi}
        onPrev={onPrev}
        onNext={onNext}
        onGoToFraction={onGoToFraction}
      />

      {isLoaded && (
        <div
          className={clsx(
            'absolute inset-x-0 top-0 h-12 z-10 pointer-events-none transition-opacity duration-300',
            !isBarsHovered && 'opacity-0'
          )}
        />
      )}
    </div>
  );
}
