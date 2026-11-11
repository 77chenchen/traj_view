import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { arch, cpus, platform } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { gzipSync } from 'node:zlib';

import { frontendRequire, packageInfo, results } from './frontend-dependencies.mjs';

const engines = ['elk', 'dagre'];
const topologies = ['chain+local', 'cyclic-aggregate'];
const script = fileURLToPath(import.meta.url);

function graph(size, topology) {
  const nodes = Array.from({ length: size }, (_, i) => ({ data: { id: `n${i}` } }));
  const edges = [];
  function edge(source, target, type) {
    edges.push({ data: { id: `e${edges.length}`, source: `n${source}`, target: `n${target}`, type } });
  }

  for (let i = 1; i < size; i++) edge(i - 1, i, 'temporal');
  for (let i = 0; i + 3 < size; i += 4) edge(i, i + 3, 'dependency');
  if (topology === 'cyclic-aggregate') {
    for (let i = 7; i < size; i += 8) edge(i, i - 5, 'retry');
    for (let i = 0; i < size; i += 24) edge(i, i, 'temporal');
    edge(size - 1, 0, 'temporal');
  }
  return { nodes, edges };
}

async function sample(engine, size, topology) {
  const cytoscape = frontendRequire('cytoscape');
  cytoscape.use(frontendRequire(`cytoscape-${engine}`));
  const elements = graph(size, topology);
  const cy = cytoscape({
    headless: true,
    styleEnabled: true,
    elements,
    layout: { name: 'preset' },
    style: [{ selector: 'node', style: { width: 96, height: 32 } }],
  });

  try {
    const started = performance.now();
    const layout = cy.layout({
      name: engine,
      fit: false,
      animate: false,
      ...(engine === 'elk'
        ? { elk: { algorithm: 'layered', 'elk.direction': 'DOWN', 'elk.randomSeed': 1 } }
        : { rankDir: 'TB' }),
    });
    const stopped = layout.promiseOn('layoutstop');
    layout.run();
    await stopped;
    const ms = performance.now() - started;
    const positions = cy.nodes().map((node) => {
      const { x, y } = node.position();
      assert.ok(Number.isFinite(x) && Number.isFinite(y), `Invalid position for ${node.id()}`);
      return [node.id(), x, y];
    });
    assert.equal(new Set(positions.map(([, x, y]) => `${x},${y}`)).size, size, 'Nodes share a position');
    const hash = createHash('sha256').update(JSON.stringify(positions)).digest('hex');
    console.log(JSON.stringify({ ms, hash }));
  } finally {
    cy.destroy();
  }
}

function fileBytes(path) {
  return readdirSync(path, { withFileTypes: true }).reduce((total, entry) => {
    const child = join(path, entry.name);
    if (entry.isDirectory() && entry.name !== 'node_modules') return total + fileBytes(child);
    return total + (entry.isFile() ? statSync(child).size : 0);
  }, 0);
}

function dependencySizes(name, entry, seen = new Map()) {
  const info = packageInfo(name, entry);
  if (seen.has(info.path)) return seen;
  seen.set(info.path, { name, version: info.version, installedBytes: fileBytes(info.path) });
  const require = createRequire(join(info.path, 'package.json'));
  for (const dependency of Object.keys(info.dependencies ?? {})) {
    dependencySizes(dependency, require.resolve(dependency), seen);
  }
  return seen;
}

async function bundleSizes() {
  const esbuild = frontendRequire('esbuild');
  const { path } = packageInfo('cytoscape');
  const bundles = {};
  for (const engine of ['baseline', ...engines]) {
    const adapter = engine === 'baseline' ? '' :
      `import adapter from 'cytoscape-${engine}'; cytoscape.use(adapter);`;
    const { outputFiles } = await esbuild.build({
      stdin: {
        contents: `import cytoscape from 'cytoscape'; ${adapter} globalThis.cytoscape = cytoscape;`,
        resolveDir: path,
      },
      platform: 'browser',
      format: 'iife',
      target: 'es2022',
      bundle: true,
      minify: true,
      write: false,
    });
    const bytes = outputFiles[0].contents;
    const minBytes = bytes.length;
    const gzipBytes = gzipSync(bytes).length;
    bundles[engine] = { minBytes, gzipBytes };
    if (engine !== 'baseline') {
      const dependencies = [...dependencySizes(`cytoscape-${engine}`).values()];
      Object.assign(bundles[engine], {
        addedMinBytes: minBytes - bundles.baseline.minBytes,
        addedGzipBytes: gzipBytes - bundles.baseline.gzipBytes,
        dependencies,
        installedBytes: dependencies.reduce((total, dep) => total + dep.installedBytes, 0),
      });
    }
  }
  return bundles;
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  if (!sorted.length) return null;
  const mid = Math.floor(sorted.length / 2);
  return (sorted[mid] + sorted[Math.floor((sorted.length - 1) / 2)]) / 2;
}

