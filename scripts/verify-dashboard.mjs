// Verify the exact public single-file delivery, including every new dashboard view.
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { frontendRequire, root, results } from './frontend-dependencies.mjs';
import { checkDashboard } from '../tests/e2e/dashboard.mjs';
import { checkWorkbench } from '../tests/e2e/workbench.mjs';

const { chromium } = frontendRequire('playwright', process.env.PLAYWRIGHT_PATH);
const artifacts = join(results, 'dashboard-delivery');
mkdirSync(artifacts, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
try {
  const context = await browser.newContext({ offline: true, viewport: { width: 1440, height: 950 }, serviceWorkers: 'block' });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const workbench = await checkWorkbench(page, pathToFileURL(join(root, 'trajviz-report.html')).href, artifacts, true);
  await page.setViewportSize({ width: 1440, height: 950 });
  const evidence = await checkDashboard(page, pathToFileURL(join(root, 'trajviz-report.html')).href, artifacts, true);
  await page.getByRole('navigation', { name: 'Workspace' }).getByRole('button', { name: 'Runs', exact: true }).click();
  await page.getByRole('button', { name: 'dashboard-baseline', exact: true }).click();
  await page.getByRole('button', { name: 'Trajectory replay', exact: true }).click();
  await page.getByRole('slider', { name: 'Replay position' }).fill('5');
  for (const width of [1024, 768, 320]) {
    const sizePage = await context.newPage();
    await sizePage.setViewportSize({ width, height: 900 });
    await sizePage.goto(pathToFileURL(join(root, 'trajviz-report.html')).href);
    await sizePage.getByRole('button', { name: 'dashboard-baseline', exact: true }).click();
    await sizePage.getByRole('button', { name: 'Trajectory replay', exact: true }).click();
    await sizePage.getByRole('slider', { name: 'Replay position' }).fill('5');
    await sizePage.getByRole('button', { name: 'Show inspection', exact: true }).click();
    await sizePage.getByRole('complementary', { name: 'Step inspector' }).getByText('#60', { exact: true }).waitFor();
    assert.ok(await sizePage.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `No document overflow at ${width}px`);
    const dock = await sizePage.getByRole('region', { name: 'Replay controls', exact: true }).boundingBox();
    assert.ok(dock.y >= 0 && dock.y + dock.height <= 900 && dock.x >= 0 && dock.x + dock.width <= width, `Replay dock visible at ${width}px`);
    if (width <= 1000) await sizePage.getByRole('button', { name: 'Hide inspection', exact: true }).click();
    await sizePage.evaluate(async () => {
      document.activeElement?.blur(); window.scrollTo(0, 0);
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    });
    await sizePage.screenshot({ path: join(artifacts, `dashboard-${width}.png`), fullPage: true });
    await sizePage.screenshot({ path: join(artifacts, `dashboard-${width}-viewport.png`) });
    if (width === 320) {
      await sizePage.getByRole('navigation', { name: 'Workspace' }).getByRole('button', { name: 'Runs', exact: true }).click();
      const target = await sizePage.locator('.run-select-target').first().boundingBox();
      const open = await sizePage.getByRole('button', { name: 'dashboard-baseline', exact: true }).boundingBox();
      assert.ok(target.width >= 44 && target.height >= 44 && open.height >= 44 && open.width >= 44, 'Mobile catalog hit areas are at least 44px');
      const selectTarget = sizePage.locator('.run-select-target').first();
      await selectTarget.click({ position: { x: 2, y: 2 } });
      assert.equal(await selectTarget.getByRole('checkbox').isChecked(), true, 'The outer label edge selects the run');
      await selectTarget.click({ position: { x: 2, y: 2 } });
      assert.equal(await selectTarget.getByRole('checkbox').isChecked(), false);
      await sizePage.screenshot({ path: join(artifacts, 'catalog-mobile-targets.png') });
    }
    await sizePage.close();
  }
  await page.setViewportSize({ width: 1440, height: 950 });
  await page.getByRole('navigation',{name:'Workspace'}).getByRole('button',{name:'Runs',exact:true}).click();
  await page.locator('.dataset-utilities > summary').click();
  await page.getByRole('button', { name: 'Dark theme', exact: true }).click();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: join(artifacts, 'dashboard-dark.png'), fullPage: true });
  await page.getByRole('button', { name: 'Light theme', exact: true }).click();
  await page.getByRole('navigation', { name: 'Workspace' }).getByRole('button', { name: 'Runs', exact: true }).click();
  await page.getByRole('button', { name: 'dag-baseline', exact: true }).click();
  await page.getByRole('button', { name: 'Hierarchy', exact: true }).click();
  const graph = page.getByRole('group', { name: 'Process graph for dag-baseline-expanded', exact: true });
  await graph.getByRole('button', { name: /Loop · 2 × 1 calls.*first source step #7/ }).click();
  await graph.getByRole('button', { name: /Iteration 2.*first source step #19/ }).click();
  const call = graph.getByRole('button', { name: /^read_file.*first source step #19/ });
  await call.focus();
  await call.press('Enter');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(async () => {
    document.activeElement?.blur();
    window.scrollTo(0, 0);
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
  await page.screenshot({ path: join(artifacts, 'hierarchy-mobile-corrected.png'), fullPage: true });
  assert.deepEqual(errors, []);
  writeFileSync(join(artifacts, 'verification.json'), JSON.stringify({ chrome: browser.version(), ...evidence, workbench, pageErrors: errors, widths: [1440, 1280, 1024, 768, 390, 320] }, null, 2) + '\n');
  console.log('PASS delivered dashboard: replay, patch, notes, playback, timeline, source fidelity; zero HTTP/page errors; 320–1440px and dark theme');
} finally { await browser.close(); }
