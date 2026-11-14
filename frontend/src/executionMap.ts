import type { Category, ExecutionSummary, Graph, GraphEdge, GraphNode, Step, StepIndex } from './model';

export interface ExecutionScope { start: number; end: number }
export const executionThreshold = 60;
export const executionLeafSize = 4;
const sectionLimit = 3;
type Activity = 'inspect' | 'edit' | 'validate' | 'setup' | 'execute' | 'plan' | 'message' | 'complete';
const names: Record<Activity, string> = {inspect:'Inspect files',edit:'Edit files',validate:'Run checks',setup:'Install / configure',execute:'Run commands',plan:'Recorded plan',message:'Recorded text',complete:'Final response'};
const shortNames: Record<Activity, string> = {inspect:'inspect',edit:'edit',validate:'check',setup:'setup',execute:'execute',plan:'plan',message:'text',complete:'final'};
const categoryFor: Record<Activity,Category> = {inspect:'read',edit:'edit',validate:'validate',setup:'shell',execute:'shell',plan:'plan',message:'message',complete:'message'};
interface Feature { node: GraphNode; activity: Activity; family: string; targets: string[]; subject: string; preview: string }
interface Cluster extends ExecutionScope {
  size: number; intents: Record<string,number>; families: Record<string,number>; targets: Record<string,number>;
  signature: string | null; cost: number; left?: Cluster; right?: Cluster;
  navigation: boolean;
}

