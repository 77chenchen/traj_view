import { useMemo, useRef, useState } from 'react';
import { sankey, sankeyLinkHorizontal, type SankeyLink, type SankeyNode } from 'd3-sankey';
import { number, percent, phaseColor, type Phase, type Run } from './model';
import { Empty, exportMetrics, Heading, Icon, OutcomeBadge } from './ui';

const dimensions = ['model', 'condition', 'outcome'] as const;
type Dimension = typeof dimensions[number];
type OutcomeFilter = 'all' | 'passed' | 'failed' | 'unrecorded';
type Signal = 'all' | 'errors' | 'repeats' | 'unvalidated' | 'limit';

const groupLabel: Record<Dimension, string> = { model: 'Model', condition: 'Condition', outcome: 'Outcome' };
const groupValue = (run: Run, dimension: Dimension) => dimension === 'outcome' ? run.outcome.label : run[dimension];
const groupName = (name: string) => name || 'Unrecorded';
const pageSize = 6;
const signalLabels: Record<Signal, string> = {
  all: 'All runs', errors: 'Recorded errors', repeats: 'Repeated actions',
  unvalidated: 'No validation after last edit', limit: 'Step limit reached',
};

function matchesSignal(run: Run, signal: Signal) {
  if (signal === 'errors') return run.metrics.error_rate > 0;
  if (signal === 'repeats') return run.metrics.repeated_actions > 0;
  if (signal === 'unvalidated') return run.metrics.validated_after_last_edit === false;
  if (signal === 'limit') return run.metrics.max_steps_hit;
  return true;
}

function summarize(runs: Run[]) {
  const lengths = runs.map(run => run.metrics.steps).sort((a, b) => a - b);
  const passed = runs.filter(run => run.outcome.passed === true).length;
  const failed = runs.filter(run => run.outcome.passed === false).length;
  return {
    count: runs.length, passed, failed, unrecorded: runs.length - passed - failed,
    tasks: new Set(runs.map(run => run.task_id)).size,
    median: lengths.length ? (lengths[Math.floor((lengths.length - 1) / 2)] + lengths[Math.floor(lengths.length / 2)]) / 2 : null,
    repeats: runs.reduce((total, run) => total + run.metrics.repeated_actions, 0),
    errors: runs.filter(run => matchesSignal(run, 'errors')).length,
    unvalidated: runs.filter(run => matchesSignal(run, 'unvalidated')).length,
    limit: runs.filter(run => matchesSignal(run, 'limit')).length,
  };
}

function Outcomes({ stats }: { stats: ReturnType<typeof summarize> }) {
  const items = [['passed', stats.passed], ['failed', stats.failed], ['unrecorded', stats.unrecorded]] as const;
  const label = items.map(([name, count]) => `${number.format(count)} ${name}`).join(' · ');
  return <div className="analytics-outcomes">
    <div className="analytics-outcome-bar" role="img" aria-label={label}>
      {items.filter(([, count]) => count > 0).map(([name, count]) => <span key={name} className={name} style={{ flexGrow: count }} />)}
    </div>
    <span>{items.map(([name, count]) => <span key={name} className={name} title={name}>{number.format(count)} <span className="sr-only">{name}</span></span>)}</span>
  </div>;
}

type Node = { id: string; phase: string; layer: 0 | 1; order: number };
type Link = Record<never, never>;
const width = 550;
const height = 336;
const inset = 16;
const flowHeight = height - 2 * inset;

