import assert from 'node:assert/strict';
import {join} from 'node:path';

const frame=page=>page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
const inspection=page=>page.getByRole('complementary',{name:'Step inspector',exact:true});
const mode=(page,name)=>page.getByRole('group',{name:'Comparison workspace',exact:true}).getByRole('button',{name,exact:true});
async function open(page,url,view,step='60') {
  const target=new URL(url),params=new URLSearchParams({view,run:'dashboard-baseline',step});
  if(view==='compare'){params.append('compare','dashboard-short');params.append('compare','dashboard-baseline');}
  target.hash=params.toString();await page.goto(target.href);
  await page.locator({replay:'.recorded-workspace',timeline:'.event-timeline',graph:'.graph-frame',compare:'.reference-alignment'}[view]).waitFor();
  if(view==='graph')await page.locator('[data-node]').first().waitFor();
  await frame(page);
}
async function capture(page,artifacts,name) {
  await page.mouse.move(0,0);await page.evaluate(()=>document.activeElement?.blur());await frame(page);
  await page.screenshot({path:join(artifacts,name+'.png'),animations:'disabled'});
}
async function inViewport(locator,page) {
  const b=await locator.boundingBox();assert.ok(b&&b.width>0&&b.height>0&&b.y>=0&&b.y+b.height<=page.viewportSize().height+1,'Critical controls stay in the viewport');
}

