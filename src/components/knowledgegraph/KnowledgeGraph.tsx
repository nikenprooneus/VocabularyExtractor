import { useRef, useCallback, useEffect } from 'react';
import ForceGraph3D from 'react-force-graph-3d';
import SpriteText from 'three-spritetext';
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

export function KnowledgeGraph({ graphData, onWordSelect, selectedWordId }: KnowledgeGraphProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fgRef = useRef<any>(undefined);

  useEffect(() => {
    const timer = setTimeout(() => {
      fgRef.current?.zoomToFit(400, 60);
    }, 800);
    return () => clearTimeout(timer);
  }, [graphData]);

  const nodeThreeObject = useCallback(
    (node: GraphNode) => {
      let color = NODE_COLORS[node.type] ?? '#94a3b8';
      if (node.type === 'tmrnd' && node.tmrndSubType) {
        color = TMRND_SHADES[node.tmrndSubType] ?? color;
      }

      const isSelected = node.type === 'word' && node.id === selectedWordId;

      const sprite = new SpriteText(node.label);

      if (node.type === 'concept') {
        sprite.textHeight = 6;
        sprite.fontWeight = 'bold';
        sprite.color = '#ffffff';
        sprite.padding = 3;
      } else if (node.type === 'word') {
        sprite.textHeight = 4;
        sprite.fontWeight = 'bold';
        sprite.color = '#1e293b';
        sprite.padding = 2;
      } else {
        sprite.textHeight = 3;
        sprite.fontWeight = 'normal';
        sprite.color = '#f8fafc';
        sprite.padding = 2;
      }

      sprite.backgroundColor = isSelected ? '#ffffff' : color;
      sprite.borderRadius = 2;

      return sprite;
    },
    [selectedWordId]
  );

  const linkThreeObject = useCallback(
    (link: { label?: string }) => {
      if (!link.label) return null;

      const sprite = new SpriteText(link.label);
      sprite.color = '#64748b';
      sprite.textHeight = 1.5;
      sprite.backgroundColor = 'rgba(255, 255, 255, 0.9)';
      sprite.borderRadius = 1;
      sprite.padding = 1;
      return sprite;
    },
    []
  );

  const linkPositionUpdate = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (sprite: any, { start, end }: { start: { x: number; y: number; z: number }; end: { x: number; y: number; z: number } }) => {
      if (!sprite) return;
      const middlePos = {
        x: (start.x + end.x) / 2,
        y: (start.y + end.y) / 2,
        z: (start.z + end.z) / 2,
      };
      Object.assign(sprite.position, middlePos);
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
      <ForceGraph3D
        ref={fgRef}
        graphData={graphData as unknown as Parameters<typeof ForceGraph3D>[0]['graphData']}
        backgroundColor="#020617"
        nodeThreeObject={nodeThreeObject as unknown as Parameters<typeof ForceGraph3D>[0]['nodeThreeObject']}
        nodeThreeObjectExtend={false}
        linkThreeObjectExtend={true}
        linkThreeObject={linkThreeObject as unknown as Parameters<typeof ForceGraph3D>[0]['linkThreeObject']}
        linkPositionUpdate={linkPositionUpdate as unknown as Parameters<typeof ForceGraph3D>[0]['linkPositionUpdate']}
        onNodeClick={handleNodeClick as unknown as Parameters<typeof ForceGraph3D>[0]['onNodeClick']}
        nodeLabel={() => ''}
        cooldownTicks={100}
        d3AlphaDecay={0.02}
        d3VelocityDecay={0.3}
        warmupTicks={20}
        linkDirectionalParticles={1}
        linkDirectionalParticleWidth={0.5}
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
