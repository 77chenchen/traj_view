import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';

const settle=page=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
const inspection=page=>page.getByRole('complementary',{name:'Step inspector',exact:true});
const graph=page=>page.locator('.graph-frame > svg');
const search=page=>page.getByRole('searchbox',{name:/Find a node in/});
const finalSource='9007199254741049';

async function selectedVisible(page,source){
  await inspection(page).locator('.step-meta').getByText('#'+source,{exact:true}).waitFor();
  await page.waitForFunction(idx=>{
    const svg=document.querySelector('.graph-frame > svg');
    if(!svg)return false;
    const node=[...svg.querySelectorAll('[data-node]')].find(n=>n.dataset.sourceIndex===idx&&n.getAttribute('aria-pressed')==='true');
    if(!node)return false;
    const v=svg.getBoundingClientRect(),b=node.getBoundingClientRect();
    return b.top>=v.top+2&&b.left>=v.left+2&&b.bottom<=v.bottom-2&&b.right<=v.right-2;
  },String(source));
  assert.equal(new URLSearchParams(new URL(page.url()).hash.slice(1)).get('step'),String(source));
  assert.match(await page.locator('.fullscreen-selection').innerText(),new RegExp('#'+source+'$'));
}

async function locate(page,source){
  await search(page).fill('#'+source);await search(page).press('Enter');
  await selectedVisible(page,source);
}

async function checkTypography(page){
  const measurements=await page.locator('.graph-workspace').evaluate(async workspace=>{
    await document.fonts.ready;
    const roles={heading:'.inspection-status strong',label:'.step-meta dt',value:'.step-meta dd:not(.mono)',evidenceTab:'.inspector-tabs button',code:'.inspector .code-lines',status:'.graph-caption'};
    const fonts=Object.fromEntries(Object.entries(roles).map(([role,selector])=>{const style=getComputedStyle(workspace.querySelector(selector));return[role,{size:parseFloat(style.fontSize),lineHeight:parseFloat(style.lineHeight),family:style.fontFamily}];}));
    const nodes=[...workspace.querySelectorAll('[data-node]')].map(node=>{
      const body=node.querySelector('[data-node-body]').getBBox();
      return{source:node.dataset.sourceIndex,labels:[...node.querySelectorAll('[data-node-title],[data-node-metadata]')].map(text=>{
        const b=text.getBBox();
        return{text:text.textContent,natural:!text.hasAttribute('textLength'),inside:b.x>=body.x+3&&b.y>=body.y+3&&b.x+b.width<=body.x+body.width-3&&b.y+b.height<=body.y+body.height-3};
      })};
    });
    const toolbar=workspace.querySelector('.graph-toolbar').getBoundingClientRect(),sidebar=workspace.querySelector('.trace-sidebar').getBoundingClientRect();
    const tabs=[...workspace.querySelectorAll('.sidebar-tabs button,.inspector-tabs button')];
    return{fonts,nodes,codeFontLoaded:[...document.fonts].some(font=>font.family==='JetBrains Mono'&&font.status==='loaded'),toolbarAndTabsFit:toolbar.right<=sidebar.left&&tabs.every(tab=>tab.scrollWidth<=tab.clientWidth&&tab.getBoundingClientRect().right<=sidebar.right)};
  });
  assert.ok(measurements.fonts.heading.size>measurements.fonts.value.size,'Selected title leads the metadata');
  for(const [role,{size}] of Object.entries(measurements.fonts))assert.ok(size>=13,role+' remains readable in the narrow Inspector');
  assert.ok(measurements.fonts.heading.size>=18&&measurements.fonts.value.size>=15&&measurements.fonts.evidenceTab.size>=14,'Evidence, metadata and controls keep their reading roles');
  assert.ok(measurements.fonts.code.size>=15&&measurements.fonts.code.lineHeight>=24,'Code keeps readable type and leading');
  assert.ok(measurements.codeFontLoaded&&measurements.fonts.code.family.startsWith('"JetBrains Mono"'),'The bundled code face loads locally and offline');
  assert.ok(measurements.toolbarAndTabsFit,'Larger controls and both tab rows fit the desktop workspace');
  assert.ok(measurements.nodes.length>=11,'All recorded category nodes are checked');
  for(const node of measurements.nodes)for(const text of node.labels)assert.ok(text.natural&&text.inside,`Source ${node.source} label stays naturally proportioned and within its node: ${text.text}`);
  return measurements.fonts;
}

