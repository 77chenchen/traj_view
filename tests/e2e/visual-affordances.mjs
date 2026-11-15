import assert from 'node:assert/strict';
import {join} from 'node:path';

const settle=page=>page.evaluate(async()=>{await document.fonts.ready;await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));});
const hashes={replay:'view=replay&run=dashboard-baseline&step=60',timeline:'view=timeline&run=dashboard-baseline&step=60',graph:'view=graph&run=dashboard-baseline&step=60',compare:'view=compare&compare=dashboard-baseline&compare=dashboard-variant',analytics:'view=sankey',datasets:'view=runs'};
const inspection=page=>page.getByRole('complementary',{name:'Step inspector',exact:true});
async function arrive(page,url,hash){await page.goto(url+'#'+hash);await page.reload();await page.locator('main h1:visible').first().waitFor();await settle(page);}
async function capture(page,dir,name){
  await page.evaluate(()=>scrollTo(0,0));await page.mouse.move(0,0);await settle(page);
  const image=await page.screenshot({path:join(dir,name+'.png'),fullPage:true,animations:'disabled'});
  assert.equal(image.readUInt32BE(16),page.viewportSize().width);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'No document overflow: '+name);
}
async function contrast(page){
  return page.locator('.kind-icon,.jump-action:not(:disabled),.type-badge[data-kind]').evaluateAll(elements=>{
    const luminance=c=>{
      const rgb=c.match(/[\d.]+/g)?.slice(0,3).map(Number);if(!rgb)return null;
      return rgb.map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;}).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);
    };
    return elements.filter(e=>e.getBoundingClientRect().height&&!e.closest('button:disabled')).map(e=>{
      const s=getComputedStyle(e),a=luminance(s.color),b=luminance(s.backgroundColor);
      return{kind:e.dataset.kind||e.closest('[data-kind]')?.dataset.kind,text:e.textContent.trim(),color:s.color,background:s.backgroundColor,ratio:(Math.max(a,b)+.05)/(Math.min(a,b)+.05)};
    });
  });
}
export async function checkVisualAffordances(page,url,artifacts,offline=false){
  const prefix=offline?'offline-':'',errors=[],http=[],captures=[],ratios=[];
  const onError=e=>errors.push(e.message),onRequest=r=>{if(/^https?:/.test(r.url()))http.push(r.url());};
  page.on('pageerror',onError);page.on('request',onRequest);
  for(const [width,height] of [[1586,912],[1280,800]]){
    await page.setViewportSize({width,height});
    for(const [name,hash] of Object.entries(hashes)){
      await arrive(page,url,hash);
      const ready={replay:'.recorded-code .code-lines',timeline:'.timeline-event',graph:'.graph-frame [data-node]',compare:'.align-pair',analytics:'.analytics-group-table tbody tr',datasets:'.runs-table tbody tr'}[name];
      await page.locator(ready).first().waitFor();await settle(page);
      const file=prefix+name+'-'+width;await capture(page,artifacts,file);captures.push(file+'.png');
      if(['replay','timeline','graph'].includes(name)){
        assert.ok(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight+1),'Investigation workspace remains one screen: '+name);
        ratios.push(...await contrast(page));
      }
      if(name==='timeline'){
        const categories=await page.locator('.timeline-event-table tbody tr td:nth-child(3)').allTextContents();
        assert.ok(categories.some(text=>text.trim()==='Recorded text'),'Generic text has its recorded category in Event Log');
        assert.ok(categories.every(text=>!text.includes('Reasoning')),'Event Log never infers a separate reasoning role');
      }
      if(name==='analytics'){
        const bars=await page.locator('.metric-inline').evaluateAll(nodes=>nodes.map(n=>({value:Number(n.querySelector('span').textContent),width:parseFloat(n.querySelector('b')?.style.width)})));
        const known=bars.filter(b=>Number.isFinite(b.value));
        for(const a of known)for(const b of known)if(a.value===b.value)assert.equal(a.width,b.width,'Equal medians share one bar scale');
      }
    }
  }
  await page.setViewportSize({width:1280,height:800});await arrive(page,url,'view=replay&run=dashboard-baseline&step=20');
  await page.getByRole('button',{name:'Next failure',exact:true}).focus();await page.keyboard.press('Enter');
  await page.waitForFunction(()=>new URLSearchParams(location.hash.slice(1)).get('step')==='50');
  assert.match(await page.getByLabel('Selected step evidence',{exact:true}).innerText(),/FAILED|AssertionError/);
  await capture(page,artifacts,prefix+'replay-failure-1280');
  await page.getByRole('button',{name:'Diff',exact:true}).click();await page.getByRole('button',{name:'Next edit',exact:true}).click();
  await page.getByLabel('Recorded patch',{exact:true}).waitFor();
  await page.getByRole('button',{name:'Show inspection',exact:true}).click();
  await capture(page,artifacts,prefix+'replay-edit-details-1280');
  const evidence=await page.locator('.recorded-workspace').boundingBox();assert.ok(evidence.width>=620,'Readable central evidence with Step details open');
  await page.getByRole('button',{name:'Next validation',exact:true}).click();
  assert.equal(await page.getByRole('button',{name:'Diff',exact:true}).getAttribute('aria-pressed'),'true');
  assert.match(await page.locator('.recorded-code').innerText(),/No patch recorded/);
  await page.getByRole('button',{name:'Automatic evidence view',exact:true}).click();
  await page.getByRole('button',{name:'Next validation',exact:true}).click();
  assert.match(await page.getByLabel('Selected step evidence',{exact:true}).innerText(),/2 passed/);

  await arrive(page,url,hashes.graph);await inspection(page).locator('.step-meta').getByText('#60',{exact:true}).waitFor();
  await inspection(page).getByRole('button',{name:'Code Diff',exact:true}).click();
  await inspection(page).getByLabel('Recorded patch',{exact:true}).waitFor();
  await page.getByRole('button',{name:'Fullscreen graph',exact:true}).click();await page.waitForFunction(()=>!!document.fullscreenElement);
  await capture(page,artifacts,prefix+'graph-fullscreen-1280');
  await inspection(page).getByRole('button',{name:'Next inspected step',exact:true}).click();
  assert.equal(await inspection(page).getByRole('button',{name:'Code Diff',exact:true}).getAttribute('aria-pressed'),'true');
  await inspection(page).getByText('No patch recorded',{exact:true}).waitFor();
  await inspection(page).locator('.recording-details > summary').click();
  assert.ok(await inspection(page).getByText('Attempts',{exact:true}).isVisible(),'Unknown attempts stay available under Recording details');
  await page.getByRole('button',{name:'Exit fullscreen',exact:true}).click();
  await page.locator('.graph-activity-disclosure > summary').click();
  await page.getByRole('combobox',{name:'Activity grouping',exact:true}).selectOption('category');
  const recordedRow=page.locator('.activity-row').filter({has:page.locator('strong').filter({hasText:/^Recorded text$/})});
  assert.ok(await recordedRow.getByRole('button').count()>0,'Recorded-text activity remains visible after category renaming');
  await recordedRow.getByRole('button',{name:'Activity #40',exact:true}).click();
  await inspection(page).locator('.step-meta').getByText('#40',{exact:true}).waitFor();
  await recordedRow.locator('strong').scrollIntoViewIfNeeded();
  await capture(page,artifacts,prefix+'graph-activity-recorded-text-1280');

  await arrive(page,url,hashes.timeline);await page.locator('.timeline-reading-guide > summary').focus();await page.keyboard.press('Enter');
  assert.match(await page.locator('.timeline-reading-guide').innerText(),/do not imply parallelism/);
  await capture(page,artifacts,prefix+'timeline-reading-guide-1280');

  await arrive(page,url,hashes.compare);await page.locator('.divergence-callout').click();
  await page.getByRole('complementary',{name:'Step comparison',exact:true}).waitFor();
  assert.ok(await inspection(page).locator('.inspector-tabs').evaluate(tabs=>{
    const parent=tabs.getBoundingClientRect();return [...tabs.querySelectorAll('button')].every(button=>{const b=button.getBoundingClientRect();return b.left>=parent.left&&b.right<=parent.right;});
  }),'All four evidence tabs fit in Step comparison');
  await capture(page,artifacts,prefix+'compare-divergence-1280');

  // Theme changes still use the catalog's local preference, with white DAGs.
  await arrive(page,url,hashes.datasets);await page.locator('.dataset-utilities > summary').click();
  await page.getByRole('button',{name:'Dark theme',exact:true}).click();
  for(const name of ['replay','graph']){
    await arrive(page,url,hashes[name]);await page.locator(name==='graph'?'[data-node]':'.code-lines').first().waitFor();
    ratios.push(...await contrast(page));await capture(page,artifacts,prefix+name+'-dark-1280');
  }
  await arrive(page,url,hashes.datasets);await page.locator('.dataset-utilities > summary').click();
  await page.getByRole('button',{name:'Light theme',exact:true}).click();
  for(const ratio of ratios)assert.ok(ratio.ratio>=4.5,`Semantic label/icon contrast ${ratio.kind}: ${ratio.ratio.toFixed(2)}`);
  assert.deepEqual(errors,[]);if(offline)assert.equal(http.length,0,'Standalone UI needs no HTTP');
  page.off('pageerror',onError);page.off('request',onRequest);
  return{desktopSizes:[[1586,912],[1280,800]],sixRoutes:true,keyboardFailureEditValidation:true,pinnedDiff:true,fullscreenEvidence:true,unknownAttemptsDisclosure:true,readingGuide:true,recordedTextCategoryAndActivity:true,comparisonDivergence:true,sharedMedianScale:true,semanticContrast:{minimum:Math.min(...ratios.map(r=>r.ratio)),samples:ratios.length},captures,offlineHttp:offline?http.length:undefined,pageErrors:errors};
}
