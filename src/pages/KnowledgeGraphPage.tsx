import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Filter, Loader2, Share2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { fetchGraphData } from '../services/conceptService';
import { FilterSidebar } from '../components/knowledgegraph/FilterSidebar';
import { KnowledgeGraph } from '../components/knowledgegraph/KnowledgeGraph';
import { WordDetailPanel } from '../components/knowledgegraph/WordDetailPanel';
import {
  GraphData,
  GraphFilters,
  GraphNode,
  LookupTables,
  WordGraphPayload,
} from '../types';

const EMPTY_LOOKUP: LookupTables = {
  tones: [],
  dialects: [],
  modes: [],
  nuances: [],
  registers: [],
  wordLinks: [],
};

const EMPTY_GRAPH: GraphData = { nodes: [], links: [] };

const DEFAULT_FILTERS: GraphFilters = {
  conceptText: '',
  wordText: '',
  toneId: '',
  dialectId: '',
  modeId: '',
  nuanceId: '',
  registerId: '',
  wordLinkId: '',
};

export default function KnowledgeGraphPage() {
  const { user } = useAuth();
  const [rawGraphData, setRawGraphData] = useState<GraphData | null>(null);
  const [lookupTables, setLookupTables] = useState<LookupTables>(EMPTY_LOOKUP);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<GraphFilters>(DEFAULT_FILTERS);
  const [selectedWordPayload, setSelectedWordPayload] = useState<WordGraphPayload | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 1024);

  useEffect(() => {
    if (!user) return;
    setIsLoading(true);
    fetchGraphData(user.id)
      .then(({ graphData, lookupTables: lt }) => {
        setRawGraphData(graphData);
        setLookupTables(lt);
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [user]);

  const filteredGraphData = useMemo<GraphData>(() => {
    if (!rawGraphData) return EMPTY_GRAPH;

    const { conceptText, wordText, toneId, dialectId, modeId, nuanceId, registerId, wordLinkId } = filters;
    const hasAnyFilter =
      conceptText || wordText || toneId || dialectId || modeId || nuanceId || registerId || wordLinkId;

    if (!hasAnyFilter) return rawGraphData;

    const getId = (nodeOrId: any): string =>
      typeof nodeOrId === 'object' && nodeOrId !== null ? nodeOrId.id : nodeOrId;

    const allNodes = rawGraphData.nodes;
    const allLinks = rawGraphData.links;

    const hasConceptFilter = !!conceptText.trim();
    let validConceptIds = new Set<string>();

    if (hasConceptFilter) {
      const lowerFilter = conceptText.trim().toLowerCase();

      const matchedIds = new Set(
        allNodes
          .filter((n) => n.type === 'concept' && n.label.toLowerCase().includes(lowerFilter))
          .map((n) => n.id)
      );

      const descendants = new Set(matchedIds);
      let added = true;
      while (added) {
        added = false;
        allLinks.forEach((l) => {
          if (l.linkType === 'concept-concept') {
            const src = getId(l.source);
            const tgt = getId(l.target);
            if (descendants.has(src) && !descendants.has(tgt)) {
              descendants.add(tgt);
              added = true;
            }
          }
        });
      }

      const ancestors = new Set(matchedIds);
      added = true;
      while (added) {
        added = false;
        allLinks.forEach((l) => {
          if (l.linkType === 'concept-concept') {
            const src = getId(l.source);
            const tgt = getId(l.target);
            if (ancestors.has(tgt) && !ancestors.has(src)) {
              ancestors.add(src);
              added = true;
            }
          }
        });
      }

      validConceptIds = new Set([...descendants, ...ancestors]);
    }

    const survivingWordIds = new Set<string>();
    for (const wNode of allNodes.filter((n) => n.type === 'word')) {
      if (wordText && !wNode.label.toLowerCase().includes(wordText.toLowerCase())) continue;
      const p = wNode.payload;
      if (!p) continue;
      if (toneId && p.toneId !== toneId) continue;
      if (dialectId && p.dialectId !== dialectId) continue;
      if (modeId && p.modeId !== modeId) continue;
      if (nuanceId && p.nuanceId !== nuanceId) continue;
      if (registerId && p.registerId !== registerId) continue;
      if (wordLinkId && p.wordLinkId !== wordLinkId) continue;
      if (hasConceptFilter && p.conceptId && !validConceptIds.has(p.conceptId)) continue;
      survivingWordIds.add(wNode.id);
    }

    const finalConceptIds = new Set<string>();
    for (const wNode of allNodes.filter((n) => survivingWordIds.has(n.id))) {
      if (wNode.payload?.conceptId) finalConceptIds.add(wNode.payload.conceptId);
    }
    if (hasConceptFilter) {
      for (const id of validConceptIds) finalConceptIds.add(id);
    }

    let added = true;
    while (added) {
      added = false;
      allLinks.forEach((l) => {
        if (l.linkType === 'concept-concept') {
          const src = getId(l.source);
          const tgt = getId(l.target);
          if (finalConceptIds.has(tgt) && !finalConceptIds.has(src)) {
            finalConceptIds.add(src);
            added = true;
          }
        }
      });
    }

    const survivingTmrndIds = new Set<string>();
    for (const l of allLinks.filter((l) => l.linkType === 'word-tmrnd')) {
      const src = getId(l.source);
      const tgt = getId(l.target);
      if (survivingWordIds.has(src)) survivingTmrndIds.add(tgt);
    }

    const finalNodeIds = new Set<string>([
      ...survivingWordIds,
      ...finalConceptIds,
      ...survivingTmrndIds,
    ]);

    const finalNodes = allNodes.filter((n) => finalNodeIds.has(n.id));
    const finalLinks = allLinks.filter((l) => {
      const src = getId(l.source);
      const tgt = getId(l.target);
      return finalNodeIds.has(src) && finalNodeIds.has(tgt);
    });

    return { nodes: finalNodes, links: finalLinks };
  }, [rawGraphData, filters]);

  const hasActiveFilter = Object.values(filters).some((v) => v !== '');
  const isFilteredEmpty = hasActiveFilter && filteredGraphData.nodes.length === 0;
  const isDataEmpty = !isLoading && rawGraphData !== null && rawGraphData.nodes.length === 0;

  return (
    <div className="relative flex h-full w-full overflow-hidden">
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-10 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <div
        className={`absolute inset-y-0 left-0 z-20 lg:relative lg:translate-x-0 transition-transform duration-300 ease-in-out ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:hidden'
        }`}
      >
        <FilterSidebar
          filters={filters}
          onFilterChange={setFilters}
          lookupTables={lookupTables}
          graphData={rawGraphData ?? EMPTY_GRAPH}
          filteredGraphData={filteredGraphData}
          onClose={() => setIsSidebarOpen(false)}
        />
      </div>

      <div className="relative flex-1 h-full overflow-hidden">
        {!isSidebarOpen && (
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="absolute top-4 left-4 z-10 bg-white border border-slate-200 shadow-sm rounded-md p-2 hover:bg-slate-50 text-slate-700 transition-colors"
            aria-label="Open filters"
          >
            <Filter size={16} />
          </button>
        )}
        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950 z-20">
            <Loader2 size={40} className="animate-spin text-blue-500 mb-4" />
            <p className="text-slate-400 text-sm font-medium">Building your knowledge graph...</p>
          </div>
        )}

        {isDataEmpty && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950 z-10">
            <div className="bg-slate-900 border border-slate-700/50 rounded-2xl p-10 text-center max-w-sm">
              <Share2 size={40} className="text-slate-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-200 mb-2">Your knowledge graph is empty</h3>
              <p className="text-slate-500 text-sm mb-6 leading-relaxed">
                Start by generating words and building concept trees to populate your graph.
              </p>
              <Link
                to="/"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors"
              >
                Go to Generator
              </Link>
            </div>
          </div>
        )}

        {isFilteredEmpty && !isLoading && (
          <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
            <div className="bg-slate-900/90 backdrop-blur-sm border border-slate-700/50 rounded-2xl px-8 py-6 text-center pointer-events-auto">
              <p className="text-slate-300 font-medium mb-1">No nodes match your filters</p>
              <p className="text-slate-500 text-sm mb-4">Try adjusting or clearing your filters</p>
              <button
                onClick={() => setFilters(DEFAULT_FILTERS)}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors"
              >
                Clear Filters
              </button>
            </div>
          </div>
        )}

        {!isLoading && (
          <KnowledgeGraph
            graphData={filteredGraphData}
            onWordSelect={(payload) => setSelectedWordPayload(payload)}
            selectedWordId={selectedWordPayload?.wordId ?? null}
          />
        )}
      </div>

      <WordDetailPanel
        payload={selectedWordPayload}
        onClose={() => setSelectedWordPayload(null)}
        lookupTables={lookupTables}
      />
    </div>
  );
}
