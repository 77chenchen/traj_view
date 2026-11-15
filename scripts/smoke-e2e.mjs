import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import {
  checkCompare, checkDag, checkDagCompare, checkFolded, checkGraph, checkNarrow, checkOffline, checkRunList, checkSankey, checkTheme, renderSizes, timeFirstGraph,
} from '../tests/e2e/browser.mjs';
import { checkLive } from '../tests/e2e/live.mjs';
import { checkHierarchy } from '../tests/e2e/hierarchy.mjs';
import { checkWorkbench } from '../tests/e2e/workbench.mjs';
import { checkDashboard, checkDashboardCompare } from '../tests/e2e/dashboard.mjs';
import { checkFourReference } from '../tests/e2e/four-reference.mjs';
import { checkDensity } from '../tests/e2e/density.mjs';
import { checkThreePage } from '../tests/e2e/three-page.mjs';
import { checkExecutionMap } from '../tests/e2e/execution-map.mjs';
import { checkNodeAppearance } from '../tests/e2e/node-appearance.mjs';
import { checkPlaybackPreferences } from '../tests/e2e/playback-preferences.mjs';
import { checkTimelineWorkspace } from '../tests/e2e/timeline-workspace.mjs';
import { checkNeutralVertical } from '../tests/e2e/neutral-vertical.mjs';
import { checkDocumentWorkspace } from '../tests/e2e/document-workspace.mjs';
import { checkGraphFullscreen } from '../tests/e2e/graph-fullscreen.mjs';
import { checkAnalytics, checkCollapseAll } from '../tests/e2e/analytics.mjs';
import { checkVisualAffordances } from '../tests/e2e/visual-affordances.mjs';
import { checkRecordedWrites } from '../tests/e2e/recorded-writes.mjs';
import { frontendRequire, results, root } from './frontend-dependencies.mjs';

const python = process.env.PYTHON || 'python';
const chrome = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const renderTimeout = Number(process.env.RENDER_TIMEOUT_MS ?? 30000);
const artifacts = join(results, 'e2e');
const cli = ['-m', 'backend.cli'];
const scenarios = [];
let chromeVersion;
function record(name, result) {
  scenarios.push({ name, ...result });
  writeFileSync(join(artifacts, 'scenarios.json'), JSON.stringify({ chrome: chromeVersion, scenarios }, null, 2) + '\n');
  return result;
}

function execute(args) {
  return execFileSync(python, args, { cwd: root, stdio: 'inherit', timeout: 120000 });
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function startServer(dataset, liveSource, liveMetadata) {
  const command = liveSource ? [...cli, 'live', liveSource, '-o', dataset, '--port', '0', ...(liveMetadata ? ['--metadata', liveMetadata] : [])] : [...cli, 'serve', dataset, '--port', '0'];
  const child = spawn(python, command, {
    cwd: root, stdio: ['ignore', 'pipe', 'pipe'],
  });
  let output = '';
  const url = new Promise((resolveUrl, reject) => {
    const timer = setTimeout(() => reject(new Error(`Server startup timed out.\n${output}`)), 12000);
    const receive = (chunk) => {
      output = (output + chunk).slice(-8192);
      const match = output.match(/http:\/\/127\.0\.0\.1:\d+\b/);
      if (match) {
        clearTimeout(timer);
        resolveUrl(match[0] + '/');
      }
    };
    child.stdout.on('data', receive);
    child.stderr.on('data', receive);
    child.once('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.once('close', (code, signal) => {
      clearTimeout(timer);
      reject(new Error(`Server exited (${code ?? signal}).\n${output}`));
    });
  });
  return { child, url };
}

async function stopServer(server) {
  if (!server?.child.pid || server.child.exitCode !== null || server.child.signalCode !== null) return;
  await new Promise((done) => {
    const child = server.child;
    const timer = setTimeout(() => child.kill('SIGKILL'), 3000);
    child.once('close', () => {
      clearTimeout(timer);
      done();
    });
    child.kill('SIGTERM');
  });
}

