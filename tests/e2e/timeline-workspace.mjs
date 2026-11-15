import assert from 'node:assert/strict';
import {join} from 'node:path';
const frame=page=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
const inspector=page=>page.getByRole('complementary',{name:'Step inspector',exact:true});
const source=page=>new URLSearchParams(new URL(page.url()).hash.slice(1)).get('step');

async function checkGeometry(timeline){
  await timeline.evaluate(root=>{if(!document.fullscreenElement)root.scrollIntoView({block:'start'});});
  const result=await timeline.evaluate(root=>{
    const scroll=root.querySelector('.event-timeline-scroll'),viewport=scroll.getBoundingClientRect();
    const labels=Array.from(root.querySelectorAll('.event-lane > strong,.stage-axis > strong,.event-axis > span'));
    const covered=labels.every(label=>{
      const b=label.getBoundingClientRect();
      return [.12,.5,.88].every(fraction=>{
        const hit=document.elementFromPoint(Math.max(viewport.left+15,b.left+10),b.top+b.height*fraction);
        return hit===label||label.contains(hit);
      });
    });
    const overlaps=Array.from(root.querySelectorAll('.event-lane')).flatMap(lane=>{
      const points=Array.from(lane.querySelectorAll('.timeline-event')).map(e=>e.getBoundingClientRect());
      return points.slice(1).map((b,i)=>Math.max(0,points[i].right-b.left));
    });
    return{labelsCovered:covered,overlaps,scrollLeft:scroll.scrollLeft,labelX:labels.map(e=>e.getBoundingClientRect().left)};
  });
  assert.ok(result.labelsCovered,'Opaque full-height labels stay above event blocks and stage bands');
  assert.ok(result.overlaps.every(value=>value<.1),'Event tokens never pile up within a lane');
  return result;
}

export async function checkTimelineWorkspace(page,url,artifacts,offline=false){
  const errors=[],http=[],captures=[];
  const onError=e=>errors.push(e.message),onRequest=r=>{if(/^https?:/.test(r.url()))http.push(r.url());};
  page.on('pageerror',onError);page.on('request',onRequest);
  const take=async name=>{await page.mouse.move(0,0);await page.screenshot({path:join(artifacts,(offline?'offline-':'')+name+'.png'),fullPage:true,animations:'disabled'});captures.push(name+'.png');};
  for(const view of ['graph','timeline'])for(const [width,height] of [[1586,912],[1280,800]]){
    await page.setViewportSize({width,height});
    await page.goto(url+`#view=${view}&run=execution-long-synthetic&step=10000000000000001`);
    if(view==='graph')await page.getByRole('group',{name:'Graph workspace view',exact:true}).getByRole('button',{name:'Timeline',exact:true}).click();
    const timeline=page.getByRole('region',{name:'Execution timeline',exact:true}),scroll=timeline.locator('.event-timeline-scroll');
    await timeline.locator('.timeline-event').first().waitFor();await frame(page);
    assert.ok(await timeline.locator('.event-cluster').count()>0,'Fit compresses dense source points into discoverable groups');
    const lane=timeline.locator('.event-lane').nth(2),cluster=lane.locator('.event-cluster').first();
    const members=(await cluster.getAttribute('data-timeline-sources')).split(',');await cluster.click();
    const picker=page.getByRole('complementary',{name:'Timeline event group',exact:true});
    assert.equal(await picker.locator('.node-result').count(),members.length);
    assert.ok(await picker.locator('.node-result').first().evaluate(n=>n===document.activeElement),'Opening a group places keyboard focus on its source choices');
    await picker.locator('.node-result').last().click();assert.equal(source(page),members.at(-1));
    assert.equal(await picker.count(),0);await frame(page);await checkGeometry(timeline);
    if(width===1586)await take('timeline-'+view+'-compact');
    for(let i=0;i<2;i++)await timeline.getByRole('button',{name:'Zoom in timeline',exact:true}).click();
    await frame(page);
    assert.ok(await timeline.locator('[data-token-mode="icon"]').count()>0,'Intermediate zoom uses compact icons');
    await timeline.getByRole('button',{name:'Zoom in timeline',exact:true}).click();
    await frame(page);
    await scroll.evaluate(n=>{n.scrollLeft=Math.min(550,(n.scrollWidth-n.clientWidth)*.4);});await frame(page);
    const first=await checkGeometry(timeline);
    await scroll.evaluate(n=>{n.scrollLeft+=150;});await frame(page);
    const second=await checkGeometry(timeline);assert.ok(second.labelX.every((x,i)=>Math.abs(x-first.labelX[i])<.6),'Lane labels stay fixed while the plot scrolls');
    await take('timeline-'+view+'-scrolled'+(width===1280?'-1280':''));
    const pinned=source(page);
    if(view==='timeline')await inspector(page).getByRole('button',{name:'Close Event details',exact:true}).click();
    await timeline.getByRole('button',{name:'Fullscreen timeline',exact:true}).click();
    await page.waitForFunction(()=>Boolean(document.fullscreenElement));await frame(page);
    assert.ok(await inspector(page).isVisible());
    assert.ok(await inspector(page).evaluate(n=>document.fullscreenElement.contains(n)),'Timeline fullscreen contains its linked Inspector');
    assert.equal(source(page),pinned);
    const visibleSelection=await timeline.evaluate(root=>{
      const point=root.querySelector('.timeline-event[aria-pressed="true"]')?.getBoundingClientRect(),viewport=root.querySelector('.event-timeline-scroll').getBoundingClientRect();
      return point&&point.left>=viewport.left+156-1&&point.right<=viewport.right-19;
    });assert.ok(visibleSelection,'Entering fullscreen brings the selected event into the visible plot instead of retaining an off-center scroll');
    await timeline.getByRole('button',{name:'Fit timeline',exact:true}).click();await frame(page);await checkGeometry(timeline);
    const bounds=await timeline.boundingBox();assert.ok(bounds.x<20&&bounds.y<120&&bounds.width>width*.55,'Fullscreen timeline begins at the workspace origin and uses the primary width');
    // Select a source from a visible group inside fullscreen and inspect it there.
    const group=timeline.locator('.event-lane').nth(2).locator('.event-cluster').first();
    await group.click();const item=page.getByRole('complementary',{name:'Timeline event group',exact:true}).locator('.node-result').last();
    const selected=(await item.locator('strong').innerText()).replace('#','');await item.click();await inspector(page).getByText('#'+selected,{exact:true}).waitFor();
    await take('timeline-'+view+'-fullscreen'+(width===1280?'-1280':''));
    if(view==='timeline'){
      await inspector(page).getByRole('button',{name:'Close Event details',exact:true}).click();
      await page.getByRole('button',{name:'Event details',exact:true}).click();await inspector(page).getByText('#'+selected,{exact:true}).waitFor();
    }
    await (view==='graph' ? page.getByRole('button',{name:'Exit fullscreen',exact:true}) : timeline.getByRole('button',{name:'Exit fullscreen timeline',exact:true})).click();await page.waitForFunction(()=>!document.fullscreenElement);assert.equal(source(page),selected);
  }
  assert.deepEqual(errors,[]);if(offline)assert.equal(http.length,0);
  page.off('pageerror',onError);page.off('request',onRequest);
  return{viewports:[1586,1280],surfaces:['Graph Timeline','Execution Timeline'],labelsOpaqueAndFixed:true,noTokenOverlap:true,semanticZoom:true,exactGroupMemberSelection:true,fullscreenInspector:true,sourcePreserved:true,captures,offlineHttp:offline?0:undefined,pageErrors:errors};
}
