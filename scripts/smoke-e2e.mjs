import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import {
  checkCompare, checkGraph, checkOffline, checkRunList, checkSankey, checkTheme, renderSizes, timeFirstGraph,
} from '../tests/e2e/browser.mjs';
import { frontendRequire, results, root } from './frontend-dependencies.mjs';

const python = process.env.PYTHON || 'python';
const chrome = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const renderTimeout = Number(process.env.RENDER_TIMEOUT_MS ?? 30000);
const artifacts = join(results, 'e2e');
const cli = ['-m', 'backend.cli'];

function execute(args) {
  return execFileSync(python, args, { cwd: root, stdio: 'inherit', timeout: 120000 });
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function startServer(dataset) {
  const child = spawn(python, [...cli, 'serve', dataset, '--port', '0'], {
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
    return { status: 'ok', value };
  } catch (error) {
    failed(name, error);
    await page.screenshot({ path: join(artifacts, `failure-${name}.png`), timeout: 3000 }).catch(() => {});
    return { status: error.name === 'TimeoutError' ? 'timeout' : 'error', error: error.message };
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
      await scenario(browser, 'sankey', (page) => checkSankey(page, url, index, artifacts));
      await scenario(browser, 'theme', (page) => checkTheme(page, url, artifacts));
      const report = { chrome: browser.version(), timeoutMs: renderTimeout, runs: [] };
      for (const size of renderSizes) {
        const sample = await scenario(browser, `first-render-${size}`,
          (page) => timeFirstGraph(page, url, size, artifacts, renderTimeout));
        report.runs.push({ nodes: size, status: sample.status, ms: sample.value ?? null, error: sample.error });
        if (sample.value !== undefined) console.log(`${size} nodes: ${sample.value.toFixed(1)} ms to first graph paint`);
        writeFileSync(join(artifacts, 'first-render.json'), JSON.stringify(report, null, 2) + '\n');
      }
    }
    await stopServer(server);
    if (exported) {
      await scenario(browser, 'offline', (page) =>
        checkOffline(page, pathToFileURL(reportFile).href, index, graph, steps, artifacts), true);
    }
  } finally {
    await stopServer(server);
    await browser?.close();
    rmSync(scratch, { recursive: true, force: true });
  }
}

await main().catch((error) => failed('browser QA', error));