function benchmark(engine, size, topology, { repeats, timeoutMs, stackSizeKb }) {
  const row = { engine, topology, nodes: size, edges: graph(size, topology).edges.length, samples: [] };
  const flags = stackSizeKb === null ? [] : [`--stack-size=${stackSizeKb}`];
  for (let i = 0; i < repeats; i++) {
    const child = spawnSync(process.execPath, [...flags, script, '--sample', engine, size, topology], {
      encoding: 'utf8',
      timeout: timeoutMs,
      killSignal: 'SIGKILL',
    });
    if (child.error?.code === 'ETIMEDOUT') {
      row.status = 'timeout';
      break;
    }
    if (child.error || child.status !== 0) {
      row.status = 'error';
      row.error = child.error?.message || child.stderr.trim() || `Child exited via ${child.signal}`;
      break;
    }
    row.samples.push(JSON.parse(child.stdout));
  }
  row.status ??= 'ok';
  row.medianMs = median(row.samples.map(({ ms }) => ms));
  row.deterministic = row.samples.length < 2 ? null : new Set(row.samples.map(({ hash }) => hash)).size === 1;
  return row;
}

async function main() {
  if (process.argv[2] === '--sample') {
    const [, , , engine, size, topology] = process.argv;
    await sample(engine, Number(size), topology);
    return;
  }

  const { values } = parseArgs({
    options: {
      repeats: { type: 'string', default: '3' },
      'timeout-ms': { type: 'string', default: '30000' },
      'stack-size-kb': { type: 'string' },
    },
  });
  const repeats = Number(values.repeats);
  const timeoutMs = Number(values['timeout-ms']);
  const stackSizeKb = values['stack-size-kb'] === undefined ? null : Number(values['stack-size-kb']);
  assert.ok(Number.isSafeInteger(repeats) && repeats >= 2, 'Use at least two repeats');
  assert.ok(Number.isSafeInteger(timeoutMs) && timeoutMs > 0, 'Use a positive integer timeout');
  assert.ok(stackSizeKb === null || (Number.isSafeInteger(stackSizeKb) && stackSizeKb > 0),
    'Use a positive integer stack size');

  mkdirSync(results, { recursive: true });
  const report = {
    machine: { platform: platform(), arch: arch(), cpu: cpus()[0]?.model, node: process.version },
    cytoscape: packageInfo('cytoscape').version,
    esbuild: packageInfo('esbuild').version,
    repeats,
    timeoutMs,
    stackSizeKb,
    bundles: await bundleSizes(),
    layouts: [],
  };
  const suffix = [
    ...(stackSizeKb === null ? [] : [`-stack-${stackSizeKb}kb`]),
    ...(timeoutMs === 30000 ? [] : [`-timeout-${timeoutMs}ms`]),
    ...(repeats === 3 ? [] : [`-repeats-${repeats}`]),
  ].join('');
  const reportPath = join(results, `layout-benchmark${suffix}.json`);
  for (const size of [500, 2000]) {
    for (const topology of topologies) {
      for (const engine of engines) {
        const row = benchmark(engine, size, topology, report);
        report.layouts.push(row);
        writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n');
        const runtime = row.medianMs === null ? 'n/a' : `${row.medianMs.toFixed(1)} ms`;
        console.log(
          `${size} ${topology} ${engine}: ${runtime}, ${row.status}, ` +
          `${row.samples.length}/${repeats} samples, deterministic=${row.deterministic ?? 'unknown'}`,
        );
        if (row.status === 'error') {
          console.error(row.error);
          process.exitCode = 1;
        }
        if (row.deterministic === false) process.exitCode = 1;
      }
    }
  }
  for (const engine of engines) {
    const { installedBytes, addedMinBytes, addedGzipBytes } = report.bundles[engine];
    console.log(`${engine}: ${installedBytes} installed bytes, +${addedMinBytes} minified / +${addedGzipBytes} gzip bytes`);
  }
  console.log(reportPath);
}

await main();
