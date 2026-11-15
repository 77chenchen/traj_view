import { useEffect, useState } from 'react';
import { useResource } from './data';
import { phaseColor, sourceIndex, type Graph, type GraphEdge, type GraphNode, type Phase, type Run, type Step, type StepIndex } from './model';
import { CopyButton, Icon, LoadError, Loading } from './ui';
import { ExecutionContents } from './ExecutionContents';
import { categoryIcon, categoryName, evidenceKind, eventStatus, eventTime, failed, label, patchStats, patchEvidence, RecordedCode, fullScreen } from './Evidence';
import { literalFileWrites } from './recordedEdits';
import { StepRecordingFields } from './Recording';

const previewLength = 1000;

function Content({ label, value, note, initialOpen = true }: { label: string; value: string | null; note?: string; initialOpen?: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const long = value != null && value.length > previewLength;
  return <section className="step-content">
    <details open={initialOpen}>
    <summary><strong>{label}</strong></summary>
    <div className="step-content-head">{value && <CopyButton text={value} />}</div>
    {value == null || value === '' ? <p className="muted">None recorded</p> : label === 'Arguments' ? <RecordedCode value={value}/> :
      <pre>{long && !expanded ? value.slice(0, previewLength) + '…' : value}</pre>}
    {note && <details className="record-note"><summary><Icon name="info" size={13}/>Recording note</summary><p>{note}</p></details>}
    {long && <button className="button small quiet" aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>
      {expanded ? 'Show less' : `Show all ${value!.length.toLocaleString()} characters`}
    </button>}
    </details>
  </section>;
}

function StepContent({ run, step, node, phases, tabbed = false, variant = 'node', graphWorkspace = false, first, priorFailure, earlierFailure, locate, tab, setTab,steps }: { run:Run;step: Step; node?: GraphNode; phases: Phase[]; tabbed?: boolean; variant?: 'node' | 'event' | 'replay'; graphWorkspace?: boolean; first?: Step; priorFailure?: Step; earlierFailure?: Step; locate: () => void; tab: string; setTab: (tab: string) => void;steps:readonly Step[] }) {
  const [recordingOpen,setRecordingOpen]=useState(false);
  const phase = phases.find(item => item.id === step.phase);
  const action = step.action, observation = step.observation;
  const evidence=patchEvidence(step,steps),patch=evidence?.text??null,stats=patchStats(step,patch),writes=literalFileWrites(step);
  const notes = [observation?.truncated && 'Truncated in the source', observation?.exit_code != null && 'Exit code ' + observation.exit_code, observation?.error && 'Source flagged an error'].filter(Boolean).join(' · ');
  return <>
    <div className={'inspection-status ' + (failed(step) ? 'error-text' : '')}><span className="inspection-status-icon kind-icon" data-kind={evidenceKind(step,node)}><Icon name={categoryIcon(step,node)} size={18}/></span><div><strong>{failed(step) ? 'Tool Call – Failure' : action?.tool || (step.tags.includes('final_message') ? 'Final Answer' : 'Recorded text')}</strong><p>{label(step)}</p></div></div>
    <dl className="step-meta">
      <div><dt>{variant === 'replay' ? 'Step ID' : 'Node / Source'}</dt><dd className={'mono' + (graphWorkspace ? ' source-identity' : '')}><span>{sourceIndex(step.idx)}</span>{graphWorkspace && <span className="source-copy"><CopyButton key={String(step.idx)} label="Copy source ID" text={sourceIndex(step.idx)}/></span>}</dd></div>
      <div><dt>{variant === 'event' ? 'Category' : 'Type / Category'}</dt><dd>{variant === 'event' ? categoryName(step,node) : action?.tool || categoryName(step,node)}</dd></div>
      {variant === 'event' && <div><dt>Tool Name</dt><dd>{action?.tool || 'Unrecorded'}</dd></div>}
      <div><dt>{variant === 'event' ? 'Timestamp' : 'Time'}</dt><dd className="mono" title={step.ts || 'Unrecorded'}>{step.ts ? first ? eventTime(step,first) : step.ts : 'Unrecorded'}</dd></div>
      <div><dt>Status</dt><dd className={failed(step) ? 'error-text' : observation?.exit_code === 0 ? 'success-text' : 'muted'}>{eventStatus(step)}</dd></div>
    </dl>
    <details className="recording-details" onToggle={event=>setRecordingOpen(event.currentTarget.open)}><summary>Recording details</summary><dl className="step-meta">
      {variant === 'node' && <div><dt>Attempts</dt><dd className="muted">Unrecorded</dd></div>}
      <StepRecordingFields run={run} step={step} open={recordingOpen}/>
      {step.phase && <div><dt>Phase</dt><dd><i className="phase-dot" style={{ background: phaseColor(phase) }}/>{phase?.label ?? step.phase}<small> · {step.phase_source}</small></dd></div>}
      <div><dt>Tokens in / out</dt><dd>{step.tokens?.in ?? 'Unrecorded'} / {step.tokens?.out ?? 'Unrecorded'}</dd></div>
    </dl></details>
    {variant === 'node' && <div className="workspace-tabs inspector-tabs" role="group" aria-label="Step detail view">
      {['Details','Code Diff','Output','Context'].map(name=><button key={name} aria-pressed={tab===name} onClick={()=>setTab(name)}><Icon name={name==='Details'?'events':name==='Code Diff'?'diff':name==='Output'?'terminal':'layers'} size={14}/>{name==='Output' ? 'Error Output' : name}</button>)}
    </div>}
    {tab === 'Details' && <>
      {variant === 'replay' && <>{patch && <><h3 className="inspection-subtitle">Edit Summary</h3><div className="edit-summary"><span className="error-text">− {stats.removed} lines removed</span><span className="success-text">+ {stats.added} lines added</span></div></>}
        <h3 className="inspection-subtitle">{patch ? 'Files Changed' : 'File Targets'} ({action?.targets.length ?? 0})</h3><div className="inspection-files">{action?.targets.length ? action.targets.map(path=><button className="button small quiet" key={path} title={'Show recorded evidence for ' + path} onClick={locate}><Icon name="file" size={14}/>{path}</button>) : <span className="muted">Unrecorded</span>}</div>
        <Content label="Description" value={step.thought ?? label(step)} />
        <h3 className="inspection-subtitle">Recorded messages &amp; reasoning</h3>
        <Content label="Recorded text" value={step.thought} note="Check Recording details for saved source role and channel; absent roles remain unrecorded." initialOpen={false}/></>}
      {variant === 'node' && <Content label={step.tags.includes('final_message') ? 'Message' : 'Description (recorded text)'} value={step.thought} note="Saved source roles and channels are available in Recording details."/>}
      <Content label={variant === 'event' ? 'Arguments' : tabbed ? 'Tool arguments' : 'Action'} value={action ? JSON.stringify(action, null, 2) : null} initialOpen={false}/>
    </>}
    {tab === 'Code Diff' && <section className="step-content node-diff"><details open><summary><strong>{evidence?.derived?'Submitted write comparison':'Related Code Diff'}</strong></summary><button className="button small quiet" disabled={!patch} title={patch ? "Expand the code comparison" : "Patch unrecorded"} onClick={e=>fullScreen(e.currentTarget.parentElement)}>View Full Diff</button>{evidence?.note&&<p className="recorded-caption">{evidence.note}</p>}{graphWorkspace && !patch ? <p className="node-diff-missing"><Icon name="file" size={16}/><span>No patch recorded</span></p> : <><div className="recorded-path"><Icon name="file" size={14}/><span title={evidence?.path??action?.targets.join(', ')}>{evidence?.path||action?.targets.join(', ') || 'File unrecorded'}</span>{patch && <CopyButton text={patch}/>}</div><RecordedCode value={patch} patch ariaLabel={evidence?.derived?'Submitted write comparison':undefined}/></>}{!patch&&writes.map(file=><details key={file.path}><summary>Submitted file · {file.path}</summary><p className="recorded-caption">Literal content in the saved command. Previous file version unrecorded.</p><RecordedCode value={file.content}/></details>)}</details></section>}
    {(tab === 'Output' || variant === 'event' || variant === 'replay') && <Content label={variant === 'event' ? 'Output / Stderr' : 'Observation'} value={observation?.text ?? null} note={notes} initialOpen={variant !== 'replay'}/>}
    {tab === 'Output' && <Content label="Error Output (from prior attempt)" value={priorFailure?.observation?.text ?? null} note={priorFailure ? 'Earlier failed action with the same normalized signature · source ' + sourceIndex(priorFailure.idx) : 'No earlier failed action with the same normalized signature recorded.'} initialOpen={true}/>}
    {tab === 'Output' && !priorFailure && earlierFailure && <Content label="Earlier failure evidence" value={earlierFailure.observation?.text ?? null} note={'Earlier source ' + sourceIndex(earlierFailure.idx) + ' · a different action, not a recorded attempt of this call.'} initialOpen={false}/>}
    {variant === 'event' && <Content label="Analysis" value={step.thought} note="Check Recording details for the source role; this text is not an inferred diagnosis." initialOpen={false}/>}
    <details className="source-ref"><summary>Raw reference</summary><span className="mono">{step.raw_ref.file}{step.raw_ref.line != null ? ':' + step.raw_ref.line : ' · line not recorded'}</span>{step.tags.length > 0 && <p>Tags: {step.tags.join(', ')}</p>}</details>
  </>;
}

export function Inspector({ run, node, index, select, clear, clearLabel = 'Clear inspected step', heading, phases, internalEdges = [], expand, relatedGraph, locate, tabbed = false, variant = 'node', graphWorkspace = false }: {
  run: Run; node?: GraphNode; index: StepIndex | null;
  select: (index: StepIndex) => void; clear?: () => void; clearLabel?: string; heading?: string; phases: Phase[]; tabbed?: boolean; variant?: 'node' | 'event' | 'replay';
  internalEdges?: GraphEdge[]; expand?: () => void;
  relatedGraph?: Graph;
  locate?: (index: StepIndex) => void; graphWorkspace?: boolean;
}) {
  const [tab,setTab]=useState('Details');
  useEffect(()=>setTab('Details'),[run.id]);
  const resource = useResource<{ steps: Step[] }>(node ? [run.steps_file] : [], true);
  const steps = resource.state.status === 'ready' ? resource.state.data.steps : undefined;
  const members = node?.step_indices ?? [];
  const member = index == null ? -1 : members.indexOf(index);
  const sourceNodes = new Map(relatedGraph?.nodes.map((item) => [item.id, item]));
  const selectedIds = new Set(relatedGraph?.nodes.filter((item) => members.includes(item.first_idx)).map((item) => item.id));
  const relations = relatedGraph?.edges.filter((edge) => selectedIds.has(edge.source) !== selectedIds.has(edge.target)) ?? [];
  let step: Step | undefined;
  if (steps && index != null) {
    let low = 0, high = steps.length;
    while (low < high) {
      const middle = Math.floor((low + high) / 2);
      if (BigInt(steps[middle].idx) < BigInt(index)) low = middle + 1;
      else high = middle;
    }
    if (String(steps[low]?.idx) === String(index)) step = steps[low];
  }

  return <aside className={"panel inspector inspector-" + variant} aria-label="Step inspector">
    <div className="panel-head"><div><h2 id="inspector-title"><Icon name={variant === 'node' ? 'graph' : 'file'} size={16}/>{heading ?? (variant === 'node' ? 'Node Inspector' : variant === 'event' ? 'Event Inspector' : 'Step Details')}</h2>
      {node && <p title={node.label}>{node.label || node.tool || 'Message'}</p>}</div>
      {steps && <div className="inspector-nav"><button className="button small icon-button" aria-label="Previous inspected step" disabled={!step || steps.indexOf(step) <= 0} onClick={() => step && (locate ?? select)(steps[steps.indexOf(step)-1].idx)}><Icon name="left" size={14}/></button><button className="button small icon-button" aria-label="Next inspected step" disabled={!step || steps.indexOf(step) >= steps.length-1} onClick={() => step && (locate ?? select)(steps[steps.indexOf(step)+1].idx)}><Icon name="right" size={14}/></button></div>}
      {node && clear && <button className="button small icon-button quiet" aria-label={clearLabel} title={clearLabel}
        onClick={clear}><Icon name="close" size={16} /></button>}
    </div>
    {!node ? <div className="inspector-empty"><Icon name="search" size={23} />
      <p>Select a node or inspect the current timeline step.</p></div> : <>
      {node.view?.summary&&<ExecutionContents node={node} locate={locate??select}/>}
      {members.length > 1 && <div className="member-control">
        <p className="muted">Continuous source interval {sourceIndex(members[0])} → {sourceIndex(members.at(-1))} · {members.length} source steps</p>
        {expand && <button className="button small" onClick={expand}>{node.view?.kind==='section' ? node.view.open ? 'Collapse this section' : 'Expand this section in place' : 'Expand this block'}</button>}
        <label htmlFor="member-step">Member step <span className="muted">{member < 0 ? '—' : member + 1} / {members.length}</span></label>
        <div>
          <button className="button small icon-button" aria-label="Previous member step" disabled={member <= 0}
            onClick={() => select(members[member - 1])}><Icon name="left" size={15} /></button>
          <select id="member-step" value={index ?? ''} onChange={(event) => {
            const value = members.find((item) => String(item) === event.target.value);
            if (value !== undefined) select(value);
          }}>
            {index == null && <option value="" disabled>Select a source step…</option>}
            {members.map((item) => <option key={item} value={item}>Source step {sourceIndex(item)}</option>)}
          </select>
          <button className="button small icon-button" aria-label="Next member step" disabled={member >= members.length - 1}
            onClick={() => select(members[member + 1])}><Icon name="right" size={15} /></button>
        </div>
      </div>}
      {members.length > 1 && <details className="internal-edges"><summary>Block internal edges ({internalEdges.length})</summary>
        <ul>{internalEdges.map((edge) => <li key={edge.id}>
          {sourceIndex(edge.source.replace(/^step-/, ''))} → {sourceIndex(edge.target.replace(/^step-/, ''))} · {edge.type}
        </li>)}</ul>
      </details>}
      {resource.state.status === 'loading' && <Loading>Loading step details…</Loading>}
      {resource.state.status === 'error' && <div className="panel-inset">
        <LoadError message={resource.state.message} retry={resource.retry} />
      </div>}
      {step && <StepContent run={run} step={step} node={node} phases={phases} tabbed={tabbed} variant={variant} graphWorkspace={graphWorkspace} tab={tab} setTab={setTab} first={steps?.[0]} steps={steps??[]}
        priorFailure={steps?.slice(0,steps.indexOf(step)).reverse().find(s=>failed(s) && (relatedGraph ? relatedGraph.nodes.find(n=>String(n.first_idx)===String(s.idx))?.signature===relatedGraph.nodes.find(n=>String(n.first_idx)===String(step!.idx))?.signature : s.action?.tool===step!.action?.tool))}
        earlierFailure={steps?.slice(0,steps.indexOf(step)).reverse().find(failed)} locate={() => (locate ?? select)(step.idx)} />}
      {relatedGraph && (variant!=='node'||tab==='Context') && <details className="node-context" open={variant==='node' ? true : undefined}><summary>Context · Files &amp; relationships</summary><div className="context-counts">
        <span>Relevant files ({step?.action?.targets.length ?? 0})</span><button className="button small quiet" disabled={!step?.action?.targets.length} title={step?.action?.targets.length ? 'Show recorded file targets' : 'File targets unrecorded'} onClick={e => { const box=e.currentTarget.closest('details'); const target=box?.querySelector('pre'); if(target)target.hidden=!target.hidden; }}>Show</button>
        <pre hidden>{step?.action?.targets.join('\n') || 'Unrecorded'}</pre>
        {['Upstream','Downstream'].map(direction => {
          const edges=relations.filter(e => selectedIds.has(direction === 'Upstream' ? e.target : e.source));
          return <details className="context-relations" key={direction}><summary>{direction} nodes ({edges.length})</summary>{edges.length ? edges.slice(0,100).map(edge => {const other=sourceNodes.get(direction === 'Upstream' ? edge.source : edge.target);return other && <button className="node-result" key={edge.id} onClick={() => (locate ?? select)(other.first_idx)}>Show {sourceIndex(other.first_idx)} · {edge.type} · {other.label}</button>;}) : <p className="muted">None recorded</p>}</details>;
        })}
        <details className="context-messages"><summary>Messages ({step?.thought ? 1 : 0})</summary><pre>{step?.thought || 'Unrecorded'}</pre></details><span className="muted">Incoming retry links: {relatedGraph.edges.filter(e => selectedIds.has(e.target) && e.type === 'retry').reduce((n,e) => n+e.count,0)} · attempts unrecorded</span>
      </div></details>}
      {relatedGraph && (variant!=='node'||tab==='Context') && <details className="internal-edges"><summary>Related steps ({relations.length})</summary>
        <p className="muted">Dependencies are recorded graph heuristics from file targets and observations. Structural edges in Hierarchy mean containment, not causation.</p>
        <div className="relation-list">{relations.slice(0, 100).map((edge) => {
          const incoming = selectedIds.has(edge.target);
          const other = sourceNodes.get(incoming ? edge.source : edge.target);
          return other && <button className="node-result" key={edge.id} onClick={() => (locate ?? select)(other.first_idx)}>
            {incoming ? 'From' : 'To'} {sourceIndex(other.first_idx)} · {edge.type} · {other.label}
          </button>;
        })}</div>
        {relations.length > 100 && <p className="muted">Showing the first 100 relationships.</p>}
      </details>}
      {steps && !step && <p className="panel-inset muted">{index == null ? 'Select a source member or recorded example to inspect its saved evidence.' : 'This step is missing from the step file.'}</p>}
    </>}
  </aside>;
}
