import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const fixtureRuns = [
  'slug-baseline-timeout', 'slug-codex-pass', 'slug-codex-rollout', 'slug-codex-verifier',
  'slug-empty', 'slug-messages-pass', 'slug-messages-provider', 'slug-skill-pass',
];
export const renderSizes = [500, 2000];
export const foldedRun = 'qa-folded-2000';
const timeoutRun = 'slug-baseline-timeout';

// Keep the UI locators here so presentation and integration changes have one adjustment point.
const role = (page, kind, name) => page.getByRole(kind, { name });
const button = (page, name) => role(page, 'button', name);
const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const exact = (text) => new RegExp(`^${escapeRegex(text)}$`, 'i');
const runButton = (page, id) => button(page, exact(id)).or(role(page, 'link', exact(id)));
const runRow = (page, id) => role(page, 'row', new RegExp(`\\b${escapeRegex(id)}\\b`));
const selection = (page, id) => role(page, 'checkbox', exact(`Select ${id}`));
const search = (page) => role(page, 'searchbox', /search runs|search traces|full.text search/i);
const graphNodes = 'svg [data-node]';

function tab(page, name) {
  const label = exact(name);
  return role(page, 'tab', label)
    .or(page.getByRole('navigation').getByRole('link', { name: label }))
    .or(page.getByRole('navigation').getByRole('button', { name: label }))
    .or(page.getByTestId(`nav-${name.toLowerCase()}`));
}

async function visible(locator) {
  await locator.first().waitFor({ state: 'visible' });
}

async function checkRows(page, runs, selected) {
  // Wait for the expected rows to settle before checking any rows that should disappear.
  for (const id of selected) await visible(runRow(page, id));
  for (const id of runs.filter((run) => !selected.includes(run))) {
    await runRow(page, id).waitFor({ state: 'hidden' });
  }
}

async function checkFacet(page, name, values) {
  const summary = page.locator('summary').filter({ hasText: new RegExp(`^${name}`, 'i') });
  await summary.or(button(page, exact(name))).first().click();
  const group = role(page, 'group', exact(name));
  for (const value of values) {
    await group.getByRole('checkbox', { name: exact(value) }).check();
  }
  await page.keyboard.press('Escape');
}

async function checkTextSearch(page, allRuns, index, url) {
  const find = () => search(page).fill('tRiMmEd SePaRaToRs AnD vErIfIeD aLl ThReE cAsEs');
  if (url) {
    const response = page.waitForResponse((res) => new URL(res.url()).pathname.endsWith('/' + index.search_file));
    const [loaded] = await Promise.all([response, find()]);
    assert.equal(loaded.ok(), true, 'Full-text index request failed');
  } else {
    await find();
  }
  await checkRows(page, allRuns, ['slug-skill-pass']);
  await search(page).fill('');
  await checkRows(page, allRuns, allRuns);
}

export async function checkRunList(page, url, index, artifacts, requests) {
  await page.goto(url);
  await visible(role(page, 'heading', /^Runs$/i));
  const ids = index.runs.map((run) => run.id);
  await checkRows(page, ids, [...fixtureRuns, ...renderSizes.map((size) => `qa-render-${size}`), foldedRun, 'qa-exact-indices']);
  assert.ok(!requests.some((path) => /\/(runs|steps)\/|\/search\.json$/.test(path)),
    'Opening the catalog fetched graph, step, or search data before it was needed');
  await page.screenshot({ path: join(artifacts, 'runs.png'), fullPage: true });

  await checkFacet(page, 'Model', ['orion-mini', 'atlas-code']);
  const models = index.runs.filter((run) => ['orion-mini', 'atlas-code'].includes(run.model));
  await checkRows(page, ids, models.map((run) => run.id));
  await checkFacet(page, 'Condition', ['baseline']);
  await checkRows(page, ids, models.filter((run) => run.condition === 'baseline').map((run) => run.id));
  await button(page, /^Clear filters$/i).first().click();
  await checkRows(page, ids, ids);
  await checkTextSearch(page, ids, index, url);

  await button(page, /^Langutory$/i).click();
  const regex = page.getByLabel(/Langutory regex/i);
  await regex.fill('[');
  await visible(role(page, 'alert', '').filter({ hasText: /invalid/i }).or(page.getByText(/invalid pattern/i)));
  assert.equal(await regex.getAttribute('aria-invalid'), 'true');
  const pattern = '^' + escapeRegex(index.runs.find((run) => run.id === timeoutRun).langutory) + '$';
  await regex.fill(pattern);
  await checkRows(page, ids, index.runs.filter((run) => new RegExp(pattern).test(run.langutory)).map((run) => run.id));
  await regex.fill('^(.*)*Z$');
  await visible(page.getByText(/Pattern search timed out/));
  await regex.fill('');
}

