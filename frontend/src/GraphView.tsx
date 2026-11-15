import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  edgeDashes, GraphDrawing, GraphLegend, makeDrawing, nodeDescription, palettes, type Drawing, type Theme,
} from './graphDrawing';
import { exportGraph } from './graphExport';
import { signatureTarget } from './graphData';
import { nodeSize, useLayout, type Box, type Point } from './layout';
import { capitalize, edgeTypes, number, type EdgeType, type Graph, type GraphNode, type Phase } from './model';
import { Empty, Icon, Loading } from './ui';
import { fullScreen } from './Evidence';

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
interface ExpansionRequest { id: string; open: boolean; sequence: number }
type Viewport = Pick<DOMRect, 'left' | 'top' | 'width' | 'height'>;

function sectionAnchor(drawing: Drawing, id: string): Point | undefined {
  const section = drawing.groups.find(group => group.node.id === id);
  if (section) return section.anchor;
  const item = drawing.nodes.find(item => item.node.id === id);
  if (!item) return;
  const size = nodeSize(item.node);
  return { x: item.point.x - size.width / 2, y: item.point.y - size.height / 2 };
}

function contains(box: Box, point: Point) {
  return point.x >= box.x && point.x <= box.x + box.width && point.y >= box.y && point.y <= box.y + box.height;
}

