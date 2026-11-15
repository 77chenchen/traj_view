import assert from 'node:assert/strict';
import { join } from 'node:path';

async function panesFit(page) {
  const geometry = await page.evaluate(() => {
    const box = (selector) => document.querySelector(selector).getBoundingClientRect().toJSON();
    return { width: innerWidth, height: innerHeight, scrollWidth: document.documentElement.scrollWidth, scrollHeight: document.documentElement.scrollHeight,
      panes: ['.event-list', '.recorded-workspace', '.terminal-panel', '.replay-inspection', '.replay-transport'].map(box) };
  });
  assert.equal(geometry.scrollWidth, geometry.width, 'Document has no horizontal overflow');
  assert.ok(geometry.scrollHeight <= geometry.height+1, 'Replay fits the desktop viewport');
  for (const box of geometry.panes) {
    assert.ok(box.width > 100 && box.height >= 38 && box.x >= 0 && box.right <= geometry.width + 1, 'Every evidence pane stays readable within the document width');
  }
  const [list, code, terminal, inspection, dock] = geometry.panes;
  assert.ok(code.x-list.right >= 0 && code.x-list.right <= 1 && inspection.x-code.right >= 0 && inspection.x-code.right <= 1, 'Three panes share aligned dividers');
  assert.ok(code.height>=280 && list.height>=400, 'Evidence and source list retain readable viewport space');
  assert.ok(Math.abs(terminal.y-code.bottom)<=1 && Math.abs(terminal.width-code.width)<=1 && Math.abs(terminal.x-code.x)<=1, 'Terminal shares the center column under evidence');
  assert.ok(dock.y>=list.bottom+10&&dock.bottom<=geometry.height+1, 'Playback occupies a separate reachable row without covering evidence');
  assert.ok(await page.locator('.evidence-tabs').evaluate(e=>e.getBoundingClientRect().bottom<=document.querySelector('.recorded-code').getBoundingClientRect().top),'Evidence tabs are reachable above content');
  await page.waitForFunction(()=>{
    const row=document.querySelector('.event-row[aria-pressed="true"]')?.getBoundingClientRect(),list=document.querySelector('.event-rows')?.getBoundingClientRect();
    if (!document.querySelector('.event-row')) return true;
    return row&&list&&row.top>=list.top-1&&row.bottom<=list.bottom+1;
  });
  return geometry;
}

