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
let scopes=0,paths=0,routes=0,maxDepth=0;
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
    const sizes=new Map(g.nodes.map(n=>[n.id,n.view?{width:220,height:104}:{width:164,height:48}]));
    let x=0;
    const positions=new Map(g.nodes.map((n,i)=>{if(i)x+=(sizes.get(g.nodes[i-1].id).width+sizes.get(n.id).width)/2+48;return [n.id,{x,y:n.view?0:(i%3)*56}];}));
    const drawn=executionRoutes(g,positions,164,48,sizes);assert.equal(drawn.length,g.edges.length);
    for(const r of drawn){
      const points=[...r.path.matchAll(/[ML] ([\d.e+-]+) ([\d.e+-]+)/g)].map(x=>({x:+x[1],y:+x[2]}));
      assert.ok(points.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)));
      for(let i=1;i<points.length;i++){
        const a=points[i-1],b=points[i];assert.ok(a.x===b.x||a.y===b.y);assert.ok(b.x>=a.x,'All route segments preserve forward x');
        for(const n of g.nodes.filter(n=>n.id!==r.edge.source&&n.id!==r.edge.target)){
          const p=positions.get(n.id),size=sizes.get(n.id),left=p.x-size.width/2,right=p.x+size.width/2,top=p.y-size.height/2,bottom=p.y+size.height/2;
          assert.ok(!(a.x===b.x?a.x>left&&a.x<right&&Math.max(a.y,b.y)>top&&Math.min(a.y,b.y)<bottom:a.y>top&&a.y<bottom&&Math.max(a.x,b.x)>left&&Math.min(a.x,b.x)<right),'No edge crosses a node interior');
        }
      }
      routes++;
    }
    scopes++;
    for(const n of g.nodes)if(n.view)visit({start:n.view.start,end:n.view.end});
  }
  visit();
  for(const n of nodes){const path=executionPath(source,n.first_idx);assert.ok(path.length<=12,'Navigation remains bounded on a 2,000-step alternating stream');maxDepth=Math.max(maxDepth,path.length);const leaf=executionGraph(source,path.at(-1));assert.ok(leaf.nodes.some(x=>x.id===n.id&&!x.view));paths++;}
  assert.equal(JSON.stringify(source),before,'Projection never mutates v1 source');
}

// Unequal content regions must drive boundaries, not n/3 or n/4. Keep source
// indices as decimal strings beyond Number.MAX_SAFE_INTEGER.
const commands=[...Array(11).fill("sed -n '1,50p' tests/test_example.py"),...Array(3).fill('python -m pip install -e .'),...Array(7).fill('apply_patch'),...Array(5).fill('python -m pytest'),...Array(2).fill('Final')];
const semanticNodes=commands.map((command,i)=>{const idx=String(9007199254741993n+BigInt(i*71));return {id:'semantic-'+idx,label:'Recorded call',signature:command,tool:'shell',category:'shell',phase:'other',phase_counts:{other:1},count:1,first_idx:idx,step_indices:[idx],error:i===21};});
const semanticSteps=semanticNodes.map((n,i)=>({idx:n.first_idx,tags:i>=26?['final_message']:[],action:i>=26?null:{tool:i>=14&&i<21?'apply_patch':'shell',command:commands[i],targets:i>=14&&i<21?['src/example.py']:[]}}));
const semanticSource={nodes:semanticNodes,edges:semanticNodes.flatMap((n,i)=>i?[{id:'t'+i,source:semanticNodes[i-1].id,target:n.id,type:'temporal',count:1},...(i===22?[{id:'r22',source:semanticNodes[21].id,target:n.id,type:'retry',count:1}]:[])]:[])};
const semanticBefore=JSON.stringify([semanticSource,semanticSteps]),semanticRoot=executionGraph(semanticSource,undefined,semanticSteps);
assert.equal(semanticRoot.nodes[0].view.end,11,'Reading test files is its own recorded activity, not running tests');
assert.match(semanticRoot.nodes[0].label,/Inspect/);
assert.match(semanticRoot.nodes[0].view.summary.focus,/^cmd: test_example.py/);
assert.match(semanticRoot.nodes[0].view.summary.basis,/not confirmed file access/);
const pure=new Set();let sectionCount=0;
function inspectSummary(scope){
  for(const n of executionGraph(semanticSource,scope,semanticSteps).nodes){
    if(!n.view)continue;
    const s=n.view.summary;assert.ok(s&&s.focus&&s.basis);assert.ok(!/^Steps?\s+\d/i.test(n.label));
    assert.equal(s.activities.reduce((total,a)=>total+a.count,0),n.count);
    assert.deepEqual(s.activities.flatMap(a=>a.indices).sort(),[...n.step_indices].sort());
    for(const example of s.examples)assert.ok(n.step_indices.includes(example.index));
    if(s.activities.length===1)pure.add(s.activities[0].label);
    if(n.view.start===21&&n.view.end>=23)assert.equal(s.retries,1);
    sectionCount++;inspectSummary(n.view);
  }
}
inspectSummary();assert.ok(sectionCount>5);
for(const activity of ['Inspect files','Edit files','Run checks','Final response'])assert.ok(pure.has(activity),activity);
for(const n of semanticNodes){const path=executionPath(semanticSource,n.first_idx,semanticSteps);assert.ok(executionGraph(semanticSource,path.at(-1),semanticSteps).nodes.some(leaf=>!leaf.view&&leaf.id===n.id));}
assert.equal(JSON.stringify([semanticSource,semanticSteps]),semanticBefore);

