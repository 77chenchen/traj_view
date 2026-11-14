// Real trace screenshots are private local evidence; this script never publishes them.
import assert from 'node:assert/strict';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {resolve,join,relative} from 'node:path';
import {pathToFileURL} from 'node:url';
import {frontendRequire,root} from './frontend-dependencies.mjs';
const args=process.argv.slice(2),option=(key,fallback)=>{const i=args.indexOf(key);return i<0?fallback:args[i+1];};
const url=option('--url','http://127.0.0.1:8766');assert.match(url,/^http:\/\/127\.0\.0\.1:\d+\/?$/);
const dataset=resolve(option('--dataset','.workers/local/nl2repo-50-out'));
const output=resolve(option('--output','.workers/local/long-graph-qa'));
assert.ok(relative(join(root,'.workers/local'),output)&&!relative(join(root,'.workers/local'),output).startsWith('..'),'Real screenshots must stay in ignored local directory');
const html=option('--html','.workers/local/nl2repo-long-graph.html');
mkdirSync(output,{recursive:true});
const index=JSON.parse(readFileSync(join(dataset,'index.json'),'utf8'));
const runs=[...index.runs].sort((a,b)=>b.metrics.steps-a.metrics.steps).slice(0,3);
const {chromium}=frontendRequire('playwright');
const ts=frontendRequire('typescript');
const {executionPath,executionGraph}=await import('data:text/javascript;base64,'+Buffer.from(ts.transpileModule(readFileSync(join(root,'frontend/src/executionMap.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText).toString('base64'));
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
const report={chrome:browser.version(),privateEvidence:true,datasetRuns:index.runs.length,runs:[],captures:[]};
async function settle(page){await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));}
async function capture(page,name,preserveFocus=false){await page.mouse.move(0,0);if(!preserveFocus)await page.evaluate(()=>document.activeElement?.blur());await settle(page);const b=await page.screenshot({path:join(output,name+'.png'),fullPage:true,animations:'disabled'});const size=page.viewportSize();assert.equal(b.readUInt32BE(16),size.width);assert.equal(b.readUInt32BE(20),size.height);report.captures.push({file:name+'.png',...size});}
try{
  const context=await browser.newContext({viewport:{width:1586,height:912}});const page=await context.newPage();page.setDefaultTimeout(20000);
  for(let i=0;i<runs.length;i++){
    const run=runs[i],data=JSON.parse(readFileSync(join(dataset,run.file),'utf8')).expanded;
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto(url+'/#view=graph&run='+encodeURIComponent(run.id));
    const graph=page.getByRole('group',{name:`Process graph for ${run.id}-expanded`,exact:true});
    await graph.locator('[data-node]').first().waitFor();
    const pause=page.getByRole('button',{name:'Pause updates',exact:true});if(await pause.count())await pause.click();
    assert.ok(await graph.locator('[data-node]').count()<=4);await capture(page,`after-${i}-overview`);
    if(i===0){await page.setViewportSize({width:1280,height:800});await capture(page,'after-0-overview-1280');await page.setViewportSize({width:1586,height:912});}
    await graph.getByRole('button',{name:/source section/}).first().click();await settle(page);await capture(page,`after-${i}-section`);
    if(i===0){await page.setViewportSize({width:1280,height:800});await capture(page,'after-0-section-1280');await page.setViewportSize({width:1586,height:912});}
    await page.getByRole('button',{name:'Next failure',exact:true}).click();
    const failure=data.nodes.find(n=>n.error);assert.ok(failure);
    const inspector=page.getByRole('complementary',{name:'Step inspector',exact:true});
    await inspector.locator('.step-meta').getByText('#'+failure.first_idx,{exact:true}).waitFor();
    await inspector.getByRole('button',{name:'Error Output',exact:true}).click();await capture(page,`after-${i}-failure`);
    if(i===0){await page.setViewportSize({width:1280,height:800});await capture(page,'after-0-failure-1280');await page.setViewportSize({width:1586,height:912});}
    await inspector.getByRole('button',{name:'Context',exact:true}).click();await inspector.locator('.context-relations > summary').first().click();await capture(page,`after-${i}-context`);
    const search=page.getByRole('searchbox',{name:`Find a node in ${run.id}-expanded`,exact:true});
    await search.fill('#'+data.nodes.at(-1).first_idx);await search.press('Enter');
    await inspector.locator('.step-meta').getByText('#'+data.nodes.at(-1).first_idx,{exact:true}).waitFor();
    assert.ok(await graph.locator('[data-node]').count()<=4);await capture(page,`after-${i}-last-source`);
    await page.getByRole('button',{name:'Zoom in',exact:true}).click();await page.getByRole('button',{name:'Zoom out',exact:true}).click();
    const [svg]=await Promise.all([page.waitForEvent('download'),page.getByRole('button',{name:`Download SVG of ${run.id}-expanded`,exact:true}).click()]);
    const exported=readFileSync(await svg.path(),'utf8');assert.ok(exported.includes(`data-node-id="${data.nodes.at(-1).id}"`));
    // Verify a real cross-range dependency rather than a vacuous toggle at the
    // last leaf. Pick the widest recorded dependency, then follow its source.
    const ordinal=new Map(data.nodes.map((node,j)=>[node.id,j]));
    const dependency=data.edges.filter(edge=>edge.type==='dependency').sort((a,b)=>(ordinal.get(b.target)-ordinal.get(b.source))-(ordinal.get(a.target)-ordinal.get(a.source)))[0];
    assert.ok(dependency);
    const target=data.nodes[ordinal.get(dependency.target)],upstream=data.nodes[ordinal.get(dependency.source)];
    await search.fill('#'+target.first_idx);await search.press('Enter');
    await inspector.locator('.step-meta').getByText('#'+target.first_idx,{exact:true}).waitFor();
    await inspector.getByRole('button',{name:'Context',exact:true}).click();
    await inspector.locator('.context-relations > summary').first().click();
    await capture(page,`after-${i}-dependency-context`);
    await inspector.getByRole('button',{name:`Show #${upstream.first_idx} · dependency · ${upstream.label}`,exact:true}).click();
    await inspector.locator('.step-meta').getByText('#'+upstream.first_idx,{exact:true}).waitFor();
    await capture(page,`after-${i}-dependency-jump`);
    if(i===0){
      const lastMember=data.nodes.find((node,j)=>{const range=executionPath(data,node.first_idx).at(-1);return range&&range.end-range.start===4&&range.end-1===j;});assert.ok(lastMember);
      await page.setViewportSize({width:1280,height:800});await search.fill('#'+lastMember.first_idx);await search.press('Enter');
      await inspector.locator('.step-meta').getByText('#'+lastMember.first_idx,{exact:true}).waitFor();await capture(page,'after-0-last-leaf-member-1280');
      async function fullyVisible(){const box=await graph.locator('[aria-pressed="true"][data-node]').boundingBox(),canvas=await page.locator('.graph-frame').boundingBox();return box.x>=canvas.x&&box.x+box.width<=canvas.x+canvas.width&&box.y>=canvas.y&&box.y+box.height<=canvas.y+canvas.height;}
      assert.ok(await fullyVisible(),'Last call must be fully visible after a cross-range search');
      await graph.focus();for(let j=0;j<22;j++)await page.keyboard.press('ArrowRight');assert.ok(!await fullyVisible());
      await search.press('Enter');await settle(page);assert.ok(await fullyVisible(),'Repeated search must recover the same source after panning');
      await capture(page,'after-0-relocated-1280');
      const strip=page.locator('.execution-overview-strip');assert.equal(await strip.locator('button[tabindex="0"]').count(),1);
      await strip.locator('button').first().focus();await page.keyboard.press('End');assert.ok(await strip.locator('button').last().evaluate(n=>n===document.activeElement));
      await capture(page,'after-0-navigator-focus-1280',true);await page.keyboard.press('Home');await page.keyboard.press('ArrowRight');assert.ok(await strip.locator('button').nth(1).evaluate(n=>n===document.activeElement));
      await page.keyboard.press('Tab');assert.ok(await strip.evaluate(n=>!n.contains(document.activeElement)));
      await page.setViewportSize({width:1586,height:912});
    }
    await inspector.getByRole('button',{name:'Clear inspected step',exact:true}).click();
    await page.getByRole('button',{name:'Run overview',exact:true}).click();
    await graph.getByRole('button',{name:/source section/}).first().waitFor();
    function connectionPath(scope,path=[]){const projected=executionGraph(data,scope);if(projected.edges.some(edge=>edge.type==='dependency'))return path;for(const node of projected.nodes){if(node.view?.kind==='section'){const found=connectionPath({start:node.view.start,end:node.view.end},[...path,node.id]);if(found)return found;}}return null;}
    const connectionScope=connectionPath();assert.ok(connectionScope);
    for(const id of connectionScope){const section=graph.locator(`[data-node-id="${id}"]`);await section.click();await section.waitFor({state:'detached'});}
    await page.locator('.graph-options > summary').click();await page.getByLabel('All dependency connections',{exact:false}).check();await page.locator('.graph-options > summary').click();
    await page.getByRole('button',{name:'Fit graph',exact:true}).click();
    await graph.locator('[data-edge-type="dependency"]').first().waitFor({state:'attached'});assert.ok(await graph.locator('[data-edge-type="dependency"]').count()>0);
    await capture(page,`after-${i}-all-connections`);
    assert.deepEqual(errors,[]);
    report.runs.push({run:run.id,sourceSteps:data.nodes.length,sourceEdges:data.edges.length,rootNodes:4,maximumLevelNodes:4,firstFailure:failure.first_idx,lastSource:data.nodes.at(-1).first_idx,globalSearch:true,context:true,crossRangeDependencyJump:true,visibleDependencyLinks:await graph.locator('[data-edge-type="dependency"]').count(),visibleRetryLinks:await graph.locator('[data-edge-type="retry"]').count(),exportSvg:true,fullLeafAndRepeatedSearch:i===0?true:undefined,rovingKeyboard:i===0?true:undefined,pageErrors:errors.length});
  }
  await context.close();
  const offline=await browser.newContext({viewport:{width:1586,height:912},offline:true,serviceWorkers:'block'});await offline.route(/^https?:\/\//,r=>r.abort());const page2=await offline.newPage();let requests=0;const errors=[];page2.on('request',r=>{if(/^https?:/.test(r.url()))requests++;});page2.on('pageerror',e=>errors.push(e.message));
  await page2.goto(pathToFileURL(resolve(html)).href+'#view=graph&run='+encodeURIComponent(runs[0].id));await page2.locator('[data-node]').first().waitFor();await capture(page2,'offline-overview');
  await page2.getByRole('button',{name:'Next failure',exact:true}).click();await page2.getByRole('complementary',{name:'Step inspector',exact:true}).getByRole('button',{name:'Error Output',exact:true}).click();await capture(page2,'offline-failure');assert.equal(requests,0);assert.deepEqual(errors,[]);report.offline={httpRequests:requests,pageErrors:errors.length};await offline.close();
  writeFileSync(join(output,'verification.json'),JSON.stringify(report,null,2)+'\n');console.log(`PASS real NL2Repo: ${runs.length} long traces, ${report.captures.length} private screenshots, exact source/Inspector/zoom/SVG; offline HTTP 0`);
}finally{await browser.close();}