export async function checkWorkbench(page, url, artifacts, offline = false) {
  const errors = [];
  const http = [];
  const record = (request) => { if (/^https?:/.test(request.url())) http.push(request.url()); };
  page.on('request', record);
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(url);
  await page.getByRole('button', { name: 'dashboard-baseline', exact: true }).click();
  await page.getByRole('button', { name: 'Trajectory replay', exact: true }).click();
  await page.getByRole('button', { name: 'Show inspection', exact: true }).click();
  const inspector = page.getByRole('complementary', { name: 'Step inspector' });
  const slider = page.getByRole('slider', { name: 'Replay position' });
  const output = page.getByLabel('Current step output', { exact: true });
  const evidence = page.getByLabel('Selected step evidence', { exact: true });
  const prefix = offline ? 'workbench-offline' : 'workbench';
  const viewports = [];
  for (const [width, height] of [[1440, 900], [1280, 800]]) {
    await page.setViewportSize({ width, height });
    await slider.fill('5');
    await page.getByLabel('Recorded patch', { exact: true }).waitFor();
    await inspector.getByText('#60', { exact: true }).waitFor();
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    viewports.push(await panesFit(page));
    await page.screenshot({ path: join(artifacts, `${prefix}-replay-${width}.png`) });
    // Failure -> recorded edit -> failed rerun -> successful subsequent validation.
    await page.getByRole('region', { name: 'Trajectory events' }).getByRole('button', { name: /^Source step #50:/ }).click();
    await inspector.getByText('#50', { exact: true }).waitFor();
    assert.equal(await slider.inputValue(), '4');
    assert.match(await evidence.innerText(), /\$ pytest -q tests\/test_session.py/);
    assert.match(await evidence.innerText(), /FAILED test_session_expiry/);
    await page.screenshot({ path: join(artifacts, `${prefix}-failure-${width}.png`) });
    await page.getByLabel('Filter trajectory events').selectOption('errors');
    await page.getByRole('button', { name: 'Next edit', exact: true }).click();
    await inspector.getByText('#60', { exact: true }).waitFor();
    assert.equal(await page.getByLabel('Filter trajectory events').inputValue(), 'all', 'Navigating to a hidden step clears incompatible filters');
    assert.equal(await slider.inputValue(), '5');
    assert.match(await page.getByLabel('Recorded patch', { exact: true }).innerText(), /3600/);
    assert.equal(await page.locator('.recorded-workspace .line-added').count(), 1);
    assert.equal(await page.locator('.recorded-workspace .line-removed').count(), 1);
    assert.ok(await page.locator('.syntax-keyword').count() > 0);
    await page.getByRole('button', { name: 'Next validation', exact: true }).click();
    await inspector.getByText('#70', { exact: true }).waitFor();
    assert.match(await evidence.innerText(), /FAILED test_session_scope/);
    await page.getByRole('button', { name: 'Next validation', exact: true }).click();
    await inspector.getByText('#100', { exact: true }).waitFor();
    assert.equal(await slider.inputValue(), '9');
    assert.match(await evidence.innerText(), /2 passed in 0.12s/);
    await page.getByRole('button', { name: 'Tests', exact: true }).click();
    assert.match(await output.innerText(), /2 passed in 0.12s/);
    await page.screenshot({ path: join(artifacts, `${prefix}-verified-${width}.png`) });
  }
  await page.getByRole('searchbox', { name: 'Search trajectory events' }).fill('no-such-synthetic-step');
  await page.getByText('No matching events. Change the search or event filter.', { exact: true }).waitFor();
  await panesFit(page);
  await page.getByRole('searchbox', { name: 'Search trajectory events' }).fill('');
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await inspector.isVisible(), true, 'Resizing preserves the requested detail panel');
  await page.getByRole('button', { name: 'Hide inspection', exact: true }).click();
  await page.getByRole('button', { name: 'Show inspection', exact: true }).waitFor();
  assert.equal(await inspector.isVisible(), false, 'The narrow detail drawer can be closed to prioritize evidence');
  await page.getByRole('button', { name: 'Previous replay step', exact: true }).click();
  assert.equal(await slider.inputValue(), '8');
  await page.getByRole('button', { name: 'Show inspection', exact: true }).click();
  await inspector.getByText('#90', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Hide inspection', exact: true }).click();
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.screenshot({ path: join(artifacts, `${prefix}-narrow.png`) });
  // The existing generated QA trace has a long single-line observation and 2,000 steps.
  if (!offline) {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.getByRole('navigation', { name: 'Workspace' }).getByRole('button', { name: 'Runs', exact: true }).click();
    await page.getByRole('button', { name: 'qa-folded-2000', exact: true }).click();
    await page.getByRole('button', { name: 'Trajectory replay', exact: true }).click();
    await output.getByText(/qa-end-of-observation/).waitFor();
    assert.ok(await output.evaluate((node) => node.scrollWidth > node.clientWidth));
    await output.evaluate((node) => { node.scrollLeft = node.scrollWidth; });
    assert.ok(await output.evaluate((node) => node.scrollLeft > 0), 'Long output scrolls within Terminal');
    await page.getByRole('button', { name: 'Updated File', exact: true }).click();
    await page.getByLabel('Recorded file excerpt', { exact: true }).waitFor();
    assert.ok(await page.locator('.recorded-code').evaluate((node) => node.scrollWidth > node.clientWidth));
    await page.getByRole('button', { name: 'Show inspection', exact: true }).click();
    await panesFit(page);
    await page.screenshot({ path: join(artifacts, 'workbench-long-evidence.png') });
    await page.getByRole('navigation', { name: 'Workspace' }).getByRole('button', { name: 'Runs', exact: true }).click();
    await page.getByRole('button', { name: 'qa-zero-steps', exact: true }).click();
    await page.getByRole('button', { name: 'Trajectory replay', exact: true }).click();
    await page.getByText('No recorded steps', { exact: true }).waitFor();
    await page.screenshot({ path: join(artifacts, 'workbench-empty.png') });
  }
  page.off('request', record);
  assert.deepEqual(errors, []);
  if (offline) assert.deepEqual(http, [], 'Offline workbench makes no HTTP requests');
  return { viewports, workflow: ['#50 failed', '#60 patch', '#70 failed rerun', '#100 validation passed'], synchronization: true, narrowInspector: 'toggle', longEvidence: !offline, empty: !offline, offline, ...(offline ? { httpRequests: http.length } : {}) };
}
