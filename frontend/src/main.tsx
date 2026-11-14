import { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { LiveStatus } from './LiveStatus';
import { Compare } from './Compare';
import { useResource, useStored, isOffline } from './data';
import { type Theme } from './graphDrawing';
import { type Dataset, type StepIndex, number } from './model';
import { Replay } from './Replay';
import { RunGraph } from './RunGraph';
import { RunList } from './RunList';
import { Sankey } from './Sankey';
import { ViewTitle, clock } from './Evidence';
import { Empty, Heading, Icon, LoadError, Loading, OutcomeBadge, type IconName } from './ui';
import './styles.css';
import './workbench.css';
import './density.css';
import './hierarchy.css';

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
function LocalSearch({ dataset, open }: { dataset?: Dataset; open: (id: string) => void }) {
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const field = useRef<HTMLInputElement>(null);
  const text = useResource<Record<string, string>>(query && dataset ? [dataset.search_file] : [], true);
  const matches = dataset?.runs.filter(r => [r.id,r.task_id,r.agent,r.model, text.state.status === 'ready' ? text.state.data[r.id] : ''].join(' ').toLowerCase().includes(query.toLowerCase())).slice(0, 8) ?? [];
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); field.current?.focus(); } };
    window.addEventListener('keydown', handler); return () => window.removeEventListener('keydown', handler);
  }, []);
  return <div className={'global-search ' + (focused ? 'is-open' : '')} onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget)) setFocused(false); }}>
    <button className="global-search-trigger" aria-label="Open global search" title="Search local traces" onClick={() => {setFocused(true);requestAnimationFrame(() => field.current?.focus());}}><Icon name="search" size={15} /></button><input ref={field} type="search" aria-label="Global search" placeholder="Search runs, tasks, or traces…" value={query}
      onFocus={() => setFocused(true)} onChange={e => setQuery(e.target.value)} onKeyDown={e => { if (e.key === 'Escape') { setFocused(false); field.current?.blur(); }
        if (e.key === 'Enter' && matches[0]) { open(matches[0].id); setFocused(false); field.current?.blur(); } }} /><kbd>⌘K</kbd>
    {focused && query && <div className="global-search-results" role="region" aria-label="Global search results">
      {matches.map(r => <button key={r.id} onClick={() => { open(r.id); setFocused(false); setQuery(''); }}><Icon name="terminal" size={16} /><span><strong>{r.id}</strong><small>{r.task_id}</small></span><OutcomeBadge outcome={r.outcome} /></button>)}
      {!matches.length && <p>No matching local traces.</p>}</div>}
  </div>;
}
function App() {
  const [page, setPage] = useState<Page>(initial.page);
  const [selectedIds, setSelectedIds] = useState<string[]>(initial.compare);
  const [graphId, setGraphId] = useState<string | undefined>(initial.run);
  const [inspected, setInspected] = useState<Record<string, StepIndex | null>>(initial.run ? {[initial.run]:initial.step} : {});
  const [theme, setTheme] = useStored<Theme>('trajviz-reference-theme', 'light', ['light','dark']);
  const [help, setHelp] = useState(false);
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
  useEffect(()=>{
    const escape=(e:KeyboardEvent)=>{
      if(e.key!=='Escape'||e.defaultPrevented)return;
      const focused=document.activeElement;
      const disclosure=focused?.closest<HTMLDetailsElement>('details[open]') ?? document.querySelector<HTMLDetailsElement>('.product-topbar details[open],.run-recording[open],.graph-options[open]');
      if(disclosure){disclosure.open=false;disclosure.querySelector<HTMLElement>(':scope > summary')?.focus({preventScroll:true});return;}
      if(help){setHelp(false);document.querySelector<HTMLElement>('[aria-label="Help"]')?.focus({preventScroll:true});}
    };
    window.addEventListener('keydown',escape);return()=>window.removeEventListener('keydown',escape);
  },[help]);
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
      <button className="brand" aria-label="TrajViz home" onClick={() => navigate('runs')}><span className="brand-mark"><Icon name="layers" size={31} /></span><span>Agent Trajectory Viewer</span></button>
      <nav className="breadcrumbs" aria-label="Breadcrumb"><button onClick={() => navigate('runs')}>Runs</button><span>/</span>
        {activeRun && page !== 'compare' && page !== 'runs' && page !== 'sankey' && <><button onClick={() => openGraph(activeRun.id)} title={activeRun.id}>{activeRun.id}</button><span>/</span></>}
        <span>{current.title}</span></nav>
      <LocalSearch dataset={dataset} open={id => { setGraphId(id); navigate(page === 'runs' || page === 'compare' || page === 'sankey' ? 'replay' : page); }} />
      <details className="topbar-popover"><summary className="topbar-icon" aria-label="Notifications" title="Dataset status"><Icon name="bell" /></summary><div><strong>Local dataset status</strong><p>{dataset?.runs.length ?? 0} runs available · {isOffline ? 'Embedded offline report' : 'Local server'}</p><LiveStatus /></div></details>
      <button className="topbar-icon" aria-label="Help" title="Help" aria-expanded={help} onClick={() => setHelp(!help)}><Icon name="help" /></button>
      <details className="topbar-popover preferences-menu"><summary className="avatar" aria-label="Local preferences" title="Local preferences">A</summary><div><strong>Local preferences</strong><p>Appearance · saved in this browser</p><div className="focus-tabs" role="group" aria-label="Appearance">{(['light','dark'] as const).map(value=><button key={value} aria-label={value==='dark'?'Dark theme':'Light theme'} aria-pressed={theme===value} onClick={()=>setTheme(value)}>{value==='dark'?'Dark':'Light'}</button>)}</div></div></details>
    </header>
    <aside className="app-sidebar">
      <nav aria-label="Workspace">{pages.map(item => <button key={item.id} className="nav-button" aria-label={item.label} title={item.short} aria-current={page === item.id ? 'page' : undefined} onClick={() => navigate(item.id)}>
        <Icon name={item.icon} size={19} /><span>{item.short}</span></button>)}</nav>
      <div className="sidebar-bottom"><label className="dataset-picker"><Icon name="database" /><span><small>Current Dataset</small><select aria-label="Current dataset" value="current" onChange={() => navigate('runs')}><option value="current">Local traces ({dataset?.runs.length ?? 0})</option><option value="browse">Browse datasets…</option></select></span></label>
        <details className="sidebar-context"><summary>{page === 'compare' ? 'Comparison context' : 'Run context'}</summary><div>{page === 'compare' ? <><strong><i className="status-dot" />Runs Compared</strong>{selected.map((r,i) => <span key={r.id}><i className={'agent-dot agent-' + i} />{String.fromCharCode(65+i)}: {r.id}</span>)}</> :
          activeRun ? <><strong><i className={'status-dot ' + (activeRun.outcome.passed === false ? 'bad' : '')} />Run {activeRun.outcome.passed == null ? 'Recorded' : 'Completed'}</strong>
            <span>Duration <b>{activeRun.usage?.wall_s == null ? 'Unrecorded' : clock(activeRun.usage.wall_s)}</b></span><span>Total Steps <b>{number.format(activeRun.metrics.steps)}</b></span><span>Result <OutcomeBadge outcome={activeRun.outcome} /></span>
            {activeRun.agent === 'synthetic' && <small className="synthetic-label">Synthetic fixture</small>}</> : <><strong>Local trace analysis</strong><p>Select a run to inspect its evidence.</p></>}</div></details>
      </div>
    </aside>
    {help && <aside className="help-popover" aria-label="Workspace help"><div className="panel-head"><h2>Inspect recorded evidence</h2><button className="button small icon-button" aria-label="Close help" onClick={() => {setHelp(false);document.querySelector<HTMLElement>('[aria-label="Help"]')?.focus();}}><Icon name="close" /></button></div>
      <p>Open a run in Datasets. Select a source step in Replay, Timeline or Graph; selection follows you between views. Compare 2–4 runs from the same task.</p><p><kbd>⌘K</kbd> searches local traces. Graph supports arrow-key panning and keyboard node selection. Share copies the exact view and source step.</p><p>Unrecorded fields are shown explicitly. Dependency edges are file/observation heuristics; structural edges mean containment.</p></aside>}
    <div className="workspace"><main id="main-content" ref={main} tabIndex={-1} data-page={page} className={page !== 'runs' && page !== 'sankey' ? 'reference-page' : ''}>
      {resource.state.status === 'loading' && <><Heading title="Runs" /><Loading>Loading dataset index…</Loading></>}
      {resource.state.status === 'error' && <><Heading title="Runs" /><div className="panel"><Empty icon="database" title="Dataset unavailable">Serve a TrajViz build at /data/index.json or open an exported HTML report.</Empty><LoadError message={resource.state.message} retry={resource.retry} /></div></>}
      {resource.state.status === 'ready' && !dataset && <Empty title="Unsupported dataset">This viewer requires a TrajViz schema version 1 index.</Empty>}
      {dataset && <>
        <div hidden={page !== 'runs'}><RunList dataset={dataset} selected={selected} onSelect={select} openGraph={openGraph} openCompare={() => navigate('compare')} /></div>
        {page !== 'runs' && page !== 'sankey' && <ViewTitle title={current.title} subtitle={subtitle} icon={current.icon} />}
        {page === 'graph' && (activeRun ? <RunGraph key={activeRun.id} run={activeRun} phases={dataset.phases} theme={theme} initialIndex={inspected[activeRun.id] ?? null} onInspect={chooseSource} /> : <div className="panel"><Empty icon="graph" title="Choose a run" actions={back}>Open a run from the catalog.</Empty></div>)}
        {(page === 'replay' || page === 'timeline') && (activeRun ? <Replay key={activeRun.id} run={activeRun} phases={dataset.phases} timeline={page === 'timeline'} index={inspected[activeRun.id] ?? null} onSelect={idx => chooseSource(idx)} /> : <div className="panel"><Empty icon="events" title="Choose a run" actions={back}>Open a run from the catalog.</Empty></div>)}
        {page === 'compare' && (selected.length >= 2 ? <Compare runs={selected} available={dataset.runs} changeRuns={setSelectedIds} initialSource={graphId&&inspected[graphId]!=null?{run:graphId,index:inspected[graphId]!}:null} onInspect={(runId,idx) => {setGraphId(runId);setInspected(prev => ({...prev,[runId]:idx}));}} phases={dataset.phases} theme={theme} /> : <div className="panel"><Empty icon="compare" title="Select runs to compare" actions={back}>Choose two to four runs from the same task in the run catalog.</Empty></div>)}
        {page === 'sankey' && <Sankey runs={dataset.runs} phases={dataset.phases} />}
      </>}
    </main></div>
  </div>;
}
const root = document.getElementById('root');
if (root) createRoot(root).render(<App />);
