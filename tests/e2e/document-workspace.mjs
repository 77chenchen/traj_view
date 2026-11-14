import assert from 'node:assert/strict';
import {join} from 'node:path';
const settle=page=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));

// Graph and Timeline are single-screen investigation tools. The other pages
// scroll as documents; their navigation leaves the viewport in normal flow.
export async function checkDocumentWorkspace(page,url,artifacts,offline=false){
  const errors=[],http=[],captures=[],geometry=[],prefix=offline?'offline-':'';
  const onError=e=>errors.push(e.message),onRequest=r=>{if(/^https?:/.test(r.url()))http.push(r.url());};
  page.on('pageerror',onError);page.on('request',onRequest);
  const take=async(name,fullPage=true)=>{
    await page.mouse.move(0,0);await settle(page);
    const file=prefix+'document-'+name+'.png';
    const buffer=await page.screenshot({path:join(artifacts,file),fullPage,animations:'disabled'});
    const dimensions=await page.evaluate(()=>({width:innerWidth,height:Math.max(innerHeight,document.documentElement.scrollHeight)}));
    assert.equal(buffer.readUInt32BE(16),dimensions.width);
    assert.equal(buffer.readUInt32BE(20),fullPage?dimensions.height:page.viewportSize().height);
    captures.push(file);
  };
  for(const [width,height] of [[1586,912],[1280,800]])for(const view of ['graph','replay','timeline','compare','sankey','runs']){
    await page.setViewportSize({width,height});
    const q=new URLSearchParams({view,run:view==='graph'?'execution-long-synthetic':'dashboard-baseline'});
    if(view==='compare'){q.append('compare','dashboard-baseline');q.append('compare','dashboard-variant');}
    await page.goto(url+'#'+q);await page.reload();
    await page.getByRole('heading',{level:1}).waitFor();
    const target={graph:'[data-node]',replay:'.recorded-workspace',timeline:'.event-lane',compare:'.align-pair',sankey:'.sankey-svg',runs:'.runs-table tbody tr'}[view];
    await page.locator(target).first().waitFor();await settle(page);
    const dimensions=await page.evaluate(()=>({width:innerWidth,height:innerHeight,documentWidth:document.documentElement.scrollWidth,documentHeight:document.documentElement.scrollHeight,mainOverflow:getComputedStyle(document.querySelector('main')).overflowY,barPosition:getComputedStyle(document.querySelector('.product-topbar')).position}));
    assert.equal(dimensions.documentWidth,width,'The document has no sideways overflow');
    const singleScreen=view==='graph'||view==='timeline';
    assert.equal(dimensions.mainOverflow,singleScreen?'hidden':'visible');
    assert.equal(dimensions.barPosition,'static','The navigation scrolls away with the page');
    if(singleScreen)assert.ok(dimensions.documentHeight<=height+1,'Graph and Timeline keep their complete work area within one screen');
    else assert.ok(dimensions.documentHeight>height+120,'Supporting modules have space below the first viewport');
    const nav=page.getByRole('navigation',{name:'Workspace',exact:true});
    assert.equal(await nav.getByRole('button').count(),6);
    assert.equal(await nav.locator('svg').count(),6,'Every tab has a consistent line icon');
    assert.equal(await page.locator('.product-topbar').getByRole('button').count(),7);
    const selected=new URLSearchParams(new URL(page.url()).hash.slice(1)).get('step');
    if(view==='graph'){
      const work=await page.locator('.graph-workspace').boundingBox(),frame=await page.locator('.graph-frame').boundingBox(),secondary=await page.locator('.graph-secondary').boundingBox();
      assert.ok(frame.height>=260&&work.y+work.height<=height);
      assert.ok(secondary.y>=frame.y+frame.height&&secondary.y+secondary.height<=height,'Activity remains inside the screen, below the graph');
    }else if(view==='replay'){
      const work=await page.locator('.replay-workspace').boundingBox(),output=await page.locator('.replay-output').boundingBox();
      assert.ok(work.height>=760&&output.y>=work.y+work.height+24,'Separate main evidence and terminal reading regions');
    }else if(view==='timeline'){
      const lanes=await page.locator('.event-timeline').boundingBox(),log=await page.locator('.timeline-records').boundingBox();
      assert.ok(lanes.height>=350&&log.height>=120&&log.y>=lanes.y+lanes.height+10&&log.y+log.height<=height,'All lanes, the event log and Inspector are available in one screen');
      assert.ok(await page.locator('.event-lane').last().evaluate(lane=>{
        const b=lane.getBoundingClientRect(),v=lane.closest('.event-timeline-scroll').getBoundingClientRect();return b.bottom<=v.bottom+1;
      }),'The Final Answer lane is visible without a hidden vertical lane scroll');
    }else if(view==='compare'){
      const row=await page.locator('.align-pair').first().boundingBox(),table=await page.locator('.alignment-panel').boundingBox(),extra=await page.locator('.source-trajectories').boundingBox();
      assert.ok(row.height>=76&&extra.y>=table.y+table.height+30,'Shared alignment leads; full source lists follow below');
    }
    await take(view+'-'+width);await take(view+'-top-'+width,false);
    // Use a real wheel on the page gutter, away from local evidence scrollers.
    await page.mouse.move(5,Math.round(height*.6));await page.mouse.wheel(0,340);
    if(!singleScreen)await page.waitForFunction(()=>scrollY>70);await settle(page);
    const hidden=await page.locator('.product-topbar').evaluate(e=>e.getBoundingClientRect().bottom<=0);
    if(singleScreen)assert.equal(await page.evaluate(()=>scrollY),0,'Single-screen tools keep the whole workspace in place');
    else assert.ok(hidden,'No top bar remains visible after scrolling down');
    assert.equal(new URLSearchParams(new URL(page.url()).hash.slice(1)).get('step'),selected,'Document scrolling preserves the selected source');
    if(view==='replay'){
      const dock=await page.getByRole('region',{name:'Replay controls',exact:true}).boundingBox();
      assert.ok(dock.y>=0&&dock.y+dock.height<=height+1,'Playback stays available after the top navigation scrolls away');
      // At the document end, the fixed dock must not cover the final module's
      // tabs, disclosure or output. Exercise both actual disclosure states.
      const clearDock=async()=>{
        await page.evaluate(()=>scrollTo(0,document.documentElement.scrollHeight));await settle(page);
        const panel=await page.locator('.replay-output').boundingBox();
        assert.ok(panel.y+panel.height<=dock.y-16,'The complete final output module clears the fixed playback dock');
        const terminal=page.getByRole('button',{name:'Terminal',exact:true});
        assert.ok(await terminal.evaluate(button=>{
          const b=button.getBoundingClientRect();return button.contains(document.elementFromPoint(b.x+b.width/2,b.y+b.height/2));
        }),'Terminal remains directly clickable at maximum scroll');
      };
      await clearDock();
      await page.getByRole('button',{name:'Show terminal output',exact:true}).click();await clearDock();
      await take('replay-terminal-expanded-'+width,false);
      await page.getByRole('button',{name:'Hide terminal output',exact:true}).click();await clearDock();
    }
    await take(view+'-scrolled-'+width,false);
    geometry.push({view,...dimensions,singleScreen,pageWheel:!singleScreen,barScrollsAway:!singleScreen,selectionPreserved:true});
  }
  // A long graph pans locally without moving its Inspector off screen.
  await page.goto(url+'#view=graph&run=execution-long-synthetic');await page.reload();
  const graph=page.getByRole('group',{name:'Process graph for execution-long-synthetic-expanded',exact:true});
  await graph.locator('[data-node]').first().waitFor();
  const group=graph.locator('[data-node]').nth(1);await group.click();await graph.locator('[data-section-toggle]').first().waitFor();
  const b=await graph.boundingBox();await page.mouse.move(b.x+b.width*.6,Math.min(page.viewportSize().height-40,b.y+150));
  await page.mouse.wheel(0,100000);await settle(page);
  const viewBox=await graph.getAttribute('viewBox');
  await page.mouse.wheel(0,400);await settle(page);
  assert.equal(await graph.getAttribute('viewBox'),viewBox,'The camera clamps at the end of a long graph');
  assert.equal(await page.evaluate(()=>scrollY),0);
  assert.ok(await graph.locator('[data-section-header]').evaluateAll(headers=>headers.every(header=>{
    const lastEdge=header.parentElement.querySelector('[data-edge-type]:last-of-type');
    return !lastEdge||Boolean(lastEdge.compareDocumentPosition(header)&Node.DOCUMENT_POSITION_FOLLOWING);
  })),'Opaque section headings paint above connection paths');
  assert.deepEqual(errors,[]);if(offline)assert.equal(http.length,0);
  page.off('pageerror',onError);page.off('request',onRequest);
  return{geometry,captures,graphAndTimelineSingleScreen:true,graphWheelStaysLocal:true,replayDockClearance:true,offlineHttp:offline?0:undefined,pageErrors:errors};
}
