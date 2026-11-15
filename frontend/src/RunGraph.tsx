import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useResource } from './data';
import { filterGraph, foldGraph, selectedRelationships } from './graphData';
import { NodeTypeLegend, type Theme } from './graphDrawing';
import { EdgeControls, GraphView, useEdgeTypes } from './GraphView';
import { hierarchyGraph } from './hierarchy';
import { inlineExecutionGraph, executionPath, executionSection, executionThreshold } from './executionMap';
import { Inspector } from './Inspector';
import { TraceOverview } from './TraceOverview';
import { fullScreen, RunMetadata, StageSnapshots, stepTitle } from './Evidence';
import { AgentActivity, EventTimeline } from './Timeline';
import { categories, capitalize, number, percent, phaseColor, sourceIndex, type GraphNode, type Phase, type Run, type RunGraphs, type Step, type StepIndex } from './model';
import { Icon, LoadError, Loading } from './ui';

const foldThreshold = 2000;

function Timeline({ nodes, position, change, phases, inspect }: {
  nodes: GraphNode[]; position: number; change: (position: number) => void; phases: Phase[];
  inspect: (index: StepIndex) => void;
}) {
  const [playing, setPlaying] = useState(false);
  const total = nodes.length;
  const current = nodes[position - 1];
  const phase = phases.find((item) => item.id === current?.phase);

  useEffect(() => {
    if (!playing) return;
    if (position >= total) {
      setPlaying(false);
      return;
    }
    const timer = window.setTimeout(() => change(position + 1), 390);
    return () => window.clearTimeout(timer);
  }, [position, playing, total, change]);

  function seek(next: number) {
    setPlaying(false);
    change(next);
  }

  function play() {
    if (playing) setPlaying(false);
    else {
      if (position >= total) change(0);
      setPlaying(true);
    }
  }

  return <section className="timeline" aria-label="Playback timeline">
    <div className="timeline-top">
      <div className="timeline-position">
        <strong><Icon name="play" size={14}/>Playback</strong>
        <span className="mono">{number.format(position)} / {number.format(total)}</span>
        {current && <span className="timeline-phase">
          <i className="phase-dot" style={{ background: phaseColor(phase) }} />{phase?.label ?? current.phase} {sourceIndex(current.first_idx)}
        </span>}
      </div>
      <button className="button small quiet" disabled={!current}
        onClick={() => current && inspect(current.first_idx)}>Inspect current step</button>
    </div>
    <div className="timeline-controls">
      <button className="button small icon-button" aria-label="Previous timeline step" title="Previous step"
        disabled={position === 0} onClick={() => seek(position - 1)}><Icon name="left" size={15} /></button>
      <button className="button primary small icon-button" aria-label={playing ? 'Pause' : 'Play'}
        title={playing ? 'Pause' : 'Play'} disabled={!total} onClick={play}><Icon name={playing ? 'pause' : 'play'} size={16} /></button>
      <button className="button small icon-button" aria-label="Next timeline step" title="Next step"
        disabled={position >= total} onClick={() => seek(position + 1)}><Icon name="right" size={15} /></button>
      <input type="range" aria-label="Timeline position" aria-valuetext={current
        ? `Step ${position} of ${total}, source index ${current.first_idx}` : 'Before the first step'}
        min={0} max={total} value={position} disabled={!total} onChange={(event) => seek(Number(event.target.value))} />
    </div>
  </section>;
}

