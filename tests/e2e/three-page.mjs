import assert from 'node:assert/strict';
import {join} from 'node:path';
import {readFileSync} from 'node:fs';

const frame=p=>p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
const inspector=p=>p.getByRole('complementary',{name:'Step inspector',exact:true});
const mode=(p,n)=>p.getByRole('group',{name:'Comparison workspace',exact:true}).getByRole('button',{name:n,exact:true});
async function open(p,url,view,step,run='dashboard-baseline'){
  const u=new URL(url),q=new URLSearchParams({view,run});if(step!=null)q.set('step',String(step));
  if(view==='compare'){q.append('compare','dashboard-baseline');q.append('compare','dashboard-variant');}
  u.hash=q.toString();await p.goto(u.href);
  await p.locator({graph:'.graph-frame',compare:'.reference-alignment',replay:'.recorded-workspace'}[view]).waitFor();
  if(view==='graph')await p.locator('[data-node]').first().waitFor();await frame(p);
}
async function node(p,idx){const f=p.getByRole('searchbox',{name:'Find a node in dashboard-baseline-expanded',exact:true});await f.fill('#'+idx);await f.press('Enter');await inspector(p).getByText('#'+idx,{exact:true}).waitFor();}
async function source(p,idx){assert.equal(new URLSearchParams(new URL(p.url()).hash.slice(1)).get('step'),String(idx));await inspector(p).getByText('#'+idx,{exact:true}).waitFor();}
async function visible(p,locator){const b=await locator.boundingBox();assert.ok(b&&b.width>0&&b.y>=0&&b.y+b.height<=p.viewportSize().height+1,'Critical control is reachable in the viewport');}

