import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useResource } from './data';
import { actionSequence, comparePair } from './graphData';
import { Inspector } from './Inspector';
import { GraphLegend, type Theme } from './graphDrawing';
import { EdgeControls, GraphView, useEdgeTypes } from './GraphView';
import { formatMetric, metricColumns, number, percent, phaseColor, sourceIndex,
  type GraphNode, type Metrics, type Phase, type Run, type RunGraphs, type Step, type StepIndex } from './model';
import { categoryIcon, evidenceKind, eventTime, failed, fileContent, fullScreen, label, patchText, RecordedCode, ShareView, StageSnapshots, stepTitle } from './Evidence';
import { CopyButton, exportMetrics, Icon, LoadError, Loading, OutcomeBadge } from './ui';

function Difference({ metric, current, baseline }: {
  metric: keyof Metrics; current: Metrics[keyof Metrics]; baseline: Metrics[keyof Metrics];
}) {
  if (current === baseline || current == null || baseline == null) return null;
  if (typeof current === 'boolean' && typeof baseline === 'boolean') return <small className="metric-difference">Changed</small>;
  if (typeof current !== 'number' || typeof baseline !== 'number') return null;
  const delta = current - baseline;
  const sign = delta >= 0 ? '+' : '−';
  const value = metric === 'error_rate' ? `${number.format(Math.abs(delta) * 100)} pp` : number.format(Math.abs(delta));
  return <small className="metric-difference" aria-label={`${delta > 0 ? 'Increase' : 'Decrease'} of ${value} versus baseline`}>
    {sign}{value}
  </small>;
}

function MetricsTable({ runs }: { runs: Run[] }) {
  return <section className="panel" aria-labelledby="comparison-metrics">
    <div className="panel-head"><div><h2 id="comparison-metrics">Metrics</h2>
      <p>Differences are relative to {runs[0].id}.</p></div></div>
    <div className="table-scroll">
      <table className="comparison-table">
        <thead><tr><th scope="col">Metric</th>
          {runs.map((run, index) => <th scope="col" key={run.id}><div title={run.id}>{run.id}</div>
            <span className="metric-run-info">{run.model} · {run.condition}{index === 0 && ' · Baseline'}</span>
          </th>)}
        </tr></thead>
        <tbody>
          <tr><th scope="row">Source outcome</th>
            {runs.map((run) => <td key={run.id}><OutcomeBadge outcome={run.outcome} /></td>)}</tr>
          {metricColumns.map(({ key, label }) => <tr key={key}><th scope="row">{label}</th>
            {runs.map((run, index) => <td key={run.id}>
              <span className="metric-value">{formatMetric(key, run.metrics[key])}</span>
              {index > 0 && <Difference metric={key} current={run.metrics[key]} baseline={runs[0].metrics[key]} />}
            </td>)}
          </tr>)}
        </tbody>
      </table>
    </div>
  </section>;
}

interface Segment { phase: string; start: number; end: number; first: StepIndex; last: StepIndex }

function makeSegments(nodes: GraphNode[]) {
  const segments: Segment[] = [];
  nodes.forEach((node, offset) => {
    const previous = segments.at(-1);
    if (previous?.phase === node.phase) {
      previous.end = offset + 1;
      previous.last = node.first_idx;
    } else {
      segments.push({ phase: node.phase, start: offset, end: offset + 1, first: node.first_idx, last: node.first_idx });
    }
  });
  return segments;
}

function PhaseLanes({ runs, graphs, phases }: { runs: Run[]; graphs: RunGraphs[]; phases: Phase[] }) {
  const phaseMap = new Map(phases.map((phase) => [phase.id, phase]));
  const longest = Math.max(1, ...graphs.map((graph) => graph.expanded.nodes.length));
  return <section className="panel" aria-labelledby="phase-lanes">
    <div className="panel-head"><div><h2 id="phase-lanes">Phase timelines</h2>
      <p>Aligned by step position. Each segment spans its recorded step count.</p></div></div>
    <div className="lanes">
      {runs.map((run, index) => {
        const nodes = graphs[index].expanded.nodes;
        const segments = makeSegments(nodes);
        return <div className="lane" key={run.id}>
          <span className="lane-label" title={run.id}>{run.id}</span>
          <svg width="100%" height="20" viewBox={`0 0 ${longest} 20`} preserveAspectRatio="none" role="img"
            aria-label={`${run.id}: ${nodes.length} steps, ${segments.length} consecutive phase segments`}>
            {segments.map((segment) => <rect key={segment.start} x={segment.start} y={0} width={segment.end - segment.start}
              height={20} fill={phaseColor(phaseMap.get(segment.phase))}>
              <title>{`${phaseMap.get(segment.phase)?.label ?? segment.phase} · ${sourceIndex(segment.first)}${
                segment.last !== segment.first ? ` to ${sourceIndex(segment.last)}` : ''}`}</title>
            </rect>)}
          </svg>
          <span className="lane-length mono">{number.format(nodes.length)}</span>
        </div>;
      })}
    </div>
    <div className="phase-lane-legend legend-items">
      {phases.map((phase) => <span key={phase.id}><i className="phase-dot" style={{ background: phaseColor(phase) }} />
        {phase.label}</span>)}
    </div>
  </section>;
}