// Inspect the invocation line only. Mentioning pytest in a read command does
// not mean executing pytest; shell wrappers and prefixes are not activities.
function invocation(command: string): string[] {
  const line=command.replace(/^\s*(?:\/[^\s]+\/)?(?:zsh|bash|sh)\s+-[a-z]*c\s+['"]?/,'').split('\n')[0];
  const tokens=line.match(/"(?:\\.|[^"\\])*"|'[^']*'|&&|\|\||[;|]|[^\s;|]+/g) ?? [];
  const groups: string[][]=[[]];
  for(const token of tokens){if(['&&','||',';','|'].includes(token))groups.push([]);else groups.at(-1)!.push(token.replace(/^['"]|['"]$/g,''));}
  for(const group of groups){
    const clean=group.filter(token=>!/^\w+=/.test(token));
    if(!clean.length||['cd','source','.','export','printf','echo'].includes(clean[0]))continue;
    if(clean[0]==='env')clean.shift();
    return clean.map((token,i)=>i===0?token.split('/').at(-1)!.replace(/^['"]|['"]$/g,''):token);
  }
  return [];
}
function pythonModules(command:string){
  // A literal import is a useful subject label for a saved heredoc. It does not
  // establish what the script achieved, or classify an ad-hoc script as a test.
  return [...new Set([...command.matchAll(/^\s*(?:from\s+([\w.]+)\s+import\s|import\s+([\w.]+))/gm)]
    .map(match=>(match[1]??match[2]).split('.')[0]))].slice(0,3);
}
function feature(node: GraphNode,step?: Step): Feature {
  const action=step?.action,command=action?.command??'',words=invocation(command),executable=words[0]??'';
  const tool=(action?.tool??node.tool??'').toLowerCase();
  let activity:Activity='execute',family=executable||tool||'record';
  if(step?.tags.includes('final_message')||node.phase==='finalize')activity='complete';
  else if(!action&&(node.category==='message'||node.category==='plan'))activity=node.category==='plan'?'plan':'message';
  else if(node.category==='edit'||node.phase==='edit'||/^(?:apply_patch|write_file|edit|str_replace|replace)$/.test(tool))activity='edit';
  else if(['cat','sed','head','tail','rg','grep','find','ls','pwd','stat','nl','less','wc'].includes(executable))activity='inspect';
  else if(executable==='git'&&['diff','show','log','status','branch','ls-files'].includes(words[1]))activity='inspect';
  else if(/^(?:pip\d*|pipx|conda)$/.test(executable)||['uv','poetry','npm','pnpm','yarn','bun'].includes(executable)&&words.some(w=>['install','sync','venv','add'].includes(w)))activity='setup';
  else if(/^python[\d.]*$/.test(executable)&&words.includes('-m')&&/^pip\d*$/.test(words[words.indexOf('-m')+1]??''))activity='setup';
  else if(node.category==='validate'||node.phase==='validate'||/^(?:pytest|unittest|vitest|jest|tox|nox|ruff|mypy)$/.test(executable)||
    /^python[\d.]*$/.test(executable)&&words.includes('-m')&&/^(?:pytest|unittest|ruff|mypy)$/.test(words[words.indexOf('-m')+1]??'')||
    ['npm','pnpm','yarn','bun','cargo','go','make'].includes(executable)&&words.slice(1,4).some(w=>/^(?:test|check|lint|build)$/.test(w)))activity='validate';
  else if(node.category==='read'||node.phase==='localize'||node.phase==='orient'||node.phase==='skill_read')activity='inspect';
  else if(node.category==='plan')activity='plan';
  if(/^python[\d.]*$/.test(executable)){
    const modules=pythonModules(command);
    family=words.includes('-m')?'python -m '+(words[words.indexOf('-m')+1]??''):modules.length?'Python · '+modules.slice(0,2).join(', '):'Python script';
  }
  else if(['npm','pnpm','yarn','uv','git','make'].includes(executable))family=[executable,...words.slice(1,3).filter(w=>!w.startsWith('-'))].join(' ');
  const targets=[...new Set(action?.targets??[])];
  // A saved read-command operand is a subject, not a confirmed file touch.
  // Keep it separate from explicit targets throughout the projection.
  const subject=activity==='inspect'?words.slice(1).filter(w=>!w.startsWith('-')&&/^[\w@./-]+\.[a-z\d]{1,8}$/i.test(w)).at(-1)??'':'';
  return {node,activity,family,targets,subject,preview:(command.split('\n')[0]||targets[0]||step?.thought?.split('\n')[0]||node.label||tool||'Evidence unrecorded').replace(/\s+/g,' ').slice(0,180)};
}
// A change point is useful only when the distributions of recorded operations
// on its two sides differ. Gini gain ignores one-off unique paths and does not
// turn arbitrary shell argument text into semantic intent. Running squared
// counts let us score every possible boundary in linear time per tree level.
class Distribution {
  left:Record<string,number>={}; right:Record<string,number>={};
  leftSquares=0; rightSquares=0; totalSquares=0;
  constructor(values:string[]){
    for(const value of values)this.right[value]=(this.right[value]??0)+1;
    this.rightSquares=this.totalSquares=Object.values(this.right).reduce((s,n)=>s+n*n,0);
  }
  move(value:string){
    const a=this.left[value]??0,b=this.right[value];
    this.left[value]=a+1;this.right[value]=b-1;
    this.leftSquares+=2*a+1;this.rightSquares+=1-2*b;
  }
  gain(a:number,b:number){const n=a+b;return this.leftSquares/(a*n)+this.rightSquares/(b*n)-this.totalSquares/(n*n);}
}
interface Index { features:Feature[]; root?:Cluster; ranges:Map<string,Cluster>; summaries:Map<string,GraphNode>; ordinals:Map<string,number> }
const cache=new WeakMap<Graph,{steps:readonly Step[]|undefined;index:Index}[]>();
const key=(range:ExecutionScope)=>range.start+':'+range.end;
function tree(features:Feature[],retryPairs:Set<string>,ranges:Map<string,Cluster>){
  if(!features.length)return undefined;
  function build(start:number,end:number,navigation=false):Cluster{
    const members=features.slice(start,end),size=end-start;
    const histogram=(values:string[])=>{const out:Record<string,number>={};for(const value of values)out[value]=(out[value]??0)+1;return out;};
    const cluster:Cluster={start,end,size,navigation,intents:histogram(members.map(f=>f.activity)),families:histogram(members.map(f=>f.family)),targets:histogram(members.flatMap(f=>f.targets)),signature:members.every(f=>f.node.signature===members[0].node.signature)?members[0].node.signature:null,cost:0};
    ranges.set(key(cluster),cluster);
    if(size<=executionLeafSize)return cluster;
    const values=[members.map(f=>f.activity),members.map(f=>f.family),members.map(f=>f.targets.length?[...f.targets].sort().join('\0'):f.subject)];
    const distributions=values.map(v=>new Distribution(v)),weights=[6,1.7,.9];
    let split=start+Math.floor(size/2),best=0;
    for(let i=0;i<size-1;i++){
      distributions.forEach((d,j)=>d.move(values[j][i]));
      const a=i+1,b=size-a;
      // Bound navigation depth in adversarial alternating streams. This guard
      // only excludes tiny tails; it never divides a section into equal thirds.
      if(Math.min(a,b)<Math.floor(size/16))continue;
      let gain=distributions.reduce((s,d,j)=>s+weights[j]*d.gain(a,b),0);
      if(members[i].node.signature===members[i+1].node.signature)gain*=.6;
      if(retryPairs.has(members[i].node.id+'\0'+members[i+1].node.id))gain*=.75;
      gain*=.7+.3*4*a*b/(size*size);
      if(gain>best){best=gain;split=start+a;}
    }
    const continuation=best<.12;
    if(continuation)split=start+Math.floor(size/2);
    cluster.cost=continuation?size*1e-9:best;
    cluster.left=build(start,split,continuation);cluster.right=build(split,end,continuation);
    return cluster;
  }
  return build(0,features.length);
}
function indexFor(source:Graph,steps?:readonly Step[]):Index{
  const old=cache.get(source)?.find(entry=>entry.steps===steps);if(old)return old.index;
  const byStep=new Map(steps?.map(step=>[String(step.idx),step]));
  const features=source.nodes.map(node=>feature(node,byStep.get(String(node.first_idx))));
  const ranges=new Map<string,Cluster>(),retryPairs=new Set(source.edges.filter(e=>e.type==='retry').map(e=>e.source+'\0'+e.target));
  const index:Index={features,ranges,summaries:new Map(),ordinals:new Map(source.nodes.map((n,i)=>[n.id,i]))};
  index.root=tree(features,retryPairs,ranges);
  const entries=cache.get(source)??[];cache.set(source,[...entries.slice(-1),{steps,index}]);return index;
}
function clusterFor(index:Index,scope?:ExecutionScope){return scope?index.ranges.get(key(scope)):index.root;}
function children(cluster:Cluster){
  const parts=[cluster];
  while(parts.length<sectionLimit){
    let next=-1;for(let i=0;i<parts.length;i++)if(parts[i].left&&(next<0||parts[i].cost>parts[next].cost))next=i;
    if(next<0)break;const node=parts[next];parts.splice(next,1,node.left!,node.right!);
  }
  return parts;
}
function section(source:Graph,index:Index,cluster:Cluster):GraphNode{
  const existing=index.summaries.get(key(cluster));if(existing)return existing;
  const members=index.features.slice(cluster.start,cluster.end),first=members[0].node;
  const ranked=Object.entries(cluster.intents).sort((a,b)=>b[1]-a[1]),dominant=ranked[0][0] as Activity;
  const activities=ranked.map(([activity,count])=>({label:names[activity as Activity],count,indices:members.filter(f=>f.activity===activity).map(f=>f.node.first_idx)}));
  const families=Object.entries(cluster.families).sort((a,b)=>b[1]-a[1]).map(([name])=>name);
  const targets=Object.entries(cluster.targets).sort((a,b)=>b[1]-a[1]).map(([name])=>name);
  const subjects=[...new Set(members.map(f=>f.subject).filter(Boolean))];
  const repeated=cluster.signature!=null&&cluster.size>1;
  const ordered=[...new Set(members.map(f=>f.activity))].filter(a=>a!=='message'&&a!=='plan');
  let title=names[dominant];
  if(dominant==='inspect'&&subjects.length===1)title='Inspect · '+subjects[0].split('/').at(-1);
  if(dominant==='execute'&&ranked[0][1]>=cluster.size*.75)title=families[0]==='record'?'Tool activity · unrecorded':'Run '+families[0];
  else if(dominant==='validate'&&ranked[0][1]>=cluster.size*.75)title=families[0]&&families[0]!=='record'?'Check · '+families[0]:'Run validation';
  if(ordered.length>1){
    const priority=(a:Activity)=>a===dominant?5:a==='edit'||a==='validate'?4:a==='inspect'||a==='setup'?3:1;
    const keep=new Set([...ordered].sort((a,b)=>priority(b)-priority(a)).slice(0,3));
    const labels:Record<Activity,string>={inspect:'inspect',edit:'edit',validate:'check',setup:'setup',execute:families.some(f=>f.startsWith('Python'))?'run Python':'execute',plan:'plan',message:'text',complete:'final'};
    title=ordered.filter(a=>keep.has(a)).map(a=>labels[a]).join(' · ');
    title=title[0].toUpperCase()+title.slice(1);
  }
  if(repeated)title='Repeat · '+title.replace(/^Run /,'');
  const phase_counts:Record<string,number>={};for(const {node}of members)for(const [phase,n]of Object.entries(node.phase_counts))phase_counts[phase]=(phase_counts[phase]??0)+n;
  const phase=Object.keys(phase_counts).sort((a,b)=>phase_counts[b]-phase_counts[a])[0]??first.phase;
  const failures=members.filter(f=>f.node.error).length;
  const retries=source.edges.filter(e=>e.type==='retry'&&(index.ordinals.get(e.source)??-1)>=cluster.start&&(index.ordinals.get(e.target)??Infinity)<cluster.end).reduce((sum,e)=>sum+e.count,0);
  const examples=[members[0],members.find(f=>f.node.error),members.find(f=>f.activity==='edit'),members.at(-1)].filter((f):f is Feature=>!!f);
  const targetLabel=targets.slice(0,2).map(path=>path.split(/[\\/]/).at(-1)).join(', ')+(targets.length>2?` +${targets.length-2}`:'');
  const subjectLabel=subjects.length?'cmd: '+subjects.slice(0,2).map(s=>s.split('/').at(-1)).join(', ')+(subjects.length>2?` +${subjects.length-2}`:''):'';
  const textActivity=['message','plan','complete'].includes(dominant);
  const summary:ExecutionSummary={description:ranked.map(([a,n])=>`${n} ${shortNames[a as Activity]}`).join(' · '),focus:targetLabel?[dominant==='execute'?families[0]:null,targetLabel].filter(Boolean).join(' · '):subjectLabel||(textActivity?members.find(f=>f.activity===dominant)!.preview:families[0]==='record'?'Command and file targets unrecorded':families.slice(0,2).join(' · ')),
    basis:(cluster.navigation?'Continuation batch: no strong change in recorded activity was found here. Batches keep calls reachable; they are not separate inferred sub-tasks.':repeated?'Adjacent records share a normalized action. Commands may still differ; the original calls remain separate inside.':'Content boundaries use changes in recorded activity, command families, literal Python imports and file subjects. Labels describe operations, not inferred intent or causation.')+(subjects.length?' “cmd:” paths are literal command operands, not confirmed file access.':''),
    repeated,activities,examples:[...new Map(examples.map(f=>[f.node.id,{index:f.node.first_idx,label:f.preview}])).values()],failures,retries};
  const node:GraphNode={...first,id:`section-${first.id}-${members.at(-1)!.node.id}`,label:title,tool:null,category:categoryFor[dominant],signature:JSON.stringify(['activity-section',first.id,members.at(-1)!.node.id]),count:members.length,step_indices:members.flatMap(f=>f.node.step_indices),phase,phase_counts,error:failures>0,
    view:{kind:'section',depth:0,open:false,start:cluster.start,end:cluster.end,errors:failures,summary}};
  index.summaries.set(key(cluster),node);return node;
}
export function executionSection(source:Graph,scope:ExecutionScope,steps?:readonly Step[]){const index=indexFor(source,steps),cluster=clusterFor(index,scope);return cluster?section(source,index,cluster):undefined;}
export function executionPath(source:Graph,idx:StepIndex,steps?:readonly Step[]):ExecutionScope[]{
  const index=indexFor(source,steps),ordinal=source.nodes.findIndex(n=>String(n.first_idx)===String(idx)),path:ExecutionScope[]=[];
  if(ordinal<0)return path;let cluster=index.root;
  while(cluster&&cluster.size>executionLeafSize){const next=children(cluster).find(part=>part.start<=ordinal&&ordinal<part.end)!;if(next.size===1)break;path.push({start:next.start,end:next.end});cluster=next;}
  return path;
}
export function executionGraph(source:Graph,scope?:ExecutionScope,steps?:readonly Step[]):Graph{
  const index=indexFor(source,steps),cluster=clusterFor(index,scope);if(!cluster)return {nodes:[],edges:[]};
  const nodes=cluster.size<=executionLeafSize?source.nodes.slice(cluster.start,cluster.end):children(cluster).map(part=>part.size===1?source.nodes[part.start]:section(source,index,part));
  const representative=new Map<string,string>();
  for(const node of nodes){const start=node.view?.start??index.ordinals.get(node.id)!,end=node.view?.end??start+1;for(let i=start;i<end;i++)representative.set(source.nodes[i].id,node.id);}
  const edges=new Map<string,GraphEdge>();
  for(const edge of source.edges){const from=representative.get(edge.source),to=representative.get(edge.target);if(!from||!to||from===to)continue;const id=JSON.stringify([from,to,edge.type]),old=edges.get(id);if(old)old.count+=edge.count;else edges.set(id,{...edge,id:'section-edge-'+id,source:from,target:to});}
  return {nodes,edges:[...edges.values()]};
}