function GraphViewport({ drawing, phases, theme, enabled, onNode, selected, signature, membership, positionsInTime,
  reached, divergence, compact, name, layoutName, layoutReason, toolbar, searchGraph, onLocate, framingKey, locateRequest = 0, expansionRequest }: {
  drawing: Drawing; phases: Map<string, Phase>; theme: Theme; enabled: ReadonlySet<EdgeType>;
  onNode: (node: GraphNode) => void; selected?: string | null; signature?: string | null;
  membership?: ReadonlyMap<string, number>; positionsInTime?: ReadonlyMap<string, number>; reached?: number;
  divergence?: ReadonlySet<string>; compact?: boolean; name: string; layoutName: string; layoutReason?: string; toolbar?: ReactNode;
  searchGraph?: Graph; onLocate?: (node: GraphNode) => void; framingKey?: string; locateRequest?: number; expansionRequest?: ExpansionRequest;
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
  const [fullscreen, setFullscreen] = useState(false);
  const fullscreenReturn = useRef<HTMLElement | null>(null);
  const wasFullscreen = useRef(false);
  useEffect(() => {
    const update = () => {
      const next = Boolean(document.fullscreenElement?.contains(frame.current));
      if (wasFullscreen.current && !next && !document.fullscreenElement) requestAnimationFrame(() => {
        const selectedNode = canvas.current?.querySelector<SVGGElement>('[data-node][aria-pressed="true"]');
        const entry = frame.current?.querySelector<HTMLButtonElement>('[aria-label="Fullscreen graph"]');
        (selectedNode ?? (fullscreenReturn.current?.isConnected ? fullscreenReturn.current : entry) ?? canvas.current)?.focus({ preventScroll: true });
      });
      wasFullscreen.current = next;
      setFullscreen(next);
    };
    document.addEventListener('fullscreenchange', update);
    update();
    return () => document.removeEventListener('fullscreenchange', update);
  }, []);
  const previousSignature = useRef<string | null | undefined>(null);
  const previousSelection = useRef<string | null | undefined>(null);
  const previousLocateRequest = useRef(-1);
  const previousViewport = useRef('');
  const fitted = useRef(false);
  const snapshot = useRef<{ drawing: Drawing; camera: Camera; viewport: Viewport } | undefined>(undefined);
  const expansionSequence = useRef(0);
  const pendingExpansion = useRef<{ request: ExpansionRequest; screen: Point; camera: Camera } | undefined>(undefined);
  const expansionFocus = useRef<number | undefined>(undefined);
  const prefix = 'graph-' + useId().replace(/[^a-z0-9_-]/gi, '');
  const { bounds } = drawing;
  const sourceCount = searchGraph?.nodes.length ?? drawing.nodes.reduce((total,item)=>total+item.node.step_indices.length,0);
  const fitScale = Math.min(Math.max(1,size.width-32) / bounds.width, Math.max(1,size.height-32) / bounds.height, 1.4);
  const fit = { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2, scale: fitScale };
  // A tall trace opens at readable size at its beginning, rather than shrinking
  // the complete source history into one screen. Fit remains an explicit action.
  const initialScale = Math.min(1.15, Math.max(Math.min(size.width / bounds.width, 1), compact ? .65 : .9));
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
  const focusNode = useCallback((point: Point, readable = true) => {
    const box = drawing.nodes.find(item => item.point.x === point.x && item.point.y === point.y)?.bounds;
    const inset = 12/current.scale;
    const safe = {x:view.x+inset,y:view.y+inset,width:Math.max(0,view.width-2*inset),height:Math.max(0,view.height-2*inset)};
    const visible = box ? contains(safe, box) && contains(safe, {x:box.x+box.width,y:box.y+box.height}) : contains(safe,point);
    if (!visible || (readable && sourceCount>12 && current.scale<.9)) {
      fitted.current = false;
      setCamera({ ...point, scale: Math.min(readable ? Math.max(current.scale,.9) : current.scale,
        box ? size.width/(box.width+48) : 2.8, box ? size.height/(box.height+48) : 2.8) });
    }
  }, [current.scale, view, drawing, size.width, size.height, sourceCount]);

  useEffect(() => { fitted.current=false;setCamera(null); previousSelection.current = undefined; }, [framingKey]);

  // Small source graphs can be read as a whole in fullscreen. Long traces keep
  // their readable scale; locating a source reveals that exact node instead.
  useEffect(() => {
    if (!fullscreen || !frame.current?.closest('.graph-workspace') || sourceCount > 12 || drawing.groups.length) return;
    fitted.current=true;
    setCamera(fit);
  }, [fullscreen]);

  useEffect(() => {
    if (fitted.current && !pendingExpansion.current) setCamera(fit);
  }, [fit.x,fit.y,fit.scale]);

  useLayoutEffect(() => {
    const rect = canvas.current?.getBoundingClientRect();
    if (!rect?.width || !rect.height) return;
    // Store document coordinates: scrolling the page between layouts must not
    // make an in-place section jump by the document's scroll delta.
    const viewport: Viewport = {left:rect.left+window.scrollX,top:rect.top+window.scrollY,width:rect.width,height:rect.height};
    if (expansionRequest && expansionRequest.sequence !== expansionSequence.current) {
      fitted.current = false;
      expansionSequence.current = expansionRequest.sequence;
      const before = snapshot.current ?? { drawing, camera: current, viewport };
      const anchor = sectionAnchor(before.drawing, expansionRequest.id);
      if (anchor) {
        const screen = {
          x: before.viewport.left + before.viewport.width / 2 + (anchor.x - before.camera.x) * before.camera.scale,
          y: before.viewport.top + before.viewport.height / 2 + (anchor.y - before.camera.y) * before.camera.scale,
        };
        pendingExpansion.current = { request: expansionRequest, screen, camera: before.camera };
        // Freeze the resolved fit camera while the new frontier is arranged.
        setCamera(before.camera);
      }
    }
    const pending = pendingExpansion.current;
    const ready = pending && (pending.request.open
      ? drawing.groups.some(group => group.node.id === pending.request.id)
      : drawing.nodes.some(item => item.node.id === pending.request.id));
    if (pending && ready) {
      const anchor = sectionAnchor(drawing, pending.request.id)!;
      const next = { ...pending.camera,
        x: anchor.x - (pending.screen.x - viewport.left - viewport.width / 2) / pending.camera.scale,
        y: anchor.y - (pending.screen.y - viewport.top - viewport.height / 2) / pending.camera.scale };
      // Filters/hints can change toolbar height at the compact desktop width.
      // Match the actual SVG viewport before preserving its screen anchor.
      if (Math.abs(size.width-viewport.width)>.1 || Math.abs(size.height-viewport.height)>.1)
        setSize({ width: viewport.width, height: viewport.height });
      setCamera(next);
      pendingExpansion.current = undefined;
      previousSelection.current = selected;
      previousLocateRequest.current = locateRequest;
      previousViewport.current = `${viewport.width}:${viewport.height}:${fullscreen}`;
      snapshot.current = { drawing, camera: next, viewport };
      const attribute = pending.request.open ? 'data-section-toggle' : 'data-node-id';
      const id = pending.request.id;
      if (expansionFocus.current != null) cancelAnimationFrame(expansionFocus.current);
      expansionFocus.current = requestAnimationFrame(() => {
        const target = Array.from(canvas.current?.querySelectorAll<SVGGElement>(`[${attribute}]`) ?? [])
          .find(item => item.getAttribute(attribute) === id);
        target?.focus({ preventScroll: true });
      });
      return;
    }
    snapshot.current = { drawing, camera: current, viewport };
  }, [drawing, expansionRequest, current.x, current.y, current.scale, selected, locateRequest, size.width, size.height]);

  useEffect(() => () => {
    if (expansionFocus.current != null) cancelAnimationFrame(expansionFocus.current);
  }, []);

  useEffect(() => {
    if (pendingExpansion.current) return;
    if (signature === previousSignature.current) return;
    previousSignature.current = signature;
    if (!signature) return;
    const matches = drawing.nodes.filter(({ node }) => node.signature === signature);
    if (matches.length && !matches.some(({ point }) => contains(view, point))) focusNode(matches[0].point);
  }, [drawing, focusNode, signature, view]);

  useEffect(() => {
    if (pendingExpansion.current) return;
    const viewportKey = `${size.width}:${size.height}:${fullscreen}`;
    const sameSource = selected === previousSelection.current && locateRequest === previousLocateRequest.current;
    if (sameSource && viewportKey === previousViewport.current) return;
    const item = drawing.nodes.find(({ node }) => node.id === selected);
    // A retained drawing may not contain the requested source yet. Consume the
    // request only after the replacement drawing can frame the complete node.
    if (!item) return;
    previousSelection.current = selected;
    previousLocateRequest.current = locateRequest;
    previousViewport.current = viewportKey;
    if (!fitted.current || !sameSource) focusNode(item.point,!sameSource);
  }, [drawing, focusNode, selected, locateRequest, size.width, size.height, fullscreen]);

  useEffect(() => {
    if (!canvas.current) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) setSize({ width, height });
    });
    // The frame also contains the navigation gutter. Measure the actual SVG,
    // so viewBox and screen-space framing have exactly the same aspect ratio.
    observer.observe(canvas.current);
    return () => observer.disconnect();
  }, []);

  const wheelCamera = useRef(current);
  wheelCamera.current = current;
  const minZoom = Math.min(fitScale, .2);
  useEffect(() => {
    const target = canvas.current;
    if (!target) return;
    function wheel(event: WheelEvent) {
      if (!event.ctrlKey && !event.metaKey) {
        const start = wheelCamera.current;
        const unit = event.deltaMode === 1 ? 18 : event.deltaMode === 2 ? size.height : 1;
        const horizontal = (event.deltaX + (event.shiftKey ? event.deltaY : 0)) * unit / start.scale;
        const vertical = (event.shiftKey ? 0 : event.deltaY) * unit / start.scale;
        const margin = size.height / start.scale * .24;
        const half = size.height / start.scale / 2;
        const low = bounds.y + half - margin, high = bounds.y + bounds.height - half + margin;
        const y = bounds.height * start.scale <= size.height - 32 ? start.y : Math.max(low, Math.min(high, start.y + vertical));
        // At the beginning/end (or when the whole trace fits), let the same wheel
        // gesture continue down the document. No invisible canvas scroll trap.
        if (Math.abs(y-start.y) < .1 && Math.abs(horizontal) < .1) return;
        event.preventDefault();
        fitted.current = false;
        const next = {...start, x:start.x+horizontal, y};
        wheelCamera.current = next;
        setCamera(next);
        return;
      }
      event.preventDefault();
      fitted.current = false;
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
  }, [initial.x, initial.y, initial.scale, minZoom, size, bounds.x, bounds.y, bounds.width, bounds.height]);

  const searchIndex = useMemo(() => (searchGraph ? searchGraph.nodes.map(node => ({node,point:drawing.nodes.find(item=>item.node.id===node.id)?.point ?? {x:0,y:0},bounds:{x:0,y:0,width:0,height:0}})) : drawing.nodes).map((item) => ({
    item,
    haystack: `${item.node.label} ${item.node.tool ?? ''} ${signatureTarget(item.node.signature)} ${item.node.signature} ${item.node.phase} #${item.node.step_indices.join(' #')}`.toLowerCase(),
  })), [drawing,searchGraph]);
  const query = search.trim().toLowerCase();
  const found = query ? searchIndex.filter(({ haystack }) => haystack.includes(query)) : [];

  function zoom(multiplier: number) {
    fitted.current = false;
    setCamera({ ...current, scale: Math.max(minZoom, Math.min(2.8, current.scale * multiplier)) });
  }

  function pick(item: Drawing['nodes'][number]) {
    if (onLocate) { onLocate(item.node); setSearchOpen(false); return; }
    fitted.current=false;
    setCamera({ ...item.point, scale: Math.max(current.scale, .9) });
    onNode(item.node);
    setSearchOpen(false);
  }

  async function save(format: 'svg' | 'png') {
    setExportError('');
    setSaving(true);
    try {
      await exportGraph(format, name, { drawing, phases, theme, enabled, selected, signature, membership, positionsInTime, reached, divergence });
    } catch (error) {
      setExportError(error instanceof Error ? error.message : 'Graph export failed.');
    } finally {
      setSaving(false);
    }
  }

  return <>
    <div className="graph-toolbar">
      {toolbar}
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
      <div className="canvas-controls">
        <button className="button small icon-button" aria-label="Zoom in" title="Zoom in" onClick={() => zoom(1.3)}>
          <Icon name="plus" size={16} /></button>
        <button className="button small icon-button" aria-label="Zoom out" title="Zoom out" onClick={() => zoom(1 / 1.3)}>
          <Icon name="minus" size={16} /></button>
        <button className="button small icon-button" aria-label="Fit graph" title="Fit all visible nodes" onClick={() => {fitted.current=true;setCamera(fit);}}>
          <Icon name="fit" size={16} /><span>Fit</span></button>
        <button className="button small icon-button" aria-label="Locate selected graph node" title={selected ? 'Locate selected node' : 'Locate first node'} onClick={() => {const node=drawing.nodes.find(n=>n.node.id===selected) ?? drawing.nodes[0];if(node){fitted.current=false;setCamera({...node.point,scale:Math.max(current.scale,.9)});}}}><Icon name="target" size={16}/><span>Locate</span></button>
        {!(fullscreen && frame.current?.closest('.graph-workspace')) && <button className="button small icon-button" aria-label={fullscreen ? 'Exit fullscreen graph' : 'Fullscreen graph'} title={fullscreen ? 'Exit fullscreen · Esc' : 'Fullscreen graph with details'} onClick={e => {fullscreenReturn.current=e.currentTarget;void fullScreen(frame.current?.closest<HTMLElement>('.graph-workspace,.compare-focus-workspace') ?? frame.current?.parentElement ?? null);}}><Icon name={fullscreen ? 'close' : 'fit'} size={16}/></button>}
      </div>
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
          fitted.current = false;
          setCamera({ ...current, x: current.x + direction.x * 70 / current.scale, y: current.y + direction.y * 70 / current.scale });
        }}
        onPointerDown={(event) => {
          if (event.button !== 0 || (event.target instanceof Element && event.target.closest('[data-node],[data-section-toggle]'))) return;
          fitted.current = false;
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
          signature={signature} membership={membership} positionsInTime={positionsInTime} reached={reached} divergence={divergence} prefix={prefix}
          clip={drawing.nodes.length > 200 ? view : undefined} labels={current.scale >= .28}
          onNode={onNode} onFocusNode={focusNode} onTip={setTip} />
      </svg>
    </div>
    <div className="graph-caption">
      <span id={`${prefix}-help`} className="sr-only">Scroll to move through the graph from top to bottom; at its ends scrolling continues through the page. Drag the background or use arrow keys to pan. Hold Control or Command while scrolling to zoom.</span>
      <span className="graph-tip" title={tip || undefined}>{`${number.format(drawing.nodes.length)} nodes · ${number.format(
        drawing.edges.filter(({ edge }) => enabled.has(edge.type)).length)} visible edges`}</span>
      <span title={layoutReason}>{layoutName} layout</span>
    </div>
  </>;
}

export function GraphView({ graph, phases, theme, enabled, name, selected, signature, membership, onNode,
  positionsInTime, reached, divergence, compact, controls, toolbar, legend = true, execution = false, searchGraph, onLocate, framingKey, locateRequest, expansionRequest }: {
  graph: Graph; phases: Phase[]; theme: Theme; enabled: ReadonlySet<EdgeType>; name: string;
  selected?: string | null; signature?: string | null; membership?: ReadonlyMap<string, number>;
  onNode: (node: GraphNode) => void; positionsInTime?: ReadonlyMap<string, number>; reached?: number; toolbar?: ReactNode;
  divergence?: ReadonlySet<string>; compact?: boolean; controls?: ReactNode; legend?: boolean;
  execution?: boolean; searchGraph?: Graph; onLocate?: (node: GraphNode) => void; framingKey?: string; locateRequest?: number; expansionRequest?: ExpansionRequest;
}) {
  const layout = useLayout(graph,execution);
  const phaseMap = useMemo(() => new Map(phases.map((phase) => [phase.id, phase])), [phases]);
  const drawing = useMemo(() => layout && makeDrawing(graph, layout.positions,layout.name==='Execution'), [graph, layout]);
  const [ready, setReady] = useState<{ drawing: Drawing; layout: NonNullable<typeof layout> }>();
  useEffect(() => {
    if (drawing && layout) setReady({ drawing, layout });
  }, [drawing, layout]);
  // Keep the camera mounted while a fresh source snapshot is being arranged.
  const displayed = drawing && layout ? { drawing, layout } : ready;
  return <>
    {controls}
    {!graph.nodes.length ? <>{toolbar && <div className="graph-toolbar">{toolbar}</div>}<Empty icon="graph" title="No graph steps">No source steps match the current layers and filters.</Empty></>
      : displayed ? <GraphViewport drawing={displayed.drawing} phases={phaseMap} theme={theme} enabled={enabled} name={name} toolbar={toolbar}
        onNode={onNode} selected={selected} signature={signature} membership={membership}
        positionsInTime={positionsInTime} reached={reached} divergence={divergence} compact={compact}
        searchGraph={searchGraph} onLocate={onLocate} framingKey={framingKey} locateRequest={locateRequest} expansionRequest={expansionRequest}
        layoutName={displayed.layout.name} layoutReason={displayed.layout.reason} />
      : <Loading>Laying out graph…</Loading>}
    {legend && graph.nodes.length > 0 && <GraphLegend phases={phases} theme={theme} />}
  </>;
}