function Pairwise({ runs, graphs }: { runs: Run[]; graphs: RunGraphs[] }) {
  const pairs = useMemo(() => {
    const sequences = graphs.map((graph) => actionSequence(graph.expanded));
    return runs.flatMap((left, i) => runs.slice(i + 1).map((right, offset) => ({
      left, right, ...comparePair(sequences[i], sequences[i + offset + 1]),
    })));
  }, [runs, graphs]);

  return <section className="panel" aria-labelledby="pairwise">
    <div className="panel-head"><div><h2 id="pairwise">Pairwise similarity</h2>
      <p>Action signatures only. Divergence offsets are zero-based.</p></div></div>
    <div className="table-scroll"><table className="pair-table">
      <thead><tr><th scope="col">Pair</th><th scope="col">Jaccard</th><th scope="col">First divergence</th>
        <th scope="col">Left source index</th><th scope="col">Right source index</th></tr></thead>
      <tbody>{pairs.map((pair) => <tr key={JSON.stringify([pair.left.id, pair.right.id])}>
        <th scope="row"><span title={pair.left.id}>{pair.left.id}</span><Icon name="arrow" size={13} />
          <span title={pair.right.id}>{pair.right.id}</span></th>
        <td><strong className="mono">{percent.format(pair.jaccard)}</strong>
          <small className="pair-overlap">{pair.intersection} shared / {pair.union} total</small></td>
        <td className="mono">{pair.offset == null ? 'Identical' : number.format(pair.offset)}</td>
        <td className="mono" title={pair.offset != null && pair.leftIndex == null ? 'Sequence ended' : undefined}>
          {sourceIndex(pair.leftIndex)}</td>
        <td className="mono" title={pair.offset != null && pair.rightIndex == null ? 'Sequence ended' : undefined}>
          {sourceIndex(pair.rightIndex)}</td>
      </tr>)}</tbody>
    </table></div>
  </section>;
}

