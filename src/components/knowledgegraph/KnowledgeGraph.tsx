import { useRef, useCallback, useEffect } from 'react';
import ForceGraph2D, { ForceGraphMethods } from 'react-force-graph-2d';
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import { GraphData, GraphNode, WordGraphPayload } from '../../types';

interface KnowledgeGraphProps {
  graphData: GraphData;
  onWordSelect: (payload: WordGraphPayload) => void;
  selectedWordId: string | null;
}

const NODE_COLORS: Record<string, string> = {
  concept: '#3b82f6',
  word: '#10b981',
  tmrnd: '#f59e0b',
};

const TMRND_SHADES: Record<string, string> = {
  tone: '#fbbf24',
  dialect: '#60a5fa',
  mode: '#34d399',
  nuance: '#f87171',
  register: '#a78bfa',
};

const NODE_RADII: Record<string, number> = {
  concept: 11,
  word: 8,
  tmrnd: 5,
};

export function KnowledgeGraph({ graphData, onWordSelect, selectedWordId }: KnowledgeGraphProps) {
  const fgRef = useRef<ForceGraphMethods<GraphNode> | undefined>(undefined);

  useEffect(() => {
    const timer = setTimeout(() => {
      fgRef.current?.zoomToFit(400, 60);
    }, 800);
    return () => clearTimeout(timer);
  }, [graphData]);

  const nodeCanvasObject = useCallback(
    (node: GraphNode, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const x = node.x ?? 0;
      const y = node.y ?? 0;
      const r = NODE_RADII[node.type] ?? 8;
      const isSelected = node.type === 'word' && node.id === selectedWordId;

      let color = NODE_COLORS[node.type] ?? '#94a3b8';
      if (node.type === 'tmrnd' && node.tmrndSubType) {
        color = TMRND_SHADES[node.tmrndSubType] ?? color;
      }

      if (isSelected) {
        ctx.beginPath();
        ctx.arc(x, y, r + 4, 0, 2 * Math.PI);
        ctx.fillStyle = `${color}33`;
        ctx.fill();
      }

      ctx.beginPath();
      ctx.arc(x, y, r, 0, 2 * Math.PI);
      ctx.fillStyle = color;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(x, y, r, 0, 2 * Math.PI);
      ctx.strokeStyle = isSelected ? '#ffffff' : `${color}80`;
      ctx.lineWidth = isSelected ? 1.5 : 0.8;
      ctx.stroke();

      const label = node.label;
      const fontSize = node.type === 'concept' ? 11 : node.type === 'word' ? 10 : 9;
      ctx.font = `${node.type === 'concept' ? 600 : 400} ${fontSize / globalScale}px Inter, sans-serif`;
      ctx.fillStyle = node.type === 'concept' ? '#e2e8f0' : '#94a3b8';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(label, x, y + r + 3 / globalScale);
    },
    [selectedWordId]
  );

  const linkCanvasObject = useCallback(
    (link: { source: GraphNode | string; target: GraphNode | string; label?: string; linkType?: string }, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const src = link.source as GraphNode;
      const tgt = link.target as GraphNode;
      if (!src.x || !src.y || !tgt.x || !tgt.y) return;

      const sx = src.x;
      const sy = src.y;
      const tx = tgt.x;
      const ty = tgt.y;

      const linkType = link.linkType;

      if (linkType === 'word-tmrnd') {
        ctx.save();
        ctx.setLineDash([3 / globalScale, 4 / globalScale]);
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 0.6;
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(tx, ty);
        ctx.stroke();
        ctx.restore();
        return;
      }

      if (linkType === 'concept-concept') {
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 1.2;
        ctx.globalAlpha = 0.8;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(tx, ty);
        ctx.stroke();

        const angle = Math.atan2(ty - sy, tx - sx);
        const arrowLen = 6 / globalScale;
        const arrowX = tx - (NODE_RADII.concept + 2) / globalScale * Math.cos(angle);
        const arrowY = ty - (NODE_RADII.concept + 2) / globalScale * Math.sin(angle);
        ctx.fillStyle = '#64748b';
        ctx.beginPath();
        ctx.moveTo(arrowX, arrowY);
        ctx.lineTo(arrowX - arrowLen * Math.cos(angle - 0.4), arrowY - arrowLen * Math.sin(angle - 0.4));
        ctx.lineTo(arrowX - arrowLen * Math.cos(angle + 0.4), arrowY - arrowLen * Math.sin(angle + 0.4));
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 1;
        return;
      }

      if (linkType === 'word-concept') {
        ctx.strokeStyle = '#3b82f640';
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.7;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(tx, ty);
        ctx.stroke();
        ctx.globalAlpha = 1;

        if (link.label && globalScale > 0.6) {
          const mx = (sx + tx) / 2;
          const my = (sy + ty) / 2;
          const fontSize = 9 / globalScale;
          ctx.font = `${fontSize}px Inter, sans-serif`;
          ctx.fillStyle = '#64748b';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(link.label, mx, my - 4 / globalScale);
        }
      }
    },
    []
  );

  const handleNodeClick = useCallback(
    (node: GraphNode) => {
      if (node.type === 'word' && node.payload) {
        onWordSelect(node.payload);
      }
    },
    [onWordSelect]
  );

  const handleZoomIn = () => fgRef.current?.zoom((fgRef.current?.zoom() ?? 1) * 1.3, 300);
  const handleZoomOut = () => fgRef.current?.zoom((fgRef.current?.zoom() ?? 1) / 1.3, 300);
  const handleZoomFit = () => fgRef.current?.zoomToFit(400, 60);

  return (
    <div className="relative flex-1 h-full bg-slate-950 overflow-hidden">
      <ForceGraph2D
        ref={fgRef}
        graphData={graphData as unknown as Parameters<typeof ForceGraph2D>[0]['graphData']}
        backgroundColor="#020617"
        nodeCanvasObject={nodeCanvasObject as unknown as Parameters<typeof ForceGraph2D>[0]['nodeCanvasObject']}
        linkCanvasObject={linkCanvasObject as unknown as Parameters<typeof ForceGraph2D>[0]['linkCanvasObject']}
        onNodeClick={handleNodeClick as unknown as Parameters<typeof ForceGraph2D>[0]['onNodeClick']}
        nodeLabel={() => ''}
        cooldownTicks={100}
        d3AlphaDecay={0.02}
        d3VelocityDecay={0.3}
        linkDirectionalArrowLength={0}
        warmupTicks={20}
      />

      <div className="absolute top-4 right-4 flex flex-col gap-1.5">
        {[
          { icon: ZoomIn, label: 'Zoom in', action: handleZoomIn },
          { icon: ZoomOut, label: 'Zoom out', action: handleZoomOut },
          { icon: Maximize2, label: 'Fit graph', action: handleZoomFit },
        ].map(({ icon: Icon, label, action }) => (
          <button
            key={label}
            onClick={action}
            title={label}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-800/90 border border-slate-700/70 text-slate-400 hover:text-slate-100 hover:bg-slate-700 transition-all backdrop-blur-sm shadow-lg"
          >
            <Icon size={15} />
          </button>
        ))}
      </div>

      <div className="absolute bottom-4 left-4 flex items-center gap-4 bg-slate-900/80 backdrop-blur-sm border border-slate-700/50 rounded-xl px-4 py-2.5">
        {[
          { color: 'bg-blue-500', label: 'Concept' },
          { color: 'bg-emerald-500', label: 'Word' },
          { color: 'bg-amber-400', label: 'TMRND' },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1.5">
            <span className={`w-2.5 h-2.5 rounded-full ${color}`} />
            <span className="text-xs text-slate-400">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
