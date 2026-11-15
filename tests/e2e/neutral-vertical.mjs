import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
const settle=page=>page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));

export async function checkNeutralVertical(page,url,artifacts,offline=false){
  const captures=[],geometry=[],errors=[],requests=[],prefix=offline?'offline-':'';
  const onError=e=>errors.push(e.message),onRequest=r=>{if(/^https?:/.test(r.url()))requests.push(r.url());};
  page.on('pageerror',onError);page.on('request',onRequest);
  const capture=async name=>{await page.mouse.move(0,0);await page.evaluate(()=>document.activeElement?.blur());await settle(page);const file=prefix+'vertical-'+name+'.png';await page.screenshot({path:join(artifacts,file),fullPage:true,animations:'disabled'});captures.push(file);};
  const inspector=page.getByRole('complementary',{name:'Step inspector',exact:true});
  for(const [width,height] of [[1586,912],[1280,800]]){
    await page.setViewportSize({width,height});
    await page.goto(url+'#view=graph&run=execution-long-synthetic');
    await page.reload(); // Fresh closed state at each viewport; same-document hash navigation retains UI state.
    const graph=page.getByRole('group',{name:'Process graph for execution-long-synthetic-expanded',exact:true});
    await graph.locator('[data-node]').first().waitFor();
    assert.equal(await graph.locator('[aria-pressed="true"]').count(),0);
    assert.equal(await graph.locator('[data-expanded-section]').count(),0);
    assert.equal(await page.locator('.product-topbar').getByRole('button').count(),7,'Only the mark and six functional tabs remain');
    assert.equal(await page.locator('.app-sidebar,.breadcrumbs,.global-search,.avatar,.help-popover').count(),0);
    assert.equal(await page.locator('.product-topbar').getByRole('textbox').count(),0);
    const frame=page.locator('.graph-frame'),style=await frame.evaluate(e=>({bg:getComputedStyle(e).backgroundColor,image:getComputedStyle(e).backgroundImage}));
    assert.deepEqual(style,{bg:'rgb(255, 255, 255)',image:'none'});
    const initialBox=await frame.boundingBox();assert.ok(initialBox.x<=40&&initialBox.width>width*.65&&initialBox.height>=260&&initialBox.y+initialBox.height<=height,'The canvas dominates a single-screen workspace with its inspection and activity controls');
    const firstBox=await graph.locator('[data-node]').first().boundingBox();assert.ok(firstBox.height>=90,'Long traces start at readable scale');
    await capture('before-'+width);
    const section=graph.locator('[data-node][aria-expanded="false"]').nth(1),id=await section.getAttribute('data-node-id'),canvas=await graph.elementHandle();
    await section.click();await graph.locator(`[data-section-toggle="${id}"]`).waitFor();await settle(page);
    assert.ok(await canvas.evaluate(e=>e.isConnected));
    await capture('expanded-'+width);
    const before=await graph.getAttribute('viewBox'),b=await frame.boundingBox();
    await page.mouse.move(b.x+b.width*.58,b.y+b.height*.55);await page.mouse.wheel(0,290);await settle(page);
    const after=await graph.getAttribute('viewBox'),a=before.split(' ').map(Number),z=after.split(' ').map(Number);
    assert.ok(z[1]>a[1]+50,'An ordinary wheel scrolls vertically through the source');assert.equal(z[2],a[2],'Ordinary wheel movement preserves scale');
    await page.keyboard.down('Control');await page.mouse.wheel(0,-60);await page.keyboard.up('Control');await settle(page);
    assert.ok(Number((await graph.getAttribute('viewBox')).split(' ')[2])<z[2],'Control+wheel zooms');
    const order=await graph.locator('[data-node]').evaluateAll(ns=>ns.map(n=>({id:n.dataset.nodeId,x:n.transform.baseVal.consolidate().matrix.e,y:n.transform.baseVal.consolidate().matrix.f})));
    assert.ok(order.every((n,i)=>i===0||n.y>order[i-1].y||(n.y===order[i-1].y&&n.x>order[i-1].x)),'The frontier preserves source reading order: right, then down');
    const search=page.getByRole('searchbox',{name:/Find a node in/});
    await search.fill('#10000000000000040');await search.press('Enter');await inspector.locator('.step-meta').getByText('#10000000000000040',{exact:true}).waitFor();
    await inspector.getByRole('button',{name:'Error Output',exact:true}).click();assert.match(await inspector.innerText(),/FAILED test_synthetic_value/);await capture('failure-'+width);
    await search.fill('#10000000000000053');await search.press('Enter');await inspector.locator('.step-meta').getByText('#10000000000000053',{exact:true}).waitFor();
    await inspector.getByRole('button',{name:'Code Diff',exact:true}).click();await inspector.getByLabel('Recorded patch',{exact:true}).waitFor();await capture('patch-'+width);
    const route=new URLSearchParams(new URL(page.url()).hash.slice(1));assert.equal(route.get('step'),'10000000000000053');
    await page.getByRole('button',{name:'Fullscreen graph',exact:true}).click();await page.waitForFunction(()=>document.fullscreenElement?.classList.contains('graph-workspace'));
    assert.ok(await inspector.evaluate(e=>document.fullscreenElement.contains(e)));
    const ib=await inspector.boundingBox();assert.ok(ib.width>=290&&ib.x+ib.width<=width+1&&ib.y+ib.height<=height+1);
    await capture('fullscreen-'+width);
    await page.getByRole('button',{name:'Exit fullscreen',exact:true}).click();await page.waitForFunction(()=>!document.fullscreenElement);
    assert.equal(await inspector.getByRole('button',{name:'Code Diff',exact:true}).getAttribute('aria-pressed'),'true');
    const [svg]=await Promise.all([page.waitForEvent('download'),page.getByRole('button',{name:'Download SVG of execution-long-synthetic-expanded',exact:true}).click()]);
    const text=readFileSync(await svg.path(),'utf8');assert.ok(text.includes('fill="#ffffff"'));assert.ok(text.includes('data-expanded-section='));
    for(const n of await graph.locator('[data-node]').evaluateAll(ns=>ns.map(n=>n.dataset.nodeId)))assert.ok(text.includes(`data-node-id="${n}"`));
    if(width===1586)await svg.saveAs(join(artifacts,prefix+'vertical-current-state.svg'));
    await page.getByRole('button',{name:'Collapse last',exact:true}).click();await inspector.locator('.step-meta').getByText('#10000000000000053',{exact:true}).waitFor();
    geometry.push({width,height,canvas:initialBox,sourceOrder:'left-to-right-then-down',ordinaryWheel:true,modifierWheelZoom:true,inlineExpansion:true,fullscreenDetails:true,exactSource:true,whiteSvg:true});
  }
  assert.deepEqual(errors,[]);if(offline)assert.equal(requests.length,0);
  page.off('pageerror',onError);page.off('request',onRequest);
  return {geometry,captures,offlineHttp:offline?requests.length:undefined,pageErrors:errors};
}