// The same signature in two nonconsecutive runs cannot become one section.
const reads=semanticNodes.slice(0,11).map(n=>({...n,category:'read',phase:'localize'}));
const repeated={nodes:reads.concat(semanticNodes.slice(14,21).map(n=>({...n,category:'edit',phase:'edit'})),reads.map(n=>({...n,id:n.id+'-again',first_idx:String(BigInt(n.first_idx)+100000n),step_indices:[String(BigInt(n.first_idx)+100000n)]}))),edges:[]};
const readSections=executionGraph(repeated).nodes.filter(n=>n.view?.summary?.activities.some(a=>a.label==='Inspect files'));
assert.ok(readSections.length>=2);
assert.ok(readSections.every(n=>!n.step_indices.some(idx=>semanticNodes.slice(14,21).some(edit=>edit.first_idx===idx))));

// Recorded Python imports give repeated scripts a subject without claiming
// that the script passed a test or inferring files from string mentions.
const scriptSource={nodes:semanticNodes.slice(0,20).map((n,i)=>({...n,id:'python-'+i,signature:'python-',error:false})),edges:[]};
const scriptSteps=scriptSource.nodes.map(n=>({idx:n.first_idx,tags:[],action:{tool:'shell',command:"python - <<'PY'\nfrom example_retry import retry\nprint(retry)\nPY",targets:[]}}));
const scriptGroups=executionGraph(scriptSource,undefined,scriptSteps);
for(const n of scriptGroups.nodes){assert.match(n.label,/Repeat.*Python.*example_retry/);assert.equal(n.view.summary.activities[0].label,'Run commands');}
const fallback=executionGraph({nodes:semanticNodes.slice(0,9).map(n=>({...n,signature:'unrecorded',category:'tool',tool:null})),edges:[]});
assert.ok(fallback.nodes.every(n=>n.view.summary.basis.includes('Continuation batch')));
const subjectPaths=[...Array(8).fill('core.py'),...Array(3).fill('main.py'),...Array(19).fill('utils.py')];
const subjectGraph={nodes:subjectPaths.map((_,i)=>({...semanticNodes[0],id:'subject-'+i,first_idx:String(i),step_indices:[String(i)],signature:'read',category:'read'})),edges:[]};
const subjectSteps=subjectPaths.map((path,i)=>({idx:String(i),tags:[],action:{tool:'shell',command:'cat src/'+path,targets:[]}}));
assert.deepEqual(executionGraph(subjectGraph,undefined,subjectSteps).nodes.map(n=>[n.view.start,n.view.end]),[[0,8],[8,11],[11,30]],'Read subjects create unequal, source-contiguous content regions');
console.log(`PASS semantic execution map: ${scopes} scopes, ${paths} exact source paths, ${routes} obstacle-free mixed-size routes, ${sectionCount} evidence summaries; max depth ${maxDepth}`);
