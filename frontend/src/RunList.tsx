import { useDeferredValue, useMemo, useState } from 'react';
import { useResource } from './data';
import { type Dataset, type Run, number, percent } from './model';
import { Empty, exportMetrics, Heading, Icon, LoadError, OutcomeBadge, PassStat, Stat } from './ui';

const fields = [
  { key: 'task_id', label: 'Task', get: (run: Run) => run.task_id },
  { key: 'model', label: 'Model', get: (run: Run) => run.model },
  { key: 'condition', label: 'Condition', get: (run: Run) => run.condition },
  { key: 'outcome', label: 'Outcome', get: (run: Run) => run.outcome.label },
] as const;
type FilterKey = typeof fields[number]['key'];
type Filters = Partial<Record<FilterKey, string[]>>;
const pageSize = 50;

function Filter({ label, options, selected, change }: {
  label: string; options: string[]; selected: string[]; change: (values: string[]) => void;
}) {
  const [query, setQuery] = useState('');
  const shown = options.filter((option) => option.toLowerCase().includes(query.toLowerCase()));
  return <details className="filter" onBlur={(event) => {
    if (!event.currentTarget.contains(event.relatedTarget)) event.currentTarget.open = false;
  }} onKeyDown={(event) => {
    if (event.key === 'Escape') {
      event.currentTarget.open = false;
      event.currentTarget.querySelector('summary')?.focus();
    }
  }}>
    <summary className={`button ${selected.length ? 'is-active' : ''}`}>
      {label}{selected.length > 0 && <span className="filter-count">{selected.length}</span>}
      <Icon name="down" size={13} />
    </summary>
    <div className="filter-menu">
      {options.length > 7 && <input type="search" aria-label={`Find ${label.toLowerCase()} options`}
        placeholder={`Find ${label.toLowerCase()}…`} value={query} onChange={(event) => setQuery(event.target.value)} />}
      <div className="filter-options" role="group" aria-label={label}>
        {shown.map((option) => <label key={option} title={option}>
          <input type="checkbox" checked={selected.includes(option)} onChange={(event) =>
            change(event.target.checked ? [...selected, option] : selected.filter((value) => value !== option))} />
          <span>{option || '(blank)'}</span>
        </label>)}
        {!shown.length && <div className="muted">No matching options</div>}
      </div>
      <button className="button quiet small" disabled={!selected.length} onClick={() => change([])}>Clear {label.toLowerCase()}</button>
    </div>
  </details>;
}

function runMetadata(run: Run) {
  return [run.id, run.task_id, run.model, run.agent, run.condition, run.source_format, run.outcome.label,
    run.outcome.finish_reason, run.outcome.partial_score, run.outcome.passed].filter((value) => value != null).join(' ').toLowerCase();
}