export async function checkDensity(page,url,artifacts,offline=false) {
  const prefix=offline?'density-offline':'density',requests=[],errors=[];
  const request=r=>{if(/^https?:/.test(r.url()))requests.push(r.url());};
  const error=e=>errors.push(e.message);page.on('request',request);page.on('pageerror',error);
  const geometry=[];
  for(const [width,height] of [[1586,912],[1280,800],[390,844]]) {
    await page.setViewportSize({width,height});
    for(const view of ['replay','timeline','graph','compare']) {
      await open(page,url,view,view==='timeline'?'50':'60');
      const measured=await page.evaluate(view=>{
        const box=s=>document.querySelector(s)?.getBoundingClientRect().toJSON();
        return {view,width:innerWidth,height:innerHeight,overflow:document.documentElement.scrollWidth>innerWidth,
          stage:view==='compare'?null:box('.stage-strip'),primary:box({replay:'.recorded-workspace',timeline:'.event-timeline',graph:'.graph-frame',compare:'.alignment-panel'}[view]),
          readingSize:parseFloat(getComputedStyle(document.querySelector(view==='replay'?'.code-lines':view==='timeline'?'.table-event-button':view==='compare'?'.align-pair button':'.step-meta')).fontSize)};
      },view);
      assert.equal(measured.overflow,false);assert.ok(measured.readingSize>=10);
      if(width>=1280) {
        if(view!=='compare')assert.ok(measured.stage.height<=56,'Compact stage navigation precedes the independent evidence workspace');
        if(view==='graph')assert.ok(measured.primary.height>=320,'Graph canvas is the main workspace');
        if(view==='replay') {
          const left=await page.locator('.event-list').boundingBox();
          assert.ok(measured.primary.width>1.5*left.width,'Recorded evidence has reading priority');
          await inViewport(page.getByRole('region',{name:'Replay controls',exact:true}),page);
          assert.equal(await inspection(page).isVisible(),false,'Replay details are optional by default');
        }
      }
      if(view==='compare') {
        assert.equal(await page.locator('.metric-comparison').isVisible(),false);
        assert.equal(await page.locator('.final-patch').isVisible(),false);
        assert.equal(await page.locator('.source-trajectories').getAttribute('open'),null);
      }
      geometry.push(measured);await capture(page,artifacts,`${prefix}-${view}-${width}`);
    }
  }

  // Progressive disclosure must preserve the same source and the debugging workflow.
  await page.setViewportSize({width:1586,height:912});await open(page,url,'replay','50');
  const seek=page.getByRole('slider',{name:'Replay position',exact:true});
  assert.match(await page.getByLabel('Selected step evidence',{exact:true}).innerText(),/FAILED test_session_expiry/);
  assert.equal(await page.getByLabel('Current step output',{exact:true}).count(),0,'Default failure output is shown once');
  const compact=await page.locator('.recorded-workspace').boundingBox();
  await page.getByRole('button',{name:'Show stage previews',exact:true}).click();
  assert.ok((await page.locator('.stage-strip').boundingBox()).height>90);
  assert.equal(await seek.inputValue(),'4');
  await page.getByRole('button',{name:'Hide stage previews',exact:true}).click();
  assert.equal((await page.locator('.recorded-workspace').boundingBox()).height,compact.height);
  await page.locator('.run-recording > summary').click();
  await page.locator('.run-recording').getByText('Synthetic fixture',{exact:true}).waitFor();
  await page.locator('.run-recording > summary').click();
  await page.getByRole('button',{name:'Show inspection',exact:true}).click();
  await inspection(page).locator('.step-content summary').filter({hasText:'Tool arguments'}).click();
  assert.match(await inspection(page).locator('.step-content').filter({hasText:'Tool arguments'}).locator('pre').innerText(),/pytest -q/);
  await page.getByRole('button',{name:'Next edit',exact:true}).click();
  await inspection(page).getByText('#60',{exact:true}).waitFor();
  assert.match(await page.locator('.recorded-workspace [aria-label="Recorded patch"]').innerText(),/3600/);
  await capture(page,artifacts,prefix+'-replay-edit');
  await page.getByRole('button',{name:'Next validation',exact:true}).click();
  assert.match(await page.getByLabel('Selected step evidence',{exact:true}).innerText(),/FAILED test_session_scope/);
  await page.getByRole('button',{name:'Next validation',exact:true}).click();
  assert.match(await page.getByLabel('Selected step evidence',{exact:true}).innerText(),/2 passed/);
  await page.getByRole('button',{name:'Tests',exact:true}).click();
  assert.match(await page.getByLabel('Current step output',{exact:true}).innerText(),/2 passed/);
  await page.getByRole('button',{name:'Hide terminal output',exact:true}).click();
  await seek.fill('4');await capture(page,artifacts,prefix+'-replay-failure');

  await open(page,url,'graph');
  assert.equal(await page.locator('.graph-options').getAttribute('open'),null);
  assert.equal(await page.locator('.graph-activity-disclosure').getAttribute('open'),null);
  assert.equal(await page.locator('.execution-legend').count(),0);
  const side=page.getByRole('group',{name:'Graph side panel',exact:true});
  await side.getByRole('button',{name:'Files & activity',exact:true}).click();
  await page.getByRole('button',{name:'Load recorded activity',exact:true}).click();
  await page.getByRole('searchbox',{name:'Find recorded file path',exact:true}).fill('session.py');
  const files=page.locator('.file-results details').filter({hasText:'src/session.py'});
  await files.locator('summary').click();
  await files.getByRole('button',{name:'Locate src/session.py at source step 60',exact:true}).click();
  await inspection(page).getByText('#60',{exact:true}).waitFor();
  assert.equal(await side.getByRole('button',{name:'Details',exact:true}).getAttribute('aria-pressed'),'true');
  await inspection(page).getByRole('button',{name:'Error Output',exact:true}).click();
  assert.match(await inspection(page).innerText(),/Applied patch/);
  await page.locator('.graph-options > summary').click();
  await page.getByLabel('Graph layers',{exact:true}).selectOption('tools');
  await page.getByLabel('Graph layers',{exact:true}).selectOption('all');
  await page.locator('.graph-options > summary').click();
  await page.locator('.graph-activity-disclosure > summary').click();
  await page.getByRole('button',{name:'Activity #50',exact:true}).click();
  await inspection(page).getByText('#50',{exact:true}).waitFor();

  await open(page,url,'timeline','50');
  const logViewport=await page.locator('.timeline-event-table').boundingBox();
  const column=await page.getByRole('columnheader',{name:'Event',exact:true}).boundingBox();
  assert.ok(column.y>=logViewport.y&&column.y+column.height<=logViewport.y+logViewport.height,'Log labels remain visible while following a selected event');
  await page.getByRole('button',{name:'Collapse event log',exact:true}).click();
  assert.equal(await page.getByRole('searchbox',{name:'Search timeline events',exact:true}).count(),0);
  await page.getByRole('button',{name:'Expand event log',exact:true}).click();
  await page.getByLabel('Timeline status',{exact:true}).selectOption('failed');
  assert.equal(await page.locator('.timeline-event-table tbody tr').count(),2);
  await page.getByRole('button',{name:'Inspect timeline source #70',exact:true}).click();
  await inspection(page).getByText('#70',{exact:true}).waitFor();
  assert.equal(await page.getByRole('button',{name:'Snapshot Retry source #70',exact:true}).getAttribute('aria-pressed'),'true');

  await open(page,url,'compare');
  await page.getByRole('button',{name:'dashboard-baseline aligned source #60',exact:true}).click();
  assert.ok(await page.locator('.align-pair button[aria-pressed="true"]').count()>=2);
  await inspection(page).getByText('#60',{exact:true}).waitFor();
  await mode(page,'Patch comparison').focus();await page.keyboard.press('Enter');
  await page.getByRole('group',{name:'Final patch view',exact:true}).getByRole('button',{name:'Agent A (Final)',exact:true}).click();
  await page.locator('.final-patch').getByText('No file content recorded',{exact:true}).waitFor();
  await mode(page,'All metrics').click();
  assert.equal(await page.locator('.metric-comparison tbody tr').count(),6);
  assert.match(await page.locator('.metric-comparison').innerText(),/未记录/);
  assert.equal(await page.locator('.comparison-chart-disclosure').getAttribute('open'),null);
  await page.locator('.comparison-chart-disclosure > summary').click();
  assert.equal(await page.locator('.small-chart:visible').count(),6);
  await capture(page,artifacts,prefix+'-compare-metrics');
  await page.getByRole('button',{name:'Add run',exact:true}).click();
  await mode(page,'Run DAGs').click();
  await page.locator('.compare-graph [data-node]').first().waitFor();
  assert.equal(await page.locator('.compare-graph').count(),3);
  assert.match(await page.locator('.pair-table').innerText(),/Jaccard/);
  await capture(page,artifacts,prefix+'-compare-dags');
  page.off('request',request);page.off('pageerror',error);
  assert.deepEqual(errors,[]);if(offline)assert.deepEqual(requests,[]);
  return {geometry,disclosureAndSourceIdentity:true,workflow:['failure','patch','failed rerun','passing validation'],offline,...(offline?{httpRequests:requests.length}:{})};
}
