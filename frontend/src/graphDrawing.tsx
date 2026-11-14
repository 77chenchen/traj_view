import { memo, type ReactNode } from 'react';
import { nodeHeight, nodeWidth, nodeSize, type Box, type Point } from './layout';
import { executionRoutes } from './edgeRouting';
import { executionBoxes, type SectionBox } from './executionGeometry';
import {
  categories, edgeTypes, capitalize, phaseColor, sourceIndex,
  type Category, type EdgeType, type Graph, type GraphEdge, type GraphNode, type Phase,
} from './model';

const halfWidth = nodeWidth / 2;
const halfHeight = nodeHeight / 2;

export const palettes = {
  light: {
    surface: '#f4f7fc', node: '#ffffff', text: '#18243a', muted: '#53637b',
    selected: '#7046d7', error: '#b92d48', unique: '#b35b09',
    edges: { temporal: '#71809a', dependency: '#206f88', retry: '#a84921', structural: '#3778b5' },
  },
  dark: {
    surface: '#0e1425', node: '#1a2238', text: '#f0f1fb', muted: '#bac3dd',
    selected: '#a38aff', error: '#ff8196', unique: '#f3cf73',
    edges: { temporal: '#c1caef', dependency: '#73b8ff', retry: '#c298ff', structural: '#ac99f5' },
  },
};
export type Theme = keyof typeof palettes;

export const edgeDashes: Record<EdgeType, string | undefined> = {
  temporal: undefined, dependency: '7 4', retry: '2 4', structural: '9 4 2 4',
};

const shapePaths: Record<Category, string> = {
  shell: 'M-8-6H8V6H-8Z',
  read: 'M0-8A8 8 0 1 1 0 8A8 8 0 1 1 0-8Z',
  edit: 'M0-9L9 0 0 9-9 0Z',
  validate: 'M-5-7H5L9 0 5 7H-5L-9 0Z',
  plan: 'M0-8L9 7H-9Z',
  tool: 'M-8-3Q-8-7-4-7H4Q8-7 8-3V3Q8 7 4 7H-4Q-8 7-8 3Z',
  message: 'M-8-6H8V4H1L-4 8V4H-8Z',
};

export function Shape({ category, color = 'currentColor' }: { category: Category; color?: string }) {
  return <path d={shapePaths[category] ?? shapePaths.tool} fill={color} />;
}

export function GraphLegend({ phases, theme }: { phases: Phase[]; theme: Theme }) {
  return <div className="graph-legend" aria-label="Graph legend">
    <div className="legend-items" aria-label="Phases">
      {phases.map((phase) => <span key={phase.id}><i className="phase-dot" style={{ background: phaseColor(phase) }} />
        {phase.label}</span>)}
      <span><i className="error-key" /> Error</span>
    </div>
    <details className="tool-legend"><summary>Tool shapes</summary>
      <div className="legend-items">
        {categories.map((category) => <span key={category}>
          <svg width="16" height="16" viewBox="-10 -10 20 20" aria-hidden="true"><Shape category={category} /></svg>
          {capitalize(category)}
        </span>)}
        <span><i className="selection-key" style={{ borderColor: palettes[theme].selected }} /> Selected</span>
      </div>
    </details>
  </div>;
}

function boxAround(points: Point[], padding: number): Box {
  let left = Infinity, top = Infinity, right = -Infinity, bottom = -Infinity;
  for (const point of points) {
    left = Math.min(left, point.x);
    top = Math.min(top, point.y);
    right = Math.max(right, point.x);
    bottom = Math.max(bottom, point.y);
  }
  return { x: left - padding, y: top - padding, width: right - left + 2 * padding, height: bottom - top + 2 * padding };
}

function joinBoxes(left: Box, right: Box): Box {
  const x = Math.min(left.x, right.x);
  const y = Math.min(left.y, right.y);
  return { x, y, width: Math.max(left.x + left.width, right.x + right.width) - x,
    height: Math.max(left.y + left.height, right.y + right.height) - y };
}

function anchored(from: Point, to: Point, pad: number): Point {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const factor = 1 / (Math.max(Math.abs(dx) / (halfWidth + pad), Math.abs(dy) / (halfHeight + pad)) || 1);
  return { x: from.x + dx * factor, y: from.y + dy * factor };
}

interface DrawnEdge {
  edge: GraphEdge;
  path: string;
  bounds: Box;
  label: Point;
}

interface DrawnNode { node: GraphNode; point: Point; bounds: Box }
export interface Drawing { edges: DrawnEdge[]; nodes: DrawnNode[]; bounds: Box; groups: SectionBox[] }

