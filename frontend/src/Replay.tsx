import { useEffect, useMemo, useRef, useState } from 'react';
import { useResource } from './data';
import { Inspector } from './Inspector';
import { number, sourceIndex, type GraphNode, type Phase, type Run, type RunGraphs, type Step, type StepIndex } from './model';
import { CopyButton, download, Icon, LoadError, Loading } from './ui';
import { categoryIcon, categoryName, evidenceKind, clock, eventStatus, eventTime, failed, fileContent, fullScreen, label, Output, patchStats, patchEvidence, RecordedCode, RunMetadata, StageSnapshots, stepTitle } from './Evidence';
import { EventTimeline } from './Timeline';
import { literalFileWrites } from './recordedEdits';
export { RunMetadata as RunSummary } from './Evidence';
export function Annotation({ run, step }: { run: Run; step: Step }) {
  const key = `trajviz-note:${run.id}:${step.raw_ref.file}:${step.idx}`;
  const [value, setValue] = useState(() => { try { return localStorage.getItem(key) || ''; } catch { return ''; } });
  const [status, setStatus] = useState('');
  function save(next: string) {
    setValue(next);
    try { localStorage.setItem(key, next); setStatus('Saved on this browser'); }
    catch { setStatus('Browser storage unavailable; export to keep this note'); }
  }
  return <section className="panel annotation">
    <div className="panel-head"><div><h2>Annotation</h2><p>Personal note · separate from trace evidence</p></div></div>
    <label className="sr-only" htmlFor="step-note">Note for source step {sourceIndex(step.idx)}</label>
    <textarea id="step-note" value={value} placeholder="Add a note about this step…" onChange={(e) => save(e.target.value)} />
    <div className="annotation-actions"><span role="status">{status || 'Stored only on this browser'}</span>
      <button className="button small quiet" disabled={!value} onClick={() => download(new Blob([JSON.stringify({ run: run.id, source_index: step.idx, note: value }, null, 2)],
        { type: 'application/json' }), 'trajviz-note.json')}>Export note</button></div>
  </section>;
}