function graphNode(page, sourceIndex) {
  return role(page, 'button', new RegExp(`first source step #${sourceIndex}\\b`, 'i'));
}

async function inspectFirstNode(page, graph, steps) {
  const node = graph.expanded.nodes[0];
  const step = steps.steps[0];
  await graphNode(page, node.first_idx).click();
  const inspector = role(page, 'complementary', /^Step inspector$/i);
  await visible(inspector.getByText(step.thought, { exact: true }));
  await visible(inspector.getByText(step.observation.text, { exact: true }));
  await visible(inspector.getByText(JSON.stringify(step.action, null, 2), { exact: true }));
  await visible(inspector.getByText(`${step.raw_ref.file}:${step.raw_ref.line}`, { exact: true }));
}

export async function checkGraph(page, url, graph, steps, artifacts, requests) {
  await page.goto(url);
  await runButton(page, timeoutRun).click();
  await visible(page.locator(graphNodes));
  assert.ok(!requests.some((path) => path.includes('/steps/')), 'Steps were fetched before inspection');
  await inspectFirstNode(page, graph, steps);
  await page.screenshot({ path: join(artifacts, 'graph-inspector.png') });
  const png = await downloadFile(page, /^Download PNG of/i);
  assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  const svg = (await downloadFile(page, /^Download SVG of/i)).toString('utf8');
  assert.match(svg, /^<svg\b/);
  assert.match(svg, /<path\b/);
  const csv = (await downloadFile(page, /^Export CSV$/i)).toString('utf8');
  assert.match(csv, /slug-baseline-timeout/);


  const repeated = graph.aggregated.nodes.find((node) => node.count > 1);
  assert.ok(repeated, 'Fixture should have a repeated action');
  const [, repeatedIndex] = repeated.step_indices;
  await visible(graphNode(page, repeatedIndex));
  await button(page, /^Aggregated$/i).click();
  await graphNode(page, repeatedIndex).waitFor({ state: 'hidden' });
  assert.match(await graphNode(page, repeated.first_idx).getAttribute('aria-label'),
    new RegExp(`\\b${repeated.count} steps\\b`));
  await button(page, /^Expanded$/i).click();
  await visible(graphNode(page, repeatedIndex));

  const position = role(page, 'slider', /timeline position/i);
  await visible(position);
  await position.press('Home');
  assert.equal(await position.inputValue(), '0');
  await button(page, /^Play$/i).click();
  await position.and(page.locator('[aria-valuetext^="Step "]')).waitFor({ timeout: 7000 });
  const pause = button(page, /^Pause$/i);
  if (await pause.isVisible()) await pause.click();
  const current = await position.evaluate((slider) => ({
    ordinal: Number(slider.value),
    description: slider.getAttribute('aria-valuetext'),
  }));
  const sourceIndex = graph.expanded.nodes[current.ordinal - 1]?.first_idx;
  assert.ok(current.ordinal > 0 && sourceIndex !== undefined, 'Playback did not advance to a source step');
  assert.match(current.description, new RegExp(`source index ${sourceIndex}\\b`, 'i'));
}

async function downloadFile(page, name) {
  const [download] = await Promise.all([page.waitForEvent('download'), button(page, name).click()]);
  return readFileSync(await download.path());
}

export async function checkFolded(page, url, artifacts) {
  await page.goto(url);
  await runButton(page, foldedRun).click();
  await visible(page.getByText(/1,960 consecutive repeat steps folded/));
  await graphNode(page, 1).click();
  const inspector = role(page, 'complementary', /step inspector/i);
  await visible(button(inspector, /show all.*characters/i));
  assert.equal(await inspector.getByText(/qa-end-of-observation/).count(), 0);
  await button(inspector, /show all.*characters/i).click();
  await visible(inspector.getByText(/qa-end-of-observation/));
  await role(inspector, 'combobox', /member step/i).selectOption('3');
  await visible(inspector.getByText('Check synthetic module 1.', { exact: true }));
  await button(page, /^Expand all steps$/i).click();
  await visible(page.getByText('All source steps are shown.', { exact: true }));
  await button(page, /^Fold repeats$/i).click();
  await visible(page.getByText(/1,960 consecutive repeat steps folded/));
  await page.screenshot({ path: join(artifacts, 'folded.png') });
  await page.goto(url);
  await runButton(page, 'qa-exact-indices').click();
  await graphNode(page, '9007199254740993').click();
  await visible(inspector.getByText('Check synthetic module 1.', { exact: true }));
  await button(page, /^Aggregated$/i).click();
  await role(inspector, 'combobox', /member step/i).selectOption('9007199254740992');
  await visible(inspector.getByText('Check synthetic module 0.', { exact: true }));

}

