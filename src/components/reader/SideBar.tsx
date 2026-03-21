import clsx from 'clsx';
import { useRef, useCallback, useState } from 'react';
import { X, ChevronRight, ChevronDown, FileText, MessageSquare, Highlighter } from 'lucide-react';
import { useReaderUIStore, type SidebarTab } from '../../store/readerUIStore';
import type { EpubTocItem, Annotation } from '../../types';

const ANNOTATION_COLOR_HEX: Record<string, string> = {
  yellow: '#FFD700',
  green: '#90EE90',
  blue: '#ADD8E6',
  pink: '#FF69B4',
  gray: '#A9A9A9',
};

function TocNode({
  item,
  depth,
  onNavigate,
}: {
  item: EpubTocItem;
  depth: number;
  onNavigate: (href: string) => void;
}) {
  const [expanded, setExpanded] = useState(depth < 1);
  const hasChildren = Array.isArray(item.subitems) && item.subitems.length > 0;

  return (
    <li>
      <div
        className="flex items-center gap-1 group"
        style={{ paddingLeft: `${depth * 14 + 10}px` }}
      >
        {hasChildren ? (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="p-0.5 text-[#6b6762] hover:text-[#c9a96e] transition-colors flex-shrink-0"
          >
            {expanded ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
          </button>
        ) : (
          <span className="w-4 flex-shrink-0" />
        )}
        <button
          onClick={() => onNavigate(item.href)}
          className="flex-1 text-left py-1.5 pr-3 text-xs text-[#9a9691] hover:text-[#e8e4de] hover:bg-[#2a2826] rounded transition-colors truncate leading-snug"
        >
          {item.label}
        </button>
      </div>
      {hasChildren && expanded && (
        <ul>
          {item.subitems!.map((child, i) => (
            <TocNode
              key={child.id ?? i}
              item={child}
              depth={depth + 1}
              onNavigate={onNavigate}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

interface SideBarProps {
  tocItems: EpubTocItem[];
  annotations: Annotation[];
  isLoaded: boolean;
  onNavigate: (href: string) => void;
  onAnnotationClick?: (annotation: Annotation) => void;
}

export function SideBar({
  tocItems,
  annotations,
  isLoaded,
  onNavigate,
  onAnnotationClick,
}: SideBarProps) {
  const {
    isSidebarVisible,
    isSidebarPinned,
    sidebarActiveTab,
    sidebarWidth,
    setSidebarVisible,
    setActiveTab,
    setSidebarWidth,
  } = useReaderUIStore();

  const [tabFading, setTabFading] = useState(false);
  const resizingRef = useRef(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);

  const handleTabChange = useCallback(
    (tab: SidebarTab) => {
      if (tab === sidebarActiveTab) return;
      setTabFading(true);
      setTimeout(() => {
        setActiveTab(tab);
        setTabFading(false);
      }, 120);
    },
    [sidebarActiveTab, setActiveTab]
  );

  const handleNavigate = useCallback(
    (href: string) => {
      onNavigate(href);
      if (!isSidebarPinned) {
        setSidebarVisible(false);
      }
    },
    [onNavigate, isSidebarPinned, setSidebarVisible]
  );

  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      resizingRef.current = true;
      startXRef.current = e.clientX;
      startWidthRef.current = sidebarWidth;

      const onMouseMove = (ev: MouseEvent) => {
        if (!resizingRef.current) return;
        const delta = ev.clientX - startXRef.current;
        const newWidth = Math.max(200, Math.min(480, startWidthRef.current + delta));
        setSidebarWidth(newWidth);
      };

      const onMouseUp = () => {
        resizingRef.current = false;
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
      };

      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    },
    [sidebarWidth, setSidebarWidth]
  );

  const TABS: { id: SidebarTab; label: string; icon: React.ReactNode }[] = [
    { id: 'toc', label: 'Contents', icon: <FileText size={13} /> },
    { id: 'annotations', label: 'Highlights', icon: <Highlighter size={13} /> },
  ];

  return (
    <>
      {isSidebarVisible && !isSidebarPinned && (
        <div
          className="absolute inset-0 z-10"
          onClick={() => setSidebarVisible(false)}
          aria-hidden
        />
      )}

      <aside
        className={clsx(
          'absolute top-0 left-0 bottom-0 z-20 flex flex-col',
          'bg-[#1a1815] border-r border-[#2e2c29]',
          'transition-transform duration-300 ease-in-out',
          isSidebarVisible ? 'translate-x-0' : '-translate-x-full'
        )}
        style={{ width: sidebarWidth }}
      >
        <div className="flex items-center gap-1 px-3 py-2.5 border-b border-[#2e2c29] flex-shrink-0">
          <div className="flex gap-0.5 flex-1">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={clsx(
                  'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors',
                  sidebarActiveTab === tab.id
                    ? 'bg-[#2e2c29] text-[#e8e4de]'
                    : 'text-[#6b6762] hover:text-[#b8b4ae] hover:bg-[#242220]'
                )}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => setSidebarVisible(false)}
            className="p-1.5 rounded text-[#6b6762] hover:text-[#e8e4de] hover:bg-[#2e2c29] transition-colors flex-shrink-0"
          >
            <X size={13} />
          </button>
        </div>

        <div
          className={clsx(
            'flex-1 overflow-y-auto transition-opacity duration-120',
            tabFading ? 'opacity-0' : 'opacity-100'
          )}
        >
          {sidebarActiveTab === 'toc' && (
            <nav className="py-2">
              {!isLoaded || tocItems.length === 0 ? (
                <p className="px-4 py-4 text-xs text-[#6b6762] text-center">
                  {isLoaded ? 'No table of contents available.' : 'Open a book to view contents.'}
                </p>
              ) : (
                <ul>
                  {tocItems.map((item, i) => (
                    <TocNode
                      key={item.id ?? i}
                      item={item}
                      depth={0}
                      onNavigate={handleNavigate}
                    />
                  ))}
                </ul>
              )}
            </nav>
          )}

          {sidebarActiveTab === 'annotations' && (
            <div className="py-2">
              {annotations.length === 0 ? (
                <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
                  <MessageSquare size={24} className="text-[#3a3835]" />
                  <p className="text-xs text-[#6b6762]">
                    {isLoaded
                      ? 'No highlights yet. Select text to annotate.'
                      : 'Open a book to see highlights.'}
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-[#2a2826]">
                  {annotations.map((ann) => (
                    <li
                      key={ann.id}
                      onClick={() => onAnnotationClick?.(ann)}
                      className="px-3 py-2.5 hover:bg-[#242220] transition-colors cursor-pointer group"
                    >
                      <div className="flex items-start gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0 mt-0.5"
                          style={{ backgroundColor: ANNOTATION_COLOR_HEX[ann.color] ?? '#888' }}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] text-[#b8b4ae] leading-relaxed line-clamp-3">
                            &ldquo;{ann.text}&rdquo;
                          </p>
                          {ann.note && (
                            <p className="text-[10px] text-[#6b6762] mt-1 italic line-clamp-2">
                              {ann.note}
                            </p>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        <div
          onMouseDown={handleResizeStart}
          className="absolute top-0 right-0 bottom-0 w-1 cursor-col-resize hover:bg-[#c9a96e]/30 transition-colors"
          title="Drag to resize"
        />
      </aside>
    </>
  );
}
