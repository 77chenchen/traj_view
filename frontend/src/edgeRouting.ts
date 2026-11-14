import type { Graph, GraphEdge } from './model';
import type { Box, Point } from './layout';

export interface RoutedEdge { edge: GraphEdge; path: string; bounds: Box; label: Point }

// Forward ports + interval-colored outer channels keep long relationships out
// of node interiors. Routes are shared by the browser and image exports.
export function executionRoutes(graph: Graph, positions: Map<string, Point>, width: number, height: number,
  sizes?:ReadonlyMap<string,{width:number;height:number}>,containers:Box[]=[]): RoutedEdge[] {
  const ordinals = new Map(graph.nodes.map((node,i) => [node.id,i]));
  const left = Math.min(0,...[...positions].map(([id,p])=>p.x-(sizes?.get(id)?.width??width)/2),...containers.map(b=>b.x)) - 38;
  const right = Math.max(0,...[...positions].map(([id,p])=>p.x+(sizes?.get(id)?.width??width)/2),...containers.map(b=>b.x+b.width)) + 38;
  const tracks: Record<string, number[]> = { upper: [], lower: [] };
  return [...graph.edges].sort((a,b) => (ordinals.get(a.source) ?? 0)-(ordinals.get(b.source) ?? 0) || (ordinals.get(a.target) ?? 0)-(ordinals.get(b.target) ?? 0)).flatMap(edge => {
    const from = positions.get(edge.source), to = positions.get(edge.target);
    if (!from || !to || to.y <= from.y) return [];
    const a = { x: from.x, y: from.y + (sizes?.get(edge.source)?.height??height) / 2 + 1 };
    const b = { x: to.x, y: to.y - (sizes?.get(edge.target)?.height??height) / 2 - 7 };
    const start = ordinals.get(edge.source)!, end = ordinals.get(edge.target)!;
    let points: Point[];
    if (edge.type === 'temporal' && end === start + 1) {
      const middle = (a.y+b.y)/2;
      points = [a,{x:a.x,y:middle},{x:b.x,y:middle},b];
    } else {
      const used = tracks[edge.type === 'retry' ? 'lower' : 'upper'];let track = used.findIndex(last => last <= start);
      if (track < 0) track = used.length;
      used[track] = end;
      const x = edge.type === 'retry' ? right + track*16 : left - track*16;
      points = [a,{x:a.x,y:a.y+13},{x,y:a.y+13},{x,y:b.y-13},{x:b.x,y:b.y-13},b];
    }
    const xs=points.map(p=>p.x), py=points.map(p=>p.y);
    const center=points.length===6 ? {x:points[2].x,y:(points[2].y+points[3].y)/2} : {x:(a.x+b.x)/2,y:(a.y+b.y)/2};
    return [{ edge, path:points.map((p,i)=>`${i?'L':'M'} ${p.x} ${p.y}`).join(' '),label:center,
      bounds:{x:Math.min(...xs)-8,y:Math.min(...py)-16,width:Math.max(...xs)-Math.min(...xs)+16,height:Math.max(...py)-Math.min(...py)+32} }];
  });
}