function flows(runs: Run[], phases: Phase[]) {
  const pairs = new Map<string, { source: string; target: string; value: number }>();
  const nodes = new Map<string, Node>();
  const order = new Map(phases.map(({ id }, index) => [id, index]));
  for (const run of runs) {
    for (const [from, transitions] of Object.entries(run.metrics.phase_transitions)) {
      for (const [to, count] of Object.entries(transitions)) {
        if (count <= 0) continue;
        const source = `from:${from}`;
        const target = `to:${to}`;
        if (!nodes.has(source)) nodes.set(source, { id: source, phase: from, layer: 0, order: order.get(from) ?? phases.length });
        if (!nodes.has(target)) nodes.set(target, { id: target, phase: to, layer: 1, order: order.get(to) ?? phases.length });
        const key = JSON.stringify([source, target]);
        const existing = pairs.get(key);
        if (existing) existing.value += count;
        else pairs.set(key, { source, target, value: count });
      }
    }
  }
  const links = [...pairs.values()];
  if (!links.length) return null;
  const columns = [...nodes.values()];
  const fromCount = columns.filter((node) => node.layer === 0).length;
  const gaps = Math.max(fromCount, columns.length - fromCount) - 1;
  return { nodes: columns, links, gaps, total: links.reduce((sum, link) => sum + link.value, 0) };
}

type Flow = NonNullable<ReturnType<typeof flows>>;

function layoutFlow(flow: Flow, pixelsPerCount: number, padding: number) {
  const contentHeight = flow.total * pixelsPerCount + flow.gaps * padding;
  const top = (height - contentHeight) / 2;
  return sankey<Node, Link>()
    .nodeId((node) => node.id)
    .nodeAlign((node) => node.layer)
    .nodeSort((a, b) => a.order - b.order || a.phase.localeCompare(b.phase))
    .nodeWidth(15)
    .nodePadding(padding)
    .extent([[104, top], [width - 104, height - top]])({
      nodes: flow.nodes.map((node) => ({ ...node })),
      links: flow.links.map((link) => ({ ...link })),
    });
}

function SankeyChart({ label, runCount, flow, phases, pixelsPerCount, padding, shared }: {
  label: string; runCount: number; flow: Flow | null; phases: Phase[];
  pixelsPerCount: number; padding: number; shared: boolean;
}) {
  const graph = useMemo(() => flow && layoutFlow(flow, pixelsPerCount, padding), [flow, pixelsPerCount, padding]);
  const map = new Map(phases.map((phase) => [phase.id, phase]));
  const [detail, setDetail] = useState('');
  const phaseName = (node: Node) => map.get(node.phase)?.label ?? node.phase;
  const phaseFill = (node: Node) => phaseColor(map.get(node.phase));
  const path = sankeyLinkHorizontal<Node, Link>();

  function linkDetails(link: SankeyLink<Node, Link>) {
    const from = link.source as SankeyNode<Node, Link>;
    const to = link.target as SankeyNode<Node, Link>;
    return `${phaseName(from)} → ${phaseName(to)} · ${number.format(link.value)} transitions`;
  }

  return <section className="panel sankey-panel" aria-label={`Phase transitions for ${groupName(label)}`}>
    <div className="panel-head"><div><h2>{groupName(label)}</h2>
      <p>{number.format(runCount)} {runCount === 1 ? 'run' : 'runs'} · {number.format(flow?.total ?? 0)} transitions</p></div></div>
    {graph ? <>
      <div className="sankey-chart-body">
      <div className="sankey-scroll">
        <div className="sankey-layers"><span>From phase</span><span>Next phase</span></div>
        <svg className="sankey-svg" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet" role="group" aria-label={`Phase transitions for ${groupName(label)}`}>
          {graph.links.map((link) => {
            const from = link.source as SankeyNode<Node, Link>;
            const detailText = linkDetails(link);
            return <path key={link.index} className="sankey-link" d={path(link) ?? undefined} fill="none"
              stroke={phaseFill(from)} strokeWidth={link.width ?? 0} tabIndex={0}
              aria-label={detailText} role="img" onPointerEnter={() => setDetail(detailText)} onPointerLeave={() => setDetail('')}
              onFocus={() => setDetail(detailText)} onBlur={() => setDetail('')}>
              <title>{detailText}</title>
            </path>;
          })}
          {graph.nodes.map((node) => {
            const { x0 = 0, x1 = 0, y0 = 0, y1 = 0 } = node;
            const detailText = `${node.layer ? 'Next phase' : 'From phase'} · ${phaseName(node)} · ${number.format(node.value ?? 0)} transitions`;
            const name = phaseName(node);
            return <g key={node.id} className="sankey-node" tabIndex={0} role="img" aria-label={detailText}
              onPointerEnter={() => setDetail(detailText)} onPointerLeave={() => setDetail('')}
              onFocus={() => setDetail(detailText)} onBlur={() => setDetail('')}>
              <title>{detailText}</title>
              <rect x={x0} y={y0} width={x1 - x0} height={y1 - y0} rx={2} fill={phaseFill(node)} />
              <text x={node.layer ? x1 + 8 : x0 - 8} y={(y0 + y1) / 2} dominantBaseline="central"
                textAnchor={node.layer ? 'start' : 'end'}>{name.length > 14 ? name.slice(0, 13) + '…' : name}</text>
            </g>;
          })}
        </svg>
      </div>
      <div className="analytics-transitions"><h3>Transition counts</h3>
        <div className="analytics-transition-list" tabIndex={0} role="region" aria-label={`Transition counts for ${groupName(label)}`}>
          <table><thead><tr><th>Phase pair</th><th>Count</th></tr></thead><tbody>
            {[...graph.links].sort((a, b) => b.value - a.value || a.index! - b.index!).map(link => <tr key={link.index}>
              <td><span>{phaseName(link.source as Node)}</span><span><Icon name="arrow" size={12}/>{phaseName(link.target as Node)}</span></td>
              <td>{number.format(link.value)}</td>
            </tr>)}
          </tbody></table>
        </div>
      </div>
      </div>
      <div className="graph-caption sankey-caption"><span className="graph-tip">{detail ||
        (shared ? 'Both charts use the same count scale.' : 'Band width represents transition count.')}</span></div>
    </> : <Empty icon="sankey" title="No phase transitions">This group contains no recorded phase transitions.</Empty>}
  </section>;
}

