import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';

const settle=page=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
const ids=graph=>graph.locator('[data-node]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('data-node-id')));
const closed=graph=>graph.locator('[data-node][aria-expanded="false"]');
const node=(graph,id)=>graph.locator(`[data-node-id="${id}"]`);
const header=(graph,id)=>graph.locator(`[data-section-toggle="${id}"]`);
export async function checkReadableConnections(page,graph){
  const selected=await graph.locator('[data-node][aria-pressed="true"]').first().getAttribute('data-node-id');
  const relationships=await graph.locator('[data-edge-type="dependency"],[data-edge-type="retry"]').evaluateAll(edges=>edges.map(e=>({source:e.dataset.source,target:e.dataset.target})));
  assert.ok(relationships.every(e=>e.source===selected||e.target===selected),'Only the selected source has visible dependency/retry lines');
  const links=graph.locator('[data-continuation]');assert.ok(await links.count()>0,'Cross-row sequences use paired endpoints');
  for(const link of await links.evaluateAll(edges=>edges.map(e=>({number:e.dataset.continuation,points:e.querySelector('path').getAttribute('d'),jumps:e.querySelectorAll('[data-sequence-jump]').length})))){
    assert.equal(link.jumps,2);assert.equal((link.points.match(/M /g)||[]).length,2,'No long row-return stroke is drawn');
  }
  const candidates=await links.evaluateAll(edges=>edges.map(e=>({source:e.dataset.source,target:e.dataset.target})));
  let pair=candidates[0],multiMember=false;
  for(const candidate of candidates){
    const item=node(graph,candidate.source);
    if(await item.getAttribute('data-source-index')!==await item.getAttribute('data-last-source-index')){pair=candidate;multiMember=true;break;}
  }
  const link=graph.locator(`[data-continuation][data-source="${pair.source}"][data-target="${pair.target}"]`);
  const jump=link.locator('[data-sequence-jump="next"]'),targetSource=await node(graph,pair.target).getAttribute('data-source-index');
  const boundary=await node(graph,pair.source).getAttribute('data-last-source-index');
  const controlStyle=await jump.evaluate(e=>({opacity:getComputedStyle(e).opacity,parentOpacity:getComputedStyle(e.parentElement).opacity,color:e.querySelector('text').getAttribute('fill')}));
  assert.equal(controlStyle.opacity,'1');assert.equal(controlStyle.parentOpacity,'1');assert.equal(controlStyle.color,'#273442','Endpoint labels retain usable contrast');
  await graph.focus();await page.keyboard.press('Tab');await jump.focus();await settle(page);await jump.press('Enter');
  const inspector=page.getByRole('complementary',{name:'Step inspector',exact:true});
  await inspector.locator('.step-meta').getByText('#'+targetSource,{exact:true}).waitFor();
  assert.equal(new URLSearchParams(new URL(page.url()).hash.slice(1)).get('step'),targetSource,'Continuation jumps preserve exact source identity');
  const reverse=graph.locator(`[data-continuation][data-source="${pair.source}"] [data-sequence-jump="previous"]`).first();
  assert.equal(await reverse.getAttribute('data-jump-source'),boundary,'Reverse endpoint names the last source in the summarized interval');
  assert.match(await reverse.getAttribute('aria-label'),new RegExp('#'+boundary+'$'));
  await reverse.focus();await settle(page);await reverse.press('Enter');
  await inspector.locator('.step-meta').getByText('#'+boundary,{exact:true}).waitFor();
  assert.equal(new URLSearchParams(new URL(page.url()).hash.slice(1)).get('step'),boundary,'Reverse continuation selects its actual temporal boundary');
  await page.locator('.graph-options > summary').click();
  const all=page.getByRole('checkbox',{name:/All relationships/});await all.check();await settle(page);
  const allCount=await graph.locator('[data-edge-type="dependency"],[data-edge-type="retry"]').count();
  await all.uncheck();await page.locator('.graph-options > summary').click();await settle(page);
  const relatedCount=await graph.locator('[data-edge-type="dependency"],[data-edge-type="retry"]').count();assert.ok(allCount>=relatedCount);
  return{pairedRows:true,noRowReturnStroke:true,endpointContrast:true,keyboardContinuation:true,reverseBoundary:true,multiMemberBoundary:multiMember,exactSource:true,selectedRelationships:true,allRelationships:true};
}
async function anchor(locator,expanded=false){
  return locator.evaluate((element,open)=>{
    const body=element.querySelector(open?':scope > rect':'[data-node-body]');
    const box=body.getBBox();
    const point=new DOMPoint(box.x,box.y).matrixTransform(element.getScreenCTM());
    const svg=element.ownerSVGElement;
    return {x:point.x,y:point.y,scale:svg.clientWidth/svg.viewBox.baseVal.width};
  },expanded);
}
async function expand(page,graph,id){
  // Complete the previous clear/collapse focus restoration before moving focus.
  await settle(page);
  // Keyboard focus frames an offscreen SVG node before the pointer action.
  // A vertical frontier may extend below the canvas after a manual zoom.
  await graph.focus();await page.keyboard.press('Tab');await node(graph,id).focus();await settle(page);
  await node(graph,id).scrollIntoViewIfNeeded();await settle(page);
  const before=await anchor(node(graph,id));
  await node(graph,id).click();
  await header(graph,id).waitFor();await node(graph,id).waitFor({state:'detached'});await settle(page);
  const after=await anchor(header(graph,id),true);
  assert.ok(Math.abs(before.scale-after.scale)<.00001,'Inline expansion preserves zoom');
  assert.ok(Math.abs(before.x-after.x)<1.5&&Math.abs(before.y-after.y)<1.5,`Expanded header stays anchored to the clicked card: ${JSON.stringify({id,before,after})}`);
}

// Historical export name kept for local validation scripts. This now verifies
// an inline frontier, not replacement pages or a breadcrumb drill-down.
export async function checkExecutionReturn(page,graph,capture=async()=>{}){
  const collapseAll=page.getByRole('button',{name:'Collapse all',exact:true});
  const collapseLast=page.getByRole('button',{name:'Collapse last',exact:true});
  if(await collapseAll.isEnabled())await collapseAll.click();
  await closed(graph).first().waitFor();await settle(page);
  assert.ok(await collapseLast.isDisabled());
  const roots=await ids(graph),canvas=await graph.elementHandle();
  const sections=await closed(graph).evaluateAll(nodes=>nodes.map(n=>({id:n.getAttribute('data-node-id'),count:Number(n.getAttribute('aria-label')?.match(/ · (\d+) steps? · first source step/)?.[1]??0)})).sort((a,b)=>b.count-a.count).map(n=>n.id));
  assert.ok(sections.length>=2,'Fixture has multiple independent sections');
  await capture('inline-closed');
  await page.getByRole('button',{name:'Zoom in',exact:true}).click();
  await expand(page,graph,sections[0]);
  for(const sibling of roots.filter(id=>id!==sections[0]))assert.ok((await ids(graph)).includes(sibling),'All sibling nodes remain on the same canvas');
  assert.ok(await canvas.evaluate(element=>element.isConnected),'The same SVG stays mounted');
  await page.getByRole('button',{name:'Fit graph',exact:true}).click();await capture('inline-open');
  const childIds=(await ids(graph)).filter(id=>!roots.includes(id));
  const nested=childIds.find(id=>id.startsWith('section-'));
  if(nested){
    await expand(page,graph,nested);
    assert.equal(await header(graph,sections[0]).count(),1);
    await page.getByRole('button',{name:'Fit graph',exact:true}).click();await capture('inline-nested');
  }
  await page.getByRole('button',{name:'Fit graph',exact:true}).click();
  await expand(page,graph,sections[1]);
  assert.equal(await header(graph,sections[0]).count(),1);
  assert.equal(await header(graph,sections[1]).count(),1);
  await page.getByRole('button',{name:'Fit graph',exact:true}).click();await capture('inline-multiple');
  // Use a real header click, not the global toolbar, to close this branch.
  const beforeCollapse=await anchor(header(graph,sections[0]),true);
  const headerBox=await header(graph,sections[0]).boundingBox();
  await header(graph,sections[0]).click({position:{x:Math.min(16,headerBox.width/2),y:headerBox.height/2}});
  await node(graph,sections[0]).waitFor();await settle(page);
  const afterCollapse=await anchor(node(graph,sections[0]));
  assert.ok(Math.abs(beforeCollapse.scale-afterCollapse.scale)<.00001);
  assert.ok(Math.abs(beforeCollapse.x-afterCollapse.x)<1.5&&Math.abs(beforeCollapse.y-afterCollapse.y)<1.5);
  assert.equal(await header(graph,sections[1]).count(),1,'Closing one branch keeps the other open');
  if(nested)assert.equal(await header(graph,nested).count(),0,'Closing a parent closes its expanded descendants');
  await page.waitForFunction(id=>document.activeElement?.getAttribute('data-node-id')===id,sections[0]);
  const source=await node(graph,sections[0]).getAttribute('data-source-index');
  const search=page.getByRole('searchbox',{name:/Find a node in/});
  await search.fill('#'+source);await search.press('Enter');
  const inspector=page.getByRole('complementary',{name:'Step inspector',exact:true});
  await inspector.locator('.step-meta').getByText('#'+source,{exact:true}).waitFor();
  assert.equal(await header(graph,sections[1]).count(),1,'Source search preserves other expanded sections');
  let collapses=0;
  while(await collapseLast.isEnabled()){
    assert.ok(collapses<16,'Collapsing must terminate');
    const count=await graph.locator('[data-expanded-section]').count();
    if(collapses===0){await graph.focus();await page.keyboard.press('Alt+ArrowUp');}
    else await collapseLast.click();
    await page.waitForFunction(before=>document.querySelectorAll('.graph-frame [data-expanded-section]').length<before,count);
    await inspector.locator('.step-meta').getByText('#'+source,{exact:true}).waitFor();
    assert.equal(new URLSearchParams(new URL(page.url()).hash.slice(1)).get('step'),source,'Collapse preserves the exact inspected source URL');
    collapses++;
  }
  assert.deepEqual(await ids(graph),roots,'Closing all sections restores the root frontier');
  await capture('inline-collapsed');
  await page.getByRole('button',{name:'Fit graph',exact:true}).click();
  await expand(page,graph,sections[0]);
  await collapseAll.click();
  await page.waitForFunction(expected=>JSON.stringify(Array.from(document.querySelectorAll('.graph-frame [data-node]'),n=>n.getAttribute('data-node-id')))===JSON.stringify(expected),roots);
  assert.ok(await collapseLast.isDisabled());assert.ok(await collapseAll.isDisabled());
  assert.ok(await canvas.evaluate(element=>element.isConnected));
  return {sameCanvas:true,siblingsPreserved:true,nested:!!nested,multipleBranches:true,headerCollapse:true,zoomAndAnchorPreserved:true,exactSourcePreserved:true,searchPreservesBranches:true,keyboard:true,focusRestored:true,collapseAll:true,collapses};
}

export async function checkExecutionMap(page,url,artifacts,offline=false){
  const requests=[];const request=r=>{if(/^https?:/.test(r.url()))requests.push(r.url());};page.on('request',request);
  await page.setViewportSize({width:1586,height:912});
  await page.goto(url+'#view=graph&run=qa-render-500');
  const graph=page.getByRole('group',{name:'Process graph for qa-render-500-expanded',exact:true});
  await graph.locator('[data-node]').first().waitFor();
  const rootNodes=await graph.locator('[data-node]').count();assert.ok(rootNodes<=3);
  assert.equal(await graph.locator('[data-section-summary]').count(),rootNodes);
  for(const text of await graph.locator('[data-section-summary]').allTextContents())assert.match(text,/inspect|edit|check|execute/i);
  await page.getByText('500 / 500 source steps',{exact:true}).waitFor();
  const strip=page.locator('.execution-overview-strip');
  assert.equal(await strip.locator('button[tabindex="0"]').count(),1);
  await strip.locator('button').first().focus();await page.keyboard.press('End');
  assert.ok(await strip.locator('button').last().evaluate(n=>n===document.activeElement));
  await page.keyboard.press('Home');await page.keyboard.press('ArrowRight');
  assert.ok(await strip.locator('button').nth(1).evaluate(n=>n===document.activeElement));
  await page.keyboard.press('Tab');assert.ok(await strip.evaluate(n=>!n.contains(document.activeElement)));
  const prefix=offline?'offline-':'';
  await checkExecutionReturn(page,graph);
  const search=page.getByRole('searchbox',{name:'Find a node in qa-render-500-expanded',exact:true});
  await search.fill('src/module-0499.py');await search.press('Enter');
  const inspector=page.getByRole('complementary',{name:'Step inspector',exact:true});
  await inspector.getByText('Check synthetic module 499.',{exact:true}).waitFor();
  await graph.locator('[data-source-index="999"][aria-pressed="true"]').waitFor();
  const positions=await graph.locator('[data-node]').evaluateAll(ns=>ns.map(n=>{const m=n.transform.baseVal.consolidate().matrix;return{x:m.e,y:m.f};}));
  assert.ok(positions.every((p,i)=>!i||p.y>positions[i-1].y||(p.y===positions[i-1].y&&p.x>positions[i-1].x)));
  const [download]=await Promise.all([page.waitForEvent('download'),page.getByRole('button',{name:'Download SVG of qa-render-500-expanded',exact:true}).click()]);
  const svg=readFileSync(await download.path(),'utf8');
  for(const id of await ids(graph))assert.ok(svg.includes(`data-node-id="${id}"`),'SVG contains every current frontier node');
  assert.ok(svg.includes('data-expanded-section='),'SVG includes the opened enclosures');
  assert.ok(svg.includes('data-continuation='),'SVG retains the same paired sequence endpoints');
  const [pngDownload]=await Promise.all([page.waitForEvent('download'),page.getByRole('button',{name:'Download PNG of qa-render-500-expanded',exact:true}).click()]);
  const png=readFileSync(await pngDownload.path());assert.equal(png.subarray(1,4).toString(),'PNG');
  assert.ok(png.readUInt32BE(16)>0&&png.readUInt32BE(16)<=4096&&png.readUInt32BE(20)>0&&png.readUInt32BE(20)<=4096);
  await pngDownload.saveAs(join(artifacts,prefix+'execution-inline-export.png'));
  await page.screenshot({path:join(artifacts,prefix+'execution-map-detail.png'),fullPage:true});
  const connections=await checkReadableConnections(page,graph);
  assert.ok(connections.multiMemberBoundary,'The regression covers reverse navigation from a multi-member summary');
  await page.locator('.graph-options > summary').click();
  await page.getByRole('combobox',{name:'Filter DAG tool category',exact:true}).selectOption('edit');
  await page.getByRole('heading',{name:'No graph steps',exact:true}).waitFor();
  if(await page.locator('.graph-options').getAttribute('open')===null)await page.locator('.graph-options > summary').click();
  await page.getByRole('button',{name:'Reset step filters',exact:true}).click();await graph.locator('[data-node]').first().waitFor();
  if(await page.locator('.graph-options').getAttribute('open')===null)await page.locator('.graph-options > summary').click();
  await page.getByRole('button',{name:'Steps',exact:true}).click();
  await page.getByText(/^500 nodes ·/).waitFor();assert.ok(!await page.locator('.execution-navigation').count());

  await page.goto(url+'#view=graph&run=execution-long-synthetic');
  const synthetic=page.getByRole('group',{name:'Process graph for execution-long-synthetic-expanded',exact:true});
  await synthetic.locator('[data-node]').first().waitFor();
  const capture=async state=>{await page.mouse.move(0,0);await page.evaluate(()=>document.activeElement?.blur());await settle(page);await page.screenshot({path:join(artifacts,prefix+'execution-'+state+'.png'),fullPage:true,animations:'disabled'});};
  const inline=await checkExecutionReturn(page,synthetic,capture);
  await inspector.getByRole('button',{name:'Clear inspected step',exact:true}).click();
  const section=closed(synthetic).first(),id=await section.getAttribute('data-node-id');
  await expand(page,synthetic,id);
  const contents=inspector.locator('.execution-contents');await contents.locator('summary').click();
  await contents.getByRole('heading',{name:'Recorded examples',exact:true}).waitFor();
  await capture('inline-contents');
  const example=contents.locator('.node-result').first(),exampleIndex=(await example.locator('b').innerText()).slice(1);await example.click();
  await inspector.locator('.step-meta').getByText('#'+exampleIndex,{exact:true}).waitFor();
  assert.equal(new URLSearchParams(new URL(page.url()).hash.slice(1)).get('step'),exampleIndex);
  await page.getByRole('button',{name:'Next failure',exact:true}).click();
  await inspector.locator('.step-meta').getByText('#10000000000000040',{exact:true}).waitFor();
  await inspector.getByRole('button',{name:'Error Output',exact:true}).click();
  await inspector.getByText('FAILED test_synthetic_value: expected 2, got 1',{exact:true}).waitFor();await capture('inline-failure');
  const syntheticSearch=page.getByRole('searchbox',{name:'Find a node in execution-long-synthetic-expanded',exact:true});
  await syntheticSearch.fill('#10000000000000053');await syntheticSearch.press('Enter');
  await inspector.locator('.step-meta').getByText('#10000000000000053',{exact:true}).waitFor();
  await inspector.getByRole('button',{name:'Code Diff',exact:true}).click();await inspector.locator('.line-added code').filter({hasText:'value = 2'}).waitFor();await capture('inline-patch');
  await page.setViewportSize({width:1280,height:800});
  const smaller=await checkExecutionReturn(page,synthetic,async state=>{if(state==='inline-open'||state==='inline-multiple')await capture(state+'-1280');});
  if(offline)assert.equal(requests.length,0);page.off('request',request);
  return {sourceSteps:500,rootNodes,contentSummaries:true,recordedExampleJump:true,globalSearch:true,exactSource:true,keyboardNavigator:true,connections,inline,smaller,legacySteps:true,currentStateSvg:true,currentStatePng:true,offline,offlineHttp:offline?requests.length:undefined};
}
