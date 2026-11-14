import type { Graph, GraphEdge, GraphNode, StepIndex } from './model';

export interface ExecutionScope { start: number; end: number }
export const executionThreshold = 60;
export const executionLeafSize = 4;

// Display ranges, never semantic tasks. Each level partitions one contiguous
// source interval; replacing a parent avoids rendering its children twice.
export function executionRanges(total: number, scope?: ExecutionScope): ExecutionScope[] {
  const start = Math.max(0, Math.min(scope?.start ?? 0, total));
  const end = Math.max(start, Math.min(scope?.end ?? total, total));
  const size = Math.ceil((end - start) / 4);
  if (!size) return [];
  const ranges: ExecutionScope[] = [];
  for (let at = start; at < end; at += size) ranges.push({ start: at, end: Math.min(at + size, end) });
  return ranges;
}

export function executionPath(source: Graph, index: StepIndex): ExecutionScope[] {
  const ordinal = source.nodes.findIndex(node => String(node.first_idx) === String(index));
  if (ordinal < 0) return [];
  const path: ExecutionScope[] = [];
  let scope: ExecutionScope | undefined;
  while ((scope?.end ?? source.nodes.length) - (scope?.start ?? 0) > executionLeafSize) {
    const from=scope?.start??0,to=scope?.end??source.nodes.length;
    if (to-from<=executionLeafSize*2) {
      const start=Math.max(from,Math.min(ordinal-1,to-executionLeafSize));
      path.push({start,end:Math.min(start+executionLeafSize,to)});
      break;
    }
    scope = executionRanges(source.nodes.length, scope).find(range => range.start <= ordinal && ordinal < range.end)!;
    path.push(scope);
  }
  return path;
}

export function executionGraph(source: Graph, scope?: ExecutionScope): Graph {
  const start = scope?.start ?? 0, end = Math.min(scope?.end ?? source.nodes.length, source.nodes.length);
  const representative = new Map<string, string>();
  let nodes: GraphNode[];
  if (end - start <= executionLeafSize) {
    nodes = source.nodes.slice(start, end);
    for (const node of nodes) representative.set(node.id, node.id);
  } else {
    nodes = executionRanges(source.nodes.length, scope).map(range => {
      const members = source.nodes.slice(range.start, range.end), first = members[0];
      const phase_counts: Record<string, number> = {};
      for (const node of members) for (const [phase, count] of Object.entries(node.phase_counts)) phase_counts[phase] = (phase_counts[phase] ?? 0) + count;
      const phase = Object.keys(phase_counts).sort((a,b) => phase_counts[b]-phase_counts[a])[0] ?? first.phase;
      const id = `section-${first.id}-${members.at(-1)!.id}`;
      for (const node of members) representative.set(node.id, id);
      const errors = members.filter(node => node.error).length;
      return { ...first, id, label: `Steps ${range.start + 1}–${range.end}`, tool: null,
        signature: JSON.stringify(['source-section', first.id, members.at(-1)!.id]),
        count: members.length, step_indices: members.flatMap(node => node.step_indices),
        phase, phase_counts, error: errors > 0,
        view: { kind: 'section', depth: 0, open: false, start: range.start, end: range.end, errors } };
    });
  }
  const edges = new Map<string, GraphEdge>();
  for (const edge of source.edges) {
    const from = representative.get(edge.source), to = representative.get(edge.target);
    if (!from || !to || from === to) continue;
    const id = JSON.stringify([from, to, edge.type]), previous = edges.get(id);
    if (previous) previous.count += edge.count;
    else edges.set(id, { ...edge, id: `section-edge-${id}`, source: from, target: to });
  }
  return { nodes, edges: [...edges.values()] };
}