export async function checkNarrow(page, url, artifacts) {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(url);
  await visible(role(page, 'heading', /^Runs$/i));
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await visible(page.getByText('Scroll the table to see all columns.', { exact: true }));
  const model = role(page, 'cell', exact('qa-model')).first();
  assert.equal(await model.evaluate((cell) => {
    const text = document.createRange();
    text.selectNodeContents(cell);
    return new Set(Array.from(text.getClientRects(), (rect) => rect.top)).size;
  }), 1, 'A short model label wraps across lines');
  await page.screenshot({ path: join(artifacts, 'narrow.png'), fullPage: true });
  await runButton(page, timeoutRun).click();
  await visible(page.locator(graphNodes));
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
}

export async function checkCompare(page, url, artifacts) {
  await page.goto(url);
  await selection(page, timeoutRun).check();
  assert.ok(await selection(page, 'qa-render-500').isDisabled(),
    'A run from another task is selectable in the comparison');
  await selection(page, 'slug-skill-pass').check();
  await selection(page, 'slug-codex-pass').check();
  await button(page, /^Compare runs$/i).click();
  await visible(role(page, 'heading', /compar/i));
  await visible(page.getByText('swe-slug-019 · 3 selected runs', { exact: true }));
  const pairs = page.getByRole('table').filter({ hasText: /Jaccard|divergence/i }).first();
  await visible(pairs);
  const pairRows = pairs.getByRole('row').filter({ hasText: /slug-/ });
  for (const [left, right] of [
    [timeoutRun, 'slug-skill-pass'], [timeoutRun, 'slug-codex-pass'], ['slug-skill-pass', 'slug-codex-pass'],
  ]) {
    await visible(pairRows.filter({ hasText: left }).filter({ hasText: right }));
  }
  assert.equal(await pairRows.count(), 3, 'Expected every unordered pair exactly once');

  const selectedGraph = role(page, 'group', exact(`Process graph for ${timeoutRun}`));
  await graphNode(selectedGraph, 0).click();
  await visible(page.getByText('Matching runs', { exact: true }));
  for (const id of [timeoutRun, 'slug-skill-pass', 'slug-codex-pass']) {
    const graph = role(page, 'group', exact(`Process graph for ${id}`));
    const matching = button(graph, /\bpwd\b/i).and(graph.locator('[aria-pressed="true"]'));
    await visible(matching);
  }
  await page.screenshot({ path: join(artifacts, 'compare.png'), fullPage: true });
}

export async function checkSankey(page, url, index, artifacts) {
  await page.goto(url);
  await tab(page, 'Sankey').or(tab(page, 'Phase transitions')).first().click();
  await visible(role(page, 'heading', /Sankey|phase transitions/i));
  const model = 'orion-mini';
  await role(page, 'combobox', /^Group$/i).selectOption(model);
  const chart = role(page, 'group', exact(`Phase transitions for ${model}`));
  await visible(chart);
  const label = (phase) => index.phases.find(({ id }) => id === phase).label;
  const runs = index.runs.filter((run) => run.model === model);
  for (const [from, to] of [['validate', 'validate'], ['edit', 'validate'], ['validate', 'edit']]) {
    const count = runs.reduce((total, run) => total + (run.metrics.phase_transitions[from]?.[to] ?? 0), 0);
    assert.ok(count > 0, `Fixture lacks ${from} → ${to} transitions`);
    const link = role(chart, 'img', exact(`${label(from)} → ${label(to)} · ${count.toLocaleString('en-US')} transitions`));
    assert.match(await link.getAttribute('d'), /^M.+/);
  }
  await button(page, /^Side by side$/i).click();
  await role(page, 'combobox', /^Second group$/i).selectOption('orion-4');
  const secondChart = role(page, 'group', exact('Phase transitions for orion-4'));
  await visible(secondChart);
  await visible(chart);
  const scale = async (groupChart, group) => {
    const count = index.runs.filter((run) => run.model === group)
      .reduce((total, run) => total + (run.metrics.phase_transitions.edit?.validate ?? 0), 0);
    assert.ok(count > 0);
    const band = role(groupChart, 'img', exact(`Edit → Validate · ${count} transitions`));
    return Number(await band.getAttribute('stroke-width')) / count;
  };
  assert.ok(Math.abs(await scale(chart, model) - await scale(secondChart, 'orion-4')) < 0.01,
    'Both Sankey panels must use the same count scale');
  await page.screenshot({ path: join(artifacts, 'sankey.png'), fullPage: true });
}

