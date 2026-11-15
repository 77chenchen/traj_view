import assert from 'node:assert/strict';
import { join } from 'node:path';
import { readFileSync } from 'node:fs';

const frame = page => page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
const nav = (page, name) => page.getByRole('navigation',{name:'Workspace',exact:true}).getByRole('button',{name,exact:true});
async function go(page,url,view,source='60') {
  const target=new URL(url);
  const hash=new URLSearchParams({view,run:'dashboard-baseline',step:source});
  if(view==='compare') {hash.append('compare','dashboard-short');hash.append('compare','dashboard-baseline');}
  target.hash=hash.toString();
  await page.goto(target.href);
  if(view==='graph')await page.getByRole('group',{name:'Process graph for dashboard-baseline-expanded',exact:true}).waitFor();
  else if(view==='compare')await page.locator('.alignment-panel').waitFor();
  else {
    await page.locator(view === 'timeline' ? '.event-timeline' : '.recorded-workspace').waitFor();
    if(view==='replay'&&page.viewportSize().width>1000) {
      const show=page.getByRole('button',{name:'Show inspection',exact:true});
      if(await show.isVisible())await show.click();
    }
    if(page.viewportSize().width>1000)await page.getByRole('complementary',{name:'Step inspector',exact:true}).getByText('#'+source,{exact:true}).waitFor();
  }
  await frame(page);
  assert.equal(await page.locator('main').evaluate(n=>n.scrollTop),0,'Entering a different workspace starts at its header');
}
function inspector(page) {return page.getByRole('complementary',{name:'Step inspector',exact:true});}
async function source(page,idx) {
  await page.locator('.graph-workspace,.replay-workspace,.timeline-workspace').waitFor();
  const show=page.getByRole('button',{name:'Show inspection',exact:true});if(await show.isVisible())await show.click();
  await inspector(page).getByText('#'+idx,{exact:true}).waitFor();
  assert.equal(new URLSearchParams(new URL(page.url()).hash.slice(1)).get('step'),String(idx));
}
async function noOverflow(page) {assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'No document overflow');}
async function capture(page,path) {await page.mouse.move(0,0);await page.evaluate(()=>{document.activeElement?.blur();});await frame(page);await page.screenshot({path,animations:'disabled'});}

