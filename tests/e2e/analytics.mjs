import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';

const settle=page=>page.evaluate(async()=>{await document.fonts.ready;await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));});
const scope=page=>page.getByRole('search',{name:'Analytics scope',exact:true});
const search=page=>scope(page).getByRole('searchbox',{name:'Find runs',exact:true});
const inspect=page=>page.getByRole('complementary',{name:'Step inspector',exact:true});
const number=new Intl.NumberFormat('en-US',{maximumFractionDigits:2});
const percent=new Intl.NumberFormat('en-US',{style:'percent',maximumFractionDigits:1});
async function capture(page,artifacts,name){
  await page.mouse.move(0,0);await settle(page);
  const buffer=await page.screenshot({path:join(artifacts,name+'.png'),fullPage:true,animations:'disabled'});
  assert.equal(buffer.readUInt32BE(16),page.viewportSize().width);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'No document-level horizontal overflow');
}

export async function checkAnalytics(page,url,index,artifacts,offline=false){
  const errors=[],http=[],prefix=offline?'offline-':'';
  const onError=error=>errors.push(error.message),onRequest=request=>{if(/^https?:/.test(request.url()))http.push(request.url());};
  page.on('pageerror',onError);page.on('request',onRequest);
  await page.setViewportSize({width:1586,height:912});
  await page.goto(url+'#view=sankey');
  await page.getByRole('heading',{name:'Analytics',exact:true}).waitFor();
  const stat=name=>page.locator(`[data-stat="${name}"]`).evaluate(e=>e.firstChild.textContent);
  const stats=runs=>{
    const lengths=runs.map(r=>r.metrics.steps).sort((a,b)=>a-b),passed=runs.filter(r=>r.outcome.passed===true).length,recorded=runs.filter(r=>r.outcome.passed!=null).length;
    return{count:number.format(runs.length),median:number.format((lengths[Math.floor((lengths.length-1)/2)]+lengths[Math.floor(lengths.length/2)])/2),pass:recorded?percent.format(passed/recorded):'Unrecorded',repeats:number.format(runs.reduce((sum,r)=>sum+r.metrics.repeated_actions,0))};
  };
  const expected=stats(index.runs);
  assert.equal(await stat('runs'),expected.count);assert.equal(await stat('median-steps'),expected.median);assert.equal(await stat('pass-rate'),expected.pass);assert.equal(await stat('repeats'),expected.repeats);
  await capture(page,artifacts,prefix+'analytics-1586');
  await page.setViewportSize({width:1280,height:800});await capture(page,artifacts,prefix+'analytics-1280');
  await page.setViewportSize({width:1586,height:912});
  await scope(page).getByRole('combobox',{name:'Outcome status',exact:true}).selectOption('unrecorded');
  const unrecorded=index.runs.filter(r=>r.outcome.passed==null);
  assert.equal(await stat('runs'),number.format(unrecorded.length));assert.equal(await stat('pass-rate'),'Unrecorded');
  await scope(page).getByRole('combobox',{name:'Outcome status',exact:true}).selectOption('failed');
  const failed=index.runs.filter(r=>r.outcome.passed===false);
  if(failed.length){assert.equal(await stat('pass-rate'),'0%');assert.equal(await stat('runs'),number.format(failed.length));}
  await scope(page).getByRole('combobox',{name:'Outcome status',exact:true}).selectOption('all');
  await scope(page).getByRole('combobox',{name:'Group by',exact:true}).selectOption('condition');
  const groupCount=new Set(index.runs.map(r=>r.condition)).size;
  if(groupCount>6){const before=await page.locator('.analytics-group-table tbody tr').first().getAttribute('data-group');await page.getByRole('button',{name:'Next group page',exact:true}).click();assert.notEqual(await page.locator('.analytics-group-table tbody tr').first().getAttribute('data-group'),before);await page.getByRole('button',{name:'Previous group page',exact:true}).click();}
  await scope(page).getByRole('combobox',{name:'Group by',exact:true}).selectOption('outcome');
  assert.equal(await page.locator('.analytics-group-table tbody tr').count(),Math.min(6,new Set(index.runs.map(r=>r.outcome.label)).size));
  await scope(page).getByRole('combobox',{name:'Group by',exact:true}).selectOption('model');
  const sample=index.runs.find(r=>r.id==='dashboard-baseline')??index.runs[0];
  await search(page).fill(sample.id);
  const searched=index.runs.filter(r=>[r.id,r.task_id,r.model,r.condition,r.agent].join('\n').toLowerCase().includes(sample.id.toLowerCase()));
  assert.equal(await stat('runs'),number.format(searched.length));
  const [csv]=await Promise.all([page.waitForEvent('download'),page.getByRole('button',{name:'Export CSV',exact:true}).click()]);
  const csvText=readFileSync(await csv.path(),'utf8');assert.equal(csvText.split('\r\n').filter(Boolean).length,searched.length+1);for(const run of searched)assert.ok(csvText.includes('"'+run.id+'"'));
  await search(page).fill('no-matching-public-trajectory-analytics');await page.getByRole('heading',{name:'No matching runs',exact:true}).waitFor();assert.ok(await page.getByRole('button',{name:'Export CSV',exact:true}).isDisabled());
  await page.getByRole('button',{name:'Clear filters',exact:true}).last().click();
  // Keyboard group selection updates both the review pane and phase selector.
  const model='orion-mini',select=page.getByRole('button',{name:`Select ${model} group`,exact:true});
  await select.focus();await page.keyboard.press('Enter');assert.equal(await select.getAttribute('aria-pressed'),'true');
  assert.equal(await page.locator('.analytics-review h3').innerText(),model);
  assert.equal(await page.getByRole('combobox',{name:'Group',exact:true}).inputValue(),model);
  const modelRuns=index.runs.filter(r=>r.model===model),withErrors=modelRuns.filter(r=>r.metrics.error_rate>0);
  await page.getByRole('button',{name:`Review ${withErrors.length} runs with errors in ${model}`,exact:true}).click();
  assert.equal(await page.locator('.analytics-records').getAttribute('open'),'');
  assert.equal(await page.getByRole('combobox',{name:'Review signal',exact:true}).inputValue(),'errors');
  await page.waitForFunction(()=>document.querySelector('.analytics-records > summary')===document.activeElement);
  assert.deepEqual(await page.locator('.analytics-runs-table tbody tr').evaluateAll(rows=>rows.map(r=>r.dataset.runId)),withErrors.slice(0,6).map(r=>r.id));
  await page.evaluate(()=>scrollTo(0,0));await capture(page,artifacts,prefix+'analytics-error-records');
  await page.getByRole('combobox',{name:'Review signal',exact:true}).selectOption('limit');
  if(!modelRuns.some(r=>r.metrics.max_steps_hit)){await page.getByRole('heading',{name:'No runs match this signal',exact:true}).waitFor();await page.getByRole('button',{name:'Show all group runs',exact:true}).click();}
  const open=withErrors[0];assert.ok(open);await page.getByRole('combobox',{name:'Review signal',exact:true}).selectOption('errors');
  await page.getByRole('button',{name:`Open ${open.id} graph`,exact:true}).click();await page.locator('.graph-frame [data-node]').first().waitFor();assert.equal(new URLSearchParams(new URL(page.url()).hash.slice(1)).get('run'),open.id);
  await page.getByRole('navigation',{name:'Workspace',exact:true}).getByRole('button',{name:'Sankey',exact:true}).click();
  await page.getByRole('heading',{name:'Analytics',exact:true}).waitFor();
  const zero=index.runs.find(r=>r.metrics.steps===0);
  if(zero){await search(page).fill(zero.id);assert.equal(await stat('median-steps'),'0');await page.getByRole('heading',{name:'No phase transitions',exact:true}).waitFor();await search(page).fill('');}
  await page.setViewportSize({width:390,height:844});await capture(page,artifacts,prefix+'analytics-390');
  assert.deepEqual(errors,[]);if(offline)assert.deepEqual(http,[]);
  page.off('pageerror',onError);page.off('request',onRequest);
  return{summaryRecomputed:true,unknownVersusZero:true,groupingAndPagination:true,keyboard:true,scopeCSV:true,signalDrillIn:true,runGraph:true,emptyFilter:true,zeroStep:!!zero,desktopSizes:[1586,1280],compatibilityWidth:390,offline,httpRequests:offline?http.length:undefined,pageErrors:errors.length};
}

