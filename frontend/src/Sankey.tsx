import { useMemo, useState } from 'react';
import { sankey, sankeyLinkHorizontal, type SankeyLink, type SankeyNode } from 'd3-sankey';
import { number, phaseColor, type Phase, type Run } from './model';
import { Empty, Heading, Icon } from './ui';

const dimensions = ['model', 'condition', 'outcome'] as const;
type Dimension = typeof dimensions[number];

const groupLabel: Record<Dimension, string> = { model: 'Model', condition: 'Condition', outcome: 'Outcome' };
const groupValue = (run: Run, dimension: Dimension) => dimension === 'outcome' ? run.outcome.label : run[dimension];

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

  return <section className="panel sankey-panel" aria-label={`Phase transitions for ${label}`}>
    <div className="panel-head"><div><h2>{label || '(blank)'}</h2>
      <p>{number.format(runCount)} {runCount === 1 ? 'run' : 'runs'} · {number.format(flow?.total ?? 0)} transitions</p></div></div>
    {graph ? <>
      <div className="sankey-scroll">
        <div className="sankey-layers"><span>From phase</span><span>Next phase</span></div>
        <svg className="sankey-svg" viewBox={`0 0 ${width} ${height}`} role="group" aria-label={`Phase transitions for ${label}`}>
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
      <div className="graph-caption sankey-caption"><span className="graph-tip">{detail ||
        (shared ? 'Both charts use the same count scale.' : 'Band width represents transition count.')}</span></div>
    </> : <Empty icon="sankey" title="No phase transitions">This group contains no recorded phase transitions.</Empty>}
  </section>;
}

export function Sankey({ runs, phases }: { runs: Run[]; phases: Phase[] }) {
  const [dimension, setDimension] = useState<Dimension>('model');
  const [two, setTwo] = useState(false);
  const [left, setLeft] = useState('');
  const [right, setRight] = useState('');
  const groups = useMemo(() => {
    const result = new Map<string, Run[]>();
    for (const run of runs) {
      const group = groupValue(run, dimension);
      const existing = result.get(group);
      if (existing) existing.push(run);
      else result.set(group, [run]);
    }
    return result;
  }, [runs, dimension]);
  const options = [...groups.keys()].sort((a, b) => a.localeCompare(b));
  const first = groups.has(left) ? left : options[0];
  const other = options.filter((option) => option !== first);
  const second = other.includes(right) ? right : other[0];
  const sideBySide = two && other.length > 0;
  const firstFlow = useMemo(() => flows(groups.get(first) ?? [], phases), [groups, first, phases]);
  const secondFlow = useMemo(() => sideBySide ? flows(groups.get(second) ?? [], phases) : null, [groups, second, phases, sideBySide]);
  const maxGaps = Math.max(1, firstFlow?.gaps ?? 0, secondFlow?.gaps ?? 0);
  const padding = Math.min(14, flowHeight / (2 * maxGaps));
  const pixelsPerCount = Math.min(
    firstFlow ? (flowHeight - firstFlow.gaps * padding) / firstFlow.total : Infinity,
    secondFlow ? (flowHeight - secondFlow.gaps * padding) / secondFlow.total : Infinity,
  );

  return <>
    <Heading title="Phase transitions">Explore how phases follow one another across groups of runs.</Heading>
    {options.length === 0 ? <div className="panel"><Empty icon="sankey" title="No groups to show">
      Add runs to the dataset to view phase transitions.
    </Empty></div> : <>
      <div className="panel sankey-controls">
        <div className="sankey-selects">
          <label>Group by<select value={dimension} onChange={(event) => {
            setDimension(event.target.value as Dimension); setLeft(''); setRight('');
          }}>{dimensions.map((value) => <option key={value} value={value}>{groupLabel[value]}</option>)}</select></label>
          <label>{sideBySide ? 'First group' : 'Group'}<select value={first} onChange={(event) => setLeft(event.target.value)}>
            {options.map((option) => <option key={option} value={option}>{option || '(blank)'}</option>)}</select></label>
          {sideBySide && <label>Second group<select value={second} onChange={(event) => setRight(event.target.value)}>
            {other.map((option) => <option key={option} value={option}>{option || '(blank)'}</option>)}</select></label>}
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
    </>}
  </>;
}
