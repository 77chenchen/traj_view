import assert from 'node:assert/strict';
import {join} from 'node:path';

// Exercise the actual visited path, including a leaf whose search-generated
// range could differ from the range reached by clicking contiguous sections.
export async function checkExecutionReturn(page,graph,capture=async()=>{}){
  const path=page.getByRole('navigation',{name:'Execution map path',exact:true});
  const back=page.getByRole('button',{name:'Back one level',exact:true});
  await path.getByRole('button',{name:'Run overview',exact:true}).click();
  await graph.getByRole('button',{name:/source section/}).first().waitFor();
  assert.ok(await back.isDisabled());
  const levels=[];
  while(await graph.getByRole('button',{name:/source section/}).count()){
    assert.ok(levels.length<8,'Drill-down must terminate');
    levels.push({nodes:await graph.locator('[data-node]').evaluateAll(ns=>ns.map(n=>n.getAttribute('data-node-id'))),path:await path.locator('button').allTextContents()});
    const section=graph.getByRole('button',{name:/source section/}).first(),id=await section.getAttribute('data-node-id');
    await section.click();await graph.locator(`[data-node-id="${id}"]`).waitFor({state:'detached'});
  }
  const leafPath=await path.locator('button').allTextContents();
  const leaf=graph.locator('[data-node]').last(),source=await leaf.getAttribute('data-source-index');
  await leaf.click();
  const inspector=page.getByRole('complementary',{name:'Step inspector',exact:true});
  await inspector.locator('.step-meta').getByText('#'+source,{exact:true}).waitFor();
  assert.deepEqual(await path.locator('button').allTextContents(),leafPath,'Selecting a visible leaf preserves the visited path');
  await capture('return-leaf');
  let keyboard=false;
  for(let i=levels.length-1;i>=0;i--){
    if(i===levels.length-2){await graph.focus();await page.keyboard.press('Alt+ArrowUp');keyboard=true;}
    else await back.click();
    await page.waitForFunction(expected=>JSON.stringify(Array.from(document.querySelectorAll('.graph-frame [data-node-id]'),n=>n.getAttribute('data-node-id')))===JSON.stringify(expected),levels[i].nodes);
    assert.deepEqual(await path.locator('button').allTextContents(),levels[i].path,'Return restores exactly the previous level');
    await inspector.locator('.step-meta').getByText('#'+source,{exact:true}).waitFor();
    assert.equal(new URLSearchParams(new URL(page.url()).hash.slice(1)).get('step'),source,'Return preserves the exact source deep link');
    await page.waitForFunction(root=>document.activeElement?.classList.contains(root?'execution-root':'execution-back'),i===0);
    if(i===levels.length-1)await capture('return-parent');
  }
  assert.ok(await back.isDisabled());
  await capture('return-overview');
  // The named ancestor remains an independent route out of a deep range.
  for(let i=0;i<2;i++){const section=graph.getByRole('button',{name:/source section/}).first(),id=await section.getAttribute('data-node-id');await section.click();await graph.locator(`[data-node-id="${id}"]`).waitFor({state:'detached'});}
  await path.getByRole('button',{name:'Run overview',exact:true}).click();
  await page.waitForFunction(expected=>JSON.stringify(Array.from(document.querySelectorAll('.graph-frame [data-node-id]'),n=>n.getAttribute('data-node-id')))===JSON.stringify(expected),levels[0].nodes);
  assert.ok(await back.isDisabled());
  return {levels:levels.length,leafPathPreserved:true,exactParentRestored:true,sourcePreserved:true,keyboard,focusRestored:true,ancestorJump:true};
}

