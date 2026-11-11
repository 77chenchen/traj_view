import { useCallback, useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  edgeDashes, GraphDrawing, GraphLegend, makeDrawing, nodeDescription, palettes, type Drawing, type Theme,
} from './graphDrawing';
import { exportGraph } from './graphExport';
import { signatureTarget } from './graphData';
import { useLayout, type Box, type Point } from './layout';
import { capitalize, edgeTypes, number, type EdgeType, type Graph, type GraphNode, type Phase } from './model';
import { Empty, Icon, Loading } from './ui';

export function useEdgeTypes() {
  const [enabled, setEnabled] = useState<ReadonlySet<EdgeType>>(() => new Set(edgeTypes));
  return {
    enabled,
    toggle(type: EdgeType) {
      setEnabled((previous) => {
        const next = new Set(previous);
        if (next.has(type)) next.delete(type);
        else next.add(type);
        return next;
      });
    },
  };
}

export function EdgeControls({ enabled, toggle, theme }: {
  enabled: ReadonlySet<EdgeType>; toggle: (type: EdgeType) => void; theme: Theme;
}) {
  return <div className="edge-controls" role="group" aria-label="Visible edge types">
    <span className="muted edge-caption">Edges</span>
    {edgeTypes.map((type) => <label key={type} className="edge-option">
      <input type="checkbox" checked={enabled.has(type)} onChange={() => toggle(type)} />
      <svg width="20" height="10" viewBox="0 0 20 10" aria-hidden="true">
        <path d="M0 5H20" stroke={palettes[theme].edges[type]} strokeWidth="2" strokeDasharray={edgeDashes[type]} />
      </svg>
      {capitalize(type)}
    </label>)}
  </div>;
}

interface Camera extends Point { scale: number }

function contains(box: Box, point: Point) {
  return point.x >= box.x && point.x <= box.x + box.width && point.y >= box.y && point.y <= box.y + box.height;
}

