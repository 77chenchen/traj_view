import type { Graph, GraphNode } from './model';
import type { Box, Point } from './layout';

type Size = (node:GraphNode)=>{width:number;height:number};
const padding=18,header=34;

export function executionPositions(graph:Graph,size:Size){
  const starts=new Map<string,number>(),ends=new Map<string,number>();
  for(const group of graph.groups??[]){
    const first=group.members[0],last=group.members.at(-1)!;
    starts.set(first,(starts.get(first)??0)+1);ends.set(last,(ends.get(last)??0)+1);
  }
  const lane={plan:0,message:0,read:1,shell:1,tool:1,edit:2,validate:3};
  let x=0;
  return new Map(graph.nodes.map(node=>{
    x+=(starts.get(node.id)??0)*padding;
    const point={x:x+size(node).width/2,y:node.view?.kind==='section'?0:lane[node.category]*56};
    x+=size(node).width+48+(ends.get(node.id)??0)*padding;
    return [node.id,point];
  }));
}

export interface SectionBox {node:GraphNode;bounds:Box;anchor:Point}
export function executionBoxes(graph:Graph,positions:Map<string,Point>,size:Size):SectionBox[]{
  const byId=new Map(graph.nodes.map(node=>[node.id,node])),boxes=new Map<string,SectionBox>();
  for(const group of [...graph.groups??[]].sort((a,b)=>b.depth-a.depth)){
    const members=group.members.flatMap(id=>{
      const point=positions.get(id),node=byId.get(id);if(!point||!node)return [];
      return [{x:point.x-size(node).width/2,y:point.y-size(node).height/2,...size(node)}];
    });
    if(!members.length)continue;
    const childBoxes=(graph.groups??[]).filter(child=>child.parent===group.node.id).flatMap(child=>boxes.get(child.node.id)?.bounds??[]);
    const all=[...members,...childBoxes],x=Math.min(...all.map(b=>b.x))-padding,y=Math.min(...all.map(b=>b.y))-header;
    const right=Math.max(...all.map(b=>b.x+b.width))+padding,bottom=Math.max(...all.map(b=>b.y+b.height))+14;
    boxes.set(group.node.id,{node:group.node,bounds:{x,y,width:right-x,height:bottom-y},anchor:{x,y}});
  }
  return [...graph.groups??[]].sort((a,b)=>a.depth-b.depth).flatMap(group=>boxes.get(group.node.id)??[]);
}
