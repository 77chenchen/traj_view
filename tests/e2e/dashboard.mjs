import assert from 'node:assert/strict';
import { join } from 'node:path';

async function timelineGeometry(page, source, value, end) {
  const timeline = page.getByRole('region', { name: 'Execution timeline', exact: true });
  await timeline.getByRole('button', { name: source, exact: true }).waitFor();
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const geometry = await timeline.evaluate((element, { source, value, end }) => {
    const center = (node) => { const box = node.getBoundingClientRect(); return box.x + box.width / 2; };
    const tick = (value) => element.querySelector(`.event-axis [data-timeline-tick="${value}"]`);
    const point = Array.from(element.querySelectorAll('.timeline-event')).find((node) => node.getAttribute('aria-label') === source);
    const origin = center(tick(0));
    const extent = center(tick(end)) - origin;
    return {
      distance: center(point) - origin,
      expected: value / end * extent,
      width: point.getBoundingClientRect().width,
      gridErrors: Array.from(element.querySelectorAll('.event-lane [data-timeline-tick]')).map((line) =>
        Math.abs(line.getBoundingClientRect().x - center(tick(line.getAttribute('data-timeline-tick'))))),
    };
  }, { source, value, end });
  assert.ok(Math.abs(geometry.distance - geometry.expected) < .6, 'Timeline block matches the axis value');
  assert.ok(geometry.gridErrors.every((error) => error < .6), 'Every lane gridline aligns with its tick');
  return geometry;
}