function failed(name, error) {
  console.error(`FAIL ${name}\n${error.stack || error}`);
  process.exitCode = 1;
}

async function scenario(browser, name, action, offline = false) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 950 },
    locale: 'en-US',
    offline,
    serviceWorkers: 'block',
  });
  const page = await context.newPage();
  page.setDefaultTimeout(12000);
  const pageErrors = [];
  const requests = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('request', (request) => requests.push(new URL(request.url()).pathname));
  if (offline) await context.route(/^https?:\/\//, (route) => route.abort());

  try {
    const value = await action(page, requests);
    assert.deepEqual(pageErrors, [], 'Uncaught browser errors');
    console.log(`PASS ${name}`);
    return record(name, { status: 'ok', value });
  } catch (error) {
    failed(name, error);
    await page.screenshot({ path: join(artifacts, `failure-${name}.png`), timeout: 3000 }).catch(() => {});
    return record(name, { status: error.name === 'TimeoutError' ? 'timeout' : 'error', error: error.message });
  } finally {
    await context.close();
  }
}

async function main() {
  assert.ok(Number.isSafeInteger(renderTimeout) && renderTimeout > 0, 'RENDER_TIMEOUT_MS must be a positive integer');
  assert.ok(existsSync(join(root, 'backend/cli.py')), 'backend.cli is missing. Run this after integration.');
  assert.ok(existsSync(join(root, 'frontend/dist/index.html')), 'Build the frontend before running browser QA.');
  assert.ok(existsSync(chrome), 'System Chrome is missing. Set CHROME_PATH to its executable.');
  const { chromium } = frontendRequire('playwright', process.env.PLAYWRIGHT_PATH);
  mkdirSync(artifacts, { recursive: true });
  execFileSync(process.execPath, [join(root, 'scripts/test-graph-data.mjs')], { cwd: root, env: { ...process.env, PYTHON: python }, stdio: 'inherit' });
  execFileSync(process.execPath, [join(root, 'scripts/test-execution-map.mjs')], { cwd: root, stdio: 'inherit' });
  execFileSync(process.execPath, [join(root, 'scripts/test-recorded-edits.mjs')], { cwd: root, stdio: 'inherit' });
  execFileSync(process.execPath, [join(root, 'scripts/test-timeline-data.mjs')], { cwd: root, stdio: 'inherit' });
  const scratch = mkdtempSync(join(tmpdir(), 'trajviz-e2e-'));
  let browser;
  let server;
  try {
    const inputs = join(scratch, 'input');
    const dataset = join(scratch, 'build');
    const portable = join(scratch, 'portable');
    const reportFile = join(portable, 'trajviz.html');
    cpSync(join(root, 'fixtures/input'), inputs, { recursive: true });
    execute([join(root, 'tests/e2e/traces.py'), inputs]);
    execute([...cli, 'build', inputs, '-o', dataset]);
    mkdirSync(portable);
    let exported = false;
    try {
      execute([...cli, 'export', dataset, '--html', reportFile]);
      assert.deepEqual(readdirSync(portable), ['trajviz.html'], 'Portable export created sidecar files');
      exported = true;
    } catch (error) {
      failed('export', error);
    }
    const index = readJson(join(dataset, 'index.json'));
    const run = index.runs.find(({ id }) => id === 'slug-baseline-timeout');
    assert.ok(run, 'Baseline fixture was missing from the build');
    for (const size of renderSizes) {
      const synthetic = index.runs.find(({ id }) => id === `qa-render-${size}`);
      assert.equal(synthetic?.metrics.nodes, size, `Synthetic ${size}-node build size`);
    }
    const graph = readJson(join(dataset, run.file));
    const steps = readJson(join(dataset, run.steps_file));

    // Launch once. Surface sandbox or Chrome launch errors without retrying.
    browser = await chromium.launch({ executablePath: resolve(chrome), headless: true, timeout: 15000 });
    chromeVersion = browser.version();
    server = startServer(dataset);
    let url;
    try {
      url = await server.url;
    } catch (error) {
      failed('serve', error);
    }
    if (url) {
      await scenario(browser, 'run-list', (page, requests) => checkRunList(page, url, index, artifacts, requests));
      await scenario(browser, 'graph', (page, requests) => checkGraph(page, url, graph, steps, artifacts, requests));
      await scenario(browser, 'compare', (page) => checkCompare(page, url, artifacts));
      await scenario(browser, 'dag', (page) => checkDag(page, url, artifacts));
      await scenario(browser, 'dag-compare', (page) => checkDagCompare(page, url, artifacts));
      await scenario(browser, 'hierarchy', (page) => checkHierarchy(page, url, artifacts));
      await scenario(browser, 'workbench', (page) => checkWorkbench(page, url, artifacts));
      await scenario(browser, 'dashboard', (page) => checkDashboard(page, url, artifacts));
      await scenario(browser, 'dashboard-compare', (page) => checkDashboardCompare(page, url, artifacts));
      await scenario(browser, 'four-reference', (page) => checkFourReference(page, url, artifacts));
      await scenario(browser, 'density', (page) => checkDensity(page, url, artifacts));
      await scenario(browser, 'three-page-desktop', (page) => checkThreePage(page, url, artifacts));
      await scenario(browser, 'execution-map', (page) => checkExecutionMap(page, url, artifacts));
      await scenario(browser, 'node-appearance', (page) => checkNodeAppearance(page, url, artifacts));
      await scenario(browser, 'graph-fullscreen', (page) => checkGraphFullscreen(page, url, artifacts));
      await scenario(browser, 'playback-preferences', (page) => checkPlaybackPreferences(page, url, artifacts));
      await scenario(browser, 'document-workspace', (page) => checkDocumentWorkspace(page, url, artifacts));
      await scenario(browser, 'neutral-vertical', (page) => checkNeutralVertical(page, url, artifacts));
      await scenario(browser, 'timeline-workspace', (page) => checkTimelineWorkspace(page, url, artifacts));
      await scenario(browser, 'sankey', (page) => checkSankey(page, url, index, artifacts));
      await scenario(browser, 'analytics', (page) => checkAnalytics(page, url, index, artifacts));
      await scenario(browser, 'collapse-all', (page) => checkCollapseAll(page, url, artifacts));
      await scenario(browser, 'visual-affordances', (page) => checkVisualAffordances(page, url, artifacts));
      await scenario(browser, 'recorded-writes', (page) => checkRecordedWrites(page, url, artifacts));
      await scenario(browser, 'theme', (page) => checkTheme(page, url, artifacts));
      await scenario(browser, 'folding', (page) => checkFolded(page, url, artifacts));
      await scenario(browser, 'narrow', (page) => checkNarrow(page, url, artifacts));
      const liveSource = join(scratch, 'live-input');
      mkdirSync(liveSource);
      const liveFile = join(liveSource, 'qa-live.codex.jsonl');
      const events = [{ type: 'thread.started', thread_id: 'qa-live' }];
      const append = (position) => {
        events.push({ type: 'item.completed', item: { id: `tool-${position}`, type: 'command_execution', command: 'cat src/live.py', aggregated_output: `live result ${position}`, exit_code: 0 } });
        writeFileSync(liveFile, events.map((event) => JSON.stringify(event)).join('\n') + '\n');
      };
      append(1);
      const liveMetadata = join(scratch, 'live-labels.json');
      writeFileSync(liveMetadata, '{}');
      const progress = () => writeFileSync(join(scratch, 'status.json'), JSON.stringify({one:{status:'completed'}}));
      const liveServer = startServer(join(scratch, 'live-out'), liveSource, liveMetadata);
      const awaitLiveUrl = await liveServer.url;
      try { await scenario(browser, 'live', (page) => checkLive(page, awaitLiveUrl, artifacts, append, progress)); }
      finally { await stopServer(liveServer); }
      const report = { chrome: browser.version(), timeoutMs: renderTimeout, mode:'overview', excludesInitialBundleLoad:true, runs: [] };
      for (const size of renderSizes) {
        const sample = await scenario(browser, `first-render-${size}`,
          (page) => timeFirstGraph(page, url, size, artifacts, renderTimeout));
        report.runs.push({ sourceSteps: size, displayedNodes:sample.value?.displayedNodes, status: sample.status, ms: sample.value?.ms ?? null, error: sample.error });
        if (sample.value !== undefined) console.log(`${size} source steps / Overview: ${sample.value.ms.toFixed(1)} ms to first graph paint`);
        writeFileSync(join(artifacts, 'first-render.json'), JSON.stringify(report, null, 2) + '\n');
      }
    }
    await stopServer(server);
    if (exported) {
      await scenario(browser, 'workbench-offline', (page) => checkWorkbench(page, pathToFileURL(reportFile).href, artifacts, true), true);
      await scenario(browser, 'dashboard-offline', (page) => checkDashboard(page, pathToFileURL(reportFile).href, artifacts, true), true);
      await scenario(browser, 'four-reference-offline', (page) => checkFourReference(page, pathToFileURL(reportFile).href, artifacts, true), true);
      await scenario(browser, 'density-offline', (page) => checkDensity(page, pathToFileURL(reportFile).href, artifacts, true), true);
      await scenario(browser, 'three-page-desktop-offline', (page) => checkThreePage(page, pathToFileURL(reportFile).href, artifacts, true), true);
      await scenario(browser, 'execution-map-offline', (page) => checkExecutionMap(page, pathToFileURL(reportFile).href, artifacts, true), true);
      await scenario(browser, 'node-appearance-offline', (page) => checkNodeAppearance(page, pathToFileURL(reportFile).href, artifacts, true), true);
      await scenario(browser, 'graph-fullscreen-offline', (page) => checkGraphFullscreen(page, pathToFileURL(reportFile).href, artifacts, true), true);
      await scenario(browser, 'analytics-offline', (page) => checkAnalytics(page, pathToFileURL(reportFile).href, index, artifacts, true), true);
      await scenario(browser, 'collapse-all-offline', (page) => checkCollapseAll(page, pathToFileURL(reportFile).href, artifacts, true), true);
      await scenario(browser, 'visual-affordances-offline', (page) => checkVisualAffordances(page, pathToFileURL(reportFile).href, artifacts, true), true);
      await scenario(browser, 'recorded-writes-offline', (page) => checkRecordedWrites(page, pathToFileURL(reportFile).href, artifacts, true), true);
      await scenario(browser, 'playback-preferences-offline', (page) => checkPlaybackPreferences(page, pathToFileURL(reportFile).href, artifacts, true), true);
      await scenario(browser, 'document-workspace-offline', (page) => checkDocumentWorkspace(page, pathToFileURL(reportFile).href, artifacts, true), true);
      await scenario(browser, 'neutral-vertical-offline', (page) => checkNeutralVertical(page, pathToFileURL(reportFile).href, artifacts, true), true);
      await scenario(browser, 'timeline-workspace-offline', (page) => checkTimelineWorkspace(page, pathToFileURL(reportFile).href, artifacts, true), true);
      await scenario(browser, 'offline', (page) =>
        checkOffline(page, pathToFileURL(reportFile).href, index, graph, steps, artifacts), true);
    }
    const delivered = join(root, 'trajviz-report.html');
    if (existsSync(delivered)) {
      const shipped = readJson(join(root, 'out/index.json'));
      const baseline = shipped.runs.find((run) => run.id === 'slug-baseline-timeout');
      await scenario(browser, 'delivered-offline', (page) => checkOffline(page, pathToFileURL(delivered).href,
        shipped, readJson(join(root, 'out', baseline.file)), readJson(join(root, 'out', baseline.steps_file)), artifacts), true);
    }
  } finally {
    await stopServer(server);
    await browser?.close();
    rmSync(scratch, { recursive: true, force: true });
  }
}

await main().catch((error) => failed('browser QA', error));
