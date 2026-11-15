import { useEffect, useState } from 'react';
import type { Graph, GraphNode } from './model';
import { executionPositions } from './executionGeometry';

export const nodeWidth = 164;
export const nodeHeight = 48;
export const nodeSize = (node:GraphNode) => node.view?.kind==='section'
  ? {width:220,height:104} : {width:nodeWidth,height:nodeHeight};
export interface Point { x: number; y: number }
export interface Box extends Point { width: number; height: number }
export interface Layout {
  positions: Map<string, Point>;
  name: 'ELK' | 'Dagre' | 'Preset' | 'Hierarchy' | 'Execution';
  reason?: string;
}

const cache = new WeakMap<Graph, Promise<Layout>>();
const executionCache = new WeakMap<Graph, Map<number,Promise<Layout>>>();

function preset(graph: Graph, reason?: string): Layout {
  // A single monotonic time axis also handles disconnected filtered subgraphs.
  // Never wrap a long trace into rows: that reverses arrows on alternate rows.
  const positions = new Map(graph.nodes.map((node, index) => [node.id, { x: 0, y: index * 100 }]));
  return { positions, name: 'Preset', reason };
}

async function cytoscapeLayout(graph: Graph, engine: 'elk' | 'dagre'): Promise<Layout> {
  const [{ default: cytoscape }, { default: extension }] = await Promise.all([
    import('cytoscape'), engine === 'elk' ? import('cytoscape-elk') : import('cytoscape-dagre'),
  ]);
  if (!cytoscape('layout', engine)) cytoscape.use(extension);
  const ids = new Map(graph.nodes.map((node, index) => [node.id, `n${index}`]));
  const cy = cytoscape({
    headless: true,
    styleEnabled: true,
    layout: { name: 'preset' },
    style: [{ selector: 'node', style: { width: nodeWidth, height: nodeHeight } }],
    elements: [
      ...graph.nodes.map((node) => ({ data: { id: ids.get(node.id) } })),
      ...graph.edges.filter((edge) => edge.source !== edge.target && ids.has(edge.source) && ids.has(edge.target))
        .map((edge, index) => ({ data: { id: `e${index}`, source: ids.get(edge.source), target: ids.get(edge.target) } })),
    ],
  });
  try {
    const options = engine === 'elk' ? {
      name: 'elk', fit: false,
      elk: {
        algorithm: 'layered',
        'elk.direction': 'DOWN',
        'elk.spacing.nodeNode': '72',
        'elk.layered.spacing.nodeNodeBetweenLayers': '76',
        'elk.layered.cycleBreaking.strategy': 'GREEDY_MODEL_ORDER',
        'elk.randomSeed': '1',
      },
    } : {
      name: 'dagre', rankDir: 'TB', nodeSep: 88, rankSep: 52, fit: false, ranker: 'tight-tree',
    };
    const layout = cy.layout(options);
    const stopped = layout.promiseOn('layoutstop');
    layout.run();
    await stopped;
    const positions = new Map(Array.from(ids, ([id, key]) => [id, cy.getElementById(key).position()]));
    return { positions, name: engine === 'elk' ? 'ELK' : 'Dagre' };
  } finally {
    cy.destroy();
  }
}

async function arrange(graph: Graph, execution = false,rowWidth=800): Promise<Layout> {
  if (execution) {
    return { positions:executionPositions(graph,nodeSize,3,rowWidth),
      name:'Execution', reason:'Read left → right, then down · content groups expand in place · placement does not imply parallel execution' };
  }
  if (graph.nodes.some((node) => node.view)) return {
    positions: new Map(graph.nodes.map((node, index) => [node.id, { x: (node.view?.depth ?? node.depth ?? 0) * 80, y: index * 140 }])),
    name: 'Hierarchy', reason: 'Source order ↓ · indentation shows containment',
  };
  if (graph.nodes.length <= 1) return preset(graph);
  if (graph.nodes.length > 180 || graph.edges.length > 700) {
    return preset(graph, 'Large graph · time-order layout');
  }
  try {
    const engine = graph.nodes.length <= 36 && graph.edges.length <= 160 ? 'elk' : 'dagre';
    const layout = await cytoscapeLayout(graph, engine);
    if (layout.positions.size !== graph.nodes.length ||
      [...layout.positions.values()].some(({ x, y }) => !Number.isFinite(x) || !Number.isFinite(y)) ||
      graph.nodes.some((node, index) => index > 0 &&
        layout.positions.get(node.id)!.y <= layout.positions.get(graph.nodes[index - 1].id)!.y)) {
      throw new Error('Invalid layout positions');
    }
    return layout;
  } catch {
    return preset(graph, 'Layout unavailable · time-order layout');
  }
}

export function useLayout(graph: Graph, execution = false,rowWidth=800): Layout | null {
  const [result, setResult] = useState<{ graph: Graph; rowWidth:number; layout: Layout }>();
  useEffect(() => {
    let active = true;
    let layouts=executionCache.get(graph);
    if(execution&&!layouts){layouts=new Map();executionCache.set(graph,layouts);}
    let promise = execution ? layouts!.get(rowWidth) : cache.get(graph);
    if (!promise) {
      promise = arrange(graph, execution,rowWidth);
      if(execution)layouts!.set(rowWidth,promise);else cache.set(graph,promise);
    }
    promise.then((layout) => { if (active) setResult({ graph,rowWidth, layout }); });
    return () => { active = false; };
  }, [graph, execution,rowWidth]);
  return result?.graph === graph&&(!execution||result.rowWidth===rowWidth) ? result.layout : null;
}