export async function checkDashboard(page, url, artifacts, offline = false) {
  const http = [];
  const record = (request) => { if (/^https?:/.test(request.url())) http.push(request.url()); };
  page.on('request', record);
  await page.goto(url);
  await page.getByRole('button', { name: 'dashboard-baseline', exact: true }).click();
  await page.getByRole('button', { name: 'Trajectory replay', exact: true }).click();
  const events = page.getByRole('region', { name: 'Trajectory events' });
  const find = page.getByRole('searchbox', { name: 'Search trajectory events' });
  await find.fill('src/session.py');
  assert.ok(await events.locator('.event-row').count() >= 2);
  await events.locator('.event-row').filter({ hasText: 'apply_patch' }).click();
  const inspector = page.getByRole('complementary', { name: 'Step inspector' });
  await page.getByRole('button', { name: 'Show inspection', exact: true }).click();
  await inspector.getByText('#60', { exact: true }).waitFor();
  await page.getByLabel('Recorded patch', { exact: true }).waitFor();
  assert.ok(await page.locator('.line-added').count() > 0);
  assert.ok(await page.locator('.line-removed').count() > 0);
  await page.getByText('Personal annotation', {exact:true}).click();
  const note = page.getByRole('textbox', { name: 'Note for source step #60' });
  await note.fill('Synthetic reviewer note: check expiry evidence.');
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Export note', exact: true }).click()]);
  assert.equal(download.suggestedFilename(), 'trajviz-note.json');
  await page.getByRole('button', { name: 'Updated File', exact: true }).click();
  await page.getByText('No file content recorded', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Diff', exact: true }).click();
  await find.fill('');
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: join(artifacts, offline ? 'dashboard-offline.png' : 'dashboard-replay.png'), fullPage: true });

  await find.fill('');
  await page.getByLabel('Filter trajectory events').selectOption('errors');
  assert.equal(await events.locator('.event-row').count(), 2);
  await page.getByLabel('Filter trajectory events').selectOption('all');
  await page.getByRole('slider', { name: 'Replay position' }).fill('0');
  await page.getByLabel('Replay speed').selectOption('4');
  const beforePlay = await page.evaluate(() => scrollY);
  await page.getByRole('button', { name: 'Play replay', exact: true }).click();
  await page.waitForFunction(() => Number(document.querySelector('[aria-label="Replay position"]').value) > 0);
  const pause = page.getByRole('button', { name: 'Pause replay', exact: true });
  if (await pause.isVisible()) await pause.click();
  assert.ok(Math.abs(await page.evaluate(() => scrollY) - beforePlay) <= 1, 'Playback must not scroll the document');
  const dock = await page.getByRole('region', { name: 'Replay controls', exact: true }).boundingBox();
  assert.ok(dock.y >= 0 && dock.y + dock.height <= page.viewportSize().height, 'Replay controls stay in the working viewport');
  await page.getByRole('slider', { name: 'Replay position' }).fill('5');
  await note.waitFor();
  assert.equal(await note.inputValue(), 'Synthetic reviewer note: check expiry evidence.');
  await page.getByRole('button', { name: 'Execution graph', exact: true }).click();
  await inspector.getByText('#60', { exact: true }).waitFor();
  assert.equal(await page.getByLabel('Timeline position', { exact: true }).inputValue(), '6');
  await page.getByRole('button', { name: 'Execution timeline', exact: true }).click();
  await page.getByText('Recorded timestamp points · no call durations recorded', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Errors: #50 error', exact: true }).click();
  await inspector.getByText('#50', { exact: true }).waitFor();
  await inspector.getByText(/FAILED test_session_expiry/).waitFor();
  const initialTimeline = await timelineGeometry(page, 'Errors: #50 error', 28, 77);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: join(artifacts, offline ? 'timeline-scale-offline-1x.png' : 'timeline-scale-1x.png') });
  await page.getByRole('button', { name: 'Zoom in timeline', exact: true }).click();
  await page.locator('.event-axis [data-timeline-tick="10"]').waitFor();
  const zoomedTimeline = await timelineGeometry(page, 'Errors: #50 error', 28, 77);
  assert.ok(Math.abs(zoomedTimeline.distance - 2 * initialTimeline.distance) < .6, 'Zoom scales block positions with the axis');
  assert.ok(Math.abs(zoomedTimeline.width - Math.min(96, 2 * initialTimeline.width)) < .6, 'Point tokens scale with available space, capped at readable label width; they never imply call duration');
  await page.screenshot({ path: join(artifacts, offline ? 'timeline-scale-offline-2x.png' : 'timeline-scale-2x.png') });
  for (let i = 2; i < 4; i++) await page.getByRole('button', { name: 'Zoom in timeline', exact: true }).click();
  await timelineGeometry(page, 'Errors: #50 error', 28, 77);
  await page.setViewportSize({ width: 390, height: 844 });
  await timelineGeometry(page, 'Errors: #50 error', 28, 77);
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Zoomed timeline scrolls internally on mobile');
  await page.setViewportSize({ width: 1440, height: 950 });
  await page.getByRole('button', { name: 'Fit timeline', exact: true }).click();
  const fittedTimeline = await timelineGeometry(page, 'Errors: #50 error', 28, 77);
  assert.ok(Math.abs(fittedTimeline.width - initialTimeline.width) < .6, 'Fit restores block scale');
  await page.evaluate(() => window.scrollTo(0, 0));
  if (!offline) await page.screenshot({ path: join(artifacts, 'dashboard-timeline.png'), fullPage: true });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Trajectory replay', exact: true }).click();
  assert.equal(await inspector.isVisible(),true,'The requested detail remains open across viewport and view changes');
  await page.getByRole('button', { name: 'Hide inspection', exact: true }).click();
  await page.getByRole('button', { name: 'Next replay step', exact: true }).click();
  await page.getByRole('button', { name: 'Show inspection', exact: true }).click();
  await inspector.getByText('#60', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Hide inspection', exact: true }).click();
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Mobile document must not overflow');
  await page.evaluate(() => window.scrollTo(0, 0));
  if (!offline) await page.screenshot({ path: join(artifacts, 'dashboard-replay-mobile.png'), fullPage: true });

  await page.setViewportSize({ width: 1440, height: 950 });
  await page.getByRole('navigation', { name: 'Workspace', exact: true }).getByRole('button', { name: 'Runs', exact: true }).click();
  await page.getByRole('button', { name: 'dag-baseline', exact: true }).click();
  await page.getByRole('button', { name: 'Execution timeline', exact: true }).click();
  await page.getByText('Source step position · complete monotonic timestamps unavailable', { exact: true }).waitFor();
  await timelineGeometry(page, 'Tool calls: #9007199254740993 write_file', 2, 6);
  assert.equal(await page.locator('.event-axis [data-timeline-tick="2"]').innerText(), '3', 'Integer step tick is placed at its actual ordinal');
  await page.getByRole('button', { name: 'Inspect timeline source #9007199254740993', exact: true }).click();
  await inspector.getByText('#9007199254740993', { exact: true }).waitFor();
  await inspector.locator('.source-ref > summary').waitFor();
  page.off('request', record);
  if (offline) assert.deepEqual(http, [], 'Offline Replay and Timeline must issue zero HTTP requests');
  return { replay: true, recordedPatch: true, annotations: true, playback: true, timeline: true, timelineScale: { sharedAxis: true, positionAndWidth: [1, 2, 8], integerOrdinals: true }, sourceIndex: '9007199254740993', offline, ...(offline ? { httpRequests: http.length } : {}) };
}

export async function checkDashboardCompare(page, url, artifacts) {
  await page.goto(url);
  for (const id of ['dashboard-baseline', 'dashboard-variant', 'dashboard-short']) await page.getByRole('checkbox', { name: `Select ${id}`, exact: true }).check();
  await page.getByRole('navigation', { name: 'Workspace' }).getByRole('button', { name: 'Compare', exact: true }).click();
  await page.getByRole('button', { name:'Run DAGs',exact:true }).click();
  await page.locator('.ordinal-alignment > summary').click();
  await page.getByRole('region', { name: 'Action sequence alignment' }).waitFor();
  await page.getByRole('button', { name: 'dashboard-baseline action 0, source #20', exact: true }).click();
  assert.ok(await page.locator('.alignment-row[aria-pressed="true"]').count() >= 3);
  assert.equal(await page.getByRole('group', { name: /^Process graph for dashboard-/ }).count(), 3);
  assert.ok(await page.locator('.alignment-row.is-different').count() > 0);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: join(artifacts, 'dashboard-compare.png'), fullPage: true });
}
