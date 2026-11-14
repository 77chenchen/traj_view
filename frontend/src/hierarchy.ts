import type { Graph, GraphEdge, GraphNode } from './model';

// A repeated sequence is contracted only when its occurrences are adjacent.
// Global signature aggregation would move actions out of source order.
function repetition(nodes: GraphNode[], start: number) {
  if (nodes[start].tool == null) return;
  let best: { period: number; repetitions: number; end: number } | undefined;
  for (let period = 1; period <= 8 && start + period * 2 <= nodes.length; period++) {
    if (nodes.slice(start, start + period).some((node) => node.tool == null)) break;
    let end = start + period;
    while (end < nodes.length && nodes[end].tool != null && nodes[end].signature === nodes[start + (end - start) % period].signature) end++;
    const repetitions = Math.floor((end - start) / period);
    if (repetitions >= 2 && (!best || repetitions * period > best.end - start)) best = { period, repetitions, end: start + repetitions * period };
  }
  return best;
}

export function hierarchyGraph(source: Graph, open: ReadonlySet<string> = new Set()): Graph {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const representative = new Map<string, string>();
  const structural = (parent: string, child: string) => edges.push({ id: `contains-${parent}-${child}`, source: parent, target: child, type: 'structural', count: 1 });
  function group(members: GraphNode[], kind: 'phase' | 'loop' | 'iteration', depth: number, suffix: string,
    repetitions?: number, period?: number): GraphNode {
    const first = members[0];
    const id = `view-${kind}-${first.id}-${suffix}`;
    const phase_counts: Record<string, number> = {};
    for (const member of members) for (const [phase, count] of Object.entries(member.phase_counts)) phase_counts[phase] = (phase_counts[phase] ?? 0) + count;
    const label = kind === 'loop' ? `Loop · ${repetitions} × ${period} calls` : kind === 'iteration' ? `Iteration ${suffix}` : `Phase · ${first.phase}`;
    return { ...first, id, label, signature: JSON.stringify([kind, first.signature]), category: 'plan', tool: null,
      count: members.length, step_indices: members.flatMap((node) => node.step_indices),
      error: members.some((node) => node.error), phase_counts,
      view: { kind, depth, open: open.has(id), repetitions, period } };
  }
  function calls(members: GraphNode[], parent: GraphNode, depth: number) {
    for (const node of members) {
      const child = { ...node, view: undefined, depth };
      // A source call retains its ID; the depth travels separately from group kind.
      nodes.push(child);
      structural(parent.id, child.id);
      representative.set(node.id, child.id);
    }
  }
  for (let start = 0; start < source.nodes.length;) {
    const loop = repetition(source.nodes, start);
    let end = loop?.end ?? start + 1;
    if (!loop) while (end < source.nodes.length && source.nodes[end].phase === source.nodes[start].phase && !repetition(source.nodes, end)) end++;
    const members = source.nodes.slice(start, end);
    const parent = group(members, loop ? 'loop' : 'phase', 0, 'root', loop?.repetitions, loop?.period);
    nodes.push(parent);
    for (const member of members) representative.set(member.id, parent.id);
    if (parent.view!.open) {
      if (loop) for (let iteration = 0; iteration < loop.repetitions; iteration++) {
        const part = members.slice(iteration * loop.period, (iteration + 1) * loop.period);
        const child = group(part, 'iteration', 1, String(iteration + 1));
        nodes.push(child); structural(parent.id, child.id);
        for (const member of part) representative.set(member.id, child.id);
        if (child.view!.open) calls(part, child, 2);
      }
      else calls(members, parent, 1);
    }
    start = end;
  }
  const rolled = new Map<string, GraphEdge>();
  for (const edge of source.edges) {
    const from = representative.get(edge.source), to = representative.get(edge.target);
    if (!from || !to || from === to) continue;
    const key = JSON.stringify([from, to, edge.type]);
    const previous = rolled.get(key);
    if (previous) previous.count += edge.count;
    else rolled.set(key, { ...edge, source: from, target: to });
  }
  return { nodes, edges: [...edges, ...rolled.values()] };
}
