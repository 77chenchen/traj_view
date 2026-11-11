import { useState } from 'react';
import { useResource } from './data';
import { phaseColor, sourceIndex, type GraphNode, type Phase, type Run, type Step } from './model';
import { CopyButton, Icon, LoadError, Loading } from './ui';

const previewLength = 1000;

function Content({ label, value, note }: { label: string; value: string | null; note?: string }) {
  const [expanded, setExpanded] = useState(false);
  const long = value != null && value.length > previewLength;
  return <section className="step-content">
    <div className="step-content-head">
      <h3>{label}</h3>{value && <CopyButton text={value} />}
    </div>
    {note && <p className="content-note">{note}</p>}
    {value == null || value === '' ? <p className="muted">None recorded</p> :
      <pre>{long && !expanded ? value.slice(0, previewLength) + '…' : value}</pre>}
    {long && <button className="button small quiet" aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>
      {expanded ? 'Show less' : `Show all ${value!.length.toLocaleString()} characters`}
    </button>}
  </section>;
}

function StepContent({ step, phases }: { step: Step; phases: Phase[] }) {
  const phase = phases.find((item) => item.id === step.phase);
  const action = step.action;
  const observation = step.observation;
  const notes = [
    observation?.truncated && 'Truncated in the source',
    observation?.exit_code != null && `Exit code ${observation.exit_code}`,
    observation?.error && 'Source flagged an error',
  ].filter(Boolean).join(' · ');
  return <>
    <dl className="step-meta">
      <div><dt>Source step</dt><dd className="mono">{sourceIndex(step.idx)}</dd></div>
      {step.phase && <div><dt>Phase</dt><dd><i className="phase-dot" style={{ background: phaseColor(phase) }} />
        {phase?.label ?? step.phase}{step.phase_source && <small> · {step.phase_source}</small>}</dd></div>}
      {step.ts && <div><dt>Timestamp</dt><dd className="mono">{step.ts}</dd></div>}
      {step.tags.length > 0 && <div><dt>Tags</dt><dd>{step.tags.join(', ')}</dd></div>}
      {step.tokens && <div><dt>Tokens in / out</dt><dd>{step.tokens.in ?? '—'} / {step.tokens.out ?? '—'}</dd></div>}
    </dl>
    <Content label="Thought" value={step.thought} />
    <Content label="Action" value={action ? JSON.stringify(action, null, 2) : null} note={action?.tool} />
    <Content label="Observation" value={observation?.text ?? null} note={notes} />
    <div className="source-ref">
      <h3>Raw reference</h3>
      <span className="mono">{step.raw_ref.file}{step.raw_ref.line != null ? `:${step.raw_ref.line}` : ''}</span>
    </div>
  </>;
}

export function Inspector({ run, node, index, select, clear, phases }: {
  run: Run; node?: GraphNode; index: number | null;
  select: (index: number) => void; clear: () => void; phases: Phase[];
}) {
  const resource = useResource<{ steps: Step[] }>(node ? [run.steps_file] : [], true);
  const steps = resource.state.status === 'ready' ? resource.state.data.steps : undefined;
  const members = node?.step_indices ?? [];
  const member = index == null ? 0 : members.indexOf(index);
  let step: Step | undefined;
  if (steps && index != null) {
    let low = 0, high = steps.length;
    while (low < high) {
      const middle = Math.floor((low + high) / 2);
      if (steps[middle].idx < index) low = middle + 1;
      else high = middle;
    }
    if (steps[low]?.idx === index) step = steps[low];
  }

  return <aside className="panel inspector" aria-labelledby="inspector-title">
    <div className="panel-head"><div><h2 id="inspector-title">Step inspector</h2>
      {node && <p title={node.label}>{node.label || node.tool || 'Message'}</p>}</div>
      {node && <button className="button small icon-button quiet" aria-label="Clear inspected step" title="Clear inspected step"
        onClick={clear}><Icon name="close" size={16} /></button>}
    </div>
    {!node ? <div className="inspector-empty"><Icon name="search" size={23} />
      <p>Select a node or inspect the current timeline step.</p></div> : <>
      {members.length > 1 && <div className="member-control">
        <label htmlFor="member-step">Member step <span className="muted">{member + 1} / {members.length}</span></label>
        <div>
          <button className="button small icon-button" aria-label="Previous member step" disabled={member <= 0}
            onClick={() => select(members[member - 1])}><Icon name="left" size={15} /></button>
          <select id="member-step" value={index ?? members[0]} onChange={(event) => select(Number(event.target.value))}>
            {members.map((item) => <option key={item} value={item}>Source step {sourceIndex(item)}</option>)}
          </select>
          <button className="button small icon-button" aria-label="Next member step" disabled={member >= members.length - 1}
            onClick={() => select(members[member + 1])}><Icon name="right" size={15} /></button>
        </div>
      </div>}
      {resource.state.status === 'loading' && <Loading>Loading step details…</Loading>}
      {resource.state.status === 'error' && <div className="panel-inset">
        <LoadError message={resource.state.message} retry={resource.retry} />
      </div>}
      {step && <StepContent key={step.idx} step={step} phases={phases} />}
      {steps && !step && <p className="panel-inset muted">This step is missing from the step file.</p>}
    </>}
  </aside>;
}