export async function checkCollapseAll(page,url,artifacts,offline=false){
  const errors=[],http=[],prefix=offline?'offline-':'';
  const onError=error=>errors.push(error.message),onRequest=request=>{if(/^https?:/.test(request.url()))http.push(request.url());};
  page.on('pageerror',onError);page.on('request',onRequest);
  const source='10000000000000053';
  for(const [width,height] of [[1586,912],[1280,800]]){
    await page.setViewportSize({width,height});await page.goto(url+'#view=graph&run=execution-long-synthetic');await page.reload();
    const graph=page.locator('.graph-frame > svg'),collapse=page.getByRole('button',{name:'Collapse all',exact:true});
    await graph.locator('[data-node]').first().waitFor();
    const root=await graph.locator('[data-node]').evaluateAll(nodes=>nodes.map(n=>n.dataset.nodeId));
    assert.ok(await collapse.isDisabled());assert.equal(await collapse.evaluate(e=>!!e.closest('.graph-toolbar')),true);
    const find=page.getByRole('searchbox',{name:/Find a node in/});
    await find.fill('#'+source);await find.press('Enter');await inspect(page).locator('.step-meta').getByText('#'+source,{exact:true}).waitFor();
    await inspect(page).getByRole('button',{name:'Code Diff',exact:true}).click();await inspect(page).getByLabel('Recorded patch',{exact:true}).waitFor();
    const patch=await inspect(page).getByLabel('Recorded patch',{exact:true}).innerText();
    assert.ok(await collapse.isEnabled());
    await page.getByRole('button',{name:'Fullscreen graph',exact:true}).click();await page.waitForFunction(()=>!!document.fullscreenElement);
    await capture(page,artifacts,prefix+'collapse-expanded-'+width);
    const canvas=await graph.elementHandle();
    await collapse.click();await page.waitForFunction(()=>document.querySelectorAll('.graph-frame [data-expanded-section]').length===0);
    assert.deepEqual(await graph.locator('[data-node]').evaluateAll(nodes=>nodes.map(n=>n.dataset.nodeId)),root);
    assert.ok(await canvas.evaluate(e=>e.isConnected));assert.ok(await collapse.isDisabled());
    assert.equal(new URLSearchParams(new URL(page.url()).hash.slice(1)).get('step'),source);
    assert.equal(await inspect(page).getByRole('button',{name:'Code Diff',exact:true}).getAttribute('aria-pressed'),'true');
    assert.equal(await inspect(page).getByLabel('Recorded patch',{exact:true}).innerText(),patch);
    assert.equal(await inspect(page).locator('.member-control').count(),0,'Canvas grouping does not displace the selected call evidence');
    const patchBounds=await inspect(page).getByLabel('Recorded patch',{exact:true}).boundingBox(),inspectorBounds=await inspect(page).boundingBox();
    assert.ok(patchBounds.y<inspectorBounds.y+inspectorBounds.height,'The pinned patch starts within the visible Inspector');
    await inspect(page).locator('.step-meta').getByText('#'+source,{exact:true}).waitFor();
    const controls=await page.locator('.graph-toolbar').evaluate(toolbar=>{const frame=toolbar.getBoundingClientRect();return [...toolbar.children].filter(e=>e.getBoundingClientRect().width>0).every(e=>{const b=e.getBoundingClientRect();return b.left>=frame.left-1&&b.right<=frame.right+1;});});assert.ok(controls,'Collapse, filters, search and exports fit in the toolbar');
    await capture(page,artifacts,prefix+'collapse-restored-'+width);
    await page.getByRole('button',{name:'Exit fullscreen',exact:true}).click();
    await page.locator('.graph-options > summary').click();await page.getByRole('button',{name:'Steps',exact:true}).click();
    if(await page.locator('.graph-options').getAttribute('open')!==null)await page.locator('.graph-options > summary').click();
    assert.ok(await collapse.isEnabled());await collapse.click();await page.locator('.execution-navigation').waitFor();assert.equal(await graph.locator('[data-expanded-section]').count(),0);
    await page.locator('.graph-options > summary').click();await page.getByRole('button',{name:'Hierarchy',exact:true}).click();
    if(await page.locator('.graph-options').getAttribute('open')!==null)await page.locator('.graph-options > summary').click();
    assert.ok(await collapse.isEnabled());await collapse.click();await page.locator('.execution-navigation').waitFor();assert.ok(await collapse.isDisabled());
  }
  // Short runs also have a discoverable one-click route out of Steps mode.
  await page.goto(url+'#view=graph&run=dag-baseline');await page.reload();await page.locator('.graph-frame [data-node]').first().waitFor();
  const collapse=page.getByRole('button',{name:'Collapse all',exact:true});assert.ok(await collapse.isEnabled());await collapse.click();await page.locator('.execution-navigation').waitFor();assert.ok(await collapse.isDisabled());
  assert.deepEqual(errors,[]);if(offline)assert.deepEqual(http,[]);page.off('pageerror',onError);page.off('request',onRequest);
  return{toolbarAlwaysVisible:true,ordinaryAndFullscreen:true,desktopSizes:[1586,1280],overviewRestored:true,stepsAndHierarchy:true,shortRun:true,source,exactSourceAndPatchPreserved:true,sameSVG:true,offline,httpRequests:offline?http.length:undefined,pageErrors:errors.length};
}