export function RunList({ dataset, selected, onSelect, openGraph, openCompare }: {
  dataset: Dataset; selected: Run[]; onSelect: (id: string) => void;
  openGraph: (id: string) => void; openCompare: () => void;
}) {
  const { runs } = dataset;
  const [filters, setFilters] = useState<Filters>({});
  const [search, setSearch] = useState('');
  const [regex, setRegex] = useState('');
  const [showRegex, setShowRegex] = useState(false);
  const [page, setPage] = useState(0);
  const query = useDeferredValue(search.trim().toLowerCase());
  const fullText = useResource<Record<string, string>>(search.trim() ? [dataset.search_file] : [], true);
  const textIndex = fullText.state.status === 'ready' ? fullText.state.data : undefined;
  const pattern = useMemo(() => {
    try { return { value: regex ? new RegExp(regex) : null }; }
    catch (error) { return { error: error instanceof Error ? error.message : 'Invalid regular expression' }; }
  }, [regex]);
  const catalog = useMemo(() => ({
    metadata: new Map(runs.map((run) => [run.id, runMetadata(run)])),
    options: fields.map((field) => [...new Set(runs.map(field.get))].sort((a, b) => a.localeCompare(b))),
  }), [runs]);
  const matches = useMemo(() => runs.filter((run) =>
    fields.every((field) => !filters[field.key]?.length || filters[field.key]?.includes(field.get(run))) &&
    (!pattern.value || pattern.value.test(run.langutory)) &&
    (!query || catalog.metadata.get(run.id)?.includes(query) ||
      (Object.hasOwn(textIndex ?? {}, run.id) && textIndex?.[run.id]?.toLowerCase().includes(query)))),
  [runs, filters, pattern, query, catalog, textIndex]);

  const activeFilters = Boolean(search || regex || fields.some((field) => filters[field.key]?.length));
  const selectedIds = new Set(selected.map((run) => run.id));
  const task = selected[0]?.task_id;
  const csvRuns = selected.length ? selected : matches;
  const pageCount = Math.ceil(matches.length / pageSize);
  const shownPage = Math.min(page, Math.max(0, pageCount - 1));
  const start = shownPage * pageSize;

  function reset() {
    setSearch('');
    setRegex('');
    setFilters({});
    setPage(0);
  }

  return <>
    <Heading title="Runs" actions={<button className="button" disabled={!csvRuns.length}
      title={selected.length ? 'Export selected runs' : 'Export filtered runs'} onClick={() => exportMetrics(csvRuns)}>
      <Icon name="download" size={16} /> Export CSV
    </button>}>Find trajectories, inspect individual steps, and compare runs of the same task.</Heading>

    <div className="stats">
      <Stat icon="layers" label="Runs" value={number.format(runs.length)} detail="Trajectories in dataset" />
      <Stat icon="target" label="Tasks" value={number.format(catalog.options[0].length)} />
      <Stat icon="model" label="Models" value={number.format(catalog.options[1].length)} />
      <PassStat runs={runs} />
    </div>

    <section className="panel run-panel" aria-labelledby="run-catalog-title">
      <div className="panel-head">
        <div><h2 id="run-catalog-title">Run catalog</h2>
          <p aria-live="polite">{number.format(matches.length)} of {number.format(runs.length)} runs</p></div>
        {activeFilters && <button className="button quiet small" onClick={reset}>Clear filters</button>}
      </div>
      <div className="filters">
        <label className="search-field">
          <Icon name="search" size={17} />
          <input type="search" aria-label="Search runs and steps" placeholder="Search runs and step text…"
            value={search} onChange={(event) => { setSearch(event.target.value); setPage(0); }} />
        </label>
        <div className="filter-buttons">
          {fields.map(({ key, label }, index) => <Filter key={key} label={label} options={catalog.options[index]}
            selected={filters[key] ?? []} change={(values) => {
              setFilters((current) => ({ ...current, [key]: values }));
              setPage(0);
            }} />)}
          <button className={`button ${showRegex || regex ? 'is-active' : ''}`} aria-expanded={showRegex}
            aria-controls="regex-filter" onClick={() => setShowRegex(!showRegex)}>
            <span className="regex-icon" aria-hidden="true">.*</span> Langutory
          </button>
        </div>
      </div>
      <div className="regex-row" id="regex-filter" hidden={!showRegex}>
        <label htmlFor="langutory">Langutory regex</label>
        <input id="langutory" className="mono" autoComplete="off" spellCheck={false} placeholder="e.g. E V(?: E)?"
          aria-invalid={Boolean(pattern.error)} aria-describedby="regex-help" value={regex} onChange={(event) => {
            setRegex(event.target.value);
            setPage(0);
          }} />
        <span id="regex-help" className={pattern.error ? 'error-text' : 'muted'} role={pattern.error ? 'alert' : undefined}>
          {pattern.error ? `Invalid pattern. ${pattern.error}` : 'Matches the space-separated phase symbols.'}
        </span>
      </div>
      {fullText.state.status === 'loading' && <p className="inline-status" role="status">Loading full-text index…</p>}
      {fullText.state.status === 'error' && <div className="panel-inset"><LoadError
        message={`Full-text search unavailable. ${fullText.state.message}`} retry={fullText.retry} /></div>}

      {matches.length ? <div className="table-scroll">
        <table className="runs-table">
          <thead><tr>
            <th scope="col"><span className="sr-only">Select run</span></th>
            <th scope="col">Run / Task</th><th scope="col">Model</th><th scope="col">Condition</th>
            <th scope="col">Outcome</th><th scope="col" className="numeric">Steps</th>
            <th scope="col" className="numeric">Error rate</th><th scope="col" className="numeric">Cycles</th>
          </tr></thead>
          <tbody>
            {matches.slice(start, start + pageSize).map((run) => {
              const checked = selectedIds.has(run.id);
              const unavailable = !checked && (task != null && run.task_id !== task ? 'Compare requires runs of the same task.'
                : selected.length >= 4 ? 'Up to four runs can be selected.' : '');
              return <tr key={run.id} className={checked ? 'row-selected' : ''}>
                <td><span title={unavailable || undefined}>
                  <input type="checkbox" aria-label={`Select ${run.id}`} checked={checked}
                    aria-describedby="selection-help" disabled={Boolean(unavailable)} onChange={() => onSelect(run.id)} />
                </span></td>
                <th scope="row">
                  <button className="text-button run-name" title={run.id} onClick={() => openGraph(run.id)}>{run.id}</button>
                  <span className="run-task" title={run.task_id}>{run.task_id}</span>
                </th>
                <td>{run.model}</td><td>{run.condition}</td><td><OutcomeBadge outcome={run.outcome} /></td>
                <td className="numeric">{number.format(run.metrics.steps)}</td>
                <td className="numeric">{percent.format(run.metrics.error_rate)}</td>
                <td className="numeric">{number.format(run.metrics.cycles)}</td>
              </tr>;
            })}
          </tbody>
        </table>
      </div> : <Empty icon={runs.length ? 'search' : 'database'}
        title={runs.length ? (fullText.state.status === 'loading' ? 'Searching runs' : 'No matching runs') : 'No runs in this dataset'}
        actions={activeFilters && <button className="button" onClick={reset}>Clear filters</button>}>
        {runs.length ? (fullText.state.status === 'loading' ? 'Step text will be searched when the index is ready.' :
          'Try a different search or clear the filters.') : 'Load a TrajViz build with at least one trajectory to begin.'}
      </Empty>}

      {pageCount > 1 && <div className="pagination">
        <span>{number.format(start + 1)}–{number.format(Math.min(start + pageSize, matches.length))} of {number.format(matches.length)}</span>
        <button className="button small icon-button" aria-label="Previous page" disabled={shownPage === 0}
          onClick={() => setPage(shownPage - 1)}><Icon name="left" size={15} /></button>
        <button className="button small icon-button" aria-label="Next page" disabled={shownPage + 1 === pageCount}
          onClick={() => setPage(shownPage + 1)}><Icon name="right" size={15} /></button>
      </div>}
      <div className="selection-bar">
        <div>
          <strong>{selected.length ? `${selected.length} selected` : 'Select runs'}</strong>
          <p id="selection-help">{task ? `Task ${task}. Compare 2–4 runs from this task.` :
            'Select one run for its graph, or 2–4 runs of the same task to compare.'}</p>
          {selected.length > 0 && <div className="selected-runs">
            {selected.map((run) => <button className="selection-chip" title={`Remove ${run.id}`} key={run.id}
              aria-label={`Deselect ${run.id}`} onClick={() => onSelect(run.id)}>
              <span>{run.id}</span><Icon name="close" size={12} />
            </button>)}
          </div>}
        </div>
        <div className="selection-actions">
          <button className="button" disabled={selected.length !== 1}
            onClick={() => openGraph(selected[0].id)}><Icon name="graph" size={16} /> Open graph</button>
          <button className="button primary" disabled={selected.length < 2} onClick={openCompare}>
            Compare runs <Icon name="arrow" size={16} />
          </button>
        </div>
      </div>
    </section>
  </>;
}
