import { useCallback, useMemo, useState } from 'react';
import { useResource } from './data';
import { actionSequence, comparePair } from './graphData';
import { GraphLegend, type Theme } from './graphDrawing';
import { EdgeControls, GraphView, useEdgeTypes } from './GraphView';
import { formatMetric, metricColumns, number, percent, phaseColor, sourceIndex,
  type GraphNode, type Metrics, type Phase, type Run, type RunGraphs } from './model';
import { exportMetrics, Heading, Icon, LoadError, Loading, OutcomeBadge } from './ui';

function Difference({ metric, current, baseline }: {
  metric: keyof Metrics; current: Metrics[keyof Metrics]; baseline: Metrics[keyof Metrics];
}) {
  if (current === baseline || current == null || baseline == null) return null;
  if (typeof current === 'boolean' && typeof baseline === 'boolean') return <small className="metric-difference">Changed</small>;
  if (typeof current !== 'number' || typeof baseline !== 'number') return null;
  const delta = current - baseline;
  const sign = delta >= 0 ? '+' : '−';
  const value = metric === 'error_rate' ? `${number.format(Math.abs(delta) * 100)} pp` : number.format(Math.abs(delta));
  return <small className="metric-difference" aria-label={`${delta > 0 ? 'Increase' : 'Decrease'} of ${value} versus baseline`}>
    {sign}{value}
  </small>;
}

function MetricsTable({ runs }: { runs: Run[] }) {
  return <section className="panel" aria-labelledby="comparison-metrics">
    <div className="panel-head"><div><h2 id="comparison-metrics">Metrics</h2>
      <p>Differences are relative to {runs[0].id}.</p></div></div>
    <div className="table-scroll">
      <table className="comparison-table">
        <thead><tr><th scope="col">Metric</th>
          {runs.map((run, index) => <th scope="col" key={run.id}><div title={run.id}>{run.id}</div>
            <span className="metric-run-info">{run.model} · {run.condition}{index === 0 && ' · Baseline'}</span>
          </th>)}
        </tr></thead>
        <tbody>
          <tr><th scope="row">Source outcome</th>
            {runs.map((run) => <td key={run.id}><OutcomeBadge outcome={run.outcome} /></td>)}</tr>
          {metricColumns.map(({ key, label }) => <tr key={key}><th scope="row">{label}</th>
            {runs.map((run, index) => <td key={run.id}>
              <span className="metric-value">{formatMetric(key, run.metrics[key])}</span>
              {index > 0 && <Difference metric={key} current={run.metrics[key]} baseline={runs[0].metrics[key]} />}
            </td>)}
          </tr>)}
        </tbody>
      </table>
    </div>
  </section>;
}

interface Segment { phase: string; start: number; end: number; first: number; last: number }

function makeSegments(nodes: GraphNode[]) {
  const segments: Segment[] = [];
  nodes.forEach((node, offset) => {
    const previous = segments.at(-1);
    if (previous?.phase === node.phase) {
      previous.end = offset + 1;
      previous.last = node.first_idx;
    } else {
      segments.push({ phase: node.phase, start: offset, end: offset + 1, first: node.first_idx, last: node.first_idx });
    }
  });
  return segments;
}

function PhaseLanes({ runs, graphs, phases }: { runs: Run[]; graphs: RunGraphs[]; phases: Phase[] }) {
  const phaseMap = new Map(phases.map((phase) => [phase.id, phase]));
  const longest = Math.max(1, ...graphs.map((graph) => graph.expanded.nodes.length));
  return <section className="panel" aria-labelledby="phase-lanes">
    <div className="panel-head"><div><h2 id="phase-lanes">Phase timelines</h2>
      <p>Aligned by step position. Each segment spans its recorded step count.</p></div></div>
    <div className="lanes">
      {runs.map((run, index) => {
        const nodes = graphs[index].expanded.nodes;
        const segments = makeSegments(nodes);
        return <div className="lane" key={run.id}>
          <span className="lane-label" title={run.id}>{run.id}</span>
          <svg width="100%" height="20" viewBox={`0 0 ${longest} 20`} preserveAspectRatio="none" role="img"
            aria-label={`${run.id}: ${nodes.length} steps, ${segments.length} consecutive phase segments`}>
            {segments.map((segment) => <rect key={segment.start} x={segment.start} y={0} width={segment.end - segment.start}
              height={20} fill={phaseColor(phaseMap.get(segment.phase))}>
              <title>{`${phaseMap.get(segment.phase)?.label ?? segment.phase} · ${sourceIndex(segment.first)}${
                segment.last !== segment.first ? ` to ${sourceIndex(segment.last)}` : ''}`}</title>
            </rect>)}
          </svg>
          <span className="lane-length mono">{number.format(nodes.length)}</span>
        </div>;
      })}
    </div>
    <div className="phase-lane-legend legend-items">
      {phases.map((phase) => <span key={phase.id}><i className="phase-dot" style={{ background: phaseColor(phase) }} />
        {phase.label}</span>)}
    </div>
  </section>;
}