export async function checkGraphFullscreen(page,url,artifacts,offline=false){
  const errors=[],http=[],captures=[],geometry=[],prefix=offline?'offline-':'';
  const onError=e=>errors.push(e.message),onRequest=r=>{if(/^https?:/.test(r.url()))http.push(r.url());};
  page.on('pageerror',onError);page.on('request',onRequest);
  const capture=async name=>{
    await page.mouse.move(0,0);await settle(page);
    const file=prefix+'fullscreen-'+name+'.png',data=await page.screenshot({path:join(artifacts,file),fullPage:true,animations:'disabled'}),v=page.viewportSize();
    assert.equal(data.readUInt32BE(16),v.width);assert.equal(data.readUInt32BE(20),v.height);
    captures.push(file);
  };
  const enter=async(run)=>{
    await page.goto(url+'#view=graph&run='+run);await page.reload();
    await graph(page).locator('[data-node]').first().waitFor();
    await page.getByRole('button',{name:'Fullscreen graph',exact:true}).click();
    await page.waitForFunction(()=>document.fullscreenElement?.classList.contains('graph-workspace'));
    await settle(page);
  };
  const exit=async()=>{
    await page.getByRole('button',{name:'Exit fullscreen',exact:true}).focus();
    await page.keyboard.press('Enter');
    await page.waitForFunction(()=>!document.fullscreenElement);await settle(page);
  };
  for(const [width,height] of [[1586,912],[1280,800]]){
    await page.setViewportSize({width,height});await enter('dag-baseline');
    const activity=page.locator('.graph-activity-disclosure');
    assert.equal(await activity.getAttribute('open'),null);
    assert.ok(await page.getByRole('region',{name:'Playback timeline',exact:true}).isVisible(),'Playback remains reachable while activity is collapsed');
    assert.equal(await page.getByRole('button',{name:'Exit fullscreen',exact:true}).count(),1);
    assert.equal(await page.getByRole('button',{name:'Exit fullscreen graph',exact:true}).count(),0,'Fullscreen has one exit, in its top bar');
    await page.getByRole('button',{name:'Fit graph',exact:true}).click();await settle(page);
    const fit=await graph(page).evaluate(svg=>{
      const viewport=svg.getBoundingClientRect().toJSON(),nodes=[...svg.querySelectorAll('[data-node]')].map(n=>({source:n.dataset.sourceIndex,box:n.getBoundingClientRect().toJSON()}));
      return{viewport,nodes,viewBox:svg.getAttribute('viewBox'),header:document.querySelector('.graph-fullscreen-bar').getBoundingClientRect().toJSON(),sidebar:document.querySelector('.trace-sidebar').getBoundingClientRect().toJSON()};
    });
    assert.equal(fit.nodes.length,7);assert.equal(fit.header.y,0);assert.equal(fit.header.width,width);
    assert.ok(fit.sidebar.width>=320&&fit.sidebar.width<=360&&fit.sidebar.bottom<=height+1);
    for(const {box} of fit.nodes)assert.ok(box.x>=fit.viewport.x+8&&box.y>=fit.viewport.y+8&&box.right<=fit.viewport.right-8&&box.bottom<=fit.viewport.bottom-8,'Fit includes the complete first/last nodes and all seven sources');
    const center=fit.nodes.reduce((sum,n)=>sum+n.box.x+n.box.width/2,0)/7;
    assert.ok(Math.abs(center-fit.viewport.x-fit.viewport.width/2)<fit.viewport.width*.1,'The source cluster is centered in the actual SVG area');
    await capture('unselected-'+width);
    await exit();assert.equal(await page.evaluate(()=>document.activeElement?.getAttribute('aria-label')),'Fullscreen graph','Unselected exit restores the entry control');
    await page.getByRole('button',{name:'Fullscreen graph',exact:true}).click();await page.waitForFunction(()=>!!document.fullscreenElement);await settle(page);
    await graph(page).locator(`[data-source-index="${finalSource}"]`).click();await selectedVisible(page,finalSource);
    await inspection(page).getByRole('button',{name:'Code Diff',exact:true}).click();
    await inspection(page).getByText('No patch recorded',{exact:true}).waitFor();
    assert.equal(await inspection(page).getByRole('button',{name:'View Full Diff',exact:true}).isEnabled(),false);
    assert.equal(await inspection(page).getByRole('button',{name:'Code Diff',exact:true}).isEnabled(),true);
    assert.equal(await inspection(page).getByRole('button',{name:'Copy source ID',exact:true}).count(),1);
    await inspection(page).getByRole('button',{name:'Copy source ID',exact:true}).click();
    await inspection(page).locator('.source-copy').getByRole('button',{name:'Copied',exact:true}).waitFor();
    assert.match(await page.locator('.fullscreen-selection').innerText(),/^Final Answer/);
    await capture('final-no-patch-'+width);

    // Popovers remain inside the fullscreen tree and can be reached with a keyboard.
    await page.getByLabel('Graph fullscreen help',{exact:true}).click();
    await page.getByText('Read the execution graph',{exact:true}).waitFor();
    assert.ok(await page.locator('.fullscreen-graph-help > div').evaluate(e=>document.fullscreenElement.contains(e)));
    await page.getByLabel('Graph fullscreen help',{exact:true}).click();
    await page.locator('.graph-options > summary').click();
    assert.ok(await page.locator('.graph-option-body').evaluate(e=>{const b=e.getBoundingClientRect();return document.fullscreenElement.contains(e)&&b.x>=0&&b.right<=innerWidth&&b.bottom<=innerHeight;}));
    await page.getByLabel('Graph layers',{exact:true}).selectOption('tools');
    await page.getByLabel('Graph layers',{exact:true}).selectOption('all');
    await page.locator('.graph-options > summary').click();await selectedVisible(page,finalSource);
    await page.getByRole('button',{name:'Legend',exact:true}).click();
    assert.ok(await page.getByLabel('Execution graph semantics',{exact:true}).evaluate(e=>{const b=e.getBoundingClientRect();return document.fullscreenElement.contains(e)&&b.top>=0&&b.bottom<=innerHeight;}));
    await page.getByRole('button',{name:'Legend',exact:true}).click();

    await page.getByRole('group',{name:'Graph workspace view',exact:true}).getByRole('button',{name:'Timeline',exact:true}).click();
    await page.getByRole('button',{name:'Tool calls: #19 read_file',exact:true}).click();
    await inspection(page).locator('.step-meta').getByText('#19',{exact:true}).waitFor();
    await exit();
    assert.ok((await page.evaluate(()=>document.activeElement?.getAttribute('data-timeline-sources')))?.split(',').includes('19'),'Exiting Graph in Timeline mode restores the selected event focus');
    await page.getByRole('button',{name:'Fullscreen timeline',exact:true}).click();await page.waitForFunction(()=>!!document.fullscreenElement);await settle(page);
    await page.getByRole('group',{name:'Graph workspace view',exact:true}).getByRole('button',{name:'Graph',exact:true}).click();
    await selectedVisible(page,'19');await locate(page,finalSource);
    for(const name of ['Files & activity','Signatures','Details'])await page.getByRole('group',{name:'Graph side panel',exact:true}).getByRole('button',{name,exact:true}).click();
    await selectedVisible(page,finalSource);
    await activity.locator(':scope > summary').click();await selectedVisible(page,finalSource);
    await capture('activity-'+width);
    await page.getByLabel('Activity grouping',{exact:true}).selectOption('category');
    await page.getByRole('button',{name:'Activity #9007199254741021',exact:true}).click();await selectedVisible(page,'9007199254741021');
    const failure=graph(page).locator('[data-source-index="9007199254741021"]');
    assert.equal(await failure.getAttribute('aria-pressed'),'true');
    assert.ok(await failure.locator('[data-node-body]').evaluate(e=>e.getAttribute('stroke')!==e.closest('svg').querySelector('[data-source-index="19"] [data-node-body]').getAttribute('stroke')),'Failure outline remains distinct from selection');
    await inspection(page).getByRole('button',{name:'Error Output',exact:true}).click();
    assert.match(await inspection(page).innerText(),/synthetic test failed/);
    await page.getByLabel('Timeline position',{exact:true}).fill('7');await selectedVisible(page,finalSource);
    await inspection(page).getByRole('button',{name:'Previous inspected step',exact:true}).click();await selectedVisible(page,'9007199254741033');
    await inspection(page).getByRole('button',{name:'Next inspected step',exact:true}).click();await selectedVisible(page,finalSource);
    await activity.locator(':scope > summary').click();await selectedVisible(page,finalSource);
    await graph(page).focus();await graph(page).press('ArrowDown');await settle(page);
    await page.getByRole('button',{name:'Locate selected graph node',exact:true}).click();await selectedVisible(page,finalSource);
    await inspection(page).getByRole('button',{name:'Context',exact:true}).click();
    await inspection(page).locator('.context-relations').filter({has:page.locator('summary',{hasText:'Upstream'})}).locator(':scope > summary').click();
    await inspection(page).locator('.context-relations[open] .node-result').first().click();await selectedVisible(page,'9007199254741033');
    await exit();
    assert.equal(await page.evaluate(()=>document.activeElement?.getAttribute('data-source-index')),'9007199254741033','Exiting fullscreen restores focus to the selected source');
    assert.equal(new URLSearchParams(new URL(page.url()).hash.slice(1)).get('step'),'9007199254741033');

    // The seven-node source saves content, not a patch. Use the separately
    // labeled public category fixture for recorded-patch evidence.
    await enter('node-types-synthetic');await locate(page,'60');
    await inspection(page).getByRole('button',{name:'Code Diff',exact:true}).click();
    await inspection(page).getByLabel('Recorded patch',{exact:true}).waitFor();
    assert.equal(await inspection(page).getByRole('button',{name:'View Full Diff',exact:true}).isEnabled(),true);
    assert.match(await inspection(page).getByLabel('Recorded patch',{exact:true}).innerText(),/return 2/);
    const typography=await checkTypography(page);
    await capture('patch-'+width);
    const [download]=await Promise.all([page.waitForEvent('download'),page.getByRole('button',{name:'Download SVG of node-types-synthetic-expanded',exact:true}).click()]);
    const svg=readFileSync(await download.path(),'utf8');assert.ok(svg.includes('fill="#ffffff"')&&svg.includes('data-source-index="60"'));
    const [png]=await Promise.all([page.waitForEvent('download'),page.getByRole('button',{name:'Download PNG of node-types-synthetic-expanded',exact:true}).click()]);
    assert.ok(readFileSync(await png.path()).readUInt32BE(16)>0);
    await exit();
    geometry.push({width,height,...fit,allSevenFit:true,selectedFinalVisible:true,missingPatchDisabled:true,exactSourceAndFocus:true,activityAndPlayback:true,popoversInsideFullscreen:true,exports:true,typography});
  }
  await page.setViewportSize({width:1586,height:912});await enter('execution-long-synthetic');
  await locate(page,'10000000000000053');await inspection(page).getByRole('button',{name:'Code Diff',exact:true}).click();
  await inspection(page).getByLabel('Recorded patch',{exact:true}).waitFor();
  assert.ok((await graph(page).locator('[data-source-index="10000000000000053"]').boundingBox()).height>=42,'Long-source navigation keeps a readable node instead of fitting the compressed frontier');
  await capture('long-located');
  await page.getByRole('button',{name:'Fit graph',exact:true}).click();await settle(page);
  await locate(page,'10000000000000053');await settle(page);
  assert.ok((await graph(page).locator('[data-source-index="10000000000000053"]').boundingBox()).height>=42,'Exact search after Fit restores source readability');
  // Local wheel / modifier zoom can move the camera; an explicit locate recovers.
  const box=await graph(page).boundingBox();await page.mouse.move(box.x+box.width*.6,box.y+box.height*.5);await page.mouse.wheel(0,2000);await settle(page);
  await page.keyboard.down('Control');await page.mouse.wheel(0,-50);await page.keyboard.up('Control');await settle(page);
  await page.getByRole('button',{name:'Locate selected graph node',exact:true}).click();await selectedVisible(page,'10000000000000053');
  await page.setViewportSize({width:1280,height:800});await selectedVisible(page,'10000000000000053');
  await page.locator('.graph-activity-disclosure > summary').click();await selectedVisible(page,'10000000000000053');
  assert.ok((await graph(page).locator('[data-source-index="10000000000000053"]').boundingBox()).height>=42,'Resize and activity disclosure preserve the long-source reading scale');
  await capture('long-located-1280');await exit();
  assert.equal(await page.evaluate(()=>document.activeElement?.getAttribute('data-source-index')),'10000000000000053');
  // A pale selected-source summary must keep dark ink in the retained dark theme.
  const navigation=page.getByRole('navigation',{name:'Workspace',exact:true});
  await navigation.getByRole('button',{name:'Runs',exact:true}).click();
  await page.locator('.dataset-utilities > summary').click();await page.getByRole('button',{name:'Dark theme',exact:true}).click();
  await navigation.getByRole('button',{name:'Execution graph',exact:true}).click();
  await graph(page).locator('[data-node]').first().waitFor();
  await page.getByRole('button',{name:'Fullscreen graph',exact:true}).click();await page.waitForFunction(()=>!!document.fullscreenElement);await settle(page);
  await selectedVisible(page,'10000000000000053');
  assert.equal(await inspection(page).locator('.inspection-status').evaluate(n=>getComputedStyle(n).color),'rgb(38, 48, 57)');
  assert.equal(await page.locator('.graph-frame').evaluate(n=>getComputedStyle(n).backgroundColor),'rgb(255, 255, 255)');
  await exit();await navigation.getByRole('button',{name:'Runs',exact:true}).click();await page.getByRole('button',{name:'Light theme',exact:true}).click();
  assert.deepEqual(errors,[]);if(offline)assert.equal(http.length,0);
  page.off('pageerror',onError);page.off('request',onRequest);
  return{geometry,captures,longTraceLocate:true,resizeAndActivityKeepSelectionVisible:true,darkSummaryContrast:true,ordinaryGraphReturn:true,httpRequests:offline?http.length:undefined,pageErrors:errors};
}
