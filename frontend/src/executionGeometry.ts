import type { Graph, GraphNode } from './model';
import type { Box, Point } from './layout';

type Size = (node:GraphNode)=>{width:number;height:number};
const padding=38,header=64;

// Every row reads left → right, then down. A row is a reading aid, never a
// parallel execution lane. Expanded semantic intervals occupy their own band;
// nested bands stay inside the parent instead of replacing the canvas.
export function executionPositions(graph:Graph,size:Size,columns=3,availableWidth?:number){
  const positions=new Map<string,Point>();
  const groups=graph.groups??[],gap=48,rowGap=56;
  const widest=Math.max(164,...graph.nodes.map(node=>size(node).width));
  const width=Math.max(widest,Math.min(availableWidth??Math.max(1,columns)*(widest+gap)-gap+padding*2,5*(widest+gap)-gap+padding*2));
  function pack(ids:readonly string[],parent:string|undefined,left:number,top:number,available:number):number{
    const children=groups.filter(group=>group.parent===parent);
    const firsts=new Map(children.map(group=>[group.members[0],group]));
    const covered=new Set(children.flatMap(group=>group.members));
    const byId=new Map(graph.nodes.map(node=>[node.id,node]));
    let y=top,row:GraphNode[]=[],used=0;
    function flush(){
      if(!row.length)return;
      const height=Math.max(...row.map(node=>size(node).height));
      const rowWidth=row.reduce((sum,node)=>sum+size(node).width,0)+(row.length-1)*gap;
      let x=left+(available-rowWidth)/2;
      for(const node of row){const box=size(node);positions.set(node.id,{x:x+box.width/2,y:y+30+height/2});x+=box.width+gap;}
      y+=height+36+rowGap;row=[];used=0;
    }
    for(const id of ids){
      const group=firsts.get(id);
      if(group){
        flush();
        y=pack(group.members,group.node.id,left+padding,y+header,Math.max(widest,available-2*padding))+padding;
      }else if(!covered.has(id)){
        const node=byId.get(id);if(!node)continue;
        if(row.length&&(row.length>=5||used+gap+size(node).width>available))flush();
        used+=(row.length?gap:0)+size(node).width;row.push(node);
      }
    }
    flush();return y;
  }
  pack(graph.nodes.map(node=>node.id),undefined,-width/2,0,width);
  return positions;
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
