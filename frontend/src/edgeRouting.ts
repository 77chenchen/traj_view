import type { Graph, GraphEdge } from './model';
import type { Box, Point } from './layout';

export interface RoutedEdge {
  edge: GraphEdge; path: string; bounds: Box; label: Point;
  continuation?: { number: number; exit: Point; entry: Point };
}

// Forward ports + interval-colored outer channels keep long relationships out
// of node interiors. Routes are shared by the browser and image exports.
export function executionRoutes(graph: Graph, positions: Map<string, Point>, width: number, height: number,
  sizes?:ReadonlyMap<string,{width:number;height:number}>,containers:Box[]=[],readingRows=false): RoutedEdge[] {
  const ordinals = new Map(graph.nodes.map((node,i) => [node.id,i]));
  const left = Math.min(0,...[...positions].map(([id,p])=>p.x-(sizes?.get(id)?.width??width)/2),...containers.map(b=>b.x)) - 38;
  const right = Math.max(0,...[...positions].map(([id,p])=>p.x+(sizes?.get(id)?.width??width)/2),...containers.map(b=>b.x+b.width)) + 38;
  const tracks: Record<string, number[]> = { upper: [], lower: [] };
  const rowTracks=new Map<string,number[]>();
  const rowHeights=new Map<number,number>();
  for(const [id,p]of positions)rowHeights.set(p.y,Math.max(rowHeights.get(p.y)??0,(sizes?.get(id)?.height??height)/2));
  let continuationNumber=0;
  return [...graph.edges].sort((a,b) => (ordinals.get(a.source) ?? 0)-(ordinals.get(b.source) ?? 0) || (ordinals.get(a.target) ?? 0)-(ordinals.get(b.target) ?? 0)).flatMap(edge => {
    const from = positions.get(edge.source), to = positions.get(edge.target);
    if (!from || !to || (ordinals.get(edge.target)??-1)<=(ordinals.get(edge.source)??-1)) return [];
    const sameRow=readingRows&&Math.abs(to.y-from.y)<.1;
    if(!sameRow&&to.y<=from.y)return [];
    const fromHeight=sizes?.get(edge.source)?.height??height,toHeight=sizes?.get(edge.target)?.height??height;
    const a = { x: from.x, y: from.y + fromHeight / 2 + 1 };
    const b = { x: to.x, y: to.y - toHeight / 2 - 7 };
    const exitY=from.y+(readingRows?rowHeights.get(from.y)!:fromHeight/2)+16;
    const entryY=to.y-(readingRows?rowHeights.get(to.y)!:toHeight/2)-20;
    const start = ordinals.get(edge.source)!, end = ordinals.get(edge.target)!;
    let points: Point[],continuation:RoutedEdge['continuation'];
    if(sameRow&&edge.type==='temporal'&&end===start+1){
      points=[{x:from.x+(sizes?.get(edge.source)?.width??width)/2+1,y:from.y},
        {x:to.x-(sizes?.get(edge.target)?.width??width)/2-7,y:to.y}];
    }else if(sameRow){
      const below=edge.type==='retry',key=`${from.y}:${below}`,used=rowTracks.get(key)??[];
      let track=used.findIndex(last=>last<=start);if(track<0)track=used.length;used[track]=end;rowTracks.set(key,used);
      const side=below?1:-1;
      const ay=from.y+side*(fromHeight/2+1),by=to.y+side*(toHeight/2+7);
      const y=from.y+side*(rowHeights.get(from.y)!+20+track*10);
      points=[{x:from.x,y:ay},{x:from.x,y},{x:to.x,y},{x:to.x,y:by}];
    }else if (edge.type === 'temporal' && end === start + 1) {
      if(readingRows){
        // Matching endpoints replace the long return stroke between reading
        // rows. They are one recorded edge, never an inferred connection.
        const sourceRight=from.x+(sizes?.get(edge.source)?.width??width)/2;
        const targetLeft=to.x-(sizes?.get(edge.target)?.width??width)/2;
        continuation={number:++continuationNumber,exit:{x:sourceRight+26,y:from.y},entry:{x:targetLeft-26,y:to.y}};
        points=[{x:sourceRight+1,y:from.y},{x:continuation.exit.x-10,y:from.y},
          {x:continuation.entry.x+10,y:to.y},{x:targetLeft-7,y:to.y}];
      }else{
        const middle=(a.y+b.y)/2;
        points = [a,{x:a.x,y:middle},{x:b.x,y:middle},b];
      }
    } else {
      const used = tracks[edge.type === 'retry' ? 'lower' : 'upper'];let track = used.findIndex(last => last <= start);
      if (track < 0) track = used.length;
      used[track] = end;
      const x = edge.type === 'retry' ? right + track*16 : left - track*16;
      points = [a,{x:a.x,y:exitY},{x,y:exitY},{x,y:entryY},{x:b.x,y:entryY},b];
    }
    const xs=points.map(p=>p.x), py=points.map(p=>p.y);
    const center=points.length===6 ? {x:points[2].x,y:(points[2].y+points[3].y)/2} : {x:(points[0].x+points.at(-1)!.x)/2,y:points.length===4?points[1].y:points[0].y};
    if(continuation){xs.push(continuation.exit.x+10,continuation.entry.x-10);py.push(continuation.exit.y-10,continuation.entry.y+10);}
    return [{ edge, path:points.map((p,i)=>`${!i||(continuation&&i===2)?'M':'L'} ${p.x} ${p.y}`).join(' '),label:center,continuation,
      bounds:{x:Math.min(...xs)-8,y:Math.min(...py)-16,width:Math.max(...xs)-Math.min(...xs)+16,height:Math.max(...py)-Math.min(...py)+32} }];
  });
}
