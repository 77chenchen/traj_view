import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { frontendRequire, root } from './frontend-dependencies.mjs';

const ts = frontendRequire('typescript');
const source = readFileSync(join(root, 'frontend/src/graphData.ts'), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const { foldGraph, filterGraph, selectedRelationships, actionSequence, comparePair, recordedFiles } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
const hierarchySource = readFileSync(join(root, 'frontend/src/hierarchy.ts'), 'utf8');
const hierarchyCompiled = ts.transpileModule(hierarchySource, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const { hierarchyGraph } = await import(`data:text/javascript;base64,${Buffer.from(hierarchyCompiled).toString('base64')}`);
const scratch = mkdtempSync(join(tmpdir(), 'trajviz-dag-'));
// Match the viewer's lossless integer-token decoding for fixture indices.
const parse = (raw) => JSON.parse(raw.replace(/"(?:\\.|[^"\\])*"|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/g,
  (token) => /^-?\d{16,}$/.test(token) && !Number.isSafeInteger(Number(token)) ? JSON.stringify(token) : token));
const read = (name) => parse(readFileSync(join(scratch, name), 'utf8'));
let checked = 0;
function dag(graph) {
  const ids = new Map(graph.nodes.map((node, index) => [node.id, index]));
  const indegree = new Map(graph.nodes.map((node) => [node.id, 0]));
  const next = new Map(graph.nodes.map((node) => [node.id, []]));
  for (const edge of graph.edges) {
    assert.ok(ids.has(edge.source) && ids.has(edge.target), 'Every edge endpoint exists');
    assert.ok(ids.get(edge.source) < ids.get(edge.target), 'Every edge moves forward in source order');
    indegree.set(edge.target, indegree.get(edge.target) + 1);
    next.get(edge.source).push(edge.target);
  }
  const queue = [...indegree].filter(([, count]) => !count).map(([id]) => id);
  for (let i = 0; i < queue.length; i++) for (const id of next.get(queue[i])) {
    indegree.set(id, indegree.get(id) - 1);
    if (!indegree.get(id)) queue.push(id);
  }
  assert.equal(queue.length, graph.nodes.length, 'Kahn topological sort covers all nodes');
  checked++;
}
try {
  execFileSync(process.env.PYTHON || 'python', ['-m', 'backend.cli', 'build', 'fixtures/input', '-o', scratch], { cwd: root, stdio: 'pipe' });
  const index = read('index.json');
  const graphs = index.runs.map((run) => read(run.file).expanded);
  for (const size of [500, 2000]) {
    const nodes = Array.from({ length: size }, (_, i) => {
      const idx = String(9007199254740993n + BigInt(i * 37));
      const target = `src/repeat-${Math.floor(i / 50) % 4}.py`;
      return { id: `step-${idx}`, signature: JSON.stringify(['read_file', target]), label: target,
        tool: 'read_file', category: 'read', phase: 'localize', count: 1, first_idx: idx,
        step_indices: [idx], error: i % 17 === 0, phase_counts: { localize: 1 } };
    });
    const edges = nodes.flatMap((node, i) => !i ? [] : [
      { id: `time-${i}`, source: nodes[i - 1].id, target: node.id, type: 'temporal', count: 1 },
      ...(i > 4 && i % 9 === 0 ? [{ id: `dep-${i}`, source: nodes[i - 4].id, target: node.id, type: 'dependency', count: 1 }] : []),
      ...(i % 17 === 1 ? [{ id: `retry-${i}`, source: nodes[i - 1].id, target: node.id, type: 'retry', count: 1 }] : []),
    ]);
    graphs.push({ nodes, edges });
  }
  for (const expanded of graphs) {
    const before = JSON.stringify(expanded);
    const folded = foldGraph(expanded);
    assert.deepEqual(folded.nodes.flatMap((node) => node.step_indices), expanded.nodes.flatMap((node) => node.step_indices));
    let offset = 0;
    for (const block of folded.nodes) {
      const members = expanded.nodes.slice(offset, offset + block.step_indices.length);
      assert.ok(members.every((node) => node.signature === block.signature));
      assert.deepEqual(members.map((node) => node.first_idx), block.step_indices, 'Block is one contiguous source interval');
      offset += block.step_indices.length;
      const open = new Set(members.map((node) => node.id));
      const partial = foldGraph(expanded, open);
      dag(partial);
      assert.deepEqual(partial.nodes.flatMap((node) => node.step_indices), expanded.nodes.flatMap((node) => node.step_indices));
      assert.ok(members.every((node) => partial.nodes.some((item) => item.id === node.id && item.count === 1)));
    }
    for (const graph of [expanded, folded, foldGraph(expanded, new Set(expanded.nodes.map((node) => node.id)))]) {
      dag(graph);
      const phases = new Set(graph.nodes.flatMap((node) => Object.keys(node.phase_counts)));
      for (const phase of phases) dag(filterGraph(graph, (node) => Boolean(node.phase_counts[phase])));
      for (const category of ['read', 'edit', 'validate', 'message']) dag(filterGraph(graph, (node) => node.category === category));
      dag(filterGraph(graph, (node) => node.error));
      dag(filterGraph(graph, () => false));
    }
    const groups = new Set();
    let nested = hierarchyGraph(expanded, groups);
    for (let level = 0; level < 3; level++) {
      dag(nested);
      for (const node of nested.nodes) if (node.view) groups.add(node.id);
      nested = hierarchyGraph(expanded, groups);
    }
    dag(nested);
    assert.deepEqual(nested.nodes.filter((node) => !node.view).map((node) => node.first_idx), expanded.nodes.map((node) => node.first_idx));
    for (const type of ['dependency', 'retry']) for (const edge of expanded.edges.filter((edge) => edge.type === type)) {
      assert.ok(nested.edges.some((item) => item.source === edge.source && item.target === edge.target && item.type === type));
    }
    assert.equal(JSON.stringify(expanded), before, 'Transforms do not mutate source graph');
  }
  const fixture = (id) => { const run = index.runs.find((run) => run.id === id); return { graph: read(run.file), steps: read(run.steps_file).steps }; };
  const { graph, steps } = fixture('dag-baseline');
  assert.ok(steps.every((step) => step.ts === null), 'Timestamp-free fixture');
  assert.ok(graph.expanded.edges.some((edge) => edge.type === 'dependency'));
  assert.ok(graph.expanded.edges.some((edge) => edge.type === 'retry'));
  const folded = foldGraph(graph.expanded);
  const reads = filterGraph(folded, (node) => node.category === 'read');
  assert.equal(reads.nodes.length, 2, 'Nonconsecutive repeated signatures stay separate after filtering');
  assert.equal(reads.nodes[0].count, 2);
  assert.equal(reads.nodes[1].count, 1);
  assert.equal(String(reads.nodes[1].first_idx), '9007199254741007');
  const pair = comparePair(actionSequence(graph.expanded), actionSequence(fixture('dag-variant').graph.expanded));
  assert.equal(pair.offset, 2); assert.equal(pair.leftIndex, '9007199254740993'); assert.equal(pair.rightIndex, 8);
  const ended = comparePair(actionSequence(graph.expanded), actionSequence(fixture('dag-short').graph.expanded));
  assert.equal(ended.offset, 2); assert.equal(ended.rightIndex, null);
  assert.deepEqual(recordedFiles(steps).get('src/alpha.py'), [7, 19, '9007199254740993', '9007199254741007']);
  // Two different source calls share each rolled-up representative pair.
  // Scoped mode must never borrow the other member's counts after collapse.
  const exact=['9007199254741049','9007199254741057','9007199254741081','9007199254741123'];
  const sourceNodes=exact.map((idx,i)=>({...graph.expanded.nodes[0],id:'member-'+i,first_idx:idx,step_indices:[idx],signature:i<2?'a':'b',count:1}));
  const relationships={nodes:sourceNodes,edges:[
    {id:'t',source:'member-1',target:'member-2',type:'temporal',count:1},
    {id:'d0',source:'member-0',target:'member-2',type:'dependency',count:2},
    {id:'d1',source:'member-1',target:'member-2',type:'dependency',count:3},
    {id:'r0',source:'member-0',target:'member-3',type:'retry',count:1},
    {id:'r1',source:'member-1',target:'member-3',type:'retry',count:4},
  ]};
  const original=JSON.stringify(relationships),collapsed=foldGraph(relationships);
  assert.deepEqual(collapsed.edges.map(e=>[e.type,e.count]),[['temporal',1],['dependency',5],['retry',5]]);
  for(const [idx,expected]of [[exact[0],[['temporal',1],['dependency',2],['retry',1]]],[exact[1],[['temporal',1],['dependency',3],['retry',4]]],[exact[3],[['temporal',1],['retry',5]]],[null,[['temporal',1]]]]){
    const scoped=selectedRelationships(relationships,collapsed,idx);dag(scoped);
    assert.deepEqual(scoped.edges.map(e=>[e.type,e.count]),expected,'Exact-source counts are computed before summary aggregation');
  }
  const filtered=filterGraph(collapsed,n=>n.signature==='a');
  assert.equal(selectedRelationships(relationships,filtered,exact[0]).edges.length,0,'Hidden endpoints are never reconnected');
  assert.equal(JSON.stringify(relationships),original);dag(collapsed);
  console.log(`PASS DAG transforms: ${checked} topological sorts; contiguous mapping, partial/full expansion, filters, retry/dependency, exact indices, divergence, recorded files`);
} finally { rmSync(scratch, { recursive: true, force: true }); }