export function Sankey({ runs, phases, openRun }: { runs: Run[]; phases: Phase[]; openRun: (id: string) => void }) {
  const [query, setQuery] = useState('');
  const [outcome, setOutcome] = useState<OutcomeFilter>('all');
  const [dimension, setDimension] = useState<Dimension>('model');
  const [two, setTwo] = useState(false);
  const [left, setLeft] = useState('');
  const [right, setRight] = useState('');
  const [groupPage, setGroupPage] = useState(0);
  const [recordPage, setRecordPage] = useState(0);
  const [recordFilter, setRecordFilter] = useState<Signal>('all');
  const [recordsOpen, setRecordsOpen] = useState(false);
  const [flowOpen, setFlowOpen] = useState(true);
  const records = useRef<HTMLDetailsElement>(null);
  const flowSection = useRef<HTMLDetailsElement>(null);
  const cohort = useMemo(() => {
    const search = query.trim().toLowerCase();
    return runs.filter(run => (!search || [run.id, run.task_id, run.model, run.condition, run.agent].join('\n').toLowerCase().includes(search)) &&
      (outcome === 'all' || (outcome === 'unrecorded' ? run.outcome.passed == null : run.outcome.passed === (outcome === 'passed'))));
  }, [runs, query, outcome]);
  const summary = useMemo(() => summarize(cohort), [cohort]);
  const groups = useMemo(() => {
    const result = new Map<string, Run[]>();
    for (const run of cohort) {
      const group = groupValue(run, dimension);
      const existing = result.get(group);
      if (existing) existing.push(run);
      else result.set(group, [run]);
    }
    return result;
  }, [cohort, dimension]);
  const options = [...groups.keys()].sort((a, b) => groups.get(b)!.length - groups.get(a)!.length || a.localeCompare(b));
  const first = groups.has(left) ? left : options[0];
  const other = options.filter((option) => option !== first);
  const second = other.includes(right) ? right : other[0];
  const sideBySide = two && other.length > 0;
  const groupStats = useMemo(() => new Map([...groups].map(([name, members]) => [name, summarize(members)])), [groups]);
  const selectedStats = groupStats.get(first);
  const selectedRuns = groups.get(first) ?? [];
  const filteredRecords = selectedRuns.filter(run => matchesSignal(run, recordFilter));
  const groupPages = Math.max(1, Math.ceil(options.length / pageSize));
  const currentGroupPage = Math.min(groupPage, groupPages - 1);
  const recordPages = Math.max(1, Math.ceil(filteredRecords.length / pageSize));
  const currentRecordPage = Math.min(recordPage, recordPages - 1);
  const firstFlow = useMemo(() => flows(groups.get(first) ?? [], phases), [groups, first, phases]);
  const secondFlow = useMemo(() => sideBySide ? flows(groups.get(second) ?? [], phases) : null, [groups, second, phases, sideBySide]);
  const maxGaps = Math.max(1, firstFlow?.gaps ?? 0, secondFlow?.gaps ?? 0);
  const padding = Math.min(14, flowHeight / (2 * maxGaps));
  const pixelsPerCount = Math.min(
    firstFlow ? (flowHeight - firstFlow.gaps * padding) / firstFlow.total : Infinity,
    secondFlow ? (flowHeight - secondFlow.gaps * padding) / secondFlow.total : Infinity,
  );

  function selectGroup(name: string) {
    setLeft(name); setRecordPage(0); setRecordFilter('all');
  }
  function review(name: string, signal: Signal) {
    setLeft(name); setRecordFilter(signal); setRecordPage(0); setRecordsOpen(true);
    requestAnimationFrame(() => { records.current?.scrollIntoView({ block: 'start' }); records.current?.querySelector('summary')?.focus({ preventScroll: true }); });
  }
  function reset() {
    setQuery(''); setOutcome('all'); setGroupPage(0); setRecordPage(0); setRecordFilter('all');
  }

  return <div className="analytics-page">
    <Heading title="Analytics" actions={<button className="button" disabled={!cohort.length} title="Export metrics for every run in the current search and outcome scope" onClick={() => exportMetrics(cohort)}><Icon name="download" size={16}/>Export CSV</button>}>
      Find runs worth inspecting, then follow the recorded evidence.
    </Heading>
    <div className="analytics-scope" role="search" aria-label="Analytics scope">
      <label className="analytics-search">Find runs<div className="search-field"><Icon name="search" size={16}/><input type="search" placeholder="Run, task, model or condition" value={query} onChange={event => { setQuery(event.target.value); setGroupPage(0); setRecordPage(0); }} /></div></label>
      <label>Group by<select value={dimension} onChange={event => { setDimension(event.target.value as Dimension); setLeft(''); setRight(''); setGroupPage(0); setRecordPage(0); setRecordFilter('all'); }}>
        {dimensions.map(value => <option key={value} value={value}>{groupLabel[value]}</option>)}
      </select></label>
      <label>Outcome status<select value={outcome} onChange={event => { setOutcome(event.target.value as OutcomeFilter); setGroupPage(0); setRecordPage(0); }}>
        <option value="all">All outcomes</option><option value="passed">Passed</option><option value="failed">Not passed</option><option value="unrecorded">Unrecorded</option>
      </select></label>
      <div className="analytics-scope-count" role="status">{number.format(cohort.length)} of {number.format(runs.length)} runs · {number.format(summary.tasks)} tasks</div>
      {(query || outcome !== 'all') && <button className="button small quiet" onClick={reset}>Clear filters</button>}
    </div>
    {!runs.length ? <Empty icon="chart" title="No runs to analyze">Import traces in Datasets to compare recorded outcomes and phase transitions.</Empty> : !cohort.length ? <Empty icon="search" title="No matching runs" actions={<button className="button" onClick={reset}>Clear filters</button>}>Try another run, task or model, or include all outcomes.</Empty> : <>
      <dl className="analytics-summary" aria-label="Analytics summary">
        <div><dt><Icon name="runs" size={17}/>Runs in scope</dt><dd data-stat="runs">{number.format(summary.count)}<span>{number.format(options.length)} {groupLabel[dimension].toLowerCase()} {options.length === 1 ? 'group' : 'groups'}</span></dd></div>
        <div><dt><Icon name="check" size={17}/>Recorded pass rate</dt><dd data-stat="pass-rate">{summary.passed + summary.failed ? percent.format(summary.passed / (summary.passed + summary.failed)) : 'Unrecorded'}<span>{summary.passed} / {summary.passed + summary.failed} reported · {summary.unrecorded} unrecorded</span></dd></div>
        <div><dt><Icon name="events" size={17}/>Median source steps</dt><dd data-stat="median-steps">{summary.median == null ? 'Unrecorded' : number.format(summary.median)}<span>Per run · recorded step count</span></dd></div>
        <div><dt><Icon name="retry" size={17}/>Repeated actions</dt><dd data-stat="repeats">{number.format(summary.repeats)}<span>Extra occurrences of a signature</span></dd></div>
      </dl>
      <section className="analytics-overview" aria-labelledby="analytics-groups-title">
        <div className="analytics-group-workspace">
          <header className="analytics-section-head"><div><h2 id="analytics-groups-title">Group comparison</h2><p>Select a group to inspect its runs.</p></div>
            <div className="analytics-outcome-legend" aria-label="Outcome order"><span className="passed">Passed</span><span className="failed">Not passed</span><span className="unrecorded">Unrecorded</span></div>
          </header>
          <div className="analytics-table-scroll" tabIndex={0} role="region" aria-label="Group comparison table">
            <table className="analytics-group-table"><thead><tr><th>{groupLabel[dimension]}</th><th>Runs</th><th>Outcomes</th><th>Median steps</th><th>With errors</th><th>Repeats</th></tr></thead><tbody>
              {options.slice(currentGroupPage * pageSize, (currentGroupPage + 1) * pageSize).map(name => {
                const stats = groupStats.get(name)!;
                return <tr key={name} className={name === first ? 'selected' : ''} data-group={name}>
                  <th scope="row"><button className="analytics-group-select" aria-label={`Select ${groupName(name)} group`} aria-pressed={name === first} onClick={() => selectGroup(name)}><span>{groupName(name)}</span><Icon name="right" size={14}/></button><small>{stats.tasks} {stats.tasks === 1 ? 'task' : 'tasks'}</small></th>
                  <td>{number.format(stats.count)}</td><td><Outcomes stats={stats}/></td><td><span className="metric-inline" title="Bar: median source steps, shared scale across all groups in scope"><span>{stats.median == null ? 'Unrecorded' : number.format(stats.median)}</span>{stats.median != null && <i aria-hidden="true"><b style={{width:(stats.median/Math.max(1,...[...groupStats.values()].map(value=>value.median??0))*100)+'%'}}/></i>}</span></td>
                  <td><button className="analytics-count-link" aria-label={`Review ${stats.errors} runs with errors in ${groupName(name)}`} disabled={!stats.errors} title={stats.errors ? 'Show runs with a recorded error' : 'No recorded errors in this group'} onClick={() => review(name, 'errors')}>{stats.errors}<Icon name="arrow" size={12}/></button></td>
                  <td>{number.format(stats.repeats)}</td>
                </tr>;
              })}
            </tbody></table>
          </div>
          <div className="analytics-pagination"><span>{options.length} {options.length === 1 ? 'group' : 'groups'}{groupPages > 1 && ` · page ${currentGroupPage + 1} of ${groupPages}`}</span><div>
            <button className="button small quiet" aria-label="Previous group page" disabled={currentGroupPage === 0} onClick={() => setGroupPage(currentGroupPage - 1)}><Icon name="left" size={14}/>Previous</button>
            <button className="button small quiet" aria-label="Next group page" disabled={currentGroupPage + 1 >= groupPages} onClick={() => setGroupPage(currentGroupPage + 1)}>Next<Icon name="right" size={14}/></button>
          </div></div>
        </div>
        {selectedStats && <aside className="analytics-review" aria-label="Selected group review">
          <h3>{groupName(first)}</h3><p>Selected {groupLabel[dimension].toLowerCase()} · {selectedStats.count} {selectedStats.count === 1 ? 'run' : 'runs'} across {selectedStats.tasks} {selectedStats.tasks === 1 ? 'task' : 'tasks'}. Review signals do not imply a failed outcome.</p>
          <h4>Review this group</h4>
          {([['errors', selectedStats.errors, 'With a recorded error'], ['unvalidated', selectedStats.unvalidated, 'No validation after last edit'], ['limit', selectedStats.limit, 'Step limit reached']] as const).map(([signal, count, label]) =>
            <button key={signal} className="analytics-signal" data-signal={signal} disabled={!count} title={count ? `Show ${count} matching runs` : `No matching runs in this group`} onClick={() => review(first, signal)}><Icon name={signal === 'errors' ? 'warning' : signal === 'unvalidated' ? 'test' : 'target'} size={16}/><span>{label}</span><strong>{count}</strong><Icon name="right" size={14}/></button>)}
          <button className="button analytics-review-runs" onClick={() => review(first, 'all')}>View {selectedStats.count} run {selectedStats.count === 1 ? 'record' : 'records'}<Icon name="arrow" size={15}/></button>
          <button className="button quiet" onClick={() => { setFlowOpen(true); requestAnimationFrame(() => { flowSection.current?.scrollIntoView({ block: 'start' }); flowSection.current?.querySelector('summary')?.focus({ preventScroll: true }); }); }}><Icon name="sankey" size={16}/>Explore phase flow</button>
        </aside>}
      </section>
      <details className="analytics-disclosure analytics-flow" ref={flowSection} open={flowOpen} onToggle={event => setFlowOpen(event.currentTarget.open)}>
        <summary><Icon name="sankey" size={18}/><h2>Phase transitions</h2><span>How recorded phases follow one another</span><Icon name="down" size={16}/></summary>
      <div className="sankey-controls">
        <div className="sankey-selects">
          <label>{sideBySide ? 'First group' : 'Group'}<select value={first} onChange={(event) => selectGroup(event.target.value)}>
            {options.map((option) => <option key={option} value={option}>{groupName(option)}</option>)}</select></label>
          {sideBySide && <label>Second group<select value={second} onChange={(event) => setRight(event.target.value)}>
            {other.map((option) => <option key={option} value={option}>{groupName(option)}</option>)}</select></label>}
        </div>
        <button className={`button ${sideBySide ? 'is-active' : ''}`} aria-pressed={sideBySide} disabled={!other.length}
          title={!other.length ? 'At least two groups are required' : undefined} onClick={() => setTwo(!two)}>
          <Icon name="compare" size={16} /> Side by side
        </button>
      </div>
      <div className={`sankey-grid ${sideBySide ? 'two' : ''}`}>
        <SankeyChart key={JSON.stringify([dimension, first])} label={first} runCount={groups.get(first)!.length}
          flow={firstFlow} phases={phases} pixelsPerCount={pixelsPerCount} padding={padding} shared={sideBySide} />
        {sideBySide && <SankeyChart key={JSON.stringify([dimension, second])} label={second} runCount={groups.get(second)!.length}
          flow={secondFlow} phases={phases} pixelsPerCount={pixelsPerCount} padding={padding} shared />}
      </div>
      </details>
      <details ref={records} className="analytics-disclosure analytics-records" open={recordsOpen} onToggle={event => setRecordsOpen(event.currentTarget.open)}>
        <summary><Icon name="runs" size={18}/><h2>Run records</h2><span>{groupName(first)} · {selectedRuns.length} {selectedRuns.length === 1 ? 'run' : 'runs'}</span><Icon name="down" size={16}/></summary>
        <div className="analytics-record-tools"><p>Open a run in Graph to inspect its source steps.</p><label>Review signal<select value={recordFilter} onChange={event => { setRecordFilter(event.target.value as Signal); setRecordPage(0); }}>{Object.entries(signalLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label></div>
        {filteredRecords.length ? <>
          <div className="analytics-table-scroll" tabIndex={0} role="region" aria-label="Run records table"><table className="analytics-runs-table"><thead><tr><th>Run / task</th><th>Outcome</th><th>Steps</th><th>Repeats</th><th>Errors</th><th>Validation after edit</th><th>Recorded time</th><th><span className="sr-only">Open</span></th></tr></thead><tbody>
            {filteredRecords.slice(currentRecordPage * pageSize, (currentRecordPage + 1) * pageSize).map(run => <tr key={run.id} data-run-id={run.id}><th scope="row"><button className="analytics-run-link" onClick={() => openRun(run.id)}>{run.id}</button><small>{run.task_id || 'Task unrecorded'}</small></th><td><OutcomeBadge outcome={run.outcome}/></td><td>{number.format(run.metrics.steps)}</td><td>{number.format(run.metrics.repeated_actions)}</td><td>{percent.format(run.metrics.error_rate)}</td><td>{run.metrics.validated_after_last_edit == null ? 'Unrecorded' : run.metrics.validated_after_last_edit ? 'Yes' : 'No'}</td><td>{run.usage?.wall_s == null ? 'Unrecorded' : `${number.format(run.usage.wall_s)}s`}</td><td><button className="button small" aria-label={`Open ${run.id} graph`} onClick={() => openRun(run.id)}><Icon name="graph" size={15}/>Graph</button></td></tr>)}
          </tbody></table></div>
          <div className="analytics-pagination"><span>{filteredRecords.length} matching {filteredRecords.length === 1 ? 'run' : 'runs'} · page {currentRecordPage + 1} of {recordPages}</span><div><button className="button small quiet" aria-label="Previous run page" disabled={currentRecordPage === 0} onClick={() => setRecordPage(currentRecordPage - 1)}><Icon name="left" size={14}/>Previous</button><button className="button small quiet" aria-label="Next run page" disabled={currentRecordPage + 1 >= recordPages} onClick={() => setRecordPage(currentRecordPage + 1)}>Next<Icon name="right" size={14}/></button></div></div>
        </> : <Empty icon="search" title="No runs match this signal" actions={<button className="button small" onClick={() => setRecordFilter('all')}>Show all group runs</button>}>Choose another review signal for {groupName(first)}.</Empty>}
      </details>
      <details className="analytics-disclosure analytics-definitions"><summary><Icon name="info" size={18}/><h2>Metric definitions</h2><span>Counting rules and missing data</span><Icon name="down" size={16}/></summary><dl>
        <div><dt><Icon name="check" size={17}/>Recorded pass rate</dt><dd>Passed ÷ runs with an explicit pass status. Unrecorded outcomes stay outside the denominator; this is not a test-case pass rate.</dd></div>
        <div><dt><Icon name="retry" size={17}/>Repeated actions</dt><dd>Extra occurrences of normalized tool/target signatures, including nonconsecutive repeats. This count does not assert retries or failures.</dd></div>
        <div><dt>Recorded errors</dt><dd>The run's saved error rate is greater than zero. A run with errors can still have a passed outcome.</dd></div>
        <div><dt>Validation after last edit</dt><dd>The saved metric records a later validation step, not whether that validation passed. No prior edit is unrecorded.</dd></div>
        <div><dt>Phase transitions</dt><dd>Counts of adjacent recorded phases, including self and reverse transitions. Side-by-side bands share one count scale; they do not measure time.</dd></div>
        <div><dt>Comparability</dt><dd>Groups can contain different tasks and budgets. Use Compare for runs of the same task. Recorded time is source wall time; missing time remains Unrecorded.</dd></div>
      </dl></details>
    </>}
  </div>;
}