function edgeCurve(edge: GraphEdge, from: Point, to: Point, parallel: number, total: number, reverse: boolean): DrawnEdge {
  if (edge.source === edge.target) {
    const reach = 39 + parallel * 24;
    const a = { x: from.x + 28, y: from.y - halfHeight };
    const b = { x: from.x + 65, y: from.y - halfHeight - 4 };
    const c1 = { x: a.x - 22, y: a.y - reach };
    const c2 = { x: b.x + 22, y: b.y - reach };
    return { edge, path: `M ${a.x} ${a.y} C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${b.x} ${b.y}`,
      label: { x: (a.x + b.x) / 2, y: a.y - reach * 0.76 }, bounds: boxAround([a, b, c1, c2], 12) };
  }

  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const distance = Math.hypot(dx, dy) || 1;
  const longLink = edge.type !== 'temporal' && Math.abs(dy) < 75 && Math.abs(dx) > 300;
  const offset = (reverse ? 30 : 0) + (parallel - (total - 1) / 2) * 24 +
    (longLink ? Math.min(155, distance * .16) : 0);
  const middle = { x: (from.x + to.x) / 2 - dy / distance * offset, y: (from.y + to.y) / 2 + dx / distance * offset };
  const a = anchored(from, middle, 1);
  const b = anchored(to, middle, 6);
  const label = { x: (a.x + b.x + middle.x * 2) / 4, y: (a.y + b.y + middle.y * 2) / 4 };
  return { edge, path: `M ${a.x} ${a.y} Q ${middle.x} ${middle.y} ${b.x} ${b.y}`,
    label, bounds: boxAround([a, middle, b], 12) };
}

export function makeDrawing(graph: Graph, positions: Map<string, Point>, execution = false): Drawing {
  const groups = new Map<string, GraphEdge[]>();
  for (const edge of graph.edges) {
    const key = JSON.stringify([edge.source, edge.target]);
    const group = groups.get(key);
    if (group) group.push(edge);
    else groups.set(key, [edge]);
  }
  const sections=execution?executionBoxes(graph,positions,nodeSize):[];
  const edges: DrawnEdge[] = execution ? executionRoutes(graph,positions,nodeWidth,nodeHeight,new Map(graph.nodes.map(node=>[node.id,nodeSize(node)])),sections.map(s=>s.bounds)) : [];
  for (const group of execution ? [] : groups.values()) {
    const { source, target } = group[0];
    const from = positions.get(source);
    const to = positions.get(target);
    if (!from || !to) continue;
    const reverse = source !== target && groups.has(JSON.stringify([target, source]));
    group.forEach((edge, index) => edges.push(edgeCurve(edge, from, to, index, group.length, reverse)));
  }
  const nodes = graph.nodes.flatMap((node) => {
    const point = positions.get(node.id);
    if (!point) return [];
    const size=nodeSize(node);
    const bounds = { x: point.x - size.width/2 - 6, y: point.y - size.height/2 - 30, width: size.width + 12, height: size.height + 36 };
    return [{ node, point, bounds }];
  });
  const first = nodes[0]?.bounds ?? { x: 0, y: 0, width: 1, height: 1 };
  let bounds = nodes.reduce((box, node) => joinBoxes(box, node.bounds), first);
  bounds = edges.reduce((box, edge) => joinBoxes(box, edge.bounds), bounds);
  bounds = sections.reduce((box, section) => joinBoxes(box, section.bounds), bounds);
  return { nodes, edges, groups:sections, bounds: { x: bounds.x - 22, y: bounds.y - 22, width: bounds.width + 44, height: bounds.height + 44 } };
}

function overlaps(a: Box, b: Box) {
  return a.x <= b.x + b.width && a.x + a.width >= b.x && a.y <= b.y + b.height && a.y + a.height >= b.y;
}

function shortened(text: string, limit: number) {
  const characters = Array.from(text.replace(/\s+/g, ' ').trim());
  return characters.length > limit ? characters.slice(0, limit - 1).join('') + '…' : characters.join('');
}
function sectionTitle(text:string){
  if(text.length<=24)return [text];
  const space=text.lastIndexOf(' ',24),split=space>12?space:24;
  return [text.slice(0,split),shortened(text.slice(split).trim(),25)];
}

export interface DrawingOptions {
  drawing: Drawing;
  phases: Map<string, Phase>;
  theme: Theme;
  enabled: ReadonlySet<EdgeType>;
  selected?: string | null;
  signature?: string | null;
  membership?: ReadonlyMap<string, number>;
  positionsInTime?: ReadonlyMap<string, number>;
  reached?: number;
  divergence?: ReadonlySet<string>;
}

