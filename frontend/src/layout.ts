import { useEffect, useState } from 'react';
import type { Graph } from './model';

export const nodeWidth = 164;
export const nodeHeight = 48;
export interface Point { x: number; y: number }
export interface Box extends Point { width: number; height: number }
export interface Layout {
  positions: Map<string, Point>;
  name: 'ELK' | 'Dagre' | 'Preset';
  reason?: string;
}

const cache = new WeakMap<Graph, Promise<Layout>>();

function preset(graph: Graph, reason?: string): Layout {
  const columns = graph.nodes.length < 8 ? Math.max(1, graph.nodes.length)
    : Math.max(4, Math.min(64, Math.ceil(Math.sqrt(graph.nodes.length * 1.5))));
  const positions = new Map(graph.nodes.map((node, index) => {
    const row = Math.floor(index / columns);
    const offset = index % columns;
    const col = row % 2 ? columns - 1 - offset : offset;
    return [node.id, { x: col * 226, y: row * 148 }];
  }));
  return { positions, name: 'Preset', reason };
}

async function elkLayout(graph: Graph): Promise<Layout> {
  const { default: ELK } = await import('elkjs/lib/elk.bundled.js');
  const elk = new ELK();
  const ids = new Map(graph.nodes.map((node, index) => [node.id, `n${index}`]));
  const result = await elk.layout({
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': 'RIGHT',
      'elk.spacing.nodeNode': '72',
      'elk.layered.spacing.nodeNodeBetweenLayers': '76',
      'elk.layered.cycleBreaking.strategy': 'GREEDY_MODEL_ORDER',
      'elk.randomSeed': '1',
    },
    children: graph.nodes.map((node) => ({ id: ids.get(node.id)!, width: nodeWidth, height: nodeHeight })),
    edges: graph.edges.filter((edge) => edge.source !== edge.target && ids.has(edge.source) && ids.has(edge.target))
      .map((edge, index) => ({ id: `e${index}`, sources: [ids.get(edge.source)!], targets: [ids.get(edge.target)!] })),
  });
  const positions = new Map<string, Point>();
  const placed = new Map(result.children?.map((child) => [child.id, child]));
  for (const [id, key] of ids) {
    const child = placed.get(key);
    if (child?.x == null || child.y == null) throw new Error('ELK returned an incomplete layout');
    positions.set(id, { x: child.x + nodeWidth / 2, y: child.y + nodeHeight / 2 });
  }
  return { positions, name: 'ELK' };
}

async function dagreLayout(graph: Graph): Promise<Layout> {
  const [{ default: cytoscape }, { default: dagre }] = await Promise.all([
    import('cytoscape'), import('cytoscape-dagre'),
  ]);
  if (!cytoscape('layout', 'dagre')) cytoscape.use(dagre);
  const ids = new Map(graph.nodes.map((node, index) => [node.id, `n${index}`]));
  const cy = cytoscape({
    headless: true,
    styleEnabled: true,
    style: [{ selector: 'node', style: { width: nodeWidth, height: nodeHeight } }],
    elements: [
      ...graph.nodes.map((node) => ({ data: { id: ids.get(node.id) } })),
      ...graph.edges.filter((edge) => edge.source !== edge.target && ids.has(edge.source) && ids.has(edge.target))
        .map((edge, index) => ({ data: { id: `e${index}`, source: ids.get(edge.source), target: ids.get(edge.target) } })),
    ],
  });
  try {
    const options = { name: 'dagre', rankDir: 'LR', nodeSep: 88, rankSep: 76, fit: false, ranker: 'tight-tree' };
    cy.layout(options).run();
    const positions = new Map(Array.from(ids, ([id, key]) => [id, cy.getElementById(key).position()]));
    return { positions, name: 'Dagre' };
  } finally {
    cy.destroy();
  }
}

async function arrange(graph: Graph) {
  if (graph.nodes.length <= 1) return preset(graph);
  if (graph.nodes.length > 180 || graph.edges.length > 700) {
    return preset(graph, 'Large graph · time-order layout');
  }
  try {
    const layout = await (graph.nodes.length <= 36 && graph.edges.length <= 160 ? elkLayout(graph) : dagreLayout(graph));
    if (layout.positions.size !== graph.nodes.length ||
      [...layout.positions.values()].some(({ x, y }) => !Number.isFinite(x) || !Number.isFinite(y))) {
      throw new Error('Invalid layout positions');
    }
    return layout;
  } catch {
    return preset(graph, 'Layout unavailable · time-order layout');
  }
}

export function useLayout(graph: Graph): Layout | null {
  const [result, setResult] = useState<{ graph: Graph; layout: Layout }>();
  useEffect(() => {
    let active = true;
    let promise = cache.get(graph);
    if (!promise) {
      promise = arrange(graph);
      cache.set(graph, promise);
    }
    promise.then((layout) => { if (active) setResult({ graph, layout }); });
    return () => { active = false; };
  }, [graph]);
  return result?.graph === graph ? result.layout : null;
}