function Transport({ steps, position, select, inspection, toggleInspection }: {
  steps: Step[]; position: number; select: (position: number) => void; inspection: boolean; toggleInspection: () => void;
}) {
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  useEffect(() => {
    if (!playing) return;
    if (position >= steps.length - 1) { setPlaying(false); return; }
    const timer = window.setTimeout(() => select(position + 1), 800 / speed);
    return () => window.clearTimeout(timer);
  }, [playing, position, steps.length, speed, select]);
  const seek = (next: number) => { setPlaying(false); select(next); };
  return <section className="replay-transport panel" aria-label="Replay controls">
    <div className="transport-buttons">
      <button className="button icon-button" aria-label="First replay step" title="First step" disabled={!steps.length || position === 0} onClick={() => seek(0)}><Icon name="first" /></button>
      <button className="button primary icon-button play-circle" aria-label={playing ? 'Pause replay' : 'Play replay'} title={playing ? 'Pause' : 'Play'} disabled={!steps.length} onClick={() => { if (!playing && position >= steps.length - 1) select(0); setPlaying(!playing); }}><Icon name={playing ? 'pause' : 'play'} size={22} /></button>
      <button className="button icon-button" aria-label="Next replay step" title="Next step" disabled={!steps.length || position >= steps.length - 1} onClick={() => seek(position + 1)}><Icon name="right" /></button>
    </div>
    <span className="transport-time mono">{steps[position] ? eventTime(steps[position],steps[0]) : '—'} / {steps.at(-1) ? eventTime(steps.at(-1)!,steps[0]) : '—'}</span>
    <input type="range" aria-label="Replay position" min={0} max={Math.max(0,steps.length - 1)} value={position} disabled={!steps.length}
      style={{'--progress': (steps.length > 1 ? position / (steps.length - 1) * 100 : 0) + '%'} as React.CSSProperties}
      aria-valuetext={'Step ' + (position + 1) + ' of ' + steps.length + ', source index ' + (steps[position]?.idx ?? 'none')}
      onChange={e => seek(Number(e.target.value))} />
    <button className="button icon-button" aria-label="Previous replay step" disabled={!steps.length || position === 0} onClick={() => seek(position - 1)}><Icon name="left" /></button>
    <span className="transport-position">Step {steps.length ? position + 1 : 0} / {number.format(steps.length)} <span className="muted">· {sourceIndex(steps[position]?.idx)}</span></span>
    <label className="speed-control">Speed <select aria-label="Replay speed" value={speed} onChange={e => setSpeed(Number(e.target.value))}>{[0.5,1,2,4].map(v => <option key={v} value={v}>{v}×</option>)}</select></label>
    <button className="button icon-button" aria-label="Toggle playback inspection panel" title="Toggle inspection panel" aria-expanded={inspection} onClick={toggleInspection}><Icon name="panel" /></button>
    <button className="button icon-button" aria-label="Fullscreen replay" title="Fullscreen workspace" onClick={() => fullScreen(document.querySelector('main'))}><Icon name="fit" /></button>
  </section>;
}
function LoadedReplay({ run, graphs, steps, phases, timeline, index, onSelect }: {
  run: Run; graphs: RunGraphs; steps: Step[]; phases: Phase[]; timeline: boolean; index: StepIndex | null; onSelect: (index: StepIndex) => void;
}) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [status, setStatus] = useState('all');
  // Auto chooses evidence until the user pins a view. Source navigation changes
  // the evidence, not that preference or the working area's open panels.
  const [preferredView, setPreferredView] = useState<'auto' | 'workspace' | 'patch' | 'text' | 'event'>('auto');
  const [output, setOutput] = useState('terminal');
  const [outputOpen, setOutputOpen] = useState<boolean | null>(null);
  const [showLog, setShowLog] = useState(true);
  const [inspection, setInspection] = useState(() => timeline && window.innerWidth > 1000);
  const inspectionReturn = useRef<HTMLElement | null>(null);
  const closeInspection = () => { setInspection(false); requestAnimationFrame(()=>inspectionReturn.current?.focus({preventScroll:true})); };
  const toggleInspection = () => {
    if (inspection) { closeInspection(); return; }
    inspectionReturn.current=document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setInspection(true);
    requestAnimationFrame(()=>{const heading=document.querySelector<HTMLElement>('#replay-inspection h2');if(heading){heading.tabIndex=-1;heading.focus({preventScroll:true});}});
  };
  const selectedRow = useRef<HTMLButtonElement>(null);
  const position = Math.max(0,steps.findIndex(s => String(s.idx) === String(index)));
  const step = steps[position];
  const previous = steps[position-1];
  const delta = step?.ts && previous?.ts ? (Date.parse(step.ts)-Date.parse(previous.ts))/1000 : NaN;
  const nodeMap = useMemo(() => new Map(graphs.expanded.nodes.map(n => [String(n.first_idx),n])),[graphs]);
  const node = nodeMap.get(String(step?.idx));
  const evidence=patchEvidence(step,steps),patch=evidence?.text??null;
  const automaticView = patch ? 'patch' : fileContent(step,node) ? 'workspace' : 'event';
  const view = preferredView === 'auto' ? automaticView : preferredView;
  const showOutput = outputOpen ?? Boolean(patch || fileContent(step,node));
  const setView = (next: typeof preferredView) => {
    setPreferredView(next);
    if (next !== 'auto') setOutputOpen(previous => previous ?? showOutput);
  };
  useEffect(() => { if (index == null && steps[0]) onSelect(steps[0].idx); }, [index, steps, onSelect]);
  const ordinals = useMemo(() => new Map(steps.map((s,i) => [String(s.idx),i])),[steps]);
  const filtered = useMemo(() => steps.filter(s => (filter === 'all' || (filter === 'errors' ? failed(s) : filter === 'text' ? !s.action : nodeMap.get(String(s.idx))?.category === filter)) &&
    (status === 'all' || (status === 'failed' ? failed(s) : status === 'success' ? s.observation?.exit_code === 0 : eventStatus(s) === 'Unrecorded')) &&
    (!query || JSON.stringify(s).toLowerCase().includes(query.toLowerCase()))),[steps,filter,status,query,nodeMap]);
  // Visibility is the reader's choice. Responsive CSS changes the panel into a
  // drawer without resetting it during resizing, playback or browser capture.
  useEffect(() => {
    const row = selectedRow.current, list = row?.parentElement;
    if (!row || !list) return;
    const reveal = () => {
      const a = row.getBoundingClientRect(), b = list.getBoundingClientRect();
      if(a.top < b.top) list.scrollTop += a.top-b.top;
      else if(a.bottom > b.bottom) list.scrollTop += a.bottom-b.bottom;
    };
    reveal();
    const observer = new ResizeObserver(reveal);
    observer.observe(list);
    return () => observer.disconnect();
  },[step?.idx,filter,query]);
  useEffect(() => {
    if (!timeline || !showLog) return;
    const row = document.querySelector('.timeline-event-table .selected-event');
    const list = row?.closest('.table-scroll');
    if (!row || !list) return;
    const a = row.getBoundingClientRect(), b = list.getBoundingClientRect();
    const start=b.top+(list.querySelector('thead')?.getBoundingClientRect().height ?? 0);
    if (a.top < start) list.scrollTop += a.top-start;
    else if (a.bottom > b.bottom) list.scrollTop += a.bottom-b.bottom;
  },[timeline,showLog,step?.idx,filter,status,query]);
  const content = fileContent(step,node);
  const submitted=literalFileWrites(step)[0];
  const stats = patchStats(step,patch);
  const contextStep = steps.slice(0,position+1).reverse().find(s => nodeMap.get(String(s.idx))?.category === 'read' && s.action?.targets.some(path => step?.action?.targets.includes(path)));
  const contextContent = contextStep?.observation?.text ?? null;
  const nextEdit = steps.slice(position+1).find(s => nodeMap.get(String(s.idx))?.category === 'edit');
  const nextValidation = steps.slice(position+1).find(s => nodeMap.get(String(s.idx))?.category === 'validate');
  const nextFailure = steps.slice(position+1).find(failed) ?? steps.find(failed);
  const choose = (idx: StepIndex) => {
    if (!filtered.some(s => s.idx === idx)) {setQuery('');setFilter('all');setStatus('all');}
    onSelect(idx);
  };
  const categories = <><option value="all">All Categories</option><option value="errors">Errors</option><option value="text">Recorded text</option><option value="read">File reads</option><option value="edit">Edits</option><option value="validate">Validation</option><option value="shell">Shell</option></>;
  if (!step) return <><div className="panel evidence-empty"><strong>No recorded steps</strong><p>This run has no events to replay.</p></div><Transport steps={steps} position={0} select={() => {}} inspection={inspection} toggleInspection={() => setInspection(!inspection)} /></>;
  return <>
    <StageSnapshots steps={steps} nodes={graphs.expanded.nodes} selected={step.idx} select={choose} count={timeline ? 5 : 6} heading={timeline} />
    <div className={timeline ? "trace-tools timeline-tools" : "trace-tools"}><span>{timeline ? 'Execution timeline' : 'Trajectory replay'} <span className="muted">/ {sourceIndex(step.idx)}</span></span>
      <div><button className="button small jump-action" data-kind="failure" aria-label="Next failure" title="Jump to the next recorded failure" disabled={!nextFailure} onClick={() => nextFailure && choose(nextFailure.idx)}><Icon name="warning" size={16} />Failure<Icon name="right" size={12}/></button>
        <button className="button small jump-action" data-kind="edit" aria-label="Next edit" title="Jump to the next code edit" disabled={!nextEdit} onClick={() => nextEdit && choose(nextEdit.idx)}><Icon name="edit" size={16}/>Edit<Icon name="right" size={12}/></button>
        <button className="button small jump-action" data-kind="validate" aria-label="Next validation" title="Jump to the next recorded validation" disabled={!nextValidation} onClick={() => nextValidation && choose(nextValidation.idx)}><Icon name="test" size={16}/>Validation<Icon name="right" size={12}/></button>
        <button className="button small" aria-label={inspection ? 'Hide inspection' : 'Show inspection'} aria-expanded={inspection} aria-controls="replay-inspection" onClick={toggleInspection}><Icon name="panel" size={14}/>{timeline ? 'Event details' : 'Step details'}</button></div></div>
    <div className={(timeline ? 'timeline-workspace' : 'replay-workspace') + (inspection ? '' : ' inspection-collapsed')}>
      {timeline&&<div className="timeline-fullscreen-bar"><Icon name="events" size={17}/><strong>{run.id}</strong><span>Choose an event to inspect its recorded evidence</span><button className="button small" onClick={()=>setInspection(true)}>Event details</button><button className="button small" onClick={()=>fullScreen(null)}><Icon name="close" size={14}/>Exit fullscreen</button></div>}
      {!timeline && <section className="panel event-list" aria-label="Trajectory events">
        <div className="panel-head"><h2>Trajectory <span className="muted">({number.format(steps.length)} steps)</span></h2></div>
        <div className="event-search"><label><Icon name="search" size={13} /><input type="search" aria-label="Search trajectory events" placeholder="Search steps…" value={query} onChange={e => setQuery(e.target.value)} /></label><select aria-label="Filter trajectory events" value={filter} onChange={e => setFilter(e.target.value)}>{categories}</select></div>
        <div className="event-rows">{filtered.map(item => {const n=nodeMap.get(String(item.idx));return <button key={String(item.idx)} ref={item.idx === step.idx ? selectedRow : null}
          className={'event-row ' + (failed(item) ? 'has-error' : '')} aria-label={'Source step ' + sourceIndex(item.idx) + ': ' + (failed(item) ? 'error' : item.action?.tool || 'recorded text') + ' ' + label(item)}
          title={sourceIndex(item.idx) + ' · ' + label(item)} aria-pressed={item.idx === step.idx} onClick={() => choose(item.idx)}>
          <span className="event-ordinal">{(ordinals.get(String(item.idx)) ?? 0)+1}</span><span data-kind={evidenceKind(item,n)} className={'event-category-icon kind-icon ' + (failed(item) ? 'error' : n?.category || 'message')}><Icon name={categoryIcon(item,n)} size={17} /></span>
          <span className="event-description"><strong>{stepTitle(item,n)}</strong><small>{label(item)}</small></span><time className="event-time mono" title={item.ts || 'Timestamp unrecorded'}>{eventTime(item,steps[0])}</time>
          <span className={'event-state ' + (failed(item) ? 'error-text' : item.observation?.exit_code === 0 ? 'success-text' : 'muted')} title={eventStatus(item)}><Icon name={failed(item) ? 'close' : item.observation?.exit_code === 0 ? 'check' : 'minus'} size={13} /></span>
        </button>;})}{!filtered.length && <p className="panel-inset muted">No matching events. Change the search or event filter.</p>}</div>
        <div className="event-list-foot">{number.format(filtered.length)} events · source order</div>
      </section>}
      <div className={'replay-center' + (timeline ? !showLog ? ' log-collapsed' : '' : showOutput ? ' output-expanded' : '')}>
        {timeline ? <><EventTimeline runId={run.id} steps={steps} nodes={graphs.expanded.nodes} selected={step.idx} select={choose} revealDetails={()=>setInspection(true)} />
          <section className="panel timeline-records" aria-label="Event log"><div className="panel-head"><h2>Event Log <span className="muted">({filtered.length} events)</span></h2>
            {showLog && <div className="log-filters"><input type="search" aria-label="Search timeline events" placeholder="Search events…" value={query} onChange={e => setQuery(e.target.value)} /><select aria-label="Timeline category" value={filter} onChange={e => setFilter(e.target.value)}>{categories}</select><select aria-label="Timeline status" value={status} onChange={e => setStatus(e.target.value)}><option value="all">All Statuses</option><option value="failed">Failed</option><option value="success">Success</option><option value="unrecorded">Unrecorded</option></select></div>}
            <button className="button small quiet log-toggle" aria-label={showLog ? 'Collapse event log' : 'Expand event log'} aria-expanded={showLog} onClick={()=>setShowLog(!showLog)}><Icon name={showLog ? 'minus' : 'plus'} size={14}/></button></div>
            {showLog && <div className="timeline-event-table table-scroll"><table><thead><tr><th>#</th><th>Timestamp</th><th>Category</th><th>Event</th><th>Status</th></tr></thead><tbody>{filtered.map(item => <tr key={String(item.idx)} className={item.idx === step.idx ? 'selected-event' : ''}>
              <td><button className="button small quiet" aria-label={'Inspect timeline source ' + sourceIndex(item.idx)} onClick={() => choose(item.idx)}>{(ordinals.get(String(item.idx)) ?? 0)+1}</button></td><td className="mono" title={item.ts || 'Timestamp unrecorded'}>{eventTime(item,steps[0])}</td><td><Icon name={categoryIcon(item,nodeMap.get(String(item.idx)))} size={13} />{categoryName(item,nodeMap.get(String(item.idx)))}</td>
              <td><button className="table-event-button" title={label(item)} onClick={() => choose(item.idx)}>{label(item)}</button></td><td className={failed(item) ? 'error-text' : item.observation?.exit_code === 0 ? 'success-text' : 'muted'}>{eventStatus(item)}</td></tr>)}</tbody></table>{!filtered.length && <p className="panel-inset muted">No matching events. Change filters to see recorded steps.</p>}</div>}</section></> : <>
          <section className="panel recorded-workspace" aria-label="Recorded workspace">
            <div className="selected-step-head"><span className="kind-icon" data-kind={evidenceKind(step,node)}><Icon name={categoryIcon(step,node)} size={19}/></span><h2>Step {position+1} · <span>{step.action?.tool || stepTitle(step,node)}</span></h2><span className="type-badge" data-kind={evidenceKind(step,node)}>{node?.category || 'text'}</span><time>t = {eventTime(step,steps[0])}<small title="Gap since the previous recorded timestamp; not call duration">{Number.isFinite(delta) && delta >= 0 ? ' · Δ +' + clock(delta) : ' · Δ unrecorded'}</small></time></div>
            <div className="workspace-tabs evidence-tabs" role="group" aria-label="Recorded content view"><button className="evidence-follow" aria-label="Automatic evidence view" aria-pressed={preferredView === 'auto'} title="Automatically follow the recorded evidence. Selecting another view keeps it across steps." onClick={() => setView('auto')}><Icon name="spark" size={15}/>Auto<span className="auto-indicator" aria-hidden="true"/></button><button aria-pressed={view === 'event'} onClick={() => setView('event')}><Icon name="terminal" size={15}/>Output</button><button aria-label="Diff" aria-pressed={view === 'patch'} onClick={() => setView('patch')}><Icon name="diff" size={15}/>Diff{patch && <small> ({(stats.added ?? 0)+(stats.removed ?? 0)})</small>}</button><button aria-pressed={view === 'workspace'} onClick={() => setView('workspace')}><Icon name="file" size={15}/>Updated File</button><button aria-pressed={view === 'text'} onClick={() => setView('text')}><Icon name="layers" size={15}/>File Context</button>
              <CopyButton text={view === 'patch' ? patch || '' : view === 'workspace' ? content || '' : view === 'event' ? step.observation?.text || step.thought || '' : contextContent || step.thought || ''} /><button className="button small icon-button" aria-label="Expand evidence" title="Expand evidence" onClick={e => fullScreen(e.currentTarget.closest('section'))}><Icon name="fit" size={15} /></button></div>
            <p className="selected-step-description" title={step.thought || label(step)}>{step.thought || label(step)}</p>
            <div className="recorded-path"><Icon name="file" size={15} /><span title={evidence?.path||step.action?.targets.join(', ') || ''}>{evidence?.path||step.action?.targets.join(', ') || (typeof step.action?.args.path === 'string' ? step.action.args.path : 'No explicit file target')}</span>{patch && <span className="diff-count"><i>−{stats.removed}</i><b>+{stats.added}</b></span>}</div>
            {view==='patch'&&evidence?.note&&<p className="recorded-caption">{evidence.note}</p>}
            {view==='workspace'&&submitted&&<p className="recorded-caption">Submitted file · {submitted.path} · literal content in the saved command; filesystem version unrecorded.</p>}
            <div className="recorded-code">{view === 'event' ? step.action ? <Output step={step} ariaLabel="Selected step evidence"/> : <div className="recorded-prose"><pre>{step.thought || 'Text unrecorded for this step.'}</pre><p className="muted">Recorded text · message and reasoning roles unavailable</p></div> : view === 'patch' && patch || view === 'workspace' ? <RecordedCode value={view === 'patch' ? patch : content} patch={view === 'patch'} ariaLabel={view==='patch'&&evidence?.derived?'Submitted write comparison':undefined} /> :
              view === 'patch' ? <RecordedCode value={null} patch /> : step.action?.targets.length ? <><p className="recorded-caption">{contextStep ? 'Recorded file context · source ' + sourceIndex(contextStep.idx) : 'File context unrecorded'} · excerpt line numbers</p><RecordedCode value={contextContent}/>{contextStep && contextStep.idx !== step.idx && <button className="button small quiet" onClick={() => choose(contextStep.idx)}>Go to file context {sourceIndex(contextStep.idx)}</button>}</> : <div className="recorded-prose"><pre>{step.thought || 'Text unrecorded for this step.'}</pre><p className="muted">Recorded text · message and reasoning roles unavailable</p></div>}</div>
          </section>
          <section className="panel terminal-panel replay-output" aria-label="Recorded terminal output"><div className="workspace-tabs" role="group" aria-label="Output view"><button aria-pressed={output === 'terminal' && showOutput} onClick={() => {setOutput('terminal');setOutputOpen(true);}}><Icon name="terminal" size={14} />Terminal</button><button aria-pressed={output === 'tests' && showOutput} onClick={() => {setOutput('tests');setOutputOpen(true);}}><Icon name="test" size={15}/>Tests</button><span className={'output-status ' + (failed(step) ? 'error-text' : '')}>{step.observation?.exit_code != null ? 'Exit ' + step.observation.exit_code : 'Exit unrecorded'}</span><button className="output-disclosure" aria-label={showOutput ? 'Hide terminal output' : 'Show terminal output'} aria-expanded={showOutput} onClick={()=>setOutputOpen(!showOutput)}><Icon name={showOutput ? 'minus' : 'plus'} size={14}/>{showOutput ? 'Collapse' : 'Expand'}</button>{showOutput && <CopyButton text={step.observation?.text || ''} />}</div>{showOutput && (output === 'tests' && node?.category !== 'validate' ? <pre aria-label="Current step output">No test output recorded for this step.</pre> : <Output step={step} />)}</section>
        </>}
      </div>
      <div className="replay-inspection" id="replay-inspection" hidden={!inspection} onKeyDown={e=>{if(e.key==='Escape'){e.preventDefault();closeInspection();}}}>
        <Inspector run={run} node={node} index={step.idx} phases={phases} select={choose} locate={choose} relatedGraph={graphs.expanded} tabbed variant={timeline ? 'event' : 'replay'} clear={closeInspection} clearLabel={timeline ? 'Close Event details' : 'Close Step details'} />
        <details className="annotation-drawer"><summary>Personal annotation</summary><Annotation key={run.id+':'+step.idx} run={run} step={step} /></details>
      </div>
    </div>
    {!timeline && <Transport steps={steps} position={position} select={next => {if(steps[next]) choose(steps[next].idx);}} inspection={inspection} toggleInspection={toggleInspection} />}
  </>;
}
export function Replay({ run, phases, timeline = false, index, onSelect }: { run: Run; phases: Phase[]; timeline?: boolean; index: StepIndex | null; onSelect: (idx: StepIndex) => void }) {
  const graph = useResource<RunGraphs>([run.file],true);
  const details = useResource<{steps:Step[]}>([run.steps_file],true);
  return <div className="replay-surface">
    <RunMetadata run={run} date={details.state.status === 'ready' ? details.state.data.steps.find(s => !!s.ts)?.ts : null} />
    {[graph,details].map((r,i) => r.state.status === 'error' ? <LoadError key={i} message={r.state.message} retry={r.retry} /> : null)}
    {(graph.state.status === 'loading' || details.state.status === 'loading') && <Loading>Loading recorded events…</Loading>}
    {graph.state.status === 'ready' && details.state.status === 'ready' && <LoadedReplay run={run} graphs={graph.state.data} steps={details.state.data.steps} phases={phases} timeline={timeline} index={index} onSelect={onSelect} />}
  </div>;
}
