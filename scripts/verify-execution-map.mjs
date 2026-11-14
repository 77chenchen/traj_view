// Real traces and captures stay in the ignored local evidence directory.
import assert from 'node:assert/strict';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {resolve,join,relative} from 'node:path';
import {pathToFileURL} from 'node:url';
import {frontendRequire,root} from './frontend-dependencies.mjs';
import {checkExecutionReturn} from '../tests/e2e/execution-map.mjs';
const args=process.argv.slice(2),option=(key,fallback)=>{const i=args.indexOf(key);return i<0?fallback:args[i+1];};
const url=option('--url','http://127.0.0.1:8766');assert.match(url,/^http:\/\/127\.0\.0\.1:\d+\/?$/);
const dataset=resolve(option('--dataset','.workers/local/nl2repo-50-out'));
const output=resolve(option('--output','.workers/local/inline-graph-qa'));
const localRelative=relative(join(root,'.workers/local'),output);
assert.ok(localRelative&&!localRelative.startsWith('..'),'Real screenshots must stay in ignored local directory');
const html=resolve(option('--html','.workers/local/nl2repo-long-graph.html'));
mkdirSync(output,{recursive:true});
const index=JSON.parse(readFileSync(join(dataset,'index.json'),'utf8'));
const runs=[...index.runs].sort((a,b)=>b.metrics.steps-a.metrics.steps).slice(0,3);
const {chromium}=frontendRequire('playwright'),ts=frontendRequire('typescript');
const {executionGraph}=await import('data:text/javascript;base64,'+Buffer.from(ts.transpileModule(readFileSync(join(root,'frontend/src/executionMap.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText).toString('base64'));
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
const report={chrome:browser.version(),privateEvidence:true,datasetRuns:index.runs.length,runs:[],captures:[]};
async function settle(page){await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));}
async function capture(page,name){
  await page.mouse.move(0,0);await page.evaluate(()=>document.activeElement?.blur());await settle(page);
  const buffer=await page.screenshot({path:join(output,name+'.png'),fullPage:true,animations:'disabled'}),size=page.viewportSize();
  assert.equal(buffer.readUInt32BE(16),size.width);assert.equal(buffer.readUInt32BE(20),size.height);
  report.captures.push({file:name+'.png',...size});
}
try{
  const context=await browser.newContext({viewport:{width:1586,height:912}}),page=await context.newPage();page.setDefaultTimeout(20000);
  for(let i=0;i<runs.length;i++){
    const run=runs[i],source=JSON.parse(readFileSync(join(dataset,run.file),'utf8')).expanded,steps=JSON.parse(readFileSync(join(dataset,run.steps_file),'utf8')).steps,errors=[];
    const onError=e=>errors.push(e.message);page.on('pageerror',onError);
    await page.goto(url+'/#view=graph&run='+encodeURIComponent(run.id));
    const graph=page.getByRole('group',{name:`Process graph for ${run.id}-expanded`,exact:true});await graph.locator('[data-node]').first().waitFor();
    const pause=page.getByRole('button',{name:'Pause updates',exact:true});if(await pause.count())await pause.click();
    const projection=executionGraph(source,undefined,steps),rootIds=await graph.locator('[data-node]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('data-node-id')));
    assert.deepEqual(rootIds,projection.nodes.map(n=>n.id));await capture(page,`run-${i}-closed`);
    const largest=[...projection.nodes].filter(n=>n.view).sort((a,b)=>b.count-a.count)[0];assert.ok(largest);
    if(i===0){
      await graph.focus();for(let j=0;j<5;j++)await page.keyboard.press('ArrowRight');
      await capture(page,'run-0-readable-before');
    }
    await graph.locator(`[data-node-id="${largest.id}"]`).click();await graph.locator(`[data-section-toggle="${largest.id}"]`).waitFor();
    for(const id of rootIds.filter(id=>id!==largest.id))assert.equal(await graph.locator(`[data-node-id="${id}"]`).count(),1);
    if(i===0)await capture(page,'run-0-readable-after');
    await page.getByRole('button',{name:'Fit graph',exact:true}).click();await capture(page,`run-${i}-largest-open`);
    const child=executionGraph(source,{start:largest.view.start,end:largest.view.end},steps).nodes.filter(n=>n.view).sort((a,b)=>b.count-a.count)[0];
    if(child){await graph.locator(`[data-node-id="${child.id}"]`).click();await graph.locator(`[data-section-toggle="${child.id}"]`).waitFor();await page.getByRole('button',{name:'Fit graph',exact:true}).click();await capture(page,`run-${i}-largest-nested`);}
    const inspector=page.getByRole('complementary',{name:'Step inspector',exact:true}),search=page.getByRole('searchbox',{name:`Find a node in ${run.id}-expanded`,exact:true});
    const failure=source.nodes.find(n=>n.error);assert.ok(failure);
    await page.getByRole('button',{name:'Next failure',exact:true}).click();await inspector.locator('.step-meta').getByText('#'+failure.first_idx,{exact:true}).waitFor();
    await inspector.getByRole('button',{name:'Error Output',exact:true}).click();await capture(page,`run-${i}-failure`);
    await inspector.getByRole('button',{name:'Context',exact:true}).click();await capture(page,`run-${i}-context`);
    const last=source.nodes.at(-1);await search.fill('#'+last.first_idx);await search.press('Enter');await inspector.locator('.step-meta').getByText('#'+last.first_idx,{exact:true}).waitFor();await settle(page);
    const fullyVisible=async()=>{
      const box=await graph.locator(`[data-node-id="${last.id}"]`).boundingBox(),canvas=await page.locator('.graph-frame').boundingBox();
      return box.x>=canvas.x&&box.x+box.width<=canvas.x+canvas.width&&box.y>=canvas.y&&box.y+box.height<=canvas.y+canvas.height;
    };
    assert.ok(await fullyVisible(),'Search frames the exact last source');
    await graph.focus();for(let j=0;j<22;j++)await page.keyboard.press('ArrowRight');assert.ok(!await fullyVisible());
    await search.press('Enter');await settle(page);assert.ok(await fullyVisible(),'Repeated search recovers the same selected source after panning');
    const [download]=await Promise.all([page.waitForEvent('download'),page.getByRole('button',{name:`Download SVG of ${run.id}-expanded`,exact:true}).click()]);
    const svg=readFileSync(await download.path(),'utf8');
    for(const id of await graph.locator('[data-node]').evaluateAll(ns=>ns.map(n=>n.getAttribute('data-node-id'))))assert.ok(svg.includes(`data-node-id="${id}"`));
    assert.ok(svg.includes('data-expanded-section='));
    const inline=await checkExecutionReturn(page,graph,async state=>{if(['inline-open','inline-nested','inline-multiple','inline-collapsed'].includes(state))await capture(page,`run-${i}-${state}`);});
    let smaller;
    if(i===0){await page.setViewportSize({width:1280,height:800});smaller=await checkExecutionReturn(page,graph,async state=>{if(['inline-open','inline-multiple'].includes(state))await capture(page,`run-${i}-${state}-1280`);});await page.setViewportSize({width:1586,height:912});}
    assert.deepEqual(errors,[]);page.off('pageerror',onError);
    report.runs.push({run:run.id,sourceSteps:source.nodes.length,sourceEdges:source.edges.length,rootNodes:projection.nodes.length,largestSectionSteps:largest.count,inline,smaller,exactFailureAndLastSource:true,repeatedSearch:true,currentStateSvg:true,pageErrors:errors.length});
  }
  await context.close();
  const offline=await browser.newContext({viewport:{width:1586,height:912},offline:true,serviceWorkers:'block'});await offline.route(/^https?:\/\//,route=>route.abort());
  const offlinePage=await offline.newPage();let requests=0;const errors=[];offlinePage.on('request',r=>{if(/^https?:/.test(r.url()))requests++;});offlinePage.on('pageerror',e=>errors.push(e.message));
  await offlinePage.goto(pathToFileURL(html).href+'#view=graph&run='+encodeURIComponent(runs[0].id));
  const graph=offlinePage.getByRole('group',{name:`Process graph for ${runs[0].id}-expanded`,exact:true});await graph.locator('[data-node]').first().waitFor();
  const inline=await checkExecutionReturn(offlinePage,graph,async state=>{if(['inline-open','inline-multiple'].includes(state))await capture(offlinePage,`offline-${state}`);});
  assert.equal(requests,0);assert.deepEqual(errors,[]);report.offline={httpRequests:requests,pageErrors:errors.length,inline};await offline.close();
  writeFileSync(join(output,'verification.json'),JSON.stringify(report,null,2)+'\n');
  console.log(`PASS real NL2Repo: ${runs.map(run=>run.metrics.steps).join('/')} steps; ${report.captures.length} private full-page captures; inline siblings/nesting/collapse/camera/source/SVG; offline HTTP ${requests}`);
}finally{await browser.close();}
