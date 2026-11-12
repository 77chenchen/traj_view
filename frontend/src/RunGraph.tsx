import { useCallback, useEffect, useMemo, useState } from 'react';
import { useResource, useStored } from './data';
import { foldGraph } from './graphData';
import { type Theme } from './graphDrawing';
import { EdgeControls, GraphView, useEdgeTypes } from './GraphView';
import { Inspector } from './Inspector';
import { number, percent, phaseColor, sourceIndex, type GraphNode, type Phase, type Run, type RunGraphs, type StepIndex } from './model';
import { exportMetrics, Heading, Icon, LoadError, Loading, OutcomeBadge } from './ui';

const foldThreshold = 2000;
const graphModes = ['expanded', 'aggregated'] as const;

function Timeline({ nodes, position, change, phases, inspect }: {
  nodes: GraphNode[]; position: number; change: (position: number) => void; phases: Phase[];
  inspect: (index: StepIndex) => void;
}) {
  const [playing, setPlaying] = useState(false);
  const total = nodes.length;
  const current = nodes[position - 1];
  const phase = phases.find((item) => item.id === current?.phase);

  useEffect(() => {
    if (!playing) return;
    if (position >= total) {
      setPlaying(false);
      return;
    }
    const timer = window.setTimeout(() => change(position + 1), 390);
    return () => window.clearTimeout(timer);
  }, [position, playing, total, change]);

  function seek(next: number) {
    setPlaying(false);
    change(next);
  }

  function play() {
    if (playing) setPlaying(false);
    else {
      if (position >= total) change(0);
      setPlaying(true);
    }
  }

  return <section className="timeline" aria-label="Playback timeline">
    <div className="timeline-top">
      <div className="timeline-position">
        <strong>Timeline</strong>
        <span className="mono">{number.format(position)} / {number.format(total)}</span>
        {current && <span className="timeline-phase">
          <i className="phase-dot" style={{ background: phaseColor(phase) }} />{phase?.label ?? current.phase} {sourceIndex(current.first_idx)}
        </span>}
      </div>
      <button className="button small quiet" disabled={!current}
        onClick={() => current && inspect(current.first_idx)}>Inspect current step</button>
    </div>
    <div className="timeline-controls">
      <button className="button small icon-button" aria-label="Previous timeline step" title="Previous step"
        disabled={position === 0} onClick={() => seek(position - 1)}><Icon name="left" size={15} /></button>
      <button className="button primary small icon-button" aria-label={playing ? 'Pause' : 'Play'}
        title={playing ? 'Pause' : 'Play'} disabled={!total} onClick={play}><Icon name={playing ? 'pause' : 'play'} size={16} /></button>
      <button className="button small icon-button" aria-label="Next timeline step" title="Next step"
        disabled={position >= total} onClick={() => seek(position + 1)}><Icon name="right" size={15} /></button>
      <input type="range" aria-label="Timeline position" aria-valuetext={current
        ? `Step ${position} of ${total}, source index ${current.first_idx}` : 'Before the first step'}
        min={0} max={total} value={position} disabled={!total} onChange={(event) => seek(Number(event.target.value))} />
    </div>
  </section>;
}

function LoadedGraph({ run, graphs, phases, theme }: {
  run: Run; graphs: RunGraphs; phases: Phase[]; theme: Theme;
}) {
  const [mode, setMode] = useStored('trajviz-graph-mode', 'expanded', graphModes);
  const [unfolded, setUnfolded] = useState(false);
  const [index, setIndex] = useState<StepIndex | null>(null);
  const [position, setPosition] = useState(graphs.expanded.nodes.length);
  const { enabled, toggle } = useEdgeTypes();
  const canFold = graphs.expanded.nodes.length >= foldThreshold;
  const folded = useMemo(() => canFold ? foldGraph(graphs.expanded) : graphs.expanded, [canFold, graphs]);
  const savings = graphs.expanded.nodes.length - folded.nodes.length;
  const graph = mode === 'aggregated' ? graphs.aggregated : unfolded ? graphs.expanded : folded;
  const byIndex = useMemo(() => {
    const result = new Map<StepIndex, GraphNode>();
    for (const node of graph.nodes) for (const step of node.step_indices) result.set(step, node);
    return result;
  }, [graph]);
  const positionsInTime = useMemo(() => {
    const ordinals = new Map(graphs.expanded.nodes.map((node, ordinal) => [node.first_idx, ordinal]));
    return new Map(graph.nodes.map((node) => [node.id, ordinals.get(node.first_idx) ?? 0]));
  }, [graph, graphs]);
  const selected = index == null ? undefined : byIndex.get(index);
  const selectNode = useCallback((node: GraphNode) => setIndex(node.step_indices[0] ?? node.first_idx), []);

  return <>
    <div className="graph-workspace">
      <section className="panel graph-panel" aria-label="Run process graph">
        <div className="panel-head graph-head">
          <div><h2>Process graph</h2>
            <p>{number.format(graphs.expanded.nodes.length)} source steps · {percent.format(run.metrics.error_rate)} error rate</p></div>
          <div className="segments" role="group" aria-label="Graph mode">
            {graphModes.map((item) => <button key={item} aria-pressed={mode === item} onClick={() => setMode(item)}>
              {item === 'expanded' ? 'Expanded' : 'Aggregated'}
            </button>)}
          </div>
        </div>
        <EdgeControls enabled={enabled} toggle={toggle} theme={theme} />
        {mode === 'expanded' && savings > 0 && <div className="fold-banner">
          <span><Icon name="layers" size={16} />{unfolded ? 'All source steps are shown.' :
            `${number.format(savings)} consecutive repeat steps folded into their preceding nodes.`}</span>
          <button className="button small" aria-pressed={unfolded} onClick={() => setUnfolded(!unfolded)}>
            {unfolded ? 'Fold repeats' : 'Expand all steps'}
          </button>
        </div>}
        <GraphView key={`${mode}-${unfolded}`} graph={graph} phases={phases} theme={theme} enabled={enabled}
          name={`${run.id}-${mode}`} onNode={selectNode} selected={selected?.id}
          positionsInTime={positionsInTime} reached={position} />
        <Timeline nodes={graphs.expanded.nodes} position={position} change={setPosition} phases={phases} inspect={setIndex} />
      </section>
      <Inspector run={run} node={selected} index={index} select={setIndex} clear={() => setIndex(null)} phases={phases} />
    </div>
  </>;
}

export function RunGraph({ run, phases, theme }: { run: Run; phases: Phase[]; theme: Theme }) {
  const resource = useResource<RunGraphs>([run.file], true);
  return <>
    <Heading title={run.id} actions={<button className="button" onClick={() => exportMetrics([run])}>
      <Icon name="download" size={16} /> Export CSV
    </button>}>
      <span className="run-context"><span>{run.task_id}</span><span>{run.model}</span><span>{run.condition}</span>
        <OutcomeBadge outcome={run.outcome} /></span>
    </Heading>
    {resource.state.status === 'loading' && <Loading>Loading run graph…</Loading>}
    {resource.state.status === 'error' && <LoadError message={resource.state.message} retry={resource.retry} />}
    {resource.state.status === 'ready' && <LoadedGraph key={run.id} run={run} graphs={resource.state.data} phases={phases} theme={theme} />}
  </>;
}
