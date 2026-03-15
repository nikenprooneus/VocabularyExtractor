import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Share2 } from 'lucide-react';
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
};

export default function KnowledgeGraphPage() {
  const { user } = useAuth();
  const [rawGraphData, setRawGraphData] = useState<GraphData | null>(null);
  const [lookupTables, setLookupTables] = useState<LookupTables>(EMPTY_LOOKUP);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<GraphFilters>(DEFAULT_FILTERS);
  const [selectedWordPayload, setSelectedWordPayload] = useState<WordGraphPayload | null>(null);

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

    const { conceptText, wordText, toneId, dialectId, modeId, nuanceId, registerId } = filters;
    const hasAnyFilter =
      conceptText || wordText || toneId || dialectId || modeId || nuanceId || registerId;

    if (!hasAnyFilter) return rawGraphData;

    const allNodes = rawGraphData.nodes;
    const allLinks = rawGraphData.links;

    const nodeById = new Map<string, GraphNode>();
    for (const n of allNodes) nodeById.set(n.id, n);

    const conceptConceptLinks = allLinks.filter((l) => l.linkType === 'concept-concept');
    const wordConceptLinks = allLinks.filter((l) => l.linkType === 'word-concept');
    const wordTmrndLinks = allLinks.filter((l) => l.linkType === 'word-tmrnd');

    const childToParents = new Map<string, string[]>();
    for (const l of conceptConceptLinks) {
      const src = typeof l.source === 'string' ? l.source : (l.source as GraphNode).id;
      const tgt = typeof l.target === 'string' ? l.target : (l.target as GraphNode).id;
      const parents = childToParents.get(tgt) ?? [];
      parents.push(src);
      childToParents.set(tgt, parents);
    }

    const wordNodes = allNodes.filter((n) => n.type === 'word');
    const survivingWordIds = new Set<string>();

    for (const wNode of wordNodes) {
      if (wordText && !wNode.label.toLowerCase().includes(wordText.toLowerCase())) continue;
      const p = wNode.payload;
      if (!p) continue;
      if (toneId && p.toneId !== toneId) continue;
      if (dialectId && p.dialectId !== dialectId) continue;
      if (modeId && p.modeId !== modeId) continue;
      if (nuanceId && p.nuanceId !== nuanceId) continue;
      if (registerId && p.registerId !== registerId) continue;
      survivingWordIds.add(wNode.id);
    }

    const survivingConceptIds = new Set<string>();

    const seedConceptIds = new Set<string>();
    for (const l of wordConceptLinks) {
      const src = typeof l.source === 'string' ? l.source : (l.source as GraphNode).id;
      const tgt = typeof l.target === 'string' ? l.target : (l.target as GraphNode).id;
      if (survivingWordIds.has(src)) seedConceptIds.add(tgt);
    }

    const walkAncestors = (conceptId: string) => {
      if (survivingConceptIds.has(conceptId)) return;
      survivingConceptIds.add(conceptId);
      const parents = childToParents.get(conceptId) ?? [];
      for (const p of parents) walkAncestors(p);
    };

    for (const cid of seedConceptIds) walkAncestors(cid);

    if (conceptText) {
      for (const cid of [...survivingConceptIds]) {
        const n = nodeById.get(cid);
        if (n && !n.label.toLowerCase().includes(conceptText.toLowerCase())) {
          survivingConceptIds.delete(cid);
        }
      }
    }

    const survivingTmrndIds = new Set<string>();
    for (const l of wordTmrndLinks) {
      const src = typeof l.source === 'string' ? l.source : (l.source as GraphNode).id;
      const tgt = typeof l.target === 'string' ? l.target : (l.target as GraphNode).id;
      if (survivingWordIds.has(src)) survivingTmrndIds.add(tgt);
    }

    const survivingNodeIds = new Set<string>([
      ...survivingWordIds,
      ...survivingConceptIds,
      ...survivingTmrndIds,
    ]);

    const survivingNodes = allNodes.filter((n) => survivingNodeIds.has(n.id));
    const survivingLinks = allLinks.filter((l) => {
      const src = typeof l.source === 'string' ? l.source : (l.source as GraphNode).id;
      const tgt = typeof l.target === 'string' ? l.target : (l.target as GraphNode).id;
      return survivingNodeIds.has(src) && survivingNodeIds.has(tgt);
    });

    return { nodes: survivingNodes, links: survivingLinks };
  }, [rawGraphData, filters]);

  const hasActiveFilter = Object.values(filters).some((v) => v !== '');
  const isFilteredEmpty = hasActiveFilter && filteredGraphData.nodes.length === 0;
  const isDataEmpty = !isLoading && rawGraphData !== null && rawGraphData.nodes.length === 0;

  return (
    <div className="flex h-full w-full overflow-hidden">
      <FilterSidebar
        filters={filters}
        onFilterChange={setFilters}
        lookupTables={lookupTables}
        graphData={rawGraphData ?? EMPTY_GRAPH}
        filteredGraphData={filteredGraphData}
      />

      <div className="relative flex-1 h-full overflow-hidden">
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