function GraphComparison({ runs, graphs, phases, theme, externalSignature, onSelection, onClear }: {
  runs: Run[]; graphs: RunGraphs[]; phases: Phase[]; theme: Theme; externalSignature?: string | null; onSelection?: (node: GraphNode, run: number) => void; onClear?: () => void;
}) {
  const [localSignature, setSignature] = useState<string | null>(null);
  const signature = externalSignature ?? localSignature;
  const [alignmentPage, setAlignmentPage] = useState(0);
  const { enabled, toggle } = useEdgeTypes();
  const [inspected, setInspected] = useState<{ run: number; node: GraphNode; index: StepIndex } | null>(null);
  const divergences = useMemo(() => {
    const baseline = actionSequence(graphs[0].expanded);
    const markers = graphs.map(() => new Set<string>());
    const pairs = graphs.map((graph, index) => {
      if (!index) return null;
      const right = actionSequence(graph.expanded);
      const pair = comparePair(baseline, right);
      if (pair.offset != null) {
        if (baseline[pair.offset]) markers[0].add(baseline[pair.offset].id);
        if (right[pair.offset]) markers[index].add(right[pair.offset].id);
      }
      return pair;
    });
    return { markers, pairs };
  }, [graphs]);
  const members = useMemo(() => {
    const map = new Map<string, number[]>();
    graphs.forEach((graph, index) => {
      const signatures = new Set(graph.expanded.nodes.map((node) => node.signature));
      for (const value of signatures) {
        const list = map.get(value);
        if (list) list.push(index);
        else map.set(value, [index]);
      }
    });
    return map;
  }, [graphs]);
  const counts = useMemo(() => new Map([...members].map(([key, list]) => [key, list.length])), [members]);
  const activeMembers = signature == null ? undefined : members.get(signature);
  const details = useResource<{ steps: Step[] }[]>(runs.map((run) => run.steps_file));
  const stepMaps = useMemo(() => details.state.status === 'ready' ? details.state.data.map((payload) => new Map(payload.steps.map((step) => [String(step.idx), step]))) : [], [details.state]);
  const sequences = useMemo(() => graphs.map((graph) => actionSequence(graph.expanded)), [graphs]);
  const longest = Math.max(0, ...sequences.map((sequence) => sequence.length));
  const start = Math.min(alignmentPage * 30, Math.max(0, Math.ceil(longest / 30) - 1) * 30);
  const select = useCallback((node: GraphNode, run: number) => {
    setSignature(node.signature);
    setInspected({ run, node, index: node.first_idx });
    onSelection?.(node, run);
  }, [onSelection]);

  return <section className="comparison-graphs" aria-labelledby="compared-graphs">
    <details className="ordinal-alignment"><summary>Compare by original action offsets</summary><section className="panel action-alignment" aria-label="Action sequence alignment">
      <div className="panel-head"><div><h2>Step alignment</h2><p>Action sequence offsets against the baseline. Repeated calls keep their own rows; this is not an inferred semantic alignment.</p></div></div>
      <div className="alignment-grid" style={{ gridTemplateColumns: `repeat(${runs.length}, minmax(0, 1fr))` }}>
        {runs.map((run, i) => <div className="alignment-run" key={run.id}>
          <h3 className="alignment-title">{run.id}{i === 0 && ' · Baseline'}</h3>
          {Array.from({ length: Math.min(30, longest - start) }, (_, row) => {
            const offset = start + row;
            const node = sequences[i][offset];
            const baseline = sequences[0][offset];
            const same = node?.signature === baseline?.signature;
            const step = node && stepMaps[i]?.get(String(node.first_idx));
            const baseStep = baseline && stepMaps[0]?.get(String(baseline.first_idx));
            const retry = node && graphs[i].expanded.edges.some((edge) => edge.target === node.id && edge.type === 'retry');
            const differentResult = i > 0 && same && step && baseStep && JSON.stringify(step.observation) !== JSON.stringify(baseStep.observation);
            const status = [node?.error ? 'Failed' : step?.observation?.exit_code === 0 ? 'Exit 0' : 'Result unrecorded', retry && 'Retry', i > 0 && !baseline ? 'Additional action' : i === 0 ? 'Baseline' : !same ? 'Different action' : differentResult ? 'Different output' : 'Same signature'].filter(Boolean).join(' · ');
            return node ? <button className={`alignment-row ${i > 0 && (!same || differentResult) ? 'is-different' : ''} ${node.error ? 'is-failed' : ''} ${retry ? 'is-retry' : ''}`} key={offset}
              aria-label={`${run.id} action ${offset}, source ${sourceIndex(node.first_idx)}`}
              aria-pressed={signature === node.signature} onClick={() => select(node, i)}>
              <span className="mono">{offset}</span><span>{node.label}<small>{sourceIndex(node.first_idx)} · {status}</small></span>
            </button> : <div className="alignment-row muted" key={offset}><span>{offset}</span><span>Sequence ended</span></div>;
          })}
        </div>)}
      </div>
      <div className="alignment-footer"><button className="button small" disabled={!start} onClick={() => setAlignmentPage(Math.max(0, alignmentPage - 1))}>Previous actions</button>
        <span>{longest ? `${start}–${Math.min(start + 30, longest) - 1}` : 'No actions'} / {longest}</span>
        <button className="button small" disabled={start + 30 >= longest} onClick={() => setAlignmentPage(alignmentPage + 1)}>Next actions</button></div>
    </section></details>
    <div className="section-head">
      <div><h2 id="compared-graphs">Run DAGs · source order ↓</h2><p>Select a node to highlight its signature across runs.</p></div>
      <button className="button small" disabled={signature == null} onClick={() => {setSignature(null);setInspected(null);onClear?.();}}>Clear highlight</button>
    </div>
    <div className="panel comparison-legend">
      <EdgeControls enabled={enabled} toggle={toggle} theme={theme} />
      <details><summary>Graph legend</summary><GraphLegend phases={phases} theme={theme} /></details>
      <div className="signature-status" aria-live="polite">
        {activeMembers ? <><strong>Matching runs</strong><span>{activeMembers.map((index) => runs[index].id).join(' · ')}</span></>
          : <><i className="unique-dot" /> <span>Marked nodes have a signature unique to their run.</span></>}
      </div>
    </div>
    <div className="comparison-grid">
      {graphs.map(({ expanded }, index) => {
        const run = runs[index];
        const signatures = new Set(expanded.nodes.map((node) => node.signature));
        const unique = [...signatures].filter((value) => counts.get(value) === 1).length;
        return <article key={run.id} className="panel compare-graph">
          <div className="panel-head"><div><h3>{run.id}</h3>
            <p>{number.format(unique)} unique · {number.format(signatures.size - unique)} shared</p></div>
            <OutcomeBadge outcome={run.outcome} /></div>
          <p className="divergence-note">{index === 0 ? 'Baseline · markers show first divergence of each compared run.' :
            divergences.pairs[index]?.offset == null ? 'Identical action sequence to baseline.' :
              `First divergence at action offset ${divergences.pairs[index]!.offset} · baseline ${sourceIndex(divergences.pairs[index]!.leftIndex)} / this run ${sourceIndex(divergences.pairs[index]!.rightIndex)}. A missing index means the sequence ended.`}</p>
          <GraphView graph={expanded} phases={phases} theme={theme} enabled={enabled} name={run.id}
            onNode={(node) => select(node, index)} signature={signature} divergence={divergences.markers[index]} membership={counts} compact legend={false} />
        </article>;
      })}
    </div>
    {inspected && !onSelection && <Inspector run={runs[inspected.run]} node={inspected.node} index={inspected.index}
      select={(index) => setInspected({ ...inspected, index })} clear={() => setInspected(null)} phases={phases} />}

  </section>;
}

function ComparisonSummary({ runs }: { runs: Run[] }) {
  return <section className="panel comparison-summary" aria-label="Comparison summary"><div className="table-scroll"><table className="comparison-table">
    <thead><tr><th>Run</th><th>Outcome</th><th>Steps</th><th>Duration</th><th>Tokens</th><th>Cost</th></tr></thead>
    <tbody>{runs.map((run, i) => <tr key={run.id}><th title={run.id}>{String.fromCharCode(65 + i)} · {run.id}{i === 0 && ' · Baseline'}</th><td><OutcomeBadge outcome={run.outcome} /></td>
      <td>{number.format(run.metrics.steps)}</td><td>{run.usage?.wall_s == null ? 'Unrecorded' : `${number.format(run.usage.wall_s)} s`}</td>
      <td>{run.usage?.input_tokens != null && run.usage.output_tokens != null ? number.format(run.usage.input_tokens + run.usage.output_tokens) : 'Unrecorded'}</td><td>Unrecorded</td></tr>)}</tbody>
  </table></div></section>;
}