export function nodeDescription(node: GraphNode, phases: Map<string, Phase>) {
  return [node.label || node.tool || 'Message', phases.get(node.phase)?.label ?? node.phase, capitalize(node.category),
    `${node.count} ${node.count === 1 ? 'step' : 'steps'}`, `first source step ${sourceIndex(node.first_idx)}`,
    node.view && (node.view.kind === 'section' ? `source section · ${node.view.errors} errors · ${node.view.summary?.description} · ${node.view.summary?.focus} · select to expand in place` : `${node.view.kind} group · ${node.view.open ? 'expanded' : 'collapsed'} · select to toggle`), node.error && 'Contains error'].filter(Boolean).join(' · ');
}

export const GraphDrawing = memo(function GraphDrawing({
  drawing, phases, theme, enabled, selected, signature, membership, positionsInTime, reached, divergence, prefix,
  clip, labels = true, onNode, onFocusNode, onTip,
}: DrawingOptions & {
  prefix: string; clip?: Box; labels?: boolean; onNode?: (node: GraphNode) => void;
  onFocusNode?: (point: Point) => void; onTip?: (text: string) => void;
}) {
  const palette = palettes[theme];
  const inView = (bounds: Box) => !clip || overlaps(bounds, clip);
  const unreached = (id: string) => reached != null && (positionsInTime?.get(id) ?? 0) >= reached;
  const marker = (type: EdgeType) => `${prefix}-arrow-${type}`;
  const renderNode = ({ node, point, bounds }: DrawnNode): ReactNode => {
    if (!inView(bounds)) return null;
    const phase = phases.get(node.phase);
    const phaseLabel = phase?.label ?? node.phase;
    const size=nodeSize(node),halfWidth=size.width/2,halfHeight=size.height/2,summary=node.view?.summary;
    const groupTitle=sectionTitle(node.label);
    const color = theme === 'dark' ? node.error ? palette.error : node.view || node.category === 'plan' || node.category === 'message' ? '#bd9bf2' : node.category === 'validate' ? '#6bd899' : '#e9c56a' : phaseColor(phase);
    const active = selected === node.id || (signature != null && signature === node.signature);
    const unique = membership?.get(node.signature) === 1;
    const dimmed = unreached(node.id);
    const description = nodeDescription(node, phases) + (membership ?
      (unique ? ' · Unique to this run' : ` · Shared across ${membership.get(node.signature)} runs`) : '') +
      (dimmed ? ' · Timeline has not reached this node' : '') +
      (divergence?.has(node.id) ? ' · First divergence versus baseline' : '');
    const title = shortened(node.label || node.tool || 'Message', node.count > 1 ? 15 : 20);
    const titleWidth = Math.max(0, Math.min(node.count > 1 ? 98 : 126, Array.from(title).length * 6.7));
    return <g key={node.id} transform={`translate(${point.x} ${point.y})`} className={onNode ? 'graph-node' : undefined}
      data-node={onNode ? '' : undefined} data-node-id={node.id} data-source-index={node.first_idx} data-signature={node.signature} role={onNode ? 'button' : undefined} tabIndex={onNode ? 0 : undefined}
      aria-label={onNode ? description : undefined} aria-pressed={onNode ? active : undefined}
      aria-expanded={onNode&&node.view?.kind==='section'?false:undefined}
      onClick={onNode ? () => onNode(node) : undefined}
      onKeyDown={onNode ? (event) => {
        if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onNode(node); }
      } : undefined}
      onPointerEnter={onTip ? () => onTip(description) : undefined}
      onPointerLeave={onTip ? () => onTip('') : undefined}
      onFocus={onTip ? (event) => {
        // Pointer focus must not move a node between pointerdown and click.
        if (event.currentTarget.matches(':focus-visible')) onFocusNode?.(point);
        onTip(description);
      } : undefined}
      onBlur={onTip ? () => onTip('') : undefined}>
      <title>{description}</title>
      <rect x={-halfWidth - 4} y={-halfHeight - 4} width={size.width + 8} height={size.height + 8} rx={11}
        fill="none" stroke={palette.selected} strokeWidth={2} opacity={active ? 1 : 0} className="node-focus" />
      {divergence?.has(node.id) && <g aria-hidden="true">
        <path d={`M${-halfWidth} ${-halfHeight - 10}H${halfWidth}`} stroke={palette.unique} strokeWidth={3} />
        <text x={-halfWidth} y={-halfHeight - 16} fill={palette.unique} fontSize={10}>First divergence</text>
      </g>}
      <g opacity={dimmed ? .22 : undefined}>
        <rect x={-halfWidth} y={-halfHeight} width={size.width} height={size.height} rx={8} fill={palette.node}
          stroke={node.error ? palette.error : color} strokeWidth={node.error ? 3 : 1.5} />
        <circle cx={halfWidth - 9} cy={halfHeight - 9} r={3} fill={phaseColor(phase)} />
        <g transform={summary?`translate(${-halfWidth+17} -29)`:'translate(-64 -5)'}><Shape category={node.category} color={color} /></g>
        {unique && <circle cx={halfWidth - 5} cy={-halfHeight + 5} r={4} fill={palette.unique} />}
        {labels && summary ? <g data-section-summary="">
          {groupTitle.map((line,i)=><text key={i} x={-halfWidth+33} y={-28+i*15} fill={palette.text} fontWeight={650} fontSize={12.5}>{line}</text>)}
          <text x={-halfWidth+14} y={7} fill={palette.muted} fontSize={11}>{shortened(summary.description,34)}</text>
          <text x={-halfWidth+14} y={25} fill={palette.muted} fontSize={11}>{shortened(summary.focus,34)}</text>
          <text x={-halfWidth+14} y={43} fill={summary.failures?palette.error:palette.muted} fontSize={10.5}>{node.count} steps · {summary.failures} errors{summary.retries>0?` · ${summary.retries} retries`:''}</text>
        </g> : labels && <>
          <text x={-50} y={-1} fill={palette.text} fontWeight={650} fontSize={12}
            textLength={title.length > 12 ? titleWidth : undefined} lengthAdjust="spacingAndGlyphs">{title}</text>
          <text x={-50} y={15} fill={palette.muted} fontSize={10}>{shortened(node.view?.kind === 'section' ? `${node.view.errors} ${node.view.errors===1?'error':'errors'} · ${phaseLabel}` : `${phaseLabel} · ${sourceIndex(node.first_idx)}`, 25)}</text>
          {node.count > 1 && <text x={halfWidth - 9} y={-1} textAnchor="end" fill={palette.muted} fontSize={10}>
            ×{node.count}
          </text>}
        </>}
      </g>
    </g>;
  };

  return <g fontFamily="system-ui, sans-serif">
    <defs>{edgeTypes.map((type) => <marker key={type} id={marker(type)} viewBox="0 0 8 8" refX={7} refY={4}
      markerWidth={7} markerHeight={7} orient="auto" markerUnits="userSpaceOnUse">
      <path d="M0 0 8 4 0 8Z" fill={palette.edges[type]} />
    </marker>)}</defs>
    {drawing.groups.map(({node,bounds})=><g key={node.id} data-expanded-section={node.id}>
      <rect {...bounds} rx={8} pointerEvents="none" fill={palette.surface} fillOpacity={.65} stroke={selected===node.id?palette.selected:palette.muted} strokeOpacity={selected===node.id?1:.4}/>
      <g className="graph-section-toggle" data-section-toggle={node.id} role={onNode?'button':undefined} tabIndex={onNode?0:undefined}
        aria-label={onNode?`Collapse ${node.label} section · ${node.count} source steps`:undefined} aria-expanded={onNode?true:undefined}
        onClick={onNode?()=>onNode(node):undefined}
        onKeyDown={onNode?event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();onNode(node);}}:undefined}
        onFocus={onTip?()=>onTip(`Expanded ${node.label} · ${node.count} source steps · click header to collapse`):undefined}
        onBlur={onTip?()=>onTip(''):undefined}>
        <title>{node.label} · {node.count} source steps · click header to collapse</title>
        <rect x={bounds.x} y={bounds.y} width={bounds.width} height={28} rx={6} fill={palette.node}/>
        <path d={`M${bounds.x+11} ${bounds.y+11}l4 5 4-5`} stroke={palette.selected} strokeWidth={1.5} fill="none"/>
        <text x={bounds.x+27} y={bounds.y+18} fontSize={12} fontWeight={600} fill={palette.text}>{shortened(node.label,Math.max(12,Math.floor((Math.min(bounds.width,620)-170)/6.5)))}</text>
        <text x={bounds.x+Math.min(bounds.width,620)-12} y={bounds.y+18} textAnchor="end" fontSize={10.5} fill={palette.selected}>{node.count} steps · Collapse</text>
      </g>
    </g>)}
    {drawing.edges.map(({ edge, path, bounds, label }) => enabled.has(edge.type) && inView(bounds) &&
      <g key={edge.id} data-edge-type={edge.type} data-source={edge.source} data-target={edge.target} opacity={unreached(edge.source) || unreached(edge.target) ? 0.16 : 0.82}>
        <title>{`${capitalize(edge.type)} · ${edge.count}`}</title>
        <path d={path} fill="none" stroke={palette.edges[edge.type]} strokeWidth={edge.type === 'temporal' ? 1.9 : 1.6}
          strokeDasharray={edgeDashes[edge.type]} markerEnd={`url(#${marker(edge.type)})`} />
        {labels && edge.count > 1 && <text x={label.x} y={label.y - 4} textAnchor="middle"
          fontSize={10} fill={palette.edges[edge.type]} stroke={palette.surface} strokeWidth={3} paintOrder="stroke">
          {edge.count}
        </text>}
      </g>)}
    {drawing.nodes.map(renderNode)}
  </g>;
});
