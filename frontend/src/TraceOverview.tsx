import { useMemo, useState } from 'react';
import { useResource } from './data';
import { recordedFiles } from './graphData';
import { number, sourceIndex, type Run, type Step, type StepIndex } from './model';
import { LoadError, Loading } from './ui';

export function TraceOverview({ run, locate }: { run: Run; locate: (index: StepIndex) => void }) {
  const [loaded, setLoaded] = useState(false);
  const [query, setQuery] = useState('');
  const resource = useResource<{ steps: Step[] }>(loaded ? [run.steps_file] : [], true);
  const steps = resource.state.status === 'ready' ? resource.state.data.steps : undefined;
  const files = useMemo(() => recordedFiles(steps ?? []), [steps]);
  const paths = [...files].filter(([path]) => path.toLowerCase().includes(query.trim().toLowerCase()));
  const lanes: [string, Step[]][] = [
    ['Conversation / message', (steps ?? []).filter((step) => !step.action && step.thought)],
    ['Thought / recorded text', (steps ?? []).filter((step) => step.action && step.thought)],
    ['Tool calls', (steps ?? []).filter((step) => step.action)],
  ];
  return <section className="panel trace-overview" aria-label="Recorded activity">
    <div className="panel-head"><div><h2>Recorded activity</h2>
      <p>Text, tools and file targets in source order.</p></div></div>
    {!loaded ? <div className="panel-inset"><button className="button small" onClick={() => setLoaded(true)}>
      Load recorded activity</button></div> : <>
      {resource.state.status === 'loading' && <Loading>Loading recorded activity…</Loading>}
      {resource.state.status === 'error' && <LoadError message={resource.state.message} retry={resource.retry} />}
      {steps && <>
        <div className="activity-lanes">
          {lanes.map(([label, members]) => {
            return <details key={label}><summary>{label} <span>{number.format(members.length)}</span></summary>
              <div className="activity-steps">{members.length ? members.map((step) => <button key={step.idx}
                className="button small quiet" onClick={() => locate(step.idx)}>{sourceIndex(step.idx)}</button>)
                : <p className="muted">None recorded</p>}</div>
            </details>;
          })}
          <p className="muted">v1 stores messages and reasoning together as thought. Roles and a separate reasoning channel are not recorded.</p>
        </div>
        <div className="file-touches">
          <h3>File targets</h3>
          <p className="muted">Explicit action targets and path arguments; attempted access, not proof of filesystem changes. Command-only paths are not listed.</p>
          <input type="search" aria-label="Find recorded file path" placeholder="Find a file path…" value={query}
            onChange={(event) => setQuery(event.target.value)} />
          <div className="file-results">
            {paths.map(([path, members]) => <details key={path}>
              <summary title={path}>{path} <span>{members.length} steps</span></summary>
              <div className="activity-steps">{members.map((idx) => <button key={idx} className="button small quiet"
                aria-label={`Locate ${path} at source step ${idx}`} onClick={() => locate(idx)}>{sourceIndex(idx)}</button>)}</div>
            </details>)}
            {!paths.length && <p className="muted">{files.size ? 'No matching paths' : 'None recorded'}</p>}
          </div>
        </div>
      </>}
    </>}
  </section>;
}
