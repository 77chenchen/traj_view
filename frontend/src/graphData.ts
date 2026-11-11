import { type Graph, type GraphEdge, type GraphNode } from './model';

export function foldGraph(graph: Graph): Graph {
  if (!graph.nodes.some((node, index) => node.signature === graph.nodes[index - 1]?.signature)) return graph;

  const nodes: GraphNode[] = [];
  const foldedIds = new Map<string, string>();

  for (const node of graph.nodes) {
    const previous = nodes.at(-1);
    if (previous && previous.signature === node.signature) {
      foldedIds.set(node.id, previous.id);
      previous.count += node.count;
      for (const index of node.step_indices) previous.step_indices.push(index);
      previous.error ||= node.error;
      for (const [phase, count] of Object.entries(node.phase_counts)) {
        previous.phase_counts[phase] = (previous.phase_counts[phase] ?? 0) + count;
      }
    } else {
      foldedIds.set(node.id, node.id);
      nodes.push({ ...node, step_indices: [...node.step_indices], phase_counts: { ...node.phase_counts } });
    }
  }

  const edges = new Map<string, GraphEdge>();
  for (const edge of graph.edges) {
    const source = foldedIds.get(edge.source);
    const target = foldedIds.get(edge.target);
    if (source == null || target == null) continue;
    const key = JSON.stringify([source, target, edge.type]);
    const previous = edges.get(key);
    if (previous) previous.count += edge.count;
    else edges.set(key, { ...edge, source, target });
  }
  return { nodes, edges: [...edges.values()] };
}

export function signatureTarget(signature: string) {
  try {
    const tuple: unknown = JSON.parse(signature);
    if (Array.isArray(tuple) && typeof tuple[1] === 'string') return tuple[1];
  } catch { /* The original signature is still searchable. */ }
  return '';
}

export function actionSequence(graph: Graph) {
  return graph.nodes.filter((node) => node.tool != null);
}

export function comparePair(left: GraphNode[], right: GraphNode[]) {
  const leftSet = new Set(left.map((node) => node.signature));
  const rightSet = new Set(right.map((node) => node.signature));
  let intersection = 0;
  for (const signature of leftSet) if (rightSet.has(signature)) intersection += 1;
  const union = leftSet.size + rightSet.size - intersection;

  let offset = 0;
  while (offset < left.length && offset < right.length && left[offset].signature === right[offset].signature) {
    offset += 1;
  }
  const identical = offset === left.length && offset === right.length;
  return {
    jaccard: union ? intersection / union : 1,
    intersection,
    union,
    offset: identical ? null : offset,
    leftIndex: identical ? null : left[offset]?.first_idx ?? null,
    rightIndex: identical ? null : right[offset]?.first_idx ?? null,
  };
}