function GraphViewport({ drawing, phases, theme, enabled, onNode, selected, signature, membership, positionsInTime,
  reached, compact, name, layoutName, layoutReason }: {
  drawing: Drawing; phases: Map<string, Phase>; theme: Theme; enabled: ReadonlySet<EdgeType>;
  onNode: (node: GraphNode) => void; selected?: string | null; signature?: string | null;
  membership?: ReadonlyMap<string, number>; positionsInTime?: ReadonlyMap<string, number>; reached?: number;
  compact?: boolean; name: string; layoutName: string; layoutReason?: string;
}) {
  const frame = useRef<HTMLDivElement>(null);
  const canvas = useRef<SVGSVGElement>(null);
  const drag = useRef<{ pointer: number; client: Point; camera: Camera } | null>(null);
  const [size, setSize] = useState({ width: 700, height: compact ? 280 : 415 });
  const [camera, setCamera] = useState<Camera | null>(null);
  const [tip, setTip] = useState('');
  const [search, setSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exportError, setExportError] = useState('');
  const previousSignature = useRef<string | null | undefined>(null);
  const prefix = 'graph-' + useId().replace(/[^a-z0-9_-]/gi, '');
  const { bounds } = drawing;
  const fitScale = Math.min(size.width / bounds.width, size.height / bounds.height, 1.4);
  const fit = { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2, scale: fitScale };
  const initialScale = Math.max(fitScale, compact ? 0.53 : 0.76);
  const first = drawing.nodes[0]?.point ?? fit;
  const initial = {
    x: size.width / initialScale >= bounds.width ? fit.x :
      Math.max(first.x, bounds.x + size.width / initialScale / 2),
    y: size.height / initialScale >= bounds.height ? fit.y :
      Math.max(first.y, bounds.y + size.height / initialScale / 2),
    scale: initialScale,
  };
  const current = camera ?? initial;
  const view = useMemo(() => ({
    x: current.x - size.width / current.scale / 2,
    y: current.y - size.height / current.scale / 2,
    width: size.width / current.scale, height: size.height / current.scale,
  }), [current.x, current.y, current.scale, size]);
  const focusNode = useCallback((point: Point) => {
    if (!contains(view, point)) setCamera({ ...point, scale: Math.max(current.scale, .76) });
  }, [current.scale, view]);

  useEffect(() => {
    if (signature === previousSignature.current) return;
    previousSignature.current = signature;
    if (!signature) return;
    const matches = drawing.nodes.filter(({ node }) => node.signature === signature);
    if (matches.length && !matches.some(({ point }) => contains(view, point))) focusNode(matches[0].point);
  }, [drawing, focusNode, signature, view]);

  useEffect(() => {
    if (!frame.current) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) setSize({ width, height });
    });
    observer.observe(frame.current);
    return () => observer.disconnect();
  }, []);

  const minZoom = Math.min(fitScale, .2);
  useEffect(() => {
    const target = canvas.current;
    if (!target) return;
    function wheel(event: WheelEvent) {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      const rect = target!.getBoundingClientRect();
      const px = event.clientX - rect.left - size.width / 2;
      const py = event.clientY - rect.top - size.height / 2;
      setCamera((previous) => {
        const start = previous ?? initial;
        const scale = Math.max(minZoom, Math.min(2.8, start.scale * Math.exp(-event.deltaY * .009)));
        return { x: start.x + px / start.scale - px / scale, y: start.y + py / start.scale - py / scale, scale };
      });
    }
    target.addEventListener('wheel', wheel, { passive: false });
    return () => target.removeEventListener('wheel', wheel);
  }, [initial.x, initial.y, initial.scale, minZoom, size]);

  const searchIndex = useMemo(() => drawing.nodes.map((item) => ({
    item,
    haystack: `${item.node.label} ${item.node.tool ?? ''} ${signatureTarget(item.node.signature)} ${item.node.signature} ${item.node.phase} #${item.node.first_idx}`.toLowerCase(),
  })), [drawing]);
  const query = search.trim().toLowerCase();
  const found = query ? searchIndex.filter(({ haystack }) => haystack.includes(query)) : [];

  function zoom(multiplier: number) {
    setCamera({ ...current, scale: Math.max(minZoom, Math.min(2.8, current.scale * multiplier)) });
  }

  function pick(item: Drawing['nodes'][number]) {
    setCamera({ ...item.point, scale: Math.max(current.scale, .9) });
    onNode(item.node);
    setSearchOpen(false);
  }

  async function save(format: 'svg' | 'png') {
    setExportError('');
    setSaving(true);
    try {
      await exportGraph(format, name, { drawing, phases, theme, enabled, selected, signature, membership, positionsInTime, reached });
    } catch (error) {
      setExportError(error instanceof Error ? error.message : 'Graph export failed.');
    } finally {
      setSaving(false);
    }
  }

  return <>
    <div className="graph-toolbar">
      <div className="node-search" onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setSearchOpen(false);
      }}>
        <label className="search-field">
          <Icon name="search" size={15} /><input type="search" value={search} placeholder="Find a node…"
            aria-label={`Find a node in ${name}`} aria-controls={`${prefix}-results`} onFocus={() => setSearchOpen(true)}
            onChange={(event) => { setSearch(event.target.value); setSearchOpen(true); }}
            onKeyDown={(event) => {
              if (event.key === 'Escape') setSearchOpen(false);
              if (event.key === 'Enter' && found.length) { event.preventDefault(); pick(found[0].item); }
            }} />
        </label>
        <div className="node-results" id={`${prefix}-results`} hidden={!searchOpen || !query}>
          {found.length ? <>
            <p className="muted">{number.format(found.length)} {found.length === 1 ? 'match' : 'matches'}</p>
            {found.slice(0, 12).map(({ item }) => <button key={item.node.id} className="node-result" onClick={() => pick(item)}>
              {nodeDescription(item.node, phases)}
            </button>)}
            {found.length > 12 && <p className="muted">Refine the search to see more matches.</p>}
          </> : <p className="muted">No matching nodes</p>}
        </div>
      </div>
      <div className="graph-toolbar-actions">
        <button className="button small icon-button" aria-label="Zoom out" title="Zoom out" onClick={() => zoom(1 / 1.3)}>
          <Icon name="minus" size={16} /></button>
        <button className="button small icon-button" aria-label="Zoom in" title="Zoom in" onClick={() => zoom(1.3)}>
          <Icon name="plus" size={16} /></button>
        <button className="button small icon-button" aria-label="Fit graph" title="Fit graph" onClick={() => setCamera(fit)}>
          <Icon name="fit" size={16} /></button>
        <div className="export-buttons">
          <button className="button small" aria-label={`Download PNG of ${name}`} disabled={saving}
            onClick={() => void save('png')}>PNG</button>
          <button className="button small" aria-label={`Download SVG of ${name}`} disabled={saving}
            onClick={() => void save('svg')}>SVG</button>
        </div>
      </div>
    </div>
    {exportError && <p className="inline-status error-text" role="alert">{exportError}</p>}
    <div ref={frame} className={`graph-frame ${compact ? 'compact' : ''}`}>
      <svg ref={canvas} viewBox={`${view.x} ${view.y} ${view.width} ${view.height}`} tabIndex={0}
        role="group" aria-label={`Process graph for ${name}`} aria-describedby={`${prefix}-help`}
        onKeyDown={(event) => {
          if (event.target !== event.currentTarget) return;
          const directions: Record<string, Point> = {
            ArrowLeft: { x: -1, y: 0 }, ArrowRight: { x: 1, y: 0 }, ArrowUp: { x: 0, y: -1 }, ArrowDown: { x: 0, y: 1 },
          };
          const direction = directions[event.key];
          if (!direction) return;
          event.preventDefault();
          setCamera({ ...current, x: current.x + direction.x * 70 / current.scale, y: current.y + direction.y * 70 / current.scale });
        }}
        onPointerDown={(event) => {
          if (event.button !== 0 || (event.target instanceof Element && event.target.closest('[data-node]'))) return;
          event.currentTarget.setPointerCapture(event.pointerId);
          drag.current = { pointer: event.pointerId, client: { x: event.clientX, y: event.clientY }, camera: current };
        }}
        onPointerMove={(event) => {
          const started = drag.current;
          if (!started || started.pointer !== event.pointerId) return;
          setCamera({
            x: started.camera.x - (event.clientX - started.client.x) / started.camera.scale,
            y: started.camera.y - (event.clientY - started.client.y) / started.camera.scale,
            scale: started.camera.scale,
          });
        }}
        onLostPointerCapture={() => { drag.current = null; }}>
        <GraphDrawing drawing={drawing} phases={phases} theme={theme} enabled={enabled} selected={selected}
          signature={signature} membership={membership} positionsInTime={positionsInTime} reached={reached} prefix={prefix}
          clip={drawing.nodes.length > 200 ? view : undefined} labels={current.scale >= .28}
          onNode={onNode} onFocusNode={focusNode} onTip={setTip} />
      </svg>
    </div>
    <div className="graph-caption">
      <span id={`${prefix}-help`} className="sr-only">Drag the background or use arrow keys to pan. Use the zoom buttons to change scale.</span>
      <span className="graph-tip" title={tip || undefined}>{tip || `${number.format(drawing.nodes.length)} nodes · ${number.format(
        drawing.edges.filter(({ edge }) => enabled.has(edge.type)).length)} visible edges`}</span>
      <span title={layoutReason}>{layoutReason ?? `${layoutName} layout`}</span>
    </div>
  </>;
}