function LoadedGraph({ run, graphs, phases, theme, initialIndex, onInspect }: {
  run: Run; graphs: RunGraphs; phases: Phase[]; theme: Theme; initialIndex: StepIndex | null; onInspect: (index: StepIndex | null) => void;
}) {
  const details = useResource<{ steps: Step[] }>([run.steps_file], true);
  const steps = details.state.status === 'ready' ? details.state.data.steps : [];
  const [canvasMode, setCanvasMode] = useState('graph');
  const [layers, setLayers] = useState<ReadonlySet<string>>(new Set(['reasoning','tools','results']));
  const [showLegend, setShowLegend] = useState(false);
  const [sidebarTab, setSidebarTab] = useState('Details');
  const [inspectorOpen,setInspectorOpen]=useState(initialIndex!=null||graphs.expanded.nodes.length<executionThreshold);
  const inspectorToggle=useRef<HTMLButtonElement>(null);
  const finalIndices = useMemo(() => new Set(steps.filter(s => s.tags.includes('final_message')).map(s => String(s.idx))), [steps]);
  const [unfolded, setUnfolded] = useState(graphs.expanded.nodes.length < foldThreshold);
  const [openBlocks, setOpenBlocks] = useState<ReadonlySet<string>>(new Set());
  const [hierarchy, setHierarchy] = useState(false);
  const [overview, setOverview] = useState(graphs.expanded.nodes.length >= executionThreshold);
  const [expandedSections,setExpandedSections]=useState<string[]>([]);
  const [expansionRequest,setExpansionRequest]=useState<{id:string;open:boolean;sequence:number}>();
  const [resetVersion,setResetVersion]=useState(0);
  const [allConnections, setAllConnections] = useState(false);
  const [locateRequest, setLocateRequest] = useState(0);
  const [navigatorFocus, setNavigatorFocus] = useState(0);
  const [openGroups, setOpenGroups] = useState<ReadonlySet<string>>(new Set());
  const [activeId, setActiveId] = useState<string | null>(null);
  const [phase, setPhase] = useState('');
  const [category, setCategory] = useState('');
  const [errors, setErrors] = useState(false);
  const [index, setIndex] = useState<StepIndex | null>(initialIndex);
  const [position, setPosition] = useState(initialIndex == null ? graphs.expanded.nodes.length : graphs.expanded.nodes.findIndex((node) => node.first_idx === initialIndex) + 1);
  const { enabled, toggle } = useEdgeTypes();
  const allFolded = useMemo(() => foldGraph(graphs.expanded), [graphs]);
  const folded = useMemo(() => foldGraph(graphs.expanded, openBlocks), [graphs, openBlocks]);
  const savings = graphs.expanded.nodes.length - allFolded.nodes.length;
  const hierarchyView = useMemo(() => hierarchyGraph(graphs.expanded, openGroups), [graphs, openGroups]);
  const executionView = useMemo(()=>inlineExecutionGraph(graphs.expanded,new Set(expandedSections),steps),[graphs,expandedSections,steps]);
  const sourcePath=useCallback((idx:StepIndex)=>executionPath(graphs.expanded,idx,steps).flatMap(range=>executionSection(graphs.expanded,range,steps)?.id??[]),[graphs,steps]);
  const initialEvidence = useRef<{graphs:RunGraphs;steps:Step[]} | undefined>(undefined);
  useEffect(()=>{
    if(details.state.status!=='ready')return;
    if(initialEvidence.current?.graphs===graphs&&initialEvidence.current.steps===steps)return;
    if(index!=null)setExpandedSections(previous=>[...new Set([...previous,...sourcePath(index)])]);
    initialEvidence.current={graphs,steps};
  },[details.state.status,graphs,index,steps,sourcePath]);
  const intervals = overview ? executionView : hierarchy ? hierarchyView : unfolded ? graphs.expanded : folded;
  const matches = useMemo(() => new Set(graphs.expanded.nodes.filter((node) =>
    (!phase || node.phase === phase) && (!category || node.category === category) && (!errors || node.error) && layers.has(finalIndices.has(String(node.first_idx)) ? 'results' : node.category === 'plan' || node.category === 'message' ? 'reasoning' : 'tools'))
    .map((node) => node.first_idx)), [graphs, phase, category, errors, layers, finalIndices]);
  const graph = useMemo(() => filterGraph(intervals, (node) => node.step_indices.some((idx) => matches.has(idx))), [intervals, matches]);
  const byIndex = useMemo(() => {
    const result = new Map<StepIndex, GraphNode>();
    for (const node of graph.nodes) for (const step of node.step_indices) result.set(step, node);
    return result;
  }, [graph]);
  const ordinals = useMemo(() => new Map(graphs.expanded.nodes.map((node, ordinal) => [node.first_idx, ordinal])), [graphs]);
  const positionsInTime = useMemo(() => new Map(graph.nodes.map((node) => [node.id, ordinals.get(node.first_idx) ?? 0])), [graph, ordinals]);
  const selected = graph.nodes.find((node) => node.id === activeId) ?? graph.groups?.find(group=>group.node.id===activeId)?.node ?? (index == null ? undefined : byIndex.get(index));
  // A collapsed canvas representative is not the inspected source. Keep the
  // exact call's evidence in place instead of inserting a group's member list.
  const inspectedNode = overview && index != null ? graphs.expanded.nodes[ordinals.get(index) ?? -1] ?? selected : selected;
  const chooseIndex = useCallback((idx: StepIndex) => {
    setInspectorOpen(true);
    setSidebarTab('Details');
    setActiveId(null);
    setIndex(idx);
    onInspect(idx);
    setPosition((ordinals.get(idx) ?? 0) + 1);
  }, [ordinals, onInspect]);
  const selectIndex = useCallback((idx: StepIndex) => {
    if (overview && !executionView.nodes.some(node => !node.view && node.first_idx === idx))
      setExpandedSections(previous=>[...new Set([...previous,...sourcePath(idx)])]);
    chooseIndex(idx);
  }, [overview,executionView,chooseIndex,sourcePath]);
  const locate = useCallback((idx: StepIndex) => {
    setPhase(''); setCategory(''); setErrors(false); setLayers(new Set(['reasoning','tools','results']));
    setSidebarTab('Details');
    setLocateRequest(previous=>previous+1);
    selectIndex(idx);
  }, [selectIndex]);
  const toggleSection=useCallback((node:GraphNode)=>{
    const open=!executionView.groups?.some(group=>group.node.id===node.id);
    if(open)setExpandedSections(previous=>[...previous.filter(id=>id!==node.id),node.id]);
    else{
      const descendants=new Set(executionView.groups?.filter(group=>group.node.view!.start!>=node.view!.start!&&group.node.view!.end!<=node.view!.end!).map(group=>group.node.id));
      setExpandedSections(previous=>previous.filter(id=>!descendants.has(id)));
    }
    if(index==null){setActiveId(node.id);setInspectorOpen(true);}
    setExpansionRequest(previous=>({id:node.id,open,sequence:(previous?.sequence??0)+1}));
  },[executionView,index]);
  const selectNode = useCallback((node: GraphNode) => {
    if (overview && node.view?.kind === 'section') {
      toggleSection(node);
      return;
    }
    selectIndex(node.step_indices[0] ?? node.first_idx);
    if (node.view) {
      setActiveId(node.id);
      setOpenGroups((previous) => {
        const next = new Set(previous);
        if (next.has(node.id)) next.delete(node.id); else next.add(node.id);
        return next;
      });
    }
  }, [selectIndex,overview,toggleSection]);
  const connectionGraph = useMemo(()=>allConnections ? graph : selectedRelationships(graphs.expanded,graph,index),[graph,graphs,index,allConnections]);
  const hiddenConnections = graph.edges.reduce((sum,edge)=>sum+edge.count,0)-connectionGraph.edges.reduce((sum,edge)=>sum+edge.count,0);
  const lastExpanded=expandedSections.slice().reverse().flatMap(id=>executionView.groups?.find(group=>group.node.id===id)?.node??[])[0];
  const canCollapse = !overview || Boolean(executionView.groups?.length);
  const navigatorRanges = useMemo(()=>{
    const nodes=graphs.expanded.nodes, size=Math.max(1,Math.ceil(nodes.length/96));
    return Array.from({length:Math.ceil(nodes.length/size)},(_,i)=>{
      const start=i*size,end=Math.min(start+size,nodes.length),members=nodes.slice(start,end);
      return {start,end,first:members[0],last:members.at(-1)!,failure:members.find(node=>node.error),selected:members.some(node=>node.first_idx===index)};
    });
  },[graphs,index]);
  const nextFailure = graphs.expanded.nodes.find((node,i)=>node.error && i>(index==null?-1:ordinals.get(index)??-1)) ?? graphs.expanded.nodes.find(node=>node.error);
  const internalEdges = useMemo(() => {
    const indices = new Set(inspectedNode?.step_indices);
    const ids = new Set(graphs.expanded.nodes.filter((node) => indices.has(node.first_idx)).map((node) => node.id));
    return graphs.expanded.edges.filter((edge) => ids.has(edge.source) && ids.has(edge.target));
  }, [inspectedNode, graphs]);
  function playback(next: number) {
    setPosition(next);
    const current = graphs.expanded.nodes[next - 1];
    if (current) locate(current.first_idx);
  }


  const commands = <>

    <div className="segments" role="group" aria-label="Graph workspace view"><button aria-pressed={canvasMode === 'graph'} onClick={() => setCanvasMode('graph')}><Icon name="graph" size={15}/>Graph</button><button aria-pressed={canvasMode === 'timeline'} onClick={() => setCanvasMode('timeline')}><Icon name="events" size={15}/>Timeline</button></div>
    <details className="graph-options"><summary><Icon name="layers" size={15}/>Layers <Icon name="down" size={13}/></summary><div className="graph-option-body">
      <h3>Layers &amp; filters</h3>
        <div className="graph-layers"><label>Layers: <select aria-label="Graph layers" value={layers.size === 3 ? 'all' : layers.size === 1 && layers.has('tools') ? 'tools' : 'custom'} onChange={e => setLayers(new Set(e.target.value === 'all' ? ['reasoning','tools','results'] : e.target.value === 'tools' ? ['tools'] : ['reasoning','results']))}><option value="all">All Layers (4)</option><option value="tools">Tool Calls only</option><option value="custom">Custom / evidence</option></select></label>
          <label title="Per-step agent identity and parent links are unrecorded"><input type="checkbox" disabled/>Agents <small>(unrecorded)</small></label>
          {[['reasoning','Reasoning'],['tools','Tool Calls'],['results','Results']].map(([key,title]) => <label key={key}><input type="checkbox" checked={layers.has(key)} onChange={() => setLayers(previous => { const next=new Set(previous); if(next.has(key))next.delete(key);else next.add(key);return next; })}/>{title}</label>)}
        </div>
        <div className="dag-filters" role="group" aria-label="Filter DAG steps">
          <label>Phase <select aria-label="Filter DAG phase" value={phase} onChange={(event) => setPhase(event.target.value)}>
            <option value="">All phases</option>{phases.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
          </select></label>
          <label>Tool <select aria-label="Filter DAG tool category" value={category} onChange={(event) => setCategory(event.target.value)}>
            <option value="">All categories</option>{categories.map((item) => <option key={item} value={item}>{capitalize(item)}</option>)}
          </select></label>
          <label><input type="checkbox" checked={errors} onChange={(event) => setErrors(event.target.checked)} /> Errors only</label>
          <button className="button small quiet" onClick={() => { setPhase(''); setCategory(''); setErrors(false); }}>Reset step filters</button>
        </div>
        {hierarchy && <div className="hierarchy-guide"><strong>Source order ↓ · indentation shows containment</strong>
          <span>Select a phase or loop to expand it, then an iteration to reveal its calls.</span>
          <button className="button small quiet" onClick={() => { setOpenGroups(new Set()); setActiveId(null); }}>Collapse groups</button>
        </div>}
        {(phase || category || errors) && <p className="filter-note">{graph.nodes.length} visible intervals. Folded blocks keep their full source interval when any member matches.</p>}
        <EdgeControls enabled={enabled} toggle={toggle} theme={theme} />
        <label className="connection-detail"><input type="checkbox" checked={allConnections} onChange={event=>setAllConnections(event.target.checked)}/>All relationships <small>Show every dependency and retry. By default, only relationships of the selected node are drawn; sequence links stay visible.</small></label>
          <div className="segments" role="group" aria-label="DAG detail level">
            <button aria-pressed={overview} onClick={() => { setOverview(true);setHierarchy(false);setExpandedSections([]);setResetVersion(v=>v+1);setActiveId(null); }}>Overview</button>
            <button aria-pressed={!overview&&!hierarchy} onClick={() => { setOverview(false);setHierarchy(false); setActiveId(null); }}>Steps</button>
            <button aria-pressed={!overview&&hierarchy} onClick={() => { setOverview(false);setHierarchy(true); setActiveId(null); }}>Hierarchy</button>
          </div>
          {!overview&&!hierarchy && savings > 0 && <button className="button small" aria-pressed={unfolded} title={unfolded ? `${savings} consecutive repeat steps can be folded` : `${graphs.expanded.nodes.length - intervals.nodes.length} repeat steps are folded`} onClick={() => { setUnfolded(!unfolded); setOpenBlocks(new Set()); }}>{unfolded ? 'Fold repeats' : 'Expand all steps'}</button>}
    </div></details>
    <button className="button small" aria-expanded={showLegend} onClick={() => setShowLegend(!showLegend)}><Icon name="info" size={15}/>Legend</button>
    <button className="button small graph-collapse-all" disabled={!canCollapse}
      title={canCollapse ? 'Return to the compact overview. Keep the selected source step and evidence view.' : 'All sections are already collapsed'}
      onClick={collapseAll}><Icon name="collapse" size={15}/>Collapse all</button>
    <button ref={inspectorToggle} className="button small icon-button" aria-label={inspectorOpen?'Hide node inspector':'Show node inspector'} aria-expanded={inspectorOpen} title={inspectorOpen?'Hide node inspector':'Show node inspector'} onClick={()=>setInspectorOpen(!inspectorOpen)}><Icon name="panel" size={16}/></button>
  </>;
  function clearSelection() {
    const selectedIndex=index,selectedId=selected?.id;
    setIndex(null);setActiveId(null);onInspect(null);
    requestAnimationFrame(()=>Array.from(document.querySelectorAll<SVGGElement>('.graph-panel svg [data-node-id],.graph-panel svg [data-section-toggle]'))
      .find(element=>element.getAttribute('data-node-id')===selectedId||element.getAttribute('data-section-toggle')===selectedId||element.getAttribute('data-source-index')===String(selectedIndex))?.focus({preventScroll:true}));
  }
  function collapseAll() {
    setExpandedSections([]);setOpenGroups(new Set());setOpenBlocks(new Set());
    setOverview(true);setHierarchy(false);setUnfolded(false);setActiveId(null);setResetVersion(v=>v+1);
  }
  if(overview&&details.state.status==='loading')return <Loading>Loading execution evidence…</Loading>;
  if(overview&&details.state.status==='error')return <LoadError message={details.state.message} retry={details.retry}/>;
  const currentStep = steps.find(step=>String(step.idx)===String(index));
  const currentTitle = currentStep ? stepTitle(currentStep,selected) : selected?.label;
  const fullscreenHint = index!=null ? `${currentTitle ?? 'Source step'} · ${sourceIndex(index)}` : selected ? `${selected.label} · ${selected.count} source steps` : 'Select a node to inspect its recorded evidence';
  return <>
    <RunMetadata run={run} date={steps.find(s => !!s.ts)?.ts}/>
    <div className="graph-stage-previews"><StageSnapshots steps={steps} nodes={graphs.expanded.nodes} selected={index} select={locate} kind="graph"/></div>
    <div className={'graph-workspace'+(inspectorOpen?'':' graph-inspector-closed')}>
      <div className="graph-fullscreen-bar"><Icon name="graph" size={19}/><strong title={run.id}>{run.id}</strong><span className="fullscreen-selection" aria-live="polite" title={fullscreenHint}>{fullscreenHint}</span>
        <details className="fullscreen-graph-help"><summary aria-label="Graph fullscreen help" title="Graph navigation help"><Icon name="help" size={19}/></summary><div><strong>Read the execution graph</strong><p>Scroll or drag to pan. Hold Ctrl / ⌘ while scrolling to zoom.</p><p>Fit shows all visible nodes. Locate brings the selected source back into view. Arrow keys move the focused canvas; Tab reaches nodes and controls.</p><p>Layers filters recorded steps and connections. Click a section to expand in place; Alt+↑ collapses the last section. Esc returns from fullscreen.</p></div></details>
        <button className="button small fullscreen-exit" onClick={() => fullScreen(null)}><Icon name="fit" size={15}/>Exit fullscreen</button></div>
      <section className="panel graph-panel" aria-label="Run process graph" onKeyDownCapture={event => {
        if (!overview || canvasMode !== 'graph' || !lastExpanded || !event.altKey || event.key !== 'ArrowUp') return;
        if (event.target instanceof Element && event.target.closest('input,textarea,select,[contenteditable="true"]')) return;
        event.preventDefault();event.stopPropagation();toggleSection(lastExpanded);
      }}>
        {overview && canvasMode==='graph' && <div className="execution-navigation" aria-label="Execution map navigation">
          <div className="execution-path">
            <button className="button small execution-back" disabled={!lastExpanded} title="Collapse the most recently expanded section (Alt+↑)" aria-keyshortcuts="Alt+ArrowUp" onClick={() => lastExpanded&&toggleSection(lastExpanded)}><Icon name="left" size={14}/>Collapse last</button>
            <span className="execution-expanded-count">{executionView.groups?.length??0} sections expanded</span>
            <button className="button small jump-action" data-kind="failure" aria-label="Next failure" title="Locate the next recorded failure" disabled={!nextFailure} onClick={()=>nextFailure&&locate(nextFailure.first_idx)}><Icon name="warning" size={15}/>Failure<Icon name="right" size={12}/></button><span>{graphs.expanded.nodes.length} / {graphs.expanded.nodes.length} source steps</span>
          </div>
          <div className="execution-overview-strip" role="toolbar" aria-label="Source step navigator. Use arrow keys, Home or End, then Enter to locate.">{navigatorRanges.map((range,i)=><button key={range.start} tabIndex={i===navigatorFocus?0:-1} title={`Steps ${range.start+1}–${range.end} · source ${sourceIndex(range.first.first_idx)} → ${sourceIndex(range.last.first_idx)}${range.failure?' · contains failure':''}`} aria-label={`Locate ${range.failure?'failure in ':''}source range ${sourceIndex(range.first.first_idx)} to ${sourceIndex(range.last.first_idx)}`} className={`${range.failure?'failed':''} ${range.selected?'selected':''} ${executionView.groups?.some(group=>range.start<group.node.view!.end!&&range.end>group.node.view!.start!)?'in-scope':''}`} onFocus={()=>setNavigatorFocus(i)} onKeyDown={event=>{
            const next=event.key==='Home'?0:event.key==='End'?navigatorRanges.length-1:event.key==='ArrowRight'?Math.min(i+1,navigatorRanges.length-1):event.key==='ArrowLeft'?Math.max(i-1,0):null;
            if(next==null)return;event.preventDefault();setNavigatorFocus(next);event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('button')[next]?.focus();
          }} onClick={()=>locate((range.failure??range.first).first_idx)} />)}</div>
          <p><Icon name="info" size={13}/>Read → then ↓ · matching numbers continue across rows.{!steps.some(step=>step.ts)&&' Timestamps unrecorded.'}{hiddenConnections>0&&` ${hiddenConnections} other ${hiddenConnections===1?'relationship':'relationships'} on selection · All in Layers.`}</p>
        </div>}
        {canvasMode === 'timeline' ? <><div className="graph-toolbar">{commands}</div><EventTimeline runId={run.id} steps={steps} nodes={graphs.expanded.nodes} selected={index ?? steps[0]?.idx ?? 0} select={locate}/></> : <GraphView toolbar={commands} graph={connectionGraph} phases={phases} theme={theme} enabled={enabled}
          name={`${run.id}-expanded`} onNode={selectNode} selected={selected?.id}
          execution={overview} searchGraph={overview?graphs.expanded:undefined} onLocate={overview?node=>locate(node.first_idx):undefined} locateRequest={locateRequest}
          onSourceJump={locate}
          expansionRequest={overview?expansionRequest:undefined} framingKey={`${overview?'overview':hierarchy?'hierarchy':'steps'}-${resetVersion}`}
          positionsInTime={positionsInTime} reached={overview?undefined:position} legend={false} />}
        {showLegend && <div className="execution-legend" aria-label="Execution graph semantics"><NodeTypeLegend/>{overview&&<span><Icon name="right" size={15}/>Matching numbers · same sequence across rows</span>}<span><Icon name="spark" size={15}/>Reasoning / text · recorded role unknown</span><span><Icon name="user" size={15}/>Sub-Agent · unrecorded</span><span className="error-text"><Icon name="info" size={15}/>Failure · red outline</span><span><Icon name="retry" size={15}/>Retry · forward dashed edge</span><span><Icon name="graph" size={15}/>Merge · dependency join</span><span className="success-text"><Icon name="check" size={15}/>Completion · final record</span></div>}

        <section className="graph-secondary" aria-label="Execution activity">
          <Timeline nodes={graphs.expanded.nodes} position={position} change={playback} phases={phases} inspect={locate} />
          <details className="graph-activity-disclosure"><summary>Agent activity <span>{number.format(graphs.expanded.nodes.length)} source steps</span></summary>
            <AgentActivity run={run} steps={steps} nodes={graphs.expanded.nodes} selected={index} select={locate}/>
          </details>
        </section>
      </section>
      <div className="trace-sidebar" hidden={!inspectorOpen} onKeyDown={e=>{if(e.key==='Escape'){e.preventDefault();setInspectorOpen(false);requestAnimationFrame(()=>inspectorToggle.current?.focus());}}}>
        <div className="focus-tabs sidebar-tabs" role="group" aria-label="Graph side panel">{['Details','Files & activity','Signatures'].map(name=><button key={name} aria-pressed={sidebarTab===name} onClick={()=>setSidebarTab(name)}>{name}</button>)}</div>
        <div className="graph-side-content" hidden={sidebarTab!=='Details'}><Inspector graphWorkspace run={run} node={inspectedNode} index={index} select={selectIndex} locate={locate}
          clear={clearSelection} phases={phases}
          relatedGraph={graphs.expanded} internalEdges={internalEdges} variant="node" expand={inspectedNode && inspectedNode.count > 1 ? () => {
            if (inspectedNode.view?.kind === 'section') {toggleSection(inspectedNode);return;}
            if (inspectedNode.view) { setOpenGroups((previous) => new Set([...previous, inspectedNode.id])); return; }
            const ids = graphs.expanded.nodes.filter((node) => inspectedNode.step_indices.includes(node.first_idx)).map((node) => node.id);
            setOpenBlocks((previous) => new Set([...previous, ...ids]));
          } : undefined} /></div>
        <div className="graph-side-content" hidden={sidebarTab!=='Files & activity'}><TraceOverview run={run} locate={locate} /></div>
        <section className="panel signature-summary graph-side-content" aria-label="Signature summary" hidden={sidebarTab!=='Signatures'}>
          <div className="panel-head"><div><h2>Signature summary</h2>
            <p>{number.format(graphs.aggregated.nodes.length)} signatures · {run.metrics.repeated_actions} repeats · {run.metrics.cycles} cyclic groups</p></div></div>
          <details><summary>Signature frequencies</summary><div className="signature-list">
            {graphs.aggregated.nodes.map((node) => <button key={node.id} className="node-result" onClick={() => locate(node.first_idx)}>
              {node.label} <strong>×{node.count}</strong></button>)}
          </div></details>
        </section>
      </div>
    </div>
  </>;
}

export function RunGraph({ run, phases, theme, initialIndex = null, onInspect = () => {} }: { run: Run; phases: Phase[]; theme: Theme; initialIndex?: StepIndex | null; onInspect?: (index: StepIndex | null) => void }) {
  const resource = useResource<RunGraphs>([run.file], true);
  return <>
    {resource.state.status === 'loading' && <Loading>Loading run graph…</Loading>}
    {resource.state.status === 'error' && <LoadError message={resource.state.message} retry={resource.retry} />}
    {resource.state.status === 'ready' && resource.state.warning && <div className="refresh-warning" role="alert">
      <span>Live refresh failed. Showing the last available graph. {resource.state.warning}</span>
      <button className="button small" onClick={resource.retry}>Retry refresh</button>
    </div>}
    {resource.state.status === 'ready' && <LoadedGraph key={run.id} run={run} graphs={resource.state.data} phases={phases} theme={theme} initialIndex={initialIndex} onInspect={onInspect} />}
  </>;
}
