import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';

const settle=p=>p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
const inspector=p=>p.getByRole('complementary',{name:'Step inspector',exact:true});
const search=p=>p.getByRole('searchbox',{name:/Find a node in/});
async function locate(p,idx){await search(p).fill('#'+idx);await search(p).press('Enter');await inspector(p).locator('.step-meta').getByText('#'+idx,{exact:true}).waitFor();await settle(p);}
async function withinViewport(page,locator){
  const b=await locator.boundingBox(),v=page.viewportSize();
  assert.ok(b&&b.width>100&&b.height>100&&b.x>=0&&b.y>=0&&b.x+b.width<=v.width+1&&b.y+b.height<=v.height+1,'Fullscreen keeps evidence readable inside the viewport');
}

export async function checkNodeAppearance(page,url,artifacts,offline=false){
  const errors=[],http=[],captures=[],geometry=[],prefix=offline?'offline-':'';
  const onError=e=>errors.push(e.message),onRequest=r=>{if(/^https?:/.test(r.url()))http.push(r.url());};
  page.on('pageerror',onError);page.on('request',onRequest);
  const capture=async name=>{
    await page.mouse.move(0,0);await page.evaluate(()=>document.activeElement?.blur());await settle(page);
    const file=prefix+'appearance-'+name+'.png',buffer=await page.screenshot({path:join(artifacts,file),fullPage:true,animations:'disabled'}),v=page.viewportSize();
    assert.equal(buffer.readUInt32BE(16),v.width);assert.equal(buffer.readUInt32BE(20),await page.evaluate(()=>Math.max(innerHeight,document.documentElement.scrollHeight)));
    captures.push({file,...v});
  };
  for(const [width,height] of [[1586,912],[1280,800]]){
    const suffix=width===1586?'':'-1280';await page.setViewportSize({width,height});
    await page.goto(url+'#view=graph&run=node-types-synthetic');
    const graph=page.getByRole('group',{name:'Process graph for node-types-synthetic-expanded',exact:true});
    await graph.locator('[data-node-body]').first().waitFor();
    const shapes=await graph.locator('[data-node]').evaluateAll(nodes=>nodes.map(node=>{
      const body=node.querySelector('[data-node-body]'),box=body.getBBox();
      return {kind:node.dataset.nodeKind,path:body.getAttribute('d'),width:box.width,height:box.height};
    }));
    assert.deepEqual([...new Set(shapes.map(s=>s.kind))].sort(),['edit','message','plan','read','shell','tool','validate']);
    assert.equal(new Set(shapes.map(s=>s.path)).size,7,'The entire silhouette changes for every source category');
    for(const s of shapes){assert.equal(s.width,164);assert.equal(s.height,48);}
    await page.getByRole('button',{name:'Legend',exact:true}).click();
    assert.equal(await page.getByLabel('Node silhouettes',{exact:true}).locator('svg').count(),8);
    assert.ok(await page.getByLabel('Node silhouettes',{exact:true}).locator('svg').evaluateAll(svgs=>svgs.every(svg=>{const b=svg.getBBox(),v=svg.viewBox.baseVal;return b.x>=v.x&&b.y>=v.y&&b.x+b.width<=v.x+v.width&&b.y+b.height<=v.y+v.height;})),'Legend silhouettes fit their own viewport');
    await locate(page,50);await capture('types'+suffix);
    await page.getByRole('button',{name:'Legend',exact:true}).click();
    await page.getByRole('button',{name:'Fullscreen graph',exact:true}).click();
    await page.waitForFunction(()=>document.fullscreenElement?.classList.contains('graph-workspace'));
    assert.ok(await inspector(page).evaluate(el=>document.fullscreenElement.contains(el)));
    await withinViewport(page,inspector(page));
    await inspector(page).getByRole('button',{name:'Error Output',exact:true}).click();
    assert.match(await inspector(page).innerText(),/AssertionError: assert 1 == 2/);
    await capture('fullscreen-failure'+suffix);
    // Select the actual SVG node in fullscreen, rather than inspecting through a hidden pane.
    await graph.locator('[data-source-index="60"]').click();
    await inspector(page).locator('.step-meta').getByText('#60',{exact:true}).waitFor();
    await inspector(page).getByRole('button',{name:'Code Diff',exact:true}).click();
    const patch=inspector(page).getByLabel('Recorded patch',{exact:true});await patch.waitFor();
    assert.match(await patch.innerText(),/return 2/);await withinViewport(page,inspector(page));
    assert.equal(new URLSearchParams(new URL(page.url()).hash.slice(1)).get('step'),'60');
    await capture('fullscreen-patch'+suffix);
    await inspector(page).getByRole('button',{name:'View Full Diff',exact:true}).click();
    await page.waitForFunction(()=>document.fullscreenElement?.matches('.step-content > details'));
    assert.ok(await patch.evaluate(el=>document.fullscreenElement.contains(el)));
    await page.getByRole('button',{name:'View Full Diff',exact:true}).click();
    // Browsers may fully exit nested fullscreen. Re-enter through the graph control when needed.
    if(!await page.evaluate(()=>Boolean(document.fullscreenElement)))await page.getByRole('button',{name:'Fullscreen graph',exact:true}).click();
    await page.waitForFunction(()=>document.fullscreenElement?.classList.contains('graph-workspace'));
    await inspector(page).getByRole('button',{name:'Next inspected step',exact:true}).click();
    await inspector(page).locator('.step-meta').getByText('#70',{exact:true}).waitFor();
    await inspector(page).getByRole('button',{name:'Error Output',exact:true}).click();
    assert.match(await inspector(page).innerText(),/1 passed \(synthetic output\)/);
    await inspector(page).getByRole('button',{name:'Previous inspected step',exact:true}).click();
    await inspector(page).locator('.step-meta').getByText('#60',{exact:true}).waitFor();
    await page.getByRole('button',{name:'Exit fullscreen graph',exact:true}).click();
    await page.waitForFunction(()=>!document.fullscreenElement);
    await inspector(page).locator('.step-meta').getByText('#60',{exact:true}).waitFor();
    await page.getByRole('button',{name:'Locate selected graph node',exact:true}).click();
    const [download]=await Promise.all([page.waitForEvent('download'),page.getByRole('button',{name:'Download SVG of node-types-synthetic-expanded',exact:true}).click()]);
    const svg=readFileSync(await download.path(),'utf8');assert.ok(svg.includes('fill="#ffffff"'));
    for(const s of shapes)assert.ok(svg.includes(`d="${s.path}"`),'Export preserves the same silhouette');
    assert.ok(svg.includes('stroke="#3d596b"'));
    if(width===1586)await download.saveAs(join(artifacts,prefix+'appearance-types.svg'));
    geometry.push({width,height,sourceKinds:7,distinctSilhouettes:7,fullscreenInspector:true,sourcePreserved:true,nestedPatchFullscreen:true});
  }
  await page.setViewportSize({width:1586,height:912});
  await page.goto(url+'#view=graph&run=execution-long-synthetic');
  await page.locator('[data-node-kind="group"]').first().waitFor();await capture('merged-sections');
  await page.getByRole('button',{name:'Fullscreen graph',exact:true}).click();
  await page.waitForFunction(()=>document.fullscreenElement?.classList.contains('graph-workspace'));
  const first=page.locator('[data-node-kind="group"]').first(),id=await first.getAttribute('data-node-id');await first.click();
  await page.locator(`[data-section-toggle="${id}"]`).waitFor();
  await page.getByRole('button',{name:'Collapse last',exact:true}).click();await page.locator(`[data-node-id="${id}"]`).waitFor();
  await page.getByRole('button',{name:'Exit fullscreen',exact:true}).click();await page.waitForFunction(()=>!document.fullscreenElement);
  await page.goto(url+'#view=graph&run=slug-empty');await page.locator('[data-node-body]').first().waitFor();
  await locate(page,0);await capture('missing-data');
  const absent=await inspector(page).innerText();assert.match(absent,/Unrecorded/);
  // Shared appearance remains coherent in the two evidence workspaces and dark theme.
  for(const view of ['replay','compare']){
    const q=new URLSearchParams({view,run:'dashboard-baseline',step:'60'});
    if(view==='compare'){q.append('compare','dashboard-baseline');q.append('compare','dashboard-variant');}
    await page.goto(url+'#'+q.toString());await page.locator(view==='replay'?'.recorded-workspace':'.reference-alignment').waitFor();await capture(view);
  }
  await page.getByRole('group',{name:'Comparison workspace',exact:true}).getByRole('button',{name:'Run DAGs',exact:true}).click();
  const compared=page.locator('.compare-graph').first();await compared.locator('[data-node]').first().waitFor();
  await compared.getByRole('button',{name:'Fullscreen graph',exact:true}).click();
  await page.waitForFunction(()=>document.fullscreenElement?.classList.contains('compare-focus-workspace'));
  await compared.getByRole('searchbox',{name:/Find a node in/}).fill('#60');await compared.getByRole('searchbox',{name:/Find a node in/}).press('Enter');await settle(page);
  await compared.locator('[data-source-index="60"]').click();
  const comparison=page.getByRole('complementary',{name:'Step comparison',exact:true});
  assert.ok(await comparison.evaluate(el=>document.fullscreenElement.contains(el)));
  await capture('compare-fullscreen');
  await compared.getByRole('button',{name:'Exit fullscreen graph',exact:true}).click();await page.waitForFunction(()=>!document.fullscreenElement);
  await page.goto(url+'#view=graph&run=node-types-synthetic&step=60');await page.locator('[data-node-body]').first().waitFor();
  await page.getByRole('navigation',{name:'Workspace'}).getByRole('button',{name:'Runs',exact:true}).click();
  await page.locator('.dataset-utilities > summary').click();
  await page.getByRole('button',{name:'Dark theme',exact:true}).click();
  await page.getByRole('navigation',{name:'Workspace'}).getByRole('button',{name:'Execution graph',exact:true}).click();await page.locator('[data-node-body]').first().waitFor();await capture('dark');
  assert.equal(await page.locator('.graph-frame').evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(255, 255, 255)');
  await page.getByRole('navigation',{name:'Workspace'}).getByRole('button',{name:'Runs',exact:true}).click();await page.getByRole('button',{name:'Light theme',exact:true}).click();
  assert.deepEqual(errors,[]);if(offline)assert.equal(http.length,0);
  page.off('pageerror',onError);page.off('request',onRequest);
  return {geometry,captures,sourceSelection:'failure → recorded patch → later validation',sharedTheme:true,mergedInlineFullscreen:true,missingData:true,currentStateSvg:true,httpRequests:offline?http.length:undefined,pageErrors:errors};
}