export function GraphView({ graph, phases, theme, enabled, name, selected, signature, membership, onNode,
  positionsInTime, reached, compact, controls, legend = true }: {
  graph: Graph; phases: Phase[]; theme: Theme; enabled: ReadonlySet<EdgeType>; name: string;
  selected?: string | null; signature?: string | null; membership?: ReadonlyMap<string, number>;
  onNode: (node: GraphNode) => void; positionsInTime?: ReadonlyMap<string, number>; reached?: number;
  compact?: boolean; controls?: ReactNode; legend?: boolean;
}) {
  const layout = useLayout(graph);
  const phaseMap = useMemo(() => new Map(phases.map((phase) => [phase.id, phase])), [phases]);
  const drawing = useMemo(() => layout && makeDrawing(graph, layout.positions), [graph, layout]);
  return <>
    {controls}
    {!graph.nodes.length ? <Empty icon="graph" title="No graph steps">This trajectory contains no canonical steps.</Empty>
      : drawing && layout ? <GraphViewport drawing={drawing} phases={phaseMap} theme={theme} enabled={enabled} name={name}
        onNode={onNode} selected={selected} signature={signature} membership={membership}
        positionsInTime={positionsInTime} reached={reached} compact={compact}
        layoutName={layout.name} layoutReason={layout.reason} />
      : <Loading>Laying out graph…</Loading>}
    {legend && graph.nodes.length > 0 && <GraphLegend phases={phases} theme={theme} />}
  </>;
}