interface AlignmentPair {left?: GraphNode; right?: GraphNode}
function alignActions(left: GraphNode[], right: GraphNode[]): {rows:AlignmentPair[]; method:string} {
  if(left.length*right.length>250000) return {rows:Array.from({length:Math.max(left.length,right.length)},(_,i)=>({left:left[i],right:right[i]})),method:'Source action offsets (large-sequence fallback)'};
  const cols=right.length+1, dp=new Uint16Array((left.length+1)*cols);
  for(let i=left.length-1;i>=0;i--)for(let j=right.length-1;j>=0;j--)dp[i*cols+j]=left[i].signature===right[j].signature?1+dp[(i+1)*cols+j+1]:Math.max(dp[(i+1)*cols+j],dp[i*cols+j+1]);
  const rows:AlignmentPair[]=[];let i=0,j=0;
  while(i<left.length||j<right.length) {
    if(i<left.length&&j<right.length&&left[i].signature===right[j].signature)rows.push({left:left[i++],right:right[j++]});
    else if(j<right.length&&(i===left.length||dp[i*cols+j+1]>=dp[(i+1)*cols+j]))rows.push({right:right[j++]});
    else rows.push({left:left[i++]});
  }
  return {rows,method:'Longest common subsequence of normalized action signatures; ties prefer a B insertion'};
}
interface MetricSpec {label:string;icon:'clock'|'terminal'|'retry'|'database'|'target'|'check';unit:string;values:(number|null)[]}
function compareMetrics(runs:Run[],graphs:RunGraphs[]):MetricSpec[] {
  return [
    {label:'Duration',icon:'clock',unit:'s',values:runs.map(r=>r.usage?.wall_s??null)},
    {label:'Tool Calls',icon:'terminal',unit:'',values:graphs.map(g=>actionSequence(g.expanded).length)},
    {label:'Retries',icon:'retry',unit:'',values:graphs.map(g=>g.expanded.edges.filter(e=>e.type==='retry').reduce((n,e)=>n+e.count,0))},
    {label:'Token Usage',icon:'database',unit:'K',values:runs.map(r=>r.usage?.input_tokens!=null&&r.usage.output_tokens!=null?(r.usage.input_tokens+r.usage.output_tokens)/1000:null)},
    {label:'Cost (USD)',icon:'target',unit:'$',values:runs.map(()=>null)},
    {label:'Test Pass Rate',icon:'check',unit:'%',values:runs.map(()=>null)},
  ];
}
const metricValue=(v:number|null,unit:string)=>v==null?'未记录':(unit==='$'?'$':'')+number.format(v)+(unit==='s'?' s':unit==='K'?'K':unit==='%'?'%':'');
function MetricComparison({metrics,runs}:{metrics:MetricSpec[];runs:Run[]}) {
  return <section className="panel metric-comparison table-scroll" aria-label="Comparison metrics"><table><thead><tr><th>Metric</th>{runs.map((r,i)=><th key={r.id}><i className={'agent-dot agent-'+i}/> Agent {String.fromCharCode(65+i)} · {r.id}</th>)}</tr></thead><tbody>
    {metrics.map(m=>{const max=Math.max(1,...m.values.map(v=>v??0));return <tr key={m.label}><th scope="row"><Icon name={m.icon} size={16}/>{m.label}</th>
      {m.values.map((v,i)=><td key={i}><div className="metric-bar-row"><div><i className={'agent-fill agent-fill-'+i} style={{display:'block',height:'100%',width:v==null?'0':Math.max(0,v/max*100)+'%'}}/></div><b>{metricValue(v,m.unit)}</b></div></td>)}</tr>;})}</tbody></table></section>;
}
function SmallChart({metric}:{metric:MetricSpec}) {
  const known=metric.values.slice(0,2).some(v=>v!=null);
  const peak=Math.max(1,...metric.values.slice(0,2).map(v=>v??0));
  const power=10**Math.floor(Math.log10(peak));
  const max=([1,2,5,10].find(f=>f*power>=peak)??10)*power;
  return <article className="small-chart"><h3>{metric.label}{metric.unit==='s'?' (s)':metric.unit==='K'?' (K)':metric.unit==='%'?' (%)':''}</h3><svg viewBox="0 0 148 100" role="img" aria-label={metric.label+' A '+metricValue(metric.values[0],metric.unit)+' B '+metricValue(metric.values[1],metric.unit)}>
    {[0,.5,1].map(t=><g key={t}><line x1={28} x2={142} y1={78-t*58} y2={78-t*58} stroke="var(--line)"/><text x={24} y={81-t*58} textAnchor="end">{known?number.format(t*max):'—'}</text></g>)}
    {metric.values.slice(0,2).map((v,i)=><g key={i}>{v!=null?<><rect x={42+i*53} y={78-v/max*58} width={29} height={v/max*58} rx={2} fill={i?'var(--agent-b)':'var(--agent-a)'}/><text x={56+i*53} y={Math.max(14,73-v/max*58)} textAnchor="middle" className="chart-value">{number.format(v)}</text></>:<text x={56+i*53} y={47} textAnchor="middle">未记录</text>}<text x={56+i*53} y={94} textAnchor="middle">{String.fromCharCode(65+i)}</text></g>)}
    <path d="M28 16V78H142" fill="none" stroke="var(--line-strong)"/></svg></article>;
}
function ReferenceComparison({runs,graphs,steps,available,changeRuns,onInspect,phases,theme,initialSource}:{runs:Run[];graphs:RunGraphs[];steps:Step[][];available:Run[];changeRuns:(ids:string[])=>void;onInspect:(id:string,idx:StepIndex)=>void;phases:Phase[];theme:Theme;initialSource?:{run:string;index:StepIndex}|null}) {
  const [selection,setSelection]=useState<{run:number;node:GraphNode}|null>(()=>{
    const run=runs.findIndex(r=>r.id===initialSource?.run);
    const node=graphs[run]?.expanded.nodes.find(n=>String(n.first_idx)===String(initialSource?.index));
    return node ? {run,node} : null;
  });
  const [inspectionOpen,setInspectionOpen]=useState(Boolean(selection));
  const returnFocus=useRef<Element|null>(null);
  const [patchView,setPatchView]=useState('Unified Diff');
  const [alignmentPage,setAlignmentPage]=useState(0);
  const [mode,setMode]=useState('Alignment');
  const sequences=useMemo(()=>graphs.map(g=>actionSequence(g.expanded)),[graphs]);
  const pair=useMemo(()=>comparePair(sequences[0],sequences[1]),[sequences]);
  const alignment=useMemo(()=>alignActions(sequences[0],sequences[1]),[sequences]);
  const metrics=compareMetrics(runs,graphs);
  const maps=steps.map(list=>new Map(list.map(s=>[String(s.idx),s])));
  const signature=selection?.node.signature;
  const selectedStep=selection ? maps[selection.run].get(String(selection.node.first_idx)) : undefined;
  const alignmentRow=(node:GraphNode,run:number)=>alignment.rows.findIndex(row=>String((run===0?row.left:row.right)?.first_idx)===String(node.first_idx));
  const choose=(node:GraphNode,i:number)=>{
    returnFocus.current=document.activeElement;
    setSelection({run:i,node});setInspectionOpen(true);onInspect(runs[i].id,node.first_idx);
    const row=alignmentRow(node,i);if(row>=0)setAlignmentPage(Math.floor(row/5));
  };
  const closeInspection=()=>{
    setInspectionOpen(false);
    requestAnimationFrame(()=>{if(returnFocus.current?.isConnected)(returnFocus.current as HTMLElement).focus({preventScroll:true});});
  };
  useEffect(()=>{
    if(!selection)return;
    for(const list of document.querySelectorAll('.compare-step-list')) {
      const row=list.querySelector('.compare-step[aria-pressed="true"]');
      if(row){const a=row.getBoundingClientRect(),b=list.getBoundingClientRect();if(a.top<b.top)list.scrollTop+=a.top-b.top;else if(a.bottom>b.bottom)list.scrollTop+=a.bottom-b.bottom;}
    }
  },[selection]);
  const snapshot=(idx:StepIndex,i:number)=>{
    const node=graphs[i].expanded.nodes.find(n=>String(n.first_idx)===String(idx));if(!node)return;
    choose(node,i);setMode('Alignment');document.querySelector('.compare-focus-workspace')?.scrollIntoView({block:'start'});
    requestAnimationFrame(()=>document.querySelector<HTMLElement>('.alignment-panel .panel-head h2')?.focus({preventScroll:true}));
  };
  const lastEdits=steps.map(list=>list.filter(s=>patchText(s)).at(-1));
  const lastPatches=lastEdits.map(s=>patchText(s));
  let finalPatch=lastPatches[0]??lastPatches[1]??null;
  if(lastPatches[0]&&lastPatches[1]&&lastPatches[0]!==lastPatches[1])finalPatch='--- Agent A recorded patch\n+++ Agent B recorded patch\n@@ patch argument comparison @@\n'+lastPatches[0].split('\n').map(l=>'-'+l).join('\n')+'\n'+lastPatches[1].split('\n').map(l=>'+'+l).join('\n');
  const finalContent=patchView==='Unified Diff'?finalPatch:fileContent(lastEdits[patchView==='Agent A (Final)'?0:1]);
  const retry=(node:GraphNode|undefined,i:number)=>node ? graphs[i].expanded.edges.some(e=>e.target===node.id&&e.type==='retry') : false;
  const agentCard=(i:number)=><article className={'panel agent-trajectory agent-card-'+i}>
    <div className="panel-head"><h2><i className={'agent-dot agent-'+i}/>Agent {String.fromCharCode(65+i)}</h2><small title={runs[i].id}>{runs[i].id}</small><OutcomeBadge outcome={runs[i].outcome}/></div>
    <div className="agent-facts">Model: {runs[i].model||'Unrecorded'} · {steps[i].length} steps · {metrics[2].values[i]} retry edges · {metricValue(metrics[0].values[i],'s')}</div>
    <div className="subpanel-title"><Icon name="file" size={14}/>Full trajectory · {steps[i].length} steps</div>
    <div className="compare-step-list">{steps[i].map((s,ordinal)=>{const n=graphs[i].expanded.nodes.find(n=>String(n.first_idx)===String(s.idx));return <button key={String(s.idx)} data-source-index={String(s.idx)} className={'compare-step '+(failed(s)?'has-error':'')} aria-label={runs[i].id+' source '+sourceIndex(s.idx)} aria-pressed={!!n&&signature===n.signature} onClick={()=>n&&snapshot(s.idx,i)}>
      <span className="compare-ordinal">{ordinal+1}</span><span><strong>{stepTitle(s,n)}</strong><small title={label(s)}>{label(s)}</small></span><time>{eventTime(s,steps[i][0])}</time><Icon name={failed(s)?'close':s.observation?.exit_code===0?'check':'minus'} size={12}/></button>;})}</div>
    <details className="agent-stage-details"><summary>Stage snapshots · Agent {String.fromCharCode(65+i)}</summary><StageSnapshots steps={steps[i]} nodes={graphs[i].expanded.nodes} selected={selection?.run===i?selection.node.first_idx:null} select={idx=>snapshot(idx,i)} count={i?6:5} initialPreviews/></details>
  </article>;
  const selectDivergence=()=>{
    const i=pair.rightIndex!=null?1:0,idx=i?pair.rightIndex:pair.leftIndex;
    const n=graphs[i].expanded.nodes.find(n=>String(n.first_idx)===String(idx));
    if(n){setMode('Alignment');choose(n,i);}
  };
  const hasInspection=inspectionOpen&&selection&&(mode==='Alignment'||mode==='Run DAGs');
  const selectedRow=selection?alignment.rows[alignmentRow(selection.node,selection.run)]:undefined;
  return <>
    <div className="compare-selection-bar"><span className="compare-task" title={runs[0].task_id}><Icon name="terminal" size={17}/>Task: <b>{runs[0].task_id}</b></span><span title="Local traces; public screenshot data are synthetic"><Icon name="database" size={16}/>{runs.every(r=>r.agent==='synthetic')?'Synthetic fixtures':'Local traces'}</span>
      {runs.map((r,i)=><label key={r.id} className={'run-comparison-picker agent-card-'+i}><i className={'agent-dot agent-'+i}/><strong>{String.fromCharCode(65+i)}</strong><select aria-label={'Agent '+String.fromCharCode(65+i)+' run'} value={r.id} onChange={e=>changeRuns(runs.map((v,j)=>j===i?e.target.value:v.id))}>{available.filter(a=>a.task_id===r.task_id).map(a=><option key={a.id} value={a.id} disabled={a.id!==r.id&&runs.some(r=>r.id===a.id)}>{a.id} · {a.outcome.label}</option>)}</select></label>)}
      {runs.length<4&&available.some(a=>a.task_id===runs[0].task_id&&!runs.some(r=>r.id===a.id))&&<button className="button small" onClick={()=>{const next=available.find(a=>a.task_id===runs[0].task_id&&!runs.some(r=>r.id===a.id));if(next)changeRuns([...runs.map(r=>r.id),next.id]);}}>Add run</button>}
      <ShareView/><button className="button small icon-button" aria-label="Export comparison CSV" title="Export comparison CSV" onClick={()=>exportMetrics(runs)}><Icon name="download" size={16}/></button>
    </div>
    <section className="comparison-quick-metrics" aria-label="Primary comparison metrics">{metrics.slice(0,3).map(m=><div key={m.label}><span><Icon name={m.icon} size={14}/>{m.label}</span><strong><i className="agent-dot agent-0"/>A {metricValue(m.values[0],m.unit)}<span className="muted">/</span><i className="agent-dot agent-1"/>B {metricValue(m.values[1],m.unit)}</strong></div>)}</section>
    <div className="compare-overview"><span><i className="agent-dot agent-0"/>A <OutcomeBadge outcome={runs[0].outcome}/></span><span><i className="agent-dot agent-1"/>B <OutcomeBadge outcome={runs[1].outcome}/></span><button className="divergence-callout" title="Locate the first different action in the alignment" disabled={pair.offset==null} onClick={selectDivergence}><Icon name="compare" size={16}/>{pair.offset==null?'Identical action sequences':'First divergence · action '+pair.offset+' · A '+sourceIndex(pair.leftIndex)+' / B '+sourceIndex(pair.rightIndex)}<Icon name="right" size={15}/></button></div>
    <div className="focus-tabs comparison-modes" role="group" aria-label="Comparison workspace">{['Alignment','Patch comparison','All metrics','Run DAGs'].map(name=><button key={name} aria-pressed={mode===name} onClick={()=>setMode(name)}><Icon name={name==='Alignment'?'compare':name==='Patch comparison'?'diff':name==='All metrics'?'chart':'graph'} size={16}/>{name}</button>)}{selection&&!inspectionOpen&&mode==='Alignment'&&<button className="reopen-comparison" onClick={()=>setInspectionOpen(true)}>Step comparison <Icon name="panel" size={14}/></button>}</div>
    <div className={'compare-focus-workspace'+(hasInspection?' has-inspection':'')}><div className="comparison-primary">
      <div className="comparison-mode-panel" hidden={mode!=='Alignment'}>
        <section className="panel alignment-panel" aria-label="Trajectory alignment and divergence"><div className="panel-head"><h2 tabIndex={-1}><Icon name="compare" size={16}/>Trajectory Alignment &amp; Divergence</h2><span className="muted">Source actions · A ↔ B</span></div>
          <div className="alignment-legend"><span><i className="agent-dot agent-0"/>Aligned</span><span><i className="agent-dot agent-1"/>Diverged / extra action</span><span><Icon name="layers" size={12}/>Rejoined</span></div>
          <div className="alignment-identities"><span><i className="agent-dot agent-0"/>Agent A <small>{runs[0].id}</small></span><span className="alignment-status-heading">Relationship</span><span><i className="agent-dot agent-1"/>Agent B <small>{runs[1].id}</small></span></div>
          <div className="reference-alignment">{alignment.rows.slice(alignmentPage*5,alignmentPage*5+5).map((row,i)=>{
            const same=!!row.left&&row.left.signature===row.right?.signature;
            const outputDiff=same&&JSON.stringify(maps[0].get(String(row.left?.first_idx))?.observation)!==JSON.stringify(maps[1].get(String(row.right?.first_idx))?.observation);
            const previous=alignment.rows[alignmentPage*5+i-1],rejoined=same&&previous&&(!previous.left||!previous.right);
            const first=pair.offset!=null&&(String(row.left?.first_idx)===String(pair.leftIndex)||String(row.right?.first_idx)===String(pair.rightIndex));
            const side=(n:GraphNode|undefined,j:number)=>{const source=n&&maps[j].get(String(n.first_idx));return n?<button aria-label={runs[j].id+' aligned source '+sourceIndex(n.first_idx)} className={n.error?'has-error':''} data-selected={selection?.run===j&&String(selection.node.first_idx)===String(n.first_idx)} data-matched={n.signature===signature} aria-pressed={n.signature===signature} onClick={()=>choose(n,j)} title={n.label}><span className="kind-icon alignment-kind" data-kind={source?evidenceKind(source,n):n.category}><Icon name={source?categoryIcon(source,n):'terminal'} size={18}/></span><span className="alignment-action-copy"><strong>{n.tool||n.label}</strong><small>{sourceIndex(n.first_idx)} · {source?label(source):n.label}</small></span><span className={n.error?'error-text':source?.observation?.exit_code===0?'success-text':'muted'} title={n.error?'Failed':source?.observation?.exit_code===0?'Success':'Result unrecorded'}><Icon name={n.error?'close':source?.observation?.exit_code===0?'check':'minus'} size={14}/></span>{retry(n,j)&&<span className="retry-tag"><Icon name="retry" size={12}/>Retry</span>}</button>:<span className="alignment-gap">— No aligned {j?'B':'A'} action</span>;};
            return <div className={'align-pair '+(same?'aligned':'diverged')} key={alignmentPage*5+i} data-first-divergence={first}>{side(row.left,0)}
              <div className="align-connector"><Icon name={rejoined?'layers':same?outputDiff?'warning':'check':'compare'} size={17}/>{first&&<strong>First divergence</strong>}<span>{rejoined?'Rejoined':same?outputDiff?'Output differs':'Aligned':row.left?'Extra A action':'Extra B action'}</span>{(row.left?.error||row.right?.error)&&<small className="error-text">Failure recorded</small>}</div>{side(row.right,1)}</div>;
          })}{!alignment.rows.length&&<div className="evidence-empty">No recorded tool actions. Open Agent details to inspect any saved text.</div>}</div>
          <div className="alignment-pagination"><button className="button small" disabled={!alignmentPage} onClick={()=>setAlignmentPage(alignmentPage-1)}>Previous</button><span>{alignment.rows.length?alignmentPage*5+1:0}–{Math.min(alignmentPage*5+5,alignment.rows.length)} / {alignment.rows.length}</span><button className="button small" disabled={(alignmentPage+1)*5>=alignment.rows.length} onClick={()=>setAlignmentPage(alignmentPage+1)}>Next</button></div>
          <details className="alignment-method"><summary>How alignment is computed</summary><p>{alignment.method}. Equal signatures reconnect source-ordered actions; this does not infer semantic equivalence. A missing side is an additional action on the other side. Rejoined means a paired signature after an unmatched interval. Failure, retry edges and output differences remain visible. First divergence uses the original zero-based action offset and both exact source indices.</p></details>
        </section>
        <div className="source-trajectories">{[0,1].map(i=><details className="agent-disclosure" key={i}><summary><i className={'agent-dot agent-'+i}/>Agent {String.fromCharCode(65+i)} details <span>Trajectory &amp; snapshots</span></summary>{agentCard(i)}</details>)}</div>
        <details className="comparison-analysis"><summary><Icon name="spark" size={15}/>Key Findings <span>Outcome, efficiency &amp; divergence</span></summary><section className="findings"><h3>Overall comparison</h3><p>Both runs address “{runs[0].task_id}”. Recorded outcomes: A “{runs[0].outcome.label}”, B “{runs[1].outcome.label}”.</p><ul>
          <li>A: {runs[0].metrics.steps} source steps, {metrics[1].values[0]} tool calls, {metrics[2].values[0]} retry edges; B: {runs[1].metrics.steps} steps, {metrics[1].values[1]} tool calls, {metrics[2].values[1]} retry edges.</li>
          <li>{metrics[0].values[0]!=null&&metrics[0].values[1]!=null?'Recorded duration: A '+metricValue(metrics[0].values[0],'s')+' / B '+metricValue(metrics[0].values[1],'s')+'.':'Duration unrecorded on at least one side; efficiency by time cannot be established.'}</li>
          <li>{pair.offset==null?'Normalized action sequences match.':'First divergence at action '+pair.offset+': A '+sourceIndex(pair.leftIndex)+' / B '+sourceIndex(pair.rightIndex)+'.'} <button className="button small quiet" disabled={pair.offset==null} onClick={selectDivergence}>Locate evidence</button></li>
          <li>Jaccard {percent.format(pair.jaccard)} · {pair.intersection} shared / {pair.union} total signatures. Cost and test pass rate are unrecorded.</li>
        </ul></section></details>
      </div>
      <div className="comparison-mode-panel" hidden={mode!=='Patch comparison'}><section className="panel final-patch" aria-label="Key code difference"><div className="panel-head"><h2><Icon name="file" size={15}/>Key Code Difference <small>(Last recorded patch)</small></h2><button className="button small icon-button" aria-label="Expand patch comparison" title="Expand patch comparison" onClick={e=>fullScreen(e.currentTarget.closest('section'))}><Icon name="fit" size={15}/></button></div><div className="segments" role="group" aria-label="Final patch view">{['Unified Diff','Agent A (Final)','Agent B (Final)'].map(v=><button key={v} aria-pressed={patchView===v} onClick={()=>setPatchView(v)}>{v}</button>)}</div><p className="patch-provenance">Last saved patch · {lastEdits.slice(0,2).map((s,i)=>String.fromCharCode(65+i)+' '+sourceIndex(s?.idx)).join(' / ')}. Selected-step patches appear separately in Step comparison.</p><div className="recorded-path"><Icon name="file" size={14}/><span>{lastEdits[0]?.action?.targets[0]||lastEdits[1]?.action?.targets[0]||'File unrecorded'}</span>{finalContent?<CopyButton text={finalContent}/>:<button className="button small" disabled title="Content unrecorded">Copy</button>}</div><div className="final-patch-code"><RecordedCode value={finalContent} patch={patchView==='Unified Diff'}/></div><p className="content-note">{patchView==='Unified Diff'?'Compares saved patch arguments; this is not a reconstructed final-file diff.':'Final file version unrecorded unless explicitly saved as content.'}</p></section></div>
      <div className="comparison-mode-panel" hidden={mode!=='All metrics'}><MetricComparison metrics={metrics} runs={runs}/><details className="comparison-chart-disclosure"><summary>Comparison charts · six metrics</summary><div className="comparison-charts">{metrics.map(m=><SmallChart key={m.label} metric={m}/>)}</div></details><ComparisonSummary runs={runs}/><details className="expanded-metrics"><summary>All comparison metrics</summary><MetricsTable runs={runs}/></details></div>
      <div className="comparison-mode-panel" hidden={mode!=='Run DAGs'}>{mode==='Run DAGs'&&<section className="comparison-extra"><p>{runs[0].task_id} · {runs.length} selected runs</p><GraphComparison runs={runs} graphs={graphs} phases={phases} theme={theme} externalSignature={signature} onSelection={choose} onClear={()=>{setSelection(null);setInspectionOpen(false);}}/><PhaseLanes runs={runs} graphs={graphs} phases={phases}/><Pairwise runs={runs} graphs={graphs}/></section>}</div>
    </div>
    {hasInspection&&selection&&<aside className="compare-inspection" aria-label="Step comparison" onKeyDown={e=>{if(e.key==='Escape'){e.preventDefault();closeInspection();}}}>
      <div className="panel-head step-comparison-heading"><h2>Step comparison</h2><button className="button small icon-button quiet" aria-label="Close Step comparison" onClick={closeInspection}><Icon name="close" size={16}/></button></div>
      <p className="comparison-source-label">Selected · {String.fromCharCode(65+selection.run)} {sourceIndex(selection.node.first_idx)} · {runs[selection.run].id}</p>
      <p className="signature-match-summary">Same signature · {graphs.slice(0,2).map((g,i)=>String.fromCharCode(65+i)+' '+g.expanded.nodes.filter(n=>n.signature===signature).length).join(' / ')}</p>
      <div className="step-comparison-matches">{[0,1].map(i=>{const n=i===0?selectedRow?.left:selectedRow?.right;return <div key={i}><strong><i className={'agent-dot agent-'+i}/>{String.fromCharCode(65+i)} · aligned row</strong>{n?<button className="button small quiet" onClick={()=>choose(n,i)}>{sourceIndex(n.first_idx)} · {n.tool||n.label}</button>:<span className="muted">No aligned counterpart</span>}</div>;})}
        <details><summary>Same-signature matches</summary><p className="content-note">Signature matches can occur more than once. They are candidates, not new alignment links.</p>{graphs.flatMap((g,i)=>g.expanded.nodes.filter(n=>n.signature===signature).map(n=><button className="node-result" key={i+':'+n.id} onClick={()=>choose(n,i)}>{String.fromCharCode(65+i)} {sourceIndex(n.first_idx)} · {n.label}</button>))}</details>
      </div>
      {patchText(selectedStep)&&<p className="selected-patch-source">Selected-step patch · source {sourceIndex(selection.node.first_idx)}</p>}
      <Inspector heading="Step evidence" run={runs[selection.run]} node={selection.node} index={selection.node.first_idx} select={idx=>{const n=graphs[selection.run].expanded.nodes.find(n=>String(n.first_idx)===String(idx));if(n)choose(n,selection.run);}} phases={phases} relatedGraph={graphs[selection.run].expanded}/>
    </aside>}
    </div>
  </>;
}
export function Compare({runs,phases,theme,available=runs,changeRuns=()=>{},onInspect=()=>{},initialSource}:{runs:Run[];phases:Phase[];theme:Theme;available?:Run[];changeRuns?:(ids:string[])=>void;onInspect?:(id:string,idx:StepIndex)=>void;initialSource?:{run:string;index:StepIndex}|null}) {
  const graphs=useResource<RunGraphs[]>(runs.map(r=>r.file));
  const details=useResource<{steps:Step[]}[]>(runs.map(r=>r.steps_file));
  return <div className="comparison-surface">{[graphs,details].map((r,i)=>r.state.status==='error'?<LoadError key={i} message={r.state.message} retry={r.retry}/>:null)}
    {(graphs.state.status==='loading'||details.state.status==='loading')&&<Loading>Loading comparison evidence…</Loading>}
    {graphs.state.status==='ready'&&details.state.status==='ready'&&<ReferenceComparison key={runs.map(r=>r.id).join('/')} runs={runs} graphs={graphs.state.data} steps={details.state.data.map(d=>d.steps)} phases={phases} theme={theme} available={available} changeRuns={changeRuns} onInspect={onInspect} initialSource={initialSource}/>}
  </div>;
}