export async function checkFourReference(page,url,artifacts,offline=false) {
  const prefix=offline?'four-offline':'four';
  const http=[],errors=[];
  const request=req=>{if(/^https?:/.test(req.url()))http.push(req.url());};
  const error=e=>errors.push(e.message);
  page.on('request',request);page.on('pageerror',error);
  await page.setViewportSize({width:1586,height:912});

  // Replay: source identity, real failure -> patch -> failed rerun -> passing validation.
  await go(page,url,'replay','50');
  await page.getByRole('button',{name:'Snapshot Recorded Text source #10',exact:true}).waitFor();
  const slider=page.getByRole('slider',{name:'Replay position',exact:true});
  const output=page.getByLabel('Current step output',{exact:true});
  assert.match(await page.getByLabel('Selected step evidence',{exact:true}).innerText(),/FAILED test_session_expiry/);
  assert.match(await page.getByLabel('Selected step evidence',{exact:true}).innerText(),/pytest.*tests\/test_session.py.*\n[\s\S]*FAILED test_session_expiry/);
  assert.equal(await slider.inputValue(),'4');
  await capture(page,join(artifacts,prefix+'-replay-failure.png'));
  await page.getByRole('button',{name:'Next edit',exact:true}).click();await source(page,60);
  assert.match(await page.locator('.recorded-workspace [aria-label="Recorded patch"]').innerText(),/3600/);
  await page.getByRole('button',{name:'Next validation',exact:true}).click();await source(page,70);assert.match(await page.getByLabel('Selected step evidence',{exact:true}).innerText(),/FAILED test_session_scope/);
  await page.getByRole('button',{name:'Next validation',exact:true}).click();await source(page,100);assert.match(await page.getByLabel('Selected step evidence',{exact:true}).innerText(),/2 passed in 0.12s/);
  await page.getByRole('button',{name:'Tests',exact:true}).click();assert.match(await output.innerText(),/2 passed/);
  await slider.fill('0');await page.getByLabel('Replay speed').selectOption('4');
  await page.getByRole('button',{name:'Play replay',exact:true}).click();
  await page.waitForFunction(()=>Number(document.querySelector('[aria-label="Replay position"]').value)>0);
  const pause=page.getByRole('button',{name:'Pause replay',exact:true});if(await pause.isVisible())await pause.click();
  await slider.fill('5');await source(page,60);
  await page.getByRole('button',{name:'Updated File',exact:true}).click();await page.getByText('No file content recorded',{exact:true}).waitFor();
  await page.getByRole('button',{name:'File Context',exact:true}).click();assert.match(await page.locator('.recorded-code').innerText(),/def issue_session/);
  await page.getByRole('button',{name:'Diff',exact:true}).click();
  await page.getByRole('region',{name:'Stage snapshots',exact:true}).getByRole('button',{name:/Snapshot Failed Test source #50/}).click();await source(page,50);
  await slider.fill('5');

  // Graph: independent layer toggles, camera, source-aware context, hierarchy and activity.
  await nav(page,'Execution graph').click();await source(page,60);
  const graph=page.getByRole('group',{name:'Process graph for dashboard-baseline-expanded',exact:true});
  const full=await graph.locator('[data-node]').count();
  await page.locator('.graph-options > summary').click();
  const reason=page.locator('.graph-layers').getByRole('checkbox',{name:'Reasoning',exact:true});
  await reason.uncheck();await frame(page);assert.ok(await graph.locator('[data-node]').count()<full);
  await reason.check();await frame(page);
  await page.getByLabel('Graph layers').selectOption('tools');await frame(page);assert.ok(await graph.locator('[data-node]').count()<full);
  await page.getByLabel('Graph layers').selectOption('all');await frame(page);
  const before=await graph.getAttribute('viewBox');await page.getByRole('button',{name:'Zoom in',exact:true}).click();assert.notEqual(await graph.getAttribute('viewBox'),before);
  await page.getByRole('button',{name:'Fit graph',exact:true}).click();
  const search=page.getByRole('searchbox',{name:'Find a node in dashboard-baseline-expanded',exact:true});
  await search.fill('#60');await search.press('Enter');await source(page,60);
  await inspector(page).getByRole('button',{name:'Code Diff',exact:true}).click();await inspector(page).getByLabel('Recorded patch',{exact:true}).waitFor();
  await inspector(page).getByRole('button',{name:'Context',exact:true}).click();await inspector(page).locator('.source-ref > summary').waitFor();
  assert.equal(await inspector(page).locator('.node-context').getAttribute('open'),'');
  await inspector(page).getByRole('button',{name:'Show',exact:true}).click();assert.match(await inspector(page).locator('.context-counts > pre').innerText(),/src\/session.py/);
  await inspector(page).locator('.context-messages > summary').click();assert.match(await inspector(page).locator('.context-messages pre').innerText(),/Update the session/);
  await inspector(page).locator('.context-relations > summary').first().click();
  const upstream=inspector(page).locator('.context-relations').first().getByRole('button').first();
  if(await upstream.count()) {await upstream.click();await search.fill('#60');await search.press('Enter');await source(page,60);}
  await inspector(page).getByRole('button',{name:'Next inspected step',exact:true}).click();await source(page,70);
  await page.locator('.graph-activity-disclosure > summary').click();
  await page.getByRole('button',{name:'Activity #60',exact:true}).click();await source(page,60);
  await page.getByRole('button',{name:'Hierarchy',exact:true}).click();
  const phase=graph.getByRole('button',{name:/phase group/}).first();await phase.waitFor();await page.getByRole('button',{name:'Fit graph',exact:true}).click();await page.locator('.graph-options > summary').click();await phase.click();await frame(page);
  assert.ok(await graph.locator('[data-node]').count()>0);
  await page.locator('.graph-options > summary').click();await page.getByRole('button',{name:'Steps',exact:true}).click();await page.locator('.graph-options > summary').click();
  await search.fill('#60');await search.press('Enter');await source(page,60);
  await page.getByRole('button',{name:'Fullscreen graph',exact:true}).click();
  await page.waitForFunction(()=>Boolean(document.fullscreenElement));
  assert.ok(await inspector(page).evaluate(el=>document.fullscreenElement.contains(el)),'Fullscreen includes Inspector');
  await search.fill('#50');await search.press('Enter');await source(page,50);
  await inspector(page).getByRole('button',{name:'Error Output',exact:true}).click();
  assert.match(await inspector(page).innerText(),/AssertionError|failed/i);
  await search.fill('#60');await search.press('Enter');await source(page,60);
  await inspector(page).getByRole('button',{name:'Code Diff',exact:true}).click();
  await inspector(page).getByLabel('Recorded patch',{exact:true}).waitFor();
  await page.getByRole('button',{name:'Exit fullscreen',exact:true}).click();
  await page.waitForFunction(()=>!document.fullscreenElement);
  await source(page,60);

  // Timeline: 1m/2m/5m and zoom resize points with the same coordinate system.
  await nav(page,'Execution timeline').click();await source(page,60);
  assert.match(await page.locator('.event-lane > strong').allTextContents().then(labels=>labels.join(' | ')),/Reasoning \(recorded text\)/);
  assert.match(await page.getByRole('button',{name:'Phase Validation Passed source #100',exact:true}).getAttribute('class'),/phase-success/);
  assert.doesNotMatch(await page.getByRole('button',{name:'Phase Completion source #120',exact:true}).getAttribute('class'),/phase-success/);
  const point=page.locator('.event-lane').nth(2).locator('.timeline-event').and(page.locator('[data-timeline-sources="50"],[data-timeline-sources^="50,"],[data-timeline-sources*=",50,"],[data-timeline-sources$=",50"]'));
  await point.waitFor();
  const width=()=>point.evaluate(n=>n.getBoundingClientRect().width);
  const fitted=await width();
  await page.getByRole('button',{name:'2 minute timeline scale',exact:true}).click();await frame(page);assert.ok(await width()<fitted);
  await page.getByRole('button',{name:'5 minute timeline scale',exact:true}).click();await frame(page);
  assert.ok(await width()<=96,'Semantic zoom caps a grouped token; its width is not an individual event duration');
  assert.ok((await point.getAttribute('data-timeline-sources')).split(',').includes('50'),'Compressed groups retain the exact selected source');
  const compressed=await page.locator('.event-lane').nth(2).locator('.timeline-event').evaluateAll(nodes=>nodes.map(node=>({sources:node.dataset.timelineSources.split(','),box:node.getBoundingClientRect().toJSON()})));
  assert.equal(new Set(compressed.flatMap(token=>token.sources)).size,compressed.flatMap(token=>token.sources).length,'Every source occurs in one tool-lane token');
  assert.ok(compressed.every((token,i)=>!i||token.box.left>=compressed[i-1].box.right-.1),'Compressed tokens do not overlap');
  await page.getByRole('button',{name:'1 minute timeline scale',exact:true}).click();await frame(page);assert.ok(await width()>fitted);
  await page.getByRole('button',{name:'Fit timeline',exact:true}).click();await frame(page);assert.ok(Math.abs(await width()-fitted)<.5);
  await page.getByRole('button',{name:'Zoom in timeline',exact:true}).click();await frame(page);assert.ok(Math.abs(await width()-Math.min(96,2*fitted))<.5);
  await page.getByRole('button',{name:'Fit timeline',exact:true}).click();
  await page.getByRole('checkbox',{name:'Events',exact:true}).uncheck();assert.equal(await page.locator('.timeline-event').count(),0);
  await page.getByRole('checkbox',{name:'Events',exact:true}).check();
  await page.getByLabel('Timeline status',{exact:true}).selectOption('failed');
  const log=page.getByRole('region',{name:'Event log',exact:true});
  assert.equal(await log.locator('tbody tr').count(),2);
  await log.getByRole('button',{name:'Inspect timeline source #50',exact:true}).click();await source(page,50);
  assert.equal(await point.getAttribute('aria-pressed'),'true');
  assert.equal(await page.getByRole('button',{name:'Snapshot Test Failure source #50',exact:true}).getAttribute('aria-pressed'),'true');
  assert.equal(await log.locator('.selected-event').count(),1);
  assert.match(await inspector(page).innerText(),/FAILED test_session_expiry/);
  await page.getByRole('searchbox',{name:'Search timeline events',exact:true}).fill('test_session_scope');
  assert.equal(await log.locator('tbody tr').count(),1);
  await page.getByRole('searchbox',{name:'Search timeline events',exact:true}).fill('');
  await page.getByLabel('Timeline status',{exact:true}).selectOption('all');

  // Compare: same-task selectors, first divergence, signature linking, patch views and three DAGs.
  await go(page,url,'compare');
  await page.getByLabel('Agent B run',{exact:true}).selectOption('dashboard-variant');
  await page.getByLabel('Agent A run',{exact:true}).selectOption('dashboard-baseline');
  for(const d of await page.locator('.agent-disclosure > summary').all())await d.click();
  await page.getByRole('button',{name:'dashboard-baseline source #60',exact:true}).click();
  assert.ok(await page.locator('.compare-step[aria-pressed="true"]').count()>=2);
  await page.locator('.divergence-callout').click();assert.ok(await page.locator('.compare-step[aria-pressed="true"]').count()>0);
  await page.getByRole('button',{name:'Patch comparison',exact:true}).click();
  await page.getByRole('group',{name:'Final patch view',exact:true}).getByRole('button',{name:'Agent A (Final)',exact:true}).click();
  await page.getByRole('region',{name:'Key code difference',exact:true}).getByText('No file content recorded',{exact:true}).waitFor();
  await page.getByRole('group',{name:'Final patch view',exact:true}).getByRole('button',{name:'Agent B (Final)',exact:true}).click();
  await page.getByRole('group',{name:'Final patch view',exact:true}).getByRole('button',{name:'Unified Diff',exact:true}).click();
  assert.equal(await page.locator('.small-chart').count(),6);
  await page.getByRole('button',{name:'Add run',exact:true}).click();
  await page.getByLabel('Agent C run',{exact:true}).waitFor();
  await page.getByRole('button',{name:'Run DAGs',exact:true}).click();
  await page.locator('.compare-graph [data-node]').first().waitFor();
  assert.equal(await page.getByRole('group',{name:/^Process graph for dashboard-/}).count(),3);
  assert.match(await page.locator('.pair-table').innerText(),/Jaccard/);

  // Search now belongs to Datasets; the product header contains only navigation.
  await page.keyboard.press('Meta+k');
  const catalogSearch=page.getByRole('searchbox',{name:'Search runs and steps',exact:true});
  await catalogSearch.fill('dashboard-baseline');
  await page.getByRole('button',{name:'dashboard-baseline',exact:true}).click();
  const showInspection=page.getByRole('button',{name:'Show inspection',exact:true});
  if(await showInspection.isVisible())await showInspection.click();
  await inspector(page).waitFor();
  assert.equal(await page.locator('.product-topbar').getByRole('button').count(),7);
  assert.equal(await page.locator('.app-sidebar,.breadcrumbs,.global-search,.avatar').count(),0);
  await page.getByRole('button',{name:'Share',exact:true}).click();
  await page.getByRole('button',{name:'Link copied',exact:true}).waitFor();
  if(!offline) {
    await page.getByLabel('Run actions',{exact:true}).click();
    const [download]=await Promise.all([page.waitForEvent('download'),page.getByRole('link',{name:'Offline HTML report',exact:true}).click()]);
    assert.equal(download.suggestedFilename(),'trajviz-report.html');
    assert.match(readFileSync(await download.path(),'utf8'),/id="trajviz-data"/);
  }
  const geometries=[];
  for(const [w,h] of [[1586,912],[1586,992],[1280,800],[390,844]])for(const view of ['compare','graph','timeline','replay']) {
    await page.setViewportSize({width:w,height:h});
    await go(page,url,view,view==='timeline'?'50':'60');
    await noOverflow(page);
    if(view==='replay') {
      const dock=await page.getByRole('region',{name:'Replay controls',exact:true}).boundingBox();
      assert.ok(dock.y>=0&&dock.y+dock.height<=h+1,'Playback reachable in the viewport');
      if(w>=1280)for(const selector of ['.event-list','.recorded-workspace','.terminal-panel']) {
        const box=await page.locator(selector).boundingBox();assert.ok(box.width>100&&box.height>40&&box.x>=0&&box.x+box.width<=w,'Desktop evidence panes remain readable across the scrolling page');
      }
      else {
        await page.getByRole('button',{name:'Show inspection',exact:true}).click();await source(page,60);
        await capture(page,join(artifacts,prefix+'-replay-mobile-inspection.png'));
        await page.getByRole('button',{name:'Hide inspection',exact:true}).click();
      }
    }
    if(view==='timeline'&&w<=1000) {
      await page.getByRole('button',{name:'Show inspection',exact:true}).click();await source(page,50);
      await capture(page,join(artifacts,prefix+'-timeline-mobile-inspection.png'));
      await page.getByRole('button',{name:'Hide inspection',exact:true}).click();
    }
    geometries.push({view,w,h,overflow:false});
    await capture(page,join(artifacts,prefix+'-'+view+'-'+w+'x'+h+'.png'));
    if(w===1586&&h===912)await page.screenshot({path:join(artifacts,prefix+'-'+view+'-full.png'),fullPage:true,animations:'disabled'});
    if(w===390&&view==='compare') {
      for(const d of await page.locator('.agent-disclosure > summary').all())await d.click();
      const row=page.getByRole('button',{name:'dashboard-baseline source #60',exact:true});
      await row.scrollIntoViewIfNeeded();await row.click();
      assert.ok(await page.locator('.compare-step[aria-pressed="true"]').count()>=2);
      await capture(page,join(artifacts,prefix+'-compare-mobile-trajectory.png'));
      await page.locator('.alignment-panel').scrollIntoViewIfNeeded();
      await capture(page,join(artifacts,prefix+'-compare-mobile-alignment.png'));
      await page.getByRole('button',{name:'All metrics',exact:true}).click();
      await page.locator('.comparison-chart-disclosure > summary').click();
      await page.locator('.comparison-charts').scrollIntoViewIfNeeded();
      assert.ok((await page.locator('.comparison-charts').boundingBox()).height>200);
      await capture(page,join(artifacts,prefix+'-compare-mobile-charts.png'));
      await noOverflow(page);
    }
    if(w===390&&view==='graph') {
      await page.getByRole('searchbox',{name:'Find a node in dashboard-baseline-expanded',exact:true}).fill('#60');
      await page.getByRole('searchbox',{name:'Find a node in dashboard-baseline-expanded',exact:true}).press('Enter');
      await inspector(page).locator('.panel-head').scrollIntoViewIfNeeded();await source(page,60);
      assert.ok((await inspector(page).boundingBox()).height>=360,'Narrow graph inspection retains an operable source panel');
      await capture(page,join(artifacts,prefix+'-graph-mobile-inspection.png'));
    }
  }
  // Missing timestamps retain all six lanes and exact source indices.
  const missing=new URL(url);missing.hash=new URLSearchParams({view:'timeline',run:'dag-baseline',step:'9007199254740993'}).toString();
  await page.setViewportSize({width:1280,height:800});await page.goto(missing.href);
  await page.getByText('Source step position · complete monotonic timestamps unavailable',{exact:true}).waitFor();
  assert.equal(await page.locator('.event-lane').count(),6);
  await inspector(page).getByText('#9007199254740993',{exact:true}).waitFor();
  assert.doesNotMatch(await page.getByRole('button',{name:'Phase Completion source #9007199254741049',exact:true}).getAttribute('class'),/phase-success/);
  assert.match(await page.getByRole('button',{name:'Phase Validation Passed source #9007199254741033',exact:true}).getAttribute('class'),/phase-success/);
  await capture(page,join(artifacts,prefix+'-missing-data.png'));

  // A source can complete without passing; generic text/failure/edit do not prove specific roles.
  const roles=new URL(url);roles.hash=new URLSearchParams({view:'replay',run:'role-boundaries',step:'31'}).toString();
  await page.goto(roles.href);await source(page,31);
  assert.equal(await page.locator('.stage-card').count(),6);
  await page.getByRole('button',{name:'Snapshot Recorded Text source #11',exact:true}).waitFor();
  await page.getByRole('button',{name:'Snapshot Tool Failure source #21',exact:true}).waitFor();
  assert.equal(await page.getByRole('button',{name:'Snapshot File Edit source #31',exact:true}).getAttribute('aria-pressed'),'true');
  assert.equal(await page.getByRole('button',{name:'Snapshot Passed Tests: unrecorded',exact:true}).isDisabled(),true);
  assert.equal(await page.locator('.stage-success').count(),0);
  await capture(page,join(artifacts,prefix+'-role-boundaries-replay.png'));
  await nav(page,'Execution timeline').click();await source(page,31);
  assert.equal(await page.locator('.stage-card').count(),5);
  await page.getByRole('button',{name:'Snapshot Tool Failure source #21',exact:true}).waitFor();
  await page.getByRole('button',{name:'Snapshot File Edit source #31',exact:true}).waitFor();
  assert.equal(await page.locator('.phase-success').count(),0);
  await page.getByRole('button',{name:'Phase Completion source #41',exact:true}).click();await source(page,41);
  await capture(page,join(artifacts,prefix+'-role-boundaries-timeline.png'));
  page.off('request',request);page.off('pageerror',error);
  assert.deepEqual(errors,[]);
  if(offline)assert.deepEqual(http,[],'Offline four-view report makes zero HTTP requests');
  return {operationChains:['replay: failure/patch/rerun/pass, seek/speed/play','graph: layers/zoom/hierarchy/context/activity/fullscreen','timeline: scales/filters/three-way selection','compare: run selection/divergence/signature/patch/three DAGs'],sourceTruth:{completionIsNeutral:true,recordedValidationIsSuccessful:true,genericRolesQualified:true,noPatchEditQualified:true},geometries,sourceIndex:'9007199254740993',httpRequests:offline?http.length:undefined,pageErrors:errors};
}
