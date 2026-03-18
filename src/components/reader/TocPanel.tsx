import { X, ChevronRight, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import type { EpubTocItem } from '../../types';

interface TocPanelProps {
  items: EpubTocItem[];
  onNavigate: (href: string) => void;
  onClose: () => void;
}

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
        style={{ paddingLeft: `${depth * 12 + 12}px` }}
      >
        {hasChildren ? (
          <button
            onClick={() => setExpanded(v => !v)}
            className="p-0.5 text-[#6b6762] hover:text-[#c9a96e] transition-colors flex-shrink-0"
          >
            {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          </button>
        ) : (
          <span className="w-5 flex-shrink-0" />
        )}
        <button
          onClick={() => onNavigate(item.href)}
          className="flex-1 text-left py-1.5 pr-3 text-xs text-[#b8b4ae] hover:text-[#e8e4de] hover:bg-[#2e2c29] rounded transition-colors truncate"
        >
          {item.label}
        </button>
      </div>
      {hasChildren && expanded && (
        <ul>
          {item.subitems!.map((child, i) => (
            <TocNode key={child.id ?? i} item={child} depth={depth + 1} onNavigate={onNavigate} />
          ))}
        </ul>
      )}
    </li>
  );
}

export function TocPanel({ items, onNavigate, onClose }: TocPanelProps) {
  return (
    <aside className="w-64 flex-shrink-0 h-full flex flex-col bg-[#1c1a18] border-r border-[#2e2c29] overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-[#2e2c29] flex-shrink-0">
        <span className="text-xs font-semibold text-[#8a8680] uppercase tracking-wider">Contents</span>
        <button
          onClick={onClose}
          className="p-1 rounded text-[#6b6762] hover:text-[#e8e4de] hover:bg-[#2e2c29] transition-colors"
        >
          <X size={14} />
        </button>
      </div>
      <nav className="flex-1 overflow-y-auto py-1.5 scrollbar-thin">
        {items.length === 0 ? (
          <p className="px-4 py-3 text-xs text-[#6b6762]">No table of contents available.</p>
        ) : (
          <ul>
            {items.map((item, i) => (
              <TocNode key={item.id ?? i} item={item} depth={0} onNavigate={onNavigate} />
            ))}
          </ul>
        )}
      </nav>
    </aside>
  );
}