function Pairwise({ runs, graphs }: { runs: Run[]; graphs: RunGraphs[] }) {
  const pairs = useMemo(() => {
    const sequences = graphs.map((graph) => actionSequence(graph.expanded));
    return runs.flatMap((left, i) => runs.slice(i + 1).map((right, offset) => ({
      left, right, ...comparePair(sequences[i], sequences[i + offset + 1]),
    })));
  }, [runs, graphs]);

  return <section className="panel" aria-labelledby="pairwise">
    <div className="panel-head"><div><h2 id="pairwise">Pairwise similarity</h2>
      <p>Action signatures only. Divergence offsets are zero-based.</p></div></div>
    <div className="table-scroll"><table className="pair-table">
      <thead><tr><th scope="col">Pair</th><th scope="col">Jaccard</th><th scope="col">First divergence</th>
        <th scope="col">Left source index</th><th scope="col">Right source index</th></tr></thead>
      <tbody>{pairs.map((pair) => <tr key={JSON.stringify([pair.left.id, pair.right.id])}>
        <th scope="row"><span title={pair.left.id}>{pair.left.id}</span><Icon name="arrow" size={13} />
          <span title={pair.right.id}>{pair.right.id}</span></th>
        <td><strong className="mono">{percent.format(pair.jaccard)}</strong>
          <small className="pair-overlap">{pair.intersection} shared / {pair.union} total</small></td>
        <td className="mono">{pair.offset == null ? 'Identical' : number.format(pair.offset)}</td>
        <td className="mono" title={pair.offset != null && pair.leftIndex == null ? 'Sequence ended' : undefined}>
          {sourceIndex(pair.leftIndex)}</td>
        <td className="mono" title={pair.offset != null && pair.rightIndex == null ? 'Sequence ended' : undefined}>
          {sourceIndex(pair.rightIndex)}</td>
      </tr>)}</tbody>
    </table></div>
  </section>;
}

function GraphComparison({ runs, graphs, phases, theme }: {
  runs: Run[]; graphs: RunGraphs[]; phases: Phase[]; theme: Theme;
}) {
  const [signature, setSignature] = useState<string | null>(null);
  const { enabled, toggle } = useEdgeTypes();
  const members = useMemo(() => {
    const map = new Map<string, number[]>();
    graphs.forEach((graph, index) => {
      const signatures = new Set(graph.aggregated.nodes.map((node) => node.signature));
      for (const value of signatures) {
        const list = map.get(value);
        if (list) list.push(index);
        else map.set(value, [index]);
      }
    });
    return map;
  }, [graphs]);
  const counts = useMemo(() => new Map([...members].map(([key, list]) => [key, list.length])), [members]);
  const activeMembers = signature == null ? undefined : members.get(signature);
  const select = useCallback((node: GraphNode) => setSignature((current) => current === node.signature ? null : node.signature), []);

  return <section className="comparison-graphs" aria-labelledby="compared-graphs">
    <div className="section-head">
      <div><h2 id="compared-graphs">Aggregated graphs</h2><p>Select a node to highlight its signature across runs.</p></div>
      <button className="button small" disabled={signature == null} onClick={() => setSignature(null)}>Clear highlight</button>
    </div>
    <div className="panel comparison-legend">
      <EdgeControls enabled={enabled} toggle={toggle} theme={theme} />
      <GraphLegend phases={phases} theme={theme} />
      <div className="signature-status" aria-live="polite">
        {activeMembers ? <><strong>Matching runs</strong><span>{activeMembers.map((index) => runs[index].id).join(' · ')}</span></>
          : <><i className="unique-dot" /> <span>Marked nodes have a signature unique to their run.</span></>}
      </div>
    </div>
    <div className="comparison-grid">
      {graphs.map(({ aggregated }, index) => {
        const run = runs[index];
        const signatures = new Set(aggregated.nodes.map((node) => node.signature));
        const unique = [...signatures].filter((value) => counts.get(value) === 1).length;
        return <article key={run.id} className="panel compare-graph">
          <div className="panel-head"><div><h3>{run.id}</h3>
            <p>{number.format(unique)} unique · {number.format(signatures.size - unique)} shared</p></div>
            <OutcomeBadge outcome={run.outcome} /></div>
          <GraphView graph={aggregated} phases={phases} theme={theme} enabled={enabled} name={run.id}
            onNode={select} signature={signature} membership={counts} compact legend={false} />
        </article>;
      })}
    </div>
  </section>;
}

export function Compare({ runs, phases, theme }: { runs: Run[]; phases: Phase[]; theme: Theme }) {
  const graphs = useResource<RunGraphs[]>(runs.map((run) => run.file));
  return <>
    <Heading title="Compare runs" actions={<button className="button" onClick={() => exportMetrics(runs)}>
      <Icon name="download" size={16} /> Export CSV
    </button>}>{runs[0].task_id} · {runs.length} selected runs</Heading>
    <div className="view-stack">
      <MetricsTable runs={runs} />
      {graphs.state.status === 'loading' && <Loading>Loading comparison graphs…</Loading>}
      {graphs.state.status === 'error' && <LoadError message={graphs.state.message} retry={graphs.retry} />}
      {graphs.state.status === 'ready' && <>
        <Pairwise runs={runs} graphs={graphs.state.data} />
        <PhaseLanes runs={runs} graphs={graphs.state.data} phases={phases} />
        <GraphComparison runs={runs} graphs={graphs.state.data} phases={phases} theme={theme} />
      </>}
    </div>
  </>;
}
