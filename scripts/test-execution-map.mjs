import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {frontendRequire,root} from './frontend-dependencies.mjs';
const ts=frontendRequire('typescript');
const load=async name=>{
  const code=ts.transpileModule(readFileSync(join(root,'frontend/src',name),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
  return import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
};
const {executionGraph,executionPath}=await load('executionMap.ts');
const {executionRoutes}=await load('edgeRouting.ts');
let scopes=0,paths=0,routes=0;
for(const size of [0,1,8,9,60,87,172,324,500,2000]){
  const nodes=Array.from({length:size},(_,i)=>{const idx=String(9007199254740993n+BigInt(i*37));return{id:'step-'+idx,label:'Synthetic call '+i,signature:JSON.stringify(['read',i%7]),tool:'read',category:i%3?'read':'edit',phase:i%3?'localize':'edit',count:1,first_idx:idx,step_indices:[idx],error:i%17===0,phase_counts:{[i%3?'localize':'edit']:1}};});
  const edges=nodes.flatMap((node,i)=>i?[{id:'t'+i,source:nodes[i-1].id,target:node.id,type:'temporal',count:1},...(i>3?[{id:'d'+i,source:nodes[i-4].id,target:node.id,type:'dependency',count:1}]:[]),...(i%17===1?[{id:'r'+i,source:nodes[i-1].id,target:node.id,type:'retry',count:1}]:[])]:[]);
  const source={nodes,edges},before=JSON.stringify(source);
  function visit(scope){
    const g=executionGraph(source,scope),start=scope?.start??0,end=scope?.end??size;
    assert.ok(g.nodes.length<=4);assert.deepEqual(g.nodes.flatMap(n=>n.step_indices),nodes.slice(start,end).map(n=>n.first_idx));
    const ids=new Map(g.nodes.map((n,i)=>[n.id,i]));
    for(const e of g.edges)assert.ok(ids.has(e.source)&&ids.has(e.target)&&ids.get(e.source)<ids.get(e.target));
    // Forward endpoints give a complete topological order, also after filtering.
    for(const filtered of [g.nodes,g.nodes.filter(n=>n.error),[]]){
      const keep=new Set(filtered.map(n=>n.id));for(const e of g.edges.filter(e=>keep.has(e.source)&&keep.has(e.target)))assert.ok(ids.get(e.source)<ids.get(e.target));
    }
    const positions=new Map(g.nodes.map((n,i)=>[n.id,{x:i*200,y:n.view?0:(i%3)*56}]));
    const drawn=executionRoutes(g,positions,164,48);assert.equal(drawn.length,g.edges.length);
    for(const r of drawn){
      const points=[...r.path.matchAll(/[ML] ([\d.e+-]+) ([\d.e+-]+)/g)].map(x=>({x:+x[1],y:+x[2]}));
      assert.ok(points.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)));
      for(let i=1;i<points.length;i++){
        const a=points[i-1],b=points[i];assert.ok(a.x===b.x||a.y===b.y);assert.ok(b.x>=a.x,'All route segments preserve forward x');
        for(const n of g.nodes.filter(n=>n.id!==r.edge.source&&n.id!==r.edge.target)){
          const p=positions.get(n.id),left=p.x-82,right=p.x+82,top=p.y-24,bottom=p.y+24;
          assert.ok(!(a.x===b.x?a.x>left&&a.x<right&&Math.max(a.y,b.y)>top&&Math.min(a.y,b.y)<bottom:a.y>top&&a.y<bottom&&Math.max(a.x,b.x)>left&&Math.min(a.x,b.x)<right),'No edge crosses a node interior');
        }
      }
      routes++;
    }
    scopes++;
    for(const n of g.nodes)if(n.view)visit({start:n.view.start,end:n.view.end});
  }
  visit();
  for(const n of nodes){const path=executionPath(source,n.first_idx);assert.ok(path.length<8);const leaf=executionGraph(source,path.at(-1));assert.ok(leaf.nodes.some(x=>x.id===n.id&&!x.view));paths++;}
  assert.equal(JSON.stringify(source),before,'Projection never mutates v1 source');
}
console.log(`PASS execution map: ${scopes} scopes, ${paths} exact source paths, ${routes} obstacle-free forward routes`);
