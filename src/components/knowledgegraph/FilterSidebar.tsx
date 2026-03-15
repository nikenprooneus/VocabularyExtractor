import { Search, SlidersHorizontal, X } from 'lucide-react';
import { GraphData, GraphFilters, LookupTables } from '../../types';

interface FilterSidebarProps {
  filters: GraphFilters;
  onFilterChange: (filters: GraphFilters) => void;
  lookupTables: LookupTables;
  graphData: GraphData;
  filteredGraphData: GraphData;
}

const TMRND_COLORS: Record<string, string> = {
  tone: 'bg-amber-400',
  dialect: 'bg-sky-400',
  mode: 'bg-emerald-400',
  nuance: 'bg-rose-400',
  register: 'bg-violet-400',
  wordLink: 'bg-blue-400',
};

export function FilterSidebar({
  filters,
  onFilterChange,
  lookupTables,
  filteredGraphData,
}: FilterSidebarProps) {
  const hasActiveFilter = Object.values(filters).some((v) => v !== '');

  const update = (key: keyof GraphFilters, value: string) =>
    onFilterChange({ ...filters, [key]: value });

  const clearAll = () =>
    onFilterChange({
      conceptText: '',
      wordText: '',
      toneId: '',
      dialectId: '',
      modeId: '',
      nuanceId: '',
      registerId: '',
      wordLinkId: '',
    });

  const nodeCount = filteredGraphData.nodes.length;
  const linkCount = filteredGraphData.links.length;

  const dropdowns: {
    key: keyof GraphFilters;
    label: string;
    subType: string;
    items: { id: string; name: string }[];
  }[] = [
    { key: 'toneId', label: 'Tone', subType: 'tone', items: lookupTables.tones },
    { key: 'dialectId', label: 'Dialect', subType: 'dialect', items: lookupTables.dialects },
    { key: 'modeId', label: 'Mode', subType: 'mode', items: lookupTables.modes },
    { key: 'nuanceId', label: 'Nuance', subType: 'nuance', items: lookupTables.nuances },
    { key: 'registerId', label: 'Register', subType: 'register', items: lookupTables.registers },
    { key: 'wordLinkId', label: 'Relationship', subType: 'wordLink', items: lookupTables.wordLinks },
  ];

  return (
    <aside className="w-72 flex-shrink-0 h-full bg-slate-900 border-r border-slate-700/60 flex flex-col overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-700/60">
        <div className="flex items-center gap-2 mb-1">
          <SlidersHorizontal size={16} className="text-slate-400" />
          <h2 className="text-sm font-semibold text-slate-100 tracking-wide uppercase">Filter Graph</h2>
        </div>
        <p className="text-xs text-slate-500">
          {nodeCount} node{nodeCount !== 1 ? 's' : ''} &middot; {linkCount} link{linkCount !== 1 ? 's' : ''}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Concepts</p>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={filters.conceptText}
              onChange={(e) => update('conceptText', e.target.value)}
              placeholder="Search concepts..."
              className="w-full pl-8 pr-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/40 transition-colors"
            />
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Words</p>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={filters.wordText}
              onChange={(e) => update('wordText', e.target.value)}
              placeholder="Search words..."
              className="w-full pl-8 pr-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/40 transition-colors"
            />
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Attributes</p>
          <div className="space-y-3">
            {dropdowns.map(({ key, label, subType, items }) => (
              <div key={key}>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${TMRND_COLORS[subType]}`} />
                  <label className="text-xs text-slate-400">{label}</label>
                </div>
                <select
                  value={filters[key]}
                  onChange={(e) => update(key, e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/40 transition-colors appearance-none cursor-pointer"
                >
                  <option value="">All {label}s</option>
                  {items.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>
      </div>

      {hasActiveFilter && (
        <div className="px-4 py-3 border-t border-slate-700/60">
          <button
            onClick={clearAll}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-sm text-slate-300 hover:text-slate-100 transition-all"
          >
            <X size={14} />
            Clear All Filters
          </button>
        </div>
      )}
    </aside>
  );
}
