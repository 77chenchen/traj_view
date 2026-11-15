import { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { LiveStatus } from './LiveStatus';
import { Compare } from './Compare';
import { useResource, useStored } from './data';
import { type Theme } from './graphDrawing';
import { type Dataset, type StepIndex } from './model';
import { Replay } from './Replay';
import { RunGraph } from './RunGraph';
import { RunList } from './RunList';
import { Sankey } from './Sankey';
import { ViewTitle } from './Evidence';
import { Empty, Heading, Icon, LoadError, Loading, type IconName } from './ui';
import './styles.css';
import './workbench.css';
import './density.css';
import './hierarchy.css';
import './neutral.css';
import './typography.css';
import './analytics.css';
import './graphFullscreen.css';

const pages = [
  { id: 'replay', label: 'Trajectory replay', short: 'Replay', title: 'Trajectory Replay', icon: 'play' },
  { id: 'timeline', label: 'Execution timeline', short: 'Timeline', title: 'Execution Timeline', icon: 'chart' },
  { id: 'graph', label: 'Execution graph', short: 'Graph', title: 'Execution Graph', icon: 'graph' },
  { id: 'compare', label: 'Compare', short: 'Compare', title: 'Trajectory Comparison', icon: 'compare' },
  { id: 'sankey', label: 'Sankey', short: 'Analytics', title: 'Analytics', icon: 'chart' },
  { id: 'runs', label: 'Runs', short: 'Datasets', title: 'Datasets', icon: 'database' },
] as const satisfies readonly { id: string; label: string; short: string; title: string; icon: IconName }[];
type Page = typeof pages[number]['id'];
function readRoute() {
  const hash = new URLSearchParams(location.hash.slice(1));
  const view = hash.get('view');
  const step = hash.get('step');
  return {
    page: (pages.some(p => p.id === view) ? view : 'runs') as Page,
    run: hash.get('run') || undefined,
    step: step == null ? null : Number.isSafeInteger(Number(step)) ? Number(step) : step,
    compare: hash.getAll('compare'),
  };
}
const initial = readRoute();
function App() {
  const [page, setPage] = useState<Page>(initial.page);
  const [selectedIds, setSelectedIds] = useState<string[]>(initial.compare);
  const [graphId, setGraphId] = useState<string | undefined>(initial.run);
  const [inspected, setInspected] = useState<Record<string, StepIndex | null>>(initial.run ? {[initial.run]:initial.step} : {});
  const [theme, setTheme] = useStored<Theme>('trajviz-reference-theme', 'light', ['light','dark']);
  const resource = useResource<Dataset>(['index.json'], true);
  const loaded = resource.state.status === 'ready' ? resource.state.data : undefined;
  const dataset = loaded?.schema_version === 1 && Array.isArray(loaded.runs) && Array.isArray(loaded.phases) ? loaded : undefined;
  const byId = useMemo(() => new Map(dataset?.runs.map(run => [run.id,run])), [dataset]);
  const selected = useMemo(() => selectedIds.flatMap(id => byId.has(id) ? [byId.get(id)!] : []), [selectedIds,byId]);
  const activeRun = graphId ? byId.get(graphId) : selected.length === 1 ? selected[0] : undefined;
  const current = pages.find(p => p.id === page)!;
  const main = useRef<HTMLElement>(null);
  const workspaceKey = page + (page === 'replay' || page === 'timeline' || page === 'graph' ? ':' + graphId : '');
  useEffect(() => {
    main.current?.scrollTo({top:0,left:0});
    window.scrollTo(0,0);
  }, [workspaceKey]);
  useEffect(() => { document.documentElement.dataset.theme = theme; }, [theme]);
  useEffect(() => {
    const shortcuts = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault(); setPage('runs');
        requestAnimationFrame(() => document.querySelector<HTMLInputElement>('[aria-label="Search runs and steps"]')?.focus());
      }
      if (event.key !== 'Escape' || event.defaultPrevented) return;
      const disclosure = document.activeElement?.closest<HTMLDetailsElement>('details[open]') ??
        document.querySelector<HTMLDetailsElement>('.run-recording[open],.graph-options[open]');
      if (disclosure) { disclosure.open = false; disclosure.querySelector<HTMLElement>(':scope > summary')?.focus({preventScroll:true}); }
    };
    window.addEventListener('keydown', shortcuts); return () => window.removeEventListener('keydown', shortcuts);
  }, []);
  useEffect(() => {
    const hash = new URLSearchParams({view:page});
    if (graphId) { hash.set('run', graphId); if (inspected[graphId] != null) hash.set('step', String(inspected[graphId])); }
    selectedIds.forEach(id => hash.append('compare',id));
    history.replaceState(null,'','#' + hash.toString());
  }, [page,graphId,inspected,selectedIds]);
  useEffect(() => {
    const handler = () => { const r = readRoute(); setPage(r.page); setGraphId(r.run); setSelectedIds(r.compare);
      if (r.run) setInspected(prev => ({...prev,[r.run!]:r.step})); };
    window.addEventListener('hashchange',handler); return () => window.removeEventListener('hashchange',handler);
  }, []);
  function navigate(next: Page) {
    setPage(next); window.scrollTo(0,0);
    requestAnimationFrame(() => { const h = main.current?.querySelector('h1'); if (h) { h.tabIndex = -1; h.focus({preventScroll:true}); } });
  }
  function openGraph(id: string) { setGraphId(id); navigate('graph'); }
  function select(id: string) {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(v => v !== id) :
      prev.length >= 4 || (prev.length && byId.get(prev[0])?.task_id !== byId.get(id)?.task_id) ? prev : [...prev,id]);
  }
  const back = <button className="button primary" onClick={() => navigate('runs')}><Icon name="runs" size={16} />Browse runs</button>;
  const chooseSource = (idx: StepIndex | null) => { if(activeRun) setInspected(prev => ({...prev,[activeRun.id]:idx})); };
  const subtitle = page === 'replay' ? 'Replay a run step by step. Inspect actions, tool calls, and recorded changes.' :
    page === 'timeline' ? 'Explore source events through stages, activity lanes, and detailed evidence.' :
    page === 'graph' ? 'Follow execution order, dependencies, and retries. Expand groups to inspect individual calls.' :
    page === 'compare' ? 'Compare trajectories of the same task to understand differences, efficiency, and outcomes.' : '';
  return <div className="app-shell reference-shell">
    <a className="skip-link" href="#main-content">Skip to workspace</a>
    <header className="product-topbar">
      <button className="site-mark" aria-label="TrajViz home" title="TrajViz · Datasets" onClick={() => navigate('runs')}><Icon name="layers" size={25}/></button>
      <nav className="workspace-navigation" aria-label="Workspace">{pages.map(item => <button key={item.id} className="nav-button" aria-label={item.label} title={item.short} aria-current={page === item.id ? 'page' : undefined} onClick={() => navigate(item.id)}><Icon name={item.icon} size={16}/><span>{item.short}</span></button>)}</nav>
    </header>
    <div className="workspace"><div className="local-live-controls"><LiveStatus liveOnly/></div><main id="main-content" ref={main} tabIndex={-1} data-page={page} className={page !== 'runs' && page !== 'sankey' ? 'reference-page' : ''}>
      {resource.state.status === 'loading' && <><Heading title="Runs" /><Loading>Loading dataset index…</Loading></>}
      {resource.state.status === 'error' && <><Heading title="Runs" /><div className="panel"><Empty icon="database" title="Dataset unavailable">Serve a TrajViz build at /data/index.json or open an exported HTML report.</Empty><LoadError message={resource.state.message} retry={resource.retry} /></div></>}
      {resource.state.status === 'ready' && !dataset && <Empty title="Unsupported dataset">This viewer requires a TrajViz schema version 1 index.</Empty>}
      {dataset && <>
        <div hidden={page !== 'runs'}><RunList dataset={dataset} selected={selected} onSelect={select} openGraph={openGraph} openCompare={() => navigate('compare')} />
          <details className="dataset-utilities"><summary>Local dataset &amp; appearance</summary><p>{dataset.runs.length} recorded runs · frozen schema v1</p><div role="group" aria-label="Appearance">{(['light','dark'] as const).map(value=><button className="button small" key={value} aria-label={value==='dark'?'Dark theme':'Light theme'} aria-pressed={theme===value} onClick={()=>setTheme(value)}>{value==='dark'?'Dark':'Light'}</button>)}</div><p>⌘K / Ctrl+K focuses the catalog search. Appearance is saved in this browser.</p></details>
        </div>
        {page !== 'runs' && page !== 'sankey' && <ViewTitle title={current.title} subtitle={subtitle} icon={current.icon} />}
        {page === 'graph' && (activeRun ? <RunGraph key={activeRun.id} run={activeRun} phases={dataset.phases} theme={theme} initialIndex={inspected[activeRun.id] ?? null} onInspect={chooseSource} /> : <div className="panel"><Empty icon="graph" title="Choose a run" actions={back}>Open a run from the catalog.</Empty></div>)}
        {(page === 'replay' || page === 'timeline') && (activeRun ? <Replay key={activeRun.id} run={activeRun} phases={dataset.phases} timeline={page === 'timeline'} index={inspected[activeRun.id] ?? null} onSelect={idx => chooseSource(idx)} /> : <div className="panel"><Empty icon="events" title="Choose a run" actions={back}>Open a run from the catalog.</Empty></div>)}
        {page === 'compare' && (selected.length >= 2 ? <Compare runs={selected} available={dataset.runs} changeRuns={setSelectedIds} initialSource={graphId&&inspected[graphId]!=null?{run:graphId,index:inspected[graphId]!}:null} onInspect={(runId,idx) => {setGraphId(runId);setInspected(prev => ({...prev,[runId]:idx}));}} phases={dataset.phases} theme={theme} /> : <div className="panel"><Empty icon="compare" title="Select runs to compare" actions={back}>Choose two to four runs from the same task in the run catalog.</Empty></div>)}
        {page === 'sankey' && <Sankey runs={dataset.runs} phases={dataset.phases} openRun={openGraph} />}
      </>}
    </main></div>
  </div>;
}
const root = document.getElementById('root');
if (root) createRoot(root).render(<App />);
