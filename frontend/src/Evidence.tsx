import { useState, type ReactNode } from 'react';
import { type GraphNode, type Run, type Step, type StepIndex, number, sourceIndex } from './model';
import { CopyButton, Icon, OutcomeBadge, exportMetrics, type IconName } from './ui';
import { literalFileWrites, savedPatch } from './recordedEdits';
import { SessionRecording } from './Recording';
export { patchEvidence } from './recordedEdits';

export const clock = (s: number) => Math.floor(s / 60) + ':' + Math.floor(s % 60).toString().padStart(2, '0');
export const failed = (s: Step) => Boolean(s.observation?.error || (s.observation?.exit_code != null && s.observation.exit_code !== 0));
export const label = (s: Step) => s.action?.command || s.action?.targets[0] || s.thought || s.action?.tool || 'Recorded event';
export const eventTime = (s: Step, first?: Step) => {
  const seconds = s.ts && first?.ts ? (Date.parse(s.ts) - Date.parse(first.ts)) / 1000 : NaN;
  return Number.isFinite(seconds) && seconds >= 0 ? clock(seconds) : '—';
};
export const eventStatus = (s: Step) => failed(s) ? 'Failed' : s.observation?.exit_code === 0 ? 'Success' : s.tags.includes('final_message') ? 'Recorded' : 'Unrecorded';
export const stepTitle = (s: Step, n?: GraphNode) => failed(s) ? 'Test / tool failure' : s.tags.includes('final_message') ? 'Final Answer' :
  s.action?.tool || (n?.category === 'plan' ? 'Plan' : 'Recorded text');
export const categoryName = (s: Step, n?: GraphNode) => s.tags.includes('final_message') ? 'Final Answer' : n?.category === 'edit' ? 'File Changes' :
  s.action ? 'Tool Calls' : n?.category === 'plan' ? 'User Task' : 'Recorded text';
export const categoryIcon = (s: Step, n?: GraphNode): IconName => failed(s) ? 'warning' : s.tags.includes('final_message') ? 'check' :
  n?.category === 'edit' ? 'edit' : n?.category === 'read' ? 'file' : n?.category === 'validate' ? 'test' : s.action ? 'terminal' : n?.category === 'plan' ? 'user' : 'message';
export const evidenceKind = (s: Step, n?: GraphNode) => failed(s) ? 'failure' : n?.category || (s.action ? 'tool' : 'message');
export const patchText = savedPatch;
export const patchStats = (s?: Step,patch?:string|null) => {
  const p = patch??patchText(s);
  return { added: p?.split('\n').filter(l => /^\+(?!\+)/.test(l)).length ?? null,
    removed: p?.split('\n').filter(l => /^-(?!-)/.test(l)).length ?? null };
};
export const fileContent = (s?: Step, n?: GraphNode) => typeof s?.action?.args.content === 'string' ? s.action.args.content :
  n?.category === 'read' ? s?.observation?.text ?? null : literalFileWrites(s)[0]?.content??null;