export async function checkThreePage(page,url,artifacts,offline=false){
  const requests=[],errors=[],captures=[],geometry=[],prefix=offline?'offline-':'';
  const onRequest=r=>{if(/^https?:/.test(r.url()))requests.push(r.url());};const onError=e=>errors.push(e.message);
  page.on('request',onRequest);page.on('pageerror',onError);
  const capture=async(name,{top=true,preserveFocus=false}={})=>{
    if(top)await page.evaluate(()=>{document.querySelector('main').scrollTo({top:0,left:0});window.scrollTo(0,0);});
    await page.mouse.move(0,0);if(!preserveFocus)await page.evaluate(()=>document.activeElement?.blur());await frame(page);
    const path=join(artifacts,prefix+name+'.png');
    // The supplementary DAG grid scrolls inside main; capture that viewport.
    // All six base before/after pairs remain independent full-page captures.
    const fullPage=name!=='compare-dags';
    const png=await page.screenshot({path,fullPage,animations:'disabled'});
    const record=await page.evaluate(()=>({width:innerWidth,height:innerHeight,documentWidth:document.documentElement.scrollWidth,documentHeight:document.documentElement.scrollHeight,scroll:scrollY,theme:document.documentElement.dataset.theme,step:new URLSearchParams(location.hash.slice(1)).get('step')}));
    const imageWidth=png.readUInt32BE(16),imageHeight=png.readUInt32BE(20);
    assert.equal(record.documentWidth,record.width);assert.equal(imageWidth,record.width);assert.equal(imageHeight,fullPage?Math.max(record.height,record.documentHeight):record.height,'Capture matches the actual document rather than a one-screen layout');
    captures.push({name:prefix+name+'.png',...record,imageWidth,imageHeight,fullPage});
  };
  for(const [width,height] of [[1586,912],[1280,800]]){
    await page.setViewportSize({width,height});const suffix=width===1586?'':'-1280';
    // A real unselected canvas; selecting a patch changes only source evidence.
    await open(page,url,'graph');assert.equal(await inspector(page).locator('.step-meta').count(),0);
    assert.equal(await page.locator('.graph-options').getAttribute('open'),null);
    assert.equal(await page.locator('.graph-activity-disclosure').getAttribute('open'),null);
    const canvas=await page.locator('.graph-frame').boundingBox();assert.ok(canvas.height>=400);geometry.push({view:'graph',width,canvas});
    await capture('graph-before'+suffix);await node(page,60);
    await inspector(page).getByRole('button',{name:'Code Diff',exact:true}).click();await inspector(page).getByLabel('Recorded patch',{exact:true}).waitFor();
    if(width===1280)await inspector(page).getByLabel('Recorded patch',{exact:true}).evaluate(n=>{const pane=n.closest('.graph-side-content');pane.scrollTop+=n.getBoundingClientRect().top-pane.getBoundingClientRect().top-200;});
    assert.equal(await page.getByRole('button',{name:'Snapshot Code Patch source #60',exact:true}).getAttribute('data-active-stage'),'true');
    await capture('graph-after'+suffix);

    await open(page,url,'compare');assert.equal(await page.getByRole('complementary',{name:'Step comparison',exact:true}).count(),0);
    assert.equal(await page.locator('.comparison-quick-metrics > div').count(),3);
    assert.equal(await page.locator('.metric-comparison').isVisible(),false);await capture('compare-before'+suffix);
    await page.locator('.divergence-callout').click();await inspector(page).locator('.step-meta').first().waitFor();
    assert.ok(await page.locator('.align-pair [data-selected="true"]').count()>0);
    assert.ok(await page.locator('.align-pair[data-first-divergence="true"]').count()>0);
    await capture('compare-after'+suffix);
    await page.getByRole('button',{name:'Close Step comparison',exact:true}).click();
    await frame(page);
    assert.equal(await page.locator('.divergence-callout').evaluate(n=>document.activeElement===n),true,'Closing returns focus to the divergence trigger');
    assert.ok(await page.locator('.align-pair [data-selected="true"]').count()>0,'Closing details retains selection');

    await open(page,url,'replay');assert.equal(await page.locator('.replay-inspection').isVisible(),false);
    assert.equal(await page.getByRole('button',{name:'Play replay',exact:true}).isEnabled(),true);
    await visible(page,page.getByRole('region',{name:'Replay controls',exact:true}));await capture('replay-before'+suffix);
    await page.getByRole('button',{name:/^Source step #60:/}).click();await page.getByRole('button',{name:'Show inspection',exact:true}).click();await source(page,60);
    await page.locator('.recorded-workspace [aria-label="Recorded patch"]').waitFor();
    const code=await page.locator('.recorded-workspace').boundingBox(),list=await page.locator('.event-list').boundingBox();
    assert.ok(code.width>list.width*1.7);geometry.push({view:'replay',width,code,list});
    await visible(page,page.getByRole('region',{name:'Replay controls',exact:true}));await capture('replay-after'+suffix);
    await page.getByRole('button',{name:'Close Step details',exact:true}).click();
    await frame(page);
    assert.equal(await page.getByRole('button',{name:'Show inspection',exact:true}).evaluate(n=>document.activeElement===n),true);
    assert.equal(await page.getByRole('slider',{name:'Replay position',exact:true}).inputValue(),'5');
  }
  await page.setViewportSize({width:1586,height:912});
  // Graph disclosures and the complete stage -> layers -> node -> error -> activity chain.
  await open(page,url,'graph');await page.getByRole('button',{name:'Show stage previews',exact:true}).click();await capture('graph-stages');
  await page.getByRole('button',{name:'Snapshot Failed Test source #50',exact:true}).click();await source(page,50);
  await page.getByRole('button',{name:'Hide stage previews',exact:true}).click();
  await page.locator('.graph-options > summary').click();await capture('graph-layers');
  const graph=page.getByRole('group',{name:'Process graph for dashboard-baseline-expanded',exact:true});const count=await graph.locator('[data-node]').count();
  await page.locator('.graph-layers').getByLabel('Reasoning',{exact:true}).uncheck();await frame(page);assert.ok(await graph.locator('[data-node]').count()<count);
  await page.getByLabel('Graph layers',{exact:true}).selectOption('all');await page.locator('.graph-options > summary').click();
  await page.getByRole('button',{name:'Legend',exact:true}).click();await capture('graph-legend');await page.getByRole('button',{name:'Legend',exact:true}).click();
  const camera=await graph.getAttribute('viewBox');await page.getByRole('button',{name:'Zoom in',exact:true}).click();assert.notEqual(await graph.getAttribute('viewBox'),camera);await page.getByRole('button',{name:'Fit graph',exact:true}).click();
  await node(page,50);await inspector(page).getByRole('button',{name:'Error Output',exact:true}).click();assert.match(await inspector(page).innerText(),/FAILED test_session_expiry/);await capture('graph-error');
  await node(page,60);await inspector(page).getByRole('button',{name:'Context',exact:true}).click();
  await inspector(page).getByRole('button',{name:'Show',exact:true}).click();await inspector(page).locator('.context-relations > summary').first().click();await inspector(page).locator('.context-messages > summary').click();await capture('graph-context');
  await page.locator('.graph-activity-disclosure > summary').click();await page.getByLabel('Activity grouping',{exact:true}).selectOption('category');await capture('graph-activity');
  await page.getByRole('button',{name:'Activity #50',exact:true}).click();await source(page,50);await page.getByLabel('Activity grouping',{exact:true}).selectOption('agent');
  await page.locator('.graph-activity-disclosure > summary').click();
  await page.getByRole('group',{name:'Graph side panel',exact:true}).getByRole('button',{name:'Signatures',exact:true}).click();await page.locator('.signature-summary > details > summary').click();await capture('graph-signatures');
  await page.getByRole('group',{name:'Graph side panel',exact:true}).getByRole('button',{name:'Files & activity',exact:true}).click();await page.getByRole('button',{name:'Load recorded activity',exact:true}).click();await page.getByLabel('Find recorded file path',{exact:true}).fill('session.py');await page.locator('.file-results details').filter({hasText:'src/session.py'}).locator('summary').click();await capture('graph-files');
  await page.getByRole('button',{name:'Locate src/session.py at source step 60',exact:true}).click();await source(page,60);
  await page.getByRole('group',{name:'Graph workspace view',exact:true}).getByRole('button',{name:'Timeline',exact:true}).click();await page.locator('.event-timeline').waitFor();await capture('graph-timeline');
  await page.getByRole('group',{name:'Graph workspace view',exact:true}).getByRole('button',{name:'Graph',exact:true}).click();await graph.waitFor();await source(page,60);
  await page.getByRole('button',{name:'Graph',exact:true}).waitFor();
  for(const format of ['SVG','PNG']){
    const [download]=await Promise.all([page.waitForEvent('download'),page.getByRole('button',{name:'Download '+format+' of dashboard-baseline-expanded',exact:true}).click()]);
    const value=readFileSync(await download.path());assert.ok(value.length>1000);
    if(format==='SVG'){assert.match(value.toString(),/marker-end/);assert.match(value.toString(),/session/);}
    else assert.equal(value.subarray(1,4).toString(),'PNG');
  }
  // Compare: named agent details and snapshot previews; final and selected patches are distinct.
  await open(page,url,'compare');await page.getByLabel('Agent B run',{exact:true}).selectOption('dashboard-short');await page.getByLabel('Agent B run',{exact:true}).selectOption('dashboard-variant');
  await page.getByRole('button',{name:'dashboard-baseline aligned source #60',exact:true}).click();assert.ok(await page.locator('.align-pair [data-matched="true"]').count()>=2);await capture('compare-matches');await inspector(page).getByRole('button',{name:'Code Diff',exact:true}).click();
  await inspector(page).getByLabel('Recorded patch',{exact:true}).evaluate(n=>{const pane=n.closest('.compare-inspection');pane.scrollTop+=n.getBoundingClientRect().top-pane.getBoundingClientRect().top-200;});
  await capture('compare-selected-patch');await page.getByRole('button',{name:'Close Step comparison',exact:true}).click();
  for(const [i,letter] of [[0,'a'],[1,'b']]){
    const d=page.locator('.agent-disclosure').nth(i);await d.locator(':scope > summary').click();await d.scrollIntoViewIfNeeded();await capture('compare-agent-'+letter,{top:false});
    await d.locator('.agent-stage-details > summary').click();await d.locator('.agent-stage-details').scrollIntoViewIfNeeded();await capture('compare-snapshots-'+letter,{top:false});
    await d.locator('.stage-card:not(:disabled)').nth(2).click();assert.equal(await mode(page,'Alignment').getAttribute('aria-pressed'),'true');
    await page.getByRole('button',{name:'Close Step comparison',exact:true}).click();await d.locator(':scope > summary').click();
  }
  await page.locator('.comparison-analysis > summary').click();await page.locator('.comparison-analysis').scrollIntoViewIfNeeded();await capture('compare-findings',{top:false});
  await mode(page,'Patch comparison').click();await capture('compare-patch');
  for(const letter of ['A','B']){await page.getByRole('group',{name:'Final patch view',exact:true}).getByRole('button',{name:'Agent '+letter+' (Final)',exact:true}).click();assert.match(await page.locator('.final-patch').innerText(),/No file content recorded/);await capture('compare-final-'+letter.toLowerCase());}
  await mode(page,'All metrics').click();assert.equal(await page.locator('.metric-comparison tbody tr').count(),6);assert.match(await page.locator('.metric-comparison').innerText(),/未记录/);await capture('compare-metrics');
  await page.locator('.comparison-chart-disclosure > summary').click();await page.locator('.comparison-chart-disclosure').scrollIntoViewIfNeeded();assert.equal(await page.locator('.small-chart:visible').count(),6);await capture('compare-charts',{top:false});
  await page.getByRole('button',{name:'Add run',exact:true}).click();await mode(page,'Run DAGs').click();await page.locator('.compare-graph [data-node]').first().waitFor();assert.equal(await page.locator('.compare-graph').count(),3);await capture('compare-dags');
  // Replay: failure -> edit -> still-failed validation -> passing validation; all evidence tabs and transport.
  await open(page,url,'replay','50');assert.match(await page.getByLabel('Selected step evidence',{exact:true}).innerText(),/FAILED test_session_expiry/);await capture('replay-failure');
  await page.getByRole('button',{name:'Show stage previews',exact:true}).click();await capture('replay-stages');await page.getByRole('button',{name:'Hide stage previews',exact:true}).click();
  await page.getByRole('button',{name:'Next edit',exact:true}).click();await page.getByRole('button',{name:'Updated File',exact:true}).click();assert.match(await page.locator('.recorded-code').innerText(),/No file content recorded/);await capture('replay-file');
  await page.getByRole('button',{name:'Show inspection',exact:true}).click();await inspector(page).locator('.source-ref > summary').click();await inspector(page).locator('.source-ref').scrollIntoViewIfNeeded();await capture('replay-details');await page.getByRole('button',{name:'Close Step details',exact:true}).click();
  await page.getByRole('button',{name:'File Context',exact:true}).click();assert.match(await page.locator('.recorded-code').innerText(),/def issue_session/);await capture('replay-context');
  await page.getByRole('button',{name:'Diff',exact:true}).click();await page.getByRole('button',{name:'Next validation',exact:true}).click();
  assert.equal(await page.getByRole('button',{name:'Diff',exact:true}).getAttribute('aria-pressed'),'true');assert.match(await page.locator('.recorded-code').innerText(),/No patch recorded/);
  await page.getByRole('button',{name:'Output',exact:true}).click();assert.match(await page.getByLabel('Selected step evidence',{exact:true}).innerText(),/FAILED test_session_scope/);
  await page.getByRole('button',{name:'Next validation',exact:true}).click();assert.match(await page.getByLabel('Selected step evidence',{exact:true}).innerText(),/2 passed/);await page.getByRole('button',{name:'Tests',exact:true}).click();await capture('replay-validation');
  const seek=page.getByRole('slider',{name:'Replay position',exact:true});await seek.fill('4');assert.match(await page.getByLabel('Selected step evidence',{exact:true}).innerText(),/FAILED/);
  await page.getByLabel('Replay speed',{exact:true}).selectOption('0.5');await seek.fill('0');await page.getByRole('button',{name:'Play replay',exact:true}).click();await page.waitForTimeout(950);assert.equal(await seek.inputValue(),'0');await page.getByRole('button',{name:'Pause replay',exact:true}).click();
  await page.getByLabel('Replay speed',{exact:true}).selectOption('4');await page.getByRole('button',{name:'Play replay',exact:true}).click();await page.waitForFunction(()=>Number(document.querySelector('[aria-label="Replay position"]').value)>0);await page.getByRole('button',{name:'Pause replay',exact:true}).click();await capture('replay-playback');
  await seek.fill('10');await page.getByRole('button',{name:'Play replay',exact:true}).click();await page.getByRole('button',{name:'Play replay',exact:true}).waitFor();assert.equal(await seek.inputValue(),'11','Playback stops at the last source');
  // Compact top navigation; search and appearance live in the local catalog.
  await page.keyboard.press('Meta+k');
  const catalogSearch=page.getByRole('searchbox',{name:'Search runs and steps',exact:true});
  assert.equal(await catalogSearch.evaluate(n=>document.activeElement===n),true);
  await catalogSearch.fill('dashboard-baseline');await capture('shared-search',{preserveFocus:true});
  await page.locator('.dataset-utilities > summary').click();await capture('shared-status');
  await page.getByRole('button',{name:'Dark theme',exact:true}).click();assert.equal(await page.locator('html').getAttribute('data-theme'),'dark');await capture('shared-dark');
  await page.getByRole('button',{name:'Light theme',exact:true}).click();
  await page.getByRole('navigation',{name:'Workspace'}).getByRole('button',{name:'Trajectory replay',exact:true}).click();
  assert.equal(await page.locator('.product-topbar').getByRole('button').count(),7);
  assert.equal(await page.locator('.app-sidebar,.breadcrumbs,.global-search,.avatar').count(),0);
  await page.locator('.run-recording > summary').click();await capture('shared-run-details');await page.keyboard.press('Escape');
  await page.getByRole('button',{name:'Share',exact:true}).click();await page.getByRole('button',{name:'Link copied',exact:true}).waitFor();
  await page.getByLabel('Run actions',{exact:true}).click();await capture('shared-actions');
  const [csv]=await Promise.all([page.waitForEvent('download'),page.getByRole('button',{name:'Export CSV',exact:true}).click()]);assert.match(readFileSync(await csv.path(),'utf8'),/dashboard-baseline/);
  // Missing records retain their entrances and precise source identity.
  await open(page,url,'replay','31','role-boundaries');await page.getByRole('button',{name:'Diff',exact:true}).click();assert.match(await page.locator('.recorded-code').innerText(),/No patch recorded/);await page.getByRole('button',{name:'Show inspection',exact:true}).click();await source(page,31);await capture('missing-patch');
  await open(page,url,'replay','9007199254740993','dag-baseline');await page.getByRole('button',{name:'Show inspection',exact:true}).click();await source(page,'9007199254740993');assert.match(await inspector(page).innerText(),/Unrecorded/);await capture('missing-time');
  page.off('request',onRequest);page.off('pageerror',onError);assert.deepEqual(errors,[]);if(offline)assert.deepEqual(requests,[]);
  return {captures,geometry,sourceIdentity:true,threeOperationChains:true,exportFormats:['PNG','SVG','CSV'],errors,httpRequests:offline?requests.length:undefined,offline};
}