export async function checkTheme(page, url, artifacts) {
  await page.goto(url);
  const toggle = button(page, /theme|light mode|dark mode|switch to (light|dark)/i).first();
  await visible(toggle);
  const theme = () => {
    const html = document.documentElement;
    return [document.querySelector('[data-theme]')?.getAttribute('data-theme'),
      getComputedStyle(html).colorScheme, getComputedStyle(document.body).backgroundColor]
      .join('|');
  };
  const original = await page.evaluate(theme);
  await toggle.click();
  const changed = await page.evaluate(theme);
  assert.notEqual(changed, original);
  await page.screenshot({ path: join(artifacts, 'theme-toggled.png') });
  await toggle.click();
  assert.equal(await page.evaluate(theme), original);
}

export async function checkOffline(page, fileUrl, index, graph, steps, artifacts) {
  const external = [];
  page.on('request', (request) => {
    const url = request.url();
    if (url !== fileUrl && !/^(data|blob):/.test(url)) external.push(url);
  });
  await page.goto(fileUrl);
  const ids = index.runs.map((run) => run.id);
  await checkRows(page, ids, ids);
  await checkTextSearch(page, ids, index);
  await button(page, /^Langutory$/i).click();
  const regex = page.getByLabel(/Langutory regex/i);
  const phaseSequence = index.runs.find((run) => run.id === timeoutRun).langutory;
  await regex.fill('^' + escapeRegex(phaseSequence) + '$');
  await checkRows(page, ids, index.runs.filter((run) => run.langutory === phaseSequence).map((run) => run.id));
  await regex.fill('');
  await runButton(page, timeoutRun).click();
  await inspectFirstNode(page, graph, steps);
  assert.deepEqual(external, [], 'Portable report requested resources outside its HTML file');
  await page.screenshot({ path: join(artifacts, 'offline.png') });
}

export async function timeFirstGraph(page, url, size, artifacts, timeout) {
  await page.goto(url);
  const run = runButton(page, `qa-render-${size}`);
  await run.evaluate((element, selector) => {
    element.addEventListener('click', () => {
      const started = performance.now();
      const observeFrame = () => {
        const inViewport = Array.from(document.querySelectorAll(selector)).some((node) => {
          const bounds = node.getBoundingClientRect();
          return bounds.width > 0 && bounds.height > 0 && bounds.bottom > 0 && bounds.top < innerHeight &&
            bounds.right > 0 && bounds.left < innerWidth;
        });
        if (inViewport) {
          // A subsequent frame gives the visible SVG node a paint opportunity.
          requestAnimationFrame(() => { window.__qaGraphPaint = performance.now() - started; });
        } else {
          requestAnimationFrame(observeFrame);
        }
      };
      requestAnimationFrame(observeFrame);
    }, { once: true, capture: true });
  }, graphNodes);
  await run.click();
  const paint = await page.waitForFunction(() => window.__qaGraphPaint, null, { timeout });
  const ms = await paint.jsonValue();
  await paint.dispose();
  assert.ok(Number.isFinite(ms) && ms > 0, 'Missing graph paint timestamp');
  const graph = role(page, 'group', exact(`Process graph for qa-render-${size}-expanded`));
  await visible(graph);
  await page.mouse.move(1, 1);
  if (size === 500) assert.ok(ms < 3000, '500-node first graph paint exceeded 3 s');
  await visible(page.getByText(new RegExp(`^${size.toLocaleString('en-US')} nodes ·`)));
  await page.screenshot({ path: join(artifacts, `first-render-${size}.png`) });
  return ms;
}