export async function checkExecutionMap(page,url,artifacts,offline=false){
  const requests=[];const request=r=>{if(/^https?:/.test(r.url()))requests.push(r.url());};page.on('request',request);
  await page.setViewportSize({width:1586,height:912});
  await page.goto(url+'#view=graph&run=qa-render-500');
  const graph=page.getByRole('group',{name:'Process graph for qa-render-500-expanded',exact:true});
  await graph.locator('[data-node]').first().waitFor();
  assert.equal(await graph.locator('[data-node]').count(),4);
  await page.getByText('500 / 500 source steps',{exact:true}).waitFor();
  const strip=page.locator('.execution-overview-strip');
  assert.equal(await strip.locator('button[tabindex="0"]').count(),1);
  await strip.locator('button').first().focus();await page.keyboard.press('End');
  assert.ok(await strip.locator('button').last().evaluate(n=>n===document.activeElement));
  await page.keyboard.press('Home');await page.keyboard.press('ArrowRight');
  assert.ok(await strip.locator('button').nth(1).evaluate(n=>n===document.activeElement));
  await page.keyboard.press('Tab');
  assert.ok(await strip.evaluate(n=>!n.contains(document.activeElement)));
  const prefix=offline?'offline-':'';
  await page.screenshot({path:join(artifacts,prefix+'execution-map-overview.png'),fullPage:true});
  await checkExecutionReturn(page,graph);
  for(let i=0;i<4&&await graph.getByRole('button',{name:/source section/}).count();i++){
    const before=await page.locator('.execution-breadcrumbs button').count();
    const section=graph.getByRole('button',{name:/source section/}).first(),id=await section.getAttribute('data-node-id');
    await section.click();
    await page.waitForFunction(n=>document.querySelectorAll('.execution-breadcrumbs button').length>n,before);
    await page.waitForFunction(()=>document.querySelectorAll('.graph-frame [data-node]').length<=4);
    await page.waitForFunction(id=>!Array.from(document.querySelectorAll('.graph-frame [data-node-id]')).some(n=>n.getAttribute('data-node-id')===id),id);
  }
  assert.equal(await graph.getByRole('button',{name:/source section/}).count(),0);
  assert.ok(await graph.locator('[data-node]').count()<=4);
  const search=page.getByRole('searchbox',{name:'Find a node in qa-render-500-expanded',exact:true});
  await search.fill('src/module-0499.py');await search.press('Enter');
  const inspector=page.getByRole('complementary',{name:'Step inspector',exact:true});
  await inspector.getByText('Check synthetic module 499.',{exact:true}).waitFor();
  await page.waitForFunction(()=>document.querySelector('.graph-frame [data-source-index="999"][aria-pressed="true"]'));
  const positions=await graph.locator('[data-node]').evaluateAll(ns=>ns.map(n=>n.transform.baseVal.consolidate().matrix.e));
  assert.ok(positions.every((x,i)=>!i||x>positions[i-1]));
  const [download]=await Promise.all([page.waitForEvent('download'),page.getByRole('button',{name:'Download SVG of qa-render-500-expanded',exact:true}).click()]);
  assert.ok(await download.path());
  await page.screenshot({path:join(artifacts,prefix+'execution-map-detail.png'),fullPage:true});
  await page.locator('.graph-options > summary').click();
  await page.getByRole('combobox',{name:'Filter DAG tool category',exact:true}).selectOption('edit');
  await page.getByRole('heading',{name:'No graph steps',exact:true}).waitFor();
  if(await page.locator('.graph-options').getAttribute('open')===null)await page.locator('.graph-options > summary').click();
  await page.getByRole('button',{name:'Reset step filters',exact:true}).click();
  await graph.locator('[data-node]').first().waitFor();
  if(await page.locator('.graph-options').getAttribute('open')===null)await page.locator('.graph-options > summary').click();
  await page.getByRole('button',{name:'Steps',exact:true}).click();
  await page.getByText(/^500 nodes ·/).waitFor();
  assert.ok(!await page.locator('.execution-navigation').count(),'Legacy complete step DAG is still available');

  // Public evidence covers saved patches, failures, retries, dependencies and
  // exact nonconsecutive indices without timestamps, not just a read-only chain.
  await page.goto(url+'#view=graph&run=execution-long-synthetic');
  const synthetic=page.getByRole('group',{name:'Process graph for execution-long-synthetic-expanded',exact:true});
  await synthetic.locator('[data-node]').first().waitFor();
  assert.equal(await synthetic.locator('[data-node]').count(),4);
  await page.mouse.move(0,0);await page.evaluate(()=>document.activeElement?.blur());
  await page.screenshot({path:join(artifacts,prefix+'execution-synthetic-overview.png'),fullPage:true,animations:'disabled'});
  await page.getByRole('button',{name:'Next failure',exact:true}).click();
  await inspector.locator('.step-meta').getByText('#10000000000000040',{exact:true}).waitFor();
  await inspector.getByRole('button',{name:'Error Output',exact:true}).click();
  await inspector.getByText('FAILED test_synthetic_value: expected 2, got 1',{exact:true}).waitFor();
  await page.screenshot({path:join(artifacts,prefix+'execution-synthetic-failure.png'),fullPage:true,animations:'disabled'});
  const syntheticSearch=page.getByRole('searchbox',{name:'Find a node in execution-long-synthetic-expanded',exact:true});
  await syntheticSearch.fill('#10000000000000053');await syntheticSearch.press('Enter');
  await inspector.locator('.step-meta').getByText('#10000000000000053',{exact:true}).waitFor();
  await inspector.getByRole('button',{name:'Code Diff',exact:true}).click();
  await inspector.locator('.line-added code').filter({hasText:'value = 2'}).waitFor();
  await page.mouse.move(0,0);await page.evaluate(()=>document.activeElement?.blur());
  await page.screenshot({path:join(artifacts,prefix+'execution-synthetic-patch.png'),fullPage:true,animations:'disabled'});
  const returnNavigation=await checkExecutionReturn(page,synthetic,async state=>{
    await page.mouse.move(0,0);await page.evaluate(()=>document.activeElement?.blur());
    await page.screenshot({path:join(artifacts,prefix+'execution-'+state+'.png'),fullPage:true,animations:'disabled'});
  });
  if(offline)assert.equal(requests.length,0);
  page.off('request',request);
  return {sourceSteps:500,rootNodes:4,maximumLevelNodes:4,globalSearch:true,exactSource:true,keyboardNavigator:true,returnNavigation,legacySteps:true,offline,offlineHttp:offline?requests.length:undefined};
}
