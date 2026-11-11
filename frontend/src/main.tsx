import { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Compare } from './Compare';
import { isOffline, useResource, useStored } from './data';
import { type Theme } from './graphDrawing';
import { number, type Dataset } from './model';
import { RunGraph } from './RunGraph';
import { RunList } from './RunList';
import { Sankey } from './Sankey';
import { Empty, Heading, Icon, LoadError, Loading, type IconName } from './ui';
import './styles.css';

const pages = [
  { id: 'runs', label: 'Runs', icon: 'runs' },
  { id: 'graph', label: 'Run graph', icon: 'graph' },
  { id: 'compare', label: 'Compare', icon: 'compare' },
  { id: 'sankey', label: 'Sankey', icon: 'sankey' },
] as const satisfies readonly { id: string; label: string; icon: IconName }[];
type Page = typeof pages[number]['id'];

function Sidebar({ page, navigate, dataset, theme, toggleTheme }: {
  page: Page; navigate: (page: Page) => void; dataset?: Dataset; theme: Theme; toggleTheme: () => void;
}) {
  const context = useMemo(() => dataset && ({
    steps: dataset.runs.reduce((sum, run) => sum + run.metrics.steps, 0),
    tasks: new Set(dataset.runs.map((run) => run.task_id)).size,
  }), [dataset]);

  return <aside className="sidebar">
    <button className="brand" onClick={() => navigate('runs')} aria-label="TrajViz home">
      <span className="brand-mark"><Icon name="logo" size={24} /></span><span>TrajViz</span>
    </button>
    <nav aria-label="Workspace">
      <span className="rail-label">Workspace</span>
      {pages.map(({ id, label, icon }) => <button key={id} className="nav-button" onClick={() => navigate(id)}
        aria-current={page === id ? 'page' : undefined} title={label}>
        <Icon name={icon} size={18} /><span>{label}</span>
      </button>)}
    </nav>
    <div className="rail-footer">
      <section className="dataset-card" aria-label="Dataset context">
        <div><Icon name="database" size={16} /><strong>Dataset</strong></div>
        {dataset && context ? <>
          <p>{number.format(dataset.runs.length)} runs · {number.format(context.tasks)} tasks</p>
          <p>{number.format(context.steps)} recorded steps</p>
        </> : <p>Index pending</p>}
      </section>
      <button className="theme-button" onClick={toggleTheme} aria-pressed={theme === 'dark'} aria-label="Dark theme"
        title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}>
        <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={17} />
        <span>{theme === 'dark' ? 'Light theme' : 'Dark theme'}</span><i className="theme-switch" aria-hidden="true" />
      </button>
    </div>
  </aside>;
}

function App() {
  const [page, setPage] = useState<Page>('runs');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [graphId, setGraphId] = useState<string>();
  const [theme, setTheme] = useStored<Theme>('trajviz-theme', 'light', ['light', 'dark']);
  const resource = useResource<Dataset>(['index.json'], true);
  const loaded = resource.state.status === 'ready' ? resource.state.data : undefined;
  const dataset = loaded?.schema_version === 1 && Array.isArray(loaded.runs) && Array.isArray(loaded.phases) ? loaded : undefined;
  const byId = useMemo(() => new Map(dataset?.runs.map((run) => [run.id, run])), [dataset]);
  const selected = useMemo(() => selectedIds.flatMap((id) => byId.has(id) ? [byId.get(id)!] : []), [selectedIds, byId]);
  const activeGraph = graphId ? byId.get(graphId) : selected.length === 1 ? selected[0] : undefined;
  const focusHeading = useRef(false);
  const main = useRef<HTMLElement>(null);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    if (focusHeading.current) {
      focusHeading.current = false;
      const heading = Array.from(main.current?.querySelectorAll('h1') ?? []).find((element) => !element.closest('[hidden]'));
      if (heading) { heading.tabIndex = -1; heading.focus({ preventScroll: true }); }
    }
  }, [page]);

  function navigate(next: Page) {
    if (page === next) return;
    focusHeading.current = true;
    setPage(next);
    window.scrollTo(0, 0);
  }

  function select(id: string) {
    setSelectedIds((previous) => {
      if (previous.includes(id)) return previous.filter((value) => value !== id);
      if (previous.length >= 4 || (previous.length && byId.get(previous[0])?.task_id !== byId.get(id)?.task_id)) return previous;
      return [...previous, id];
    });
  }

  function openGraph(id: string) {
    setGraphId(id);
    navigate('graph');
  }

  const back = <button className="button primary" onClick={() => navigate('runs')}>
    <Icon name="runs" size={16} /> Browse runs
  </button>;

  return <div className="app-shell">
    <a className="skip-link" href="#main-content">Skip to workspace</a>
    <Sidebar page={page} navigate={navigate} dataset={dataset} theme={theme}
      toggleTheme={() => setTheme(theme === 'dark' ? 'light' : 'dark')} />
    <div className="workspace">
      <div className="topbar">
        <div className="breadcrumbs"><span>Workspace</span><Icon name="right" size={13} />
          <strong>{pages.find(({ id }) => id === page)?.label}</strong></div>
        <div className="source-chip"><i />{isOffline ? 'Offline report' : 'Local dataset'}</div>
      </div>
      <main id="main-content" tabIndex={-1} ref={main}>
        {resource.state.status === 'loading' && <><Heading title="Runs" /><Loading>Loading dataset index…</Loading></>}
        {resource.state.status === 'error' && <>
          <Heading title="Runs" />
          <div className="panel">
            <Empty icon="database" title="Dataset unavailable">
              Serve a TrajViz build at /data/index.json or open an exported HTML report.
            </Empty>
            <div className="panel-inset"><LoadError message={resource.state.message} retry={resource.retry} /></div>
          </div>
        </>}
        {resource.state.status === 'ready' && !dataset && <>
          <Heading title="Runs" />
          <div className="panel"><Empty icon="database" title="Unsupported dataset">
            This viewer requires a TrajViz schema version 1 index.
          </Empty></div>
        </>}
        {dataset && <>
          <div hidden={page !== 'runs'}><RunList dataset={dataset} selected={selected} onSelect={select}
            openGraph={openGraph} openCompare={() => navigate('compare')} /></div>
          {page === 'graph' && (activeGraph ? <RunGraph run={activeGraph} phases={dataset.phases} theme={theme} /> : <>
            <Heading title="Run graph" />
            <div className="panel"><Empty icon="graph" title="Choose a run" actions={back}>
              Open a run from the catalog to explore its process graph and inspect source steps.
            </Empty></div>
          </>)}
          {page === 'compare' && (selected.length >= 2 ? <Compare runs={selected} phases={dataset.phases} theme={theme} /> : <>
            <Heading title="Compare runs" />
            <div className="panel"><Empty icon="compare" title="Select runs to compare" actions={back}>
              Choose two to four runs from the same task in the run catalog.
            </Empty></div>
          </>)}
          {page === 'sankey' && <Sankey runs={dataset.runs} phases={dataset.phases} />}
        </>}
      </main>
    </div>
  </div>;
}

const root = document.getElementById('root');
if (root) createRoot(root).render(<App />);
