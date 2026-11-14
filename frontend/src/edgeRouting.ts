import type { Graph, GraphEdge } from './model';
import type { Box, Point } from './layout';

export interface RoutedEdge { edge: GraphEdge; path: string; bounds: Box; label: Point }

// Forward ports + interval-colored outer channels keep long relationships out
// of node interiors. Routes are shared by the browser and image exports.
export function executionRoutes(graph: Graph, positions: Map<string, Point>, width: number, height: number,
  sizes?:ReadonlyMap<string,{width:number;height:number}>,containers:Box[]=[]): RoutedEdge[] {
  const ordinals = new Map(graph.nodes.map((node,i) => [node.id,i]));
  const top = Math.min(0,...[...positions].map(([id,p])=>p.y-(sizes?.get(id)?.height??height)/2),...containers.map(b=>b.y)) - 46;
  const bottom = Math.max(0,...[...positions].map(([id,p])=>p.y+(sizes?.get(id)?.height??height)/2),...containers.map(b=>b.y+b.height)) + 46;
  const tracks: Record<string, number[]> = { upper: [], lower: [] };
  return [...graph.edges].sort((a,b) => (ordinals.get(a.source) ?? 0)-(ordinals.get(b.source) ?? 0) || (ordinals.get(a.target) ?? 0)-(ordinals.get(b.target) ?? 0)).flatMap(edge => {
    const from = positions.get(edge.source), to = positions.get(edge.target);
    if (!from || !to || to.x <= from.x) return [];
    const a = { x: from.x + (sizes?.get(edge.source)?.width??width) / 2 + 1, y: from.y };
    const b = { x: to.x - (sizes?.get(edge.target)?.width??width) / 2 - 7, y: to.y };
    const start = ordinals.get(edge.source)!, end = ordinals.get(edge.target)!;
    let points: Point[];
    if (edge.type === 'temporal' && end === start + 1) {
      const middle = (a.x+b.x)/2;
      points = [a,{x:middle,y:a.y},{x:middle,y:b.y},b];
    } else {
      const used = tracks[edge.type === 'retry' ? 'lower' : 'upper'];let track = used.findIndex(last => last <= start);
      if (track < 0) track = used.length;
      used[track] = end;
      const y = edge.type === 'retry' ? bottom + track*20 : top - track*20;
      points = [a,{x:a.x+13,y:a.y},{x:a.x+13,y},{x:b.x-13,y},{x:b.x-13,y:b.y},b];
    }
    const xs=points.map(p=>p.x), py=points.map(p=>p.y);
    const center=points.length===6 ? {x:(points[2].x+points[3].x)/2,y:points[2].y} : {x:(a.x+b.x)/2,y:(a.y+b.y)/2};
    return [{ edge, path:points.map((p,i)=>`${i?'L':'M'} ${p.x} ${p.y}`).join(' '),label:center,
      bounds:{x:Math.min(...xs)-8,y:Math.min(...py)-16,width:Math.max(...xs)-Math.min(...xs)+16,height:Math.max(...py)-Math.min(...py)+32} }];
  });
}