export function Syntax({ text }: { text: string }) {
  const pattern = /(#.*$|\/\/.*$|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\b(?:def|return|class|import|from|if|else|elif|for|while|const|let|var|function|export|async|await|throw|new|try|except|true|false|null|None|True|False)\b|\b\d+(?:\.\d+)?\b)/g;
  return <>{text.split(pattern).map((part, i) => <span key={i} className={i % 2 === 0 ? undefined : /^(#|\/\/)/.test(part) ? 'syntax-comment' : /^["']/.test(part) ? 'syntax-string' : /^\d/.test(part) ? 'syntax-number' : 'syntax-keyword'}>{part}</span>)}</>;
}
export function RecordedCode({ value, patch = false,ariaLabel }: { value: string | null; patch?: boolean;ariaLabel?:string }) {
  const [full, setFull] = useState(false);
  if (!value) return <div className="evidence-empty"><Icon name="file" size={27} /><strong>{patch ? 'No patch recorded' : 'No file content recorded'}</strong><p>未记录 · Full file versions cannot be recovered from this record.</p></div>;
  const lines = value.split('\n');
  let oldLine: number | null = null, newLine: number | null = null;
  const rows = lines.map((line, i) => {
    const hunk = line.match(/^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
    if (hunk) { oldLine = Number(hunk[1]); newLine = Number(hunk[2]); }
    const add = patch && /^\+(?!\+)/.test(line), remove = patch && /^-(?!-)/.test(line);
    const meta = patch && (/^(@@|\*\*\*|---|\+\+\+)/.test(line));
    const display = meta ? '·' : patch && newLine != null ? remove ? oldLine : newLine : i + 1;
    if (!meta) { if (!add && oldLine != null) oldLine++; if (!remove && newLine != null) newLine++; }
    return { line, add, remove, display };
  });
  return <><div className="code-lines" aria-label={ariaLabel??(patch ? 'Recorded patch' : 'Recorded file excerpt')}>
    {(full ? rows : rows.slice(0, 600)).map((r, i) => <div className={r.add ? 'line-added' : r.remove ? 'line-removed' : ''} key={i}>
      <span>{r.display}</span><i className="diff-sign" aria-hidden="true">{r.add ? '+' : r.remove ? '−' : ' '}</i><code><Syntax text={(r.add || r.remove ? r.line.slice(1) : r.line) || ' '} /></code>
    </div>)}</div>{!full && lines.length > 600 && <button className="button small" onClick={() => setFull(true)}>Show all {number.format(lines.length)} recorded lines</button>}</>;
}
export function Output({ step, ariaLabel = 'Current step output' }: { step: Step; ariaLabel?: string }) {
  return <pre tabIndex={0} aria-label={ariaLabel}><span className="terminal-command">{step.action?.command ? '$ ' + step.action.command + '\n\n' : ''}</span>
    {(step.observation?.text || step.thought || 'No observation recorded for this step.').split('\n').map((l, i) => <span key={i} className={/FAIL|Error|error|^E |assert /.test(l) ? 'terminal-error' : /\bpassed\b|success/i.test(l) ? 'terminal-success' : undefined}>{l}{'\n'}</span>)}</pre>;
}
export function ViewTitle({ title, subtitle, icon, actions }: { title: string; subtitle: string; icon: IconName; actions?: ReactNode }) {
  return <header className="view-title"><span className="view-title-icon"><Icon name={icon} size={21} /></span><h1>{title}</h1>
    <details className="view-guide"><summary aria-label={'About ' + title} title={subtitle}><Icon name="info" size={16}/></summary><p>{subtitle}</p></details>{actions}</header>;
}
export function ShareView() {
  const [shared, setShared] = useState(false);
  return <button className="button small share-button" onClick={async () => {
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(location.href);
      else throw new Error('selection fallback');
      setShared(true);
    } catch {
      const field=document.createElement('textarea'); field.value=location.href; field.style.position='fixed';field.style.opacity='0'; document.body.append(field);field.select();
      setShared(document.execCommand('copy'));field.remove();
    }
  }}><Icon name="share" size={15} />{shared ? 'Link copied' : 'Share'}</button>;
}
export function RunMetadata({ run, date }: { run: Run; date?: string | null }) {
  const [recordingOpen,setRecordingOpen]=useState(false);
  return <div className="run-metadata" aria-label="Run summary"><Icon name="terminal" size={20} /><strong title={run.id}>{run.id}</strong><OutcomeBadge outcome={run.outcome} />
    <span className="metadata-task" title={run.task_id}><b>{run.task_id}</b></span>
    <span className="metadata-duration"><Icon name="clock" size={15} />{run.usage?.wall_s == null ? 'Duration unrecorded' : clock(run.usage.wall_s)}</span>
    <details className="run-recording" onToggle={event=>setRecordingOpen(event.currentTarget.open)}><summary>Run details <Icon name="down" size={13}/></summary><div className="run-recording-body"><dl>
      <div><dt>Agent</dt><dd>{run.agent || 'Unrecorded'}</dd></div><div><dt>Model</dt><dd>{run.model || 'Unrecorded'}</dd></div>
      <div><dt>Date</dt><dd>{date ? new Date(date).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : 'Unrecorded'}</dd></div>
      <div><dt>Source steps</dt><dd>{number.format(run.metrics.steps)}</dd></div>
      <div><dt>Duration</dt><dd>{run.usage?.wall_s == null ? 'Unrecorded' : clock(run.usage.wall_s)}</dd></div>
      <div><dt>Input / output tokens</dt><dd>{run.usage?.input_tokens==null?'Unrecorded':number.format(run.usage.input_tokens)} / {run.usage?.output_tokens==null?'Unrecorded':number.format(run.usage.output_tokens)}</dd></div>
      <div><dt>Cost (USD)</dt><dd>Unrecorded</dd></div>
      <div><dt>Dataset</dt><dd>{run.agent === 'synthetic' ? 'Synthetic fixture' : 'Local traces'}</dd></div>
    </dl><SessionRecording run={run} open={recordingOpen}/></div></details>
    <ShareView />
    <details className="more-menu"><summary className="button small icon-button" aria-label="Run actions" title="Run actions"><Icon name="more" /></summary><div>
      <button className="button small" onClick={() => exportMetrics([run])}>Export CSV</button>
      <a className="button small" href={location.protocol === 'file:' ? location.href : '/api/report.html'} target="_blank" rel="noreferrer">Offline HTML report</a>
    </div></details>
  </div>;
}
interface Stage { name: string; step?: Step; passed?: boolean }
const isTest = (s: Step, n?: GraphNode) => n?.label.startsWith('validate:test') ||
  ['test', 'run_tests'].includes(s.action?.tool.split('.').at(-1)?.toLowerCase() ?? '');
export function stagesFor(steps: Step[], nodes: GraphNode[], count = 6): Stage[] {
  const by = new Map(nodes.map(n => [String(n.first_idx), n]));
  const node = (s: Step) => by.get(String(s.idx));
  const error = steps.find(failed);
  const edit = steps.find(s => node(s)?.category === 'edit');
  const after = edit ?? error;
  const retry = after && steps.slice(steps.indexOf(after) + 1).find(s => node(s)?.category === 'validate');
  const repeatedFailure = retry && steps.slice(0, steps.indexOf(retry)).some(s =>
    failed(s) && node(s)?.category === 'validate' && node(s)?.signature === node(retry)?.signature);
  const success = steps.filter(s => node(s)?.category === 'validate' && !failed(s) && s.observation?.exit_code === 0).at(-1);
  const plan = steps.find(s => node(s)?.category === 'plan' && !s.tags.includes('final_message')) ??
    steps.find(s => !s.action && !s.tags.includes('final_message'));
  const tool = steps.find(s => !!s.action);
  const planning = {name:plan && node(plan)?.category !== 'plan' ? 'Recorded Text' : count === 5 ? 'Plan' : 'Planning',step:plan};
  const failure = {name:!error || isTest(error,node(error)) ? count === 5 ? 'Test Failure' : 'Failed Test' :
    node(error)?.category === 'validate' ? 'Validation Failed' : error.action ? 'Tool Failure' : 'Recorded Failure',step:error};
  const editing = {name:edit && !patchText(edit) ? 'File Edit' : count === 5 ? 'Code Edit' : 'Code Patch',step:edit};
  const rerun = {name:retry && !repeatedFailure ? 'Validation' : count === 5 ? 'Retry' : 'Re-run',step:retry};
  const passed = {name:success && !isTest(success,node(success)) ? 'Validation Passed' : count === 5 ? 'Success' : 'Passed Tests',step:success,passed:Boolean(success)};
  return count === 5 ? [planning,failure,editing,rerun,passed] : [planning,{name:'Tool Call',step:tool},failure,editing,rerun,passed];
}
export function StageSnapshots({ steps, nodes, selected, select, count = 6, heading = false, kind = 'replay', initialPreviews = false }: {
  steps: Step[]; nodes: GraphNode[]; selected: StepIndex | null; select: (idx: StepIndex) => void; count?: number; heading?: boolean; kind?: 'replay' | 'graph'; initialPreviews?: boolean;
}) {
  const [offset, setOffset] = useState(0);
  const [previews, setPreviews] = useState(initialPreviews);
  const stages = stagesFor(steps, nodes, count);
  if (kind === 'graph') stages[1] = {name:'Investigation',step:steps.find(s => nodes.find(n=>String(n.first_idx)===String(s.idx))?.category==='read')};
  const ordinal=steps.findIndex(s=>String(s.idx)===String(selected));
  const active=stages.filter(s=>s.step&&steps.indexOf(s.step)<=ordinal).sort((a,b)=>steps.indexOf(b.step!)-steps.indexOf(a.step!))[0];
  return <section className={'stage-strip ' + (previews ? 'with-previews ' : 'compact-stages ') + (heading ? 'has-stage-heading' : '')} aria-label="Stage snapshots">
    <span className="stage-strip-label">Stages</span>
    {heading && <button className="button small icon-button stage-scroll-control" aria-label="Previous stage snapshot" disabled={!offset} onClick={() => setOffset(Math.max(0, offset - 1))}><Icon name="left" /></button>}
    <div className="stage-cards" style={{gridTemplateColumns:'repeat(' + (count - offset) + ', minmax(0, 1fr))'}}>
      {stages.slice(offset).map((s, i) => <button key={s.name} className={'stage-card ' + (s.step && failed(s.step) ? 'stage-failed' : s.passed ? 'stage-success' : '')}
        data-kind={s.step ? evidenceKind(s.step,nodes.find(n=>String(n.first_idx)===String(s.step!.idx))) : undefined}
        aria-label={'Snapshot ' + s.name + (s.step ? ' source ' + sourceIndex(s.step.idx) : ': unrecorded')}
        aria-pressed={s.step?.idx === selected} disabled={!s.step} title={s.step ? sourceIndex(s.step.idx) + ' · ' + label(s.step) : 'No matching stage recorded'}
        data-active-stage={!!s.step && s===active}
        onClick={() => s.step && select(s.step.idx)}>
        <div><span className="stage-number">{i + offset + 1}</span><span className="stage-kind-icon kind-icon"><Icon name={s.step ? categoryIcon(s.step,nodes.find(n=>String(n.first_idx)===String(s.step!.idx))) : 'minus'} size={16}/></span><strong>{s.name}</strong><time>{s.step ? eventTime(s.step, steps[0]) : '—'}</time></div>
        {previews && <pre>{s.step ? (patchText(s.step) || s.step.observation?.text || s.step.thought || s.step.action?.command || 'Unrecorded').split('\n').slice(0, 4).map((line, j) =>
          <span key={j} className={line.startsWith('+') ? 'terminal-success' : line.startsWith('-') || /FAIL|assert |^E /.test(line) ? 'terminal-error' : ''}>{line}{'\n'}</span>) : '未记录 / Unrecorded'}</pre>
        }
      </button>)}
    </div>
    {heading && <button className="button small icon-button stage-scroll-control" aria-label="Next stage snapshot" disabled={offset >= count - 1} onClick={() => setOffset(Math.min(count - 1, offset + 1))}><Icon name="right" /></button>}
    <button className="button small quiet stage-preview-toggle" aria-label={previews ? 'Hide stage previews' : 'Show stage previews'} aria-expanded={previews} title={previews ? 'Hide code and output previews' : 'Show code and output previews'} onClick={() => setPreviews(!previews)}><Icon name="panel" size={14}/><span>Previews</span></button>
  </section>;
}
export function fullScreen(element: HTMLElement | null) {
  if (document.fullscreenElement && (!element || document.fullscreenElement === element)) void document.exitFullscreen();
  else if (element?.requestFullscreen) void element.requestFullscreen();
}
