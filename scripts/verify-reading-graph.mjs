// Works with public synthetic datasets or authorized private local data.
import assert from 'node:assert/strict';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {resolve,join,relative} from 'node:path';
import {pathToFileURL} from 'node:url';
import {frontendRequire,root} from './frontend-dependencies.mjs';
import {checkReadableConnections} from '../tests/e2e/execution-map.mjs';
const args=process.argv.slice(2),option=(key,fallback)=>{const i=args.indexOf(key);return i<0?fallback:args[i+1];};
const privateData=args.includes('--private'),dataset=resolve(option('--dataset','out'));
const output=resolve(option('--output',privateData?'.workers/local/reading-graph-qa':'test-results/reading-graph'));
if(privateData)assert.ok(!relative(join(root,'.workers/local'),output).startsWith('..'),'Private evidence stays ignored');
mkdirSync(output,{recursive:true});
const parse=raw=>JSON.parse(raw.replace(/"(?:\\.|[^"\\])*"|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/g,token=>/^-?\d{16,}$/.test(token)&&!Number.isSafeInteger(Number(token))?JSON.stringify(token):token));
const index=parse(readFileSync(join(dataset,'index.json'),'utf8'));
const requested=option('--run','execution-long-synthetic');
const run=index.runs.find(r=>r.id===requested)??[...index.runs].sort((a,b)=>b.metrics.steps-a.metrics.steps)[0];
const source=parse(readFileSync(join(dataset,run.file),'utf8')).expanded,steps=parse(readFileSync(join(dataset,run.steps_file),'utf8')).steps;
const {chromium}=frontendRequire('playwright'),ts=frontendRequire('typescript');
const code=ts.transpileModule(readFileSync(join(root,'frontend/src/recordedEdits.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {literalFileWrites,patchEvidence}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
const edit=steps.find(s=>patchEvidence(s,steps))??steps.find(s=>literalFileWrites(s).length)??steps.find(s=>source.nodes.find(n=>String(n.first_idx)===String(s.idx))?.category==='edit');
const failure=steps.find(s=>s.observation?.error||(s.observation?.exit_code!=null&&s.observation.exit_code!==0));
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
const report={privateData,chrome:browser.version(),sourceSteps:steps.length,timestamps:steps.filter(s=>s.ts).length,nativePatches:steps.filter(s=>patchEvidence(s,steps)&&!patchEvidence(s,steps).derived).length,derivedComparisons:steps.filter(s=>patchEvidence(s,steps)?.derived).length,literalWriteSteps:steps.filter(s=>literalFileWrites(s).length).length,checks:[],captures:[]};
const settle=page=>page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
async function capture(page,name){await page.mouse.move(0,0);await settle(page);await page.screenshot({path:join(output,name+'.png'),fullPage:true,animations:'disabled'});report.captures.push(name+'.png');}
async function visibleNode(page,graph,idx){
  await page.waitForFunction(source=>{
    const node=document.querySelector(`.graph-frame [data-source-index="${source}"]:not([aria-expanded])`),svg=node?.ownerSVGElement;if(!node||!svg)return false;
    const a=node.getBoundingClientRect(),b=svg.getBoundingClientRect();return a.x>=b.x-1&&a.right<=b.right+1&&a.y>=b.y-1&&a.bottom<=b.bottom+1;
  },String(idx));
  await settle(page);const box=await graph.locator(`[data-source-index="${idx}"]:not([aria-expanded])`).boundingBox(),canvas=await graph.boundingBox();
  assert.ok(box&&box.x>=canvas.x-1&&box.x+box.width<=canvas.x+canvas.width+1&&box.y>=canvas.y-1&&box.y+box.height<=canvas.y+canvas.height+1,'Exact selected node stays fully visible');
}
async function checkOrder(graph){
  const nodes=await graph.locator('[data-node]').evaluateAll(ns=>ns.map(n=>{const m=n.transform.baseVal.consolidate().matrix;return{x:m.e,y:m.f};}));
  assert.ok(nodes.every((n,i)=>!i||n.y>nodes[i-1].y||(n.y===nodes[i-1].y&&n.x>nodes[i-1].x)));
  assert.ok(nodes.some((n,i)=>i&&n.y===nodes[i-1].y),'Uses horizontal space');
}
try{
  for(const [width,height]of [[1586,912],[1280,800]]){
    const context=await browser.newContext({viewport:{width,height},locale:'en-US'}),page=await context.newPage(),errors=[];
    page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(15000);
    await page.goto(option('--url','http://127.0.0.1:8765/')+'#view=graph&run='+encodeURIComponent(run.id));
    const graph=page.getByRole('group',{name:`Process graph for ${run.id}-expanded`,exact:true}),inspection=page.getByRole('complementary',{name:'Step inspector',exact:true});
    await graph.locator('[data-node]').first().waitFor();await settle(page);
    assert.ok(await page.locator('.graph-workspace').evaluate(e=>e.classList.contains('graph-inspector-closed')));
    assert.equal(await graph.locator('[data-edge-type="dependency"],[data-edge-type="retry"]').count(),0,'Overview begins with sequence only');
    await checkOrder(graph);await capture(page,'overview-'+width);
    await graph.locator('[data-node][aria-expanded="false"]').first().click();
    await graph.locator('[data-expanded-section]').first().waitFor();await page.getByRole('button',{name:'Fit graph',exact:true}).click();await settle(page);
    await checkOrder(graph);assert.ok(await inspection.isVisible());
    await capture(page,'content-groups-'+width);
    const search=page.getByRole('searchbox',{name:`Find a node in ${run.id}-expanded`,exact:true});
    async function locate(idx){await search.fill('#'+idx);await search.press('Enter');await inspection.locator('.step-meta').getByText('#'+idx,{exact:true}).waitFor();await visibleNode(page,graph,idx);}
    if(edit){
      await locate(edit.idx);await inspection.getByRole('button',{name:'Code Diff',exact:true}).click();
      const evidence=patchEvidence(edit,steps);
      if(evidence){await inspection.getByLabel('Recorded patch',{exact:true}).waitFor();assert.ok(await inspection.getByRole('button',{name:'View Full Diff',exact:true}).isEnabled());}
      else{
        await inspection.getByText('No patch recorded',{exact:true}).waitFor();assert.ok(await inspection.getByRole('button',{name:'View Full Diff',exact:true}).isDisabled());
        const write=literalFileWrites(edit)[0];
        if(write){await inspection.getByText('Submitted file · '+write.path,{exact:true}).click();await inspection.getByLabel('Recorded file excerpt',{exact:true}).first().waitFor();}
      }
      await capture(page,'code-evidence-'+width);
      await page.getByRole('button',{name:'Fullscreen graph',exact:true}).click();await page.waitForFunction(()=>!!document.fullscreenElement);await visibleNode(page,graph,edit.idx);
      await capture(page,'fullscreen-'+width);
      await page.getByRole('button',{name:'Exit fullscreen',exact:true}).click();await page.waitForFunction(()=>!document.fullscreenElement);
      await page.getByRole('button',{name:'Hide node inspector',exact:true}).click();await settle(page);
      assert.equal(new URLSearchParams(new URL(page.url()).hash.slice(1)).get('step'),String(edit.idx));
      await page.getByRole('button',{name:'Show node inspector',exact:true}).click();await visibleNode(page,graph,edit.idx);
      assert.equal(await inspection.getByRole('button',{name:'Code Diff',exact:true}).getAttribute('aria-pressed'),'true');
    }
    if(failure){await locate(failure.idx);await inspection.getByRole('button',{name:'Error Output',exact:true}).click();await capture(page,'failure-'+width);}
    const connections=await checkReadableConnections(page,graph);
    await locate(steps.at(-1).idx);await page.getByRole('button',{name:'Collapse all',exact:true}).click();
    await graph.locator('[data-expanded-section]').waitFor({state:'detached'});await inspection.locator('.step-meta').getByText('#'+steps.at(-1).idx,{exact:true}).waitFor();
    assert.equal(await inspection.getByRole('button',{name:'Error Output',exact:true}).getAttribute('aria-pressed'),'true');
    assert.ok(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight+1));assert.deepEqual(errors,[]);
    report.checks.push({width,height,readingOrder:true,inlineSummary:true,sequenceOnlyStart:true,connections,exactSource:true,fullscreenInspector:true,sidebarTogglePreservesSelectionAndTab:true,collapseAll:true,pageErrors:errors.length});await context.close();
  }
  const html=option('--html',null);
  if(html){
    const context=await browser.newContext({viewport:{width:1586,height:912},offline:true,serviceWorkers:'block'});await context.route(/^https?:\/\//,r=>r.abort());
    const page=await context.newPage();let requests=0;const errors=[];page.on('request',r=>{if(/^https?:/.test(r.url()))requests++;});page.on('pageerror',e=>errors.push(e.message));
    await page.goto(pathToFileURL(resolve(html)).href+'#view=graph&run='+encodeURIComponent(run.id)+'&step='+edit.idx);
    const graph=page.getByRole('group',{name:`Process graph for ${run.id}-expanded`,exact:true}),inspection=page.getByRole('complementary',{name:'Step inspector',exact:true});
    await inspection.locator('.step-meta').getByText('#'+edit.idx,{exact:true}).waitFor();await visibleNode(page,graph,edit.idx);await inspection.getByRole('button',{name:'Code Diff',exact:true}).click();
    if(patchEvidence(edit,steps))await inspection.getByLabel('Recorded patch',{exact:true}).waitFor();else await inspection.getByText('No patch recorded',{exact:true}).waitFor();
    await capture(page,'offline-code-evidence');await page.getByRole('button',{name:'Fullscreen graph',exact:true}).click();await page.waitForFunction(()=>!!document.fullscreenElement);await visibleNode(page,graph,edit.idx);await capture(page,'offline-fullscreen');
    await page.getByRole('button',{name:'Exit fullscreen',exact:true}).click();await page.waitForFunction(()=>!document.fullscreenElement);assert.equal(requests,0);assert.deepEqual(errors,[]);
    report.offline={httpRequests:requests,pageErrors:errors.length,codeEvidence:true,fullscreen:true};await context.close();
  }
  writeFileSync(join(output,'verification.json'),JSON.stringify(report,null,2)+'\n');console.log(`PASS reading graph: ${steps.length} sources; ${report.captures.length} captures; ${report.nativePatches} saved patches / ${report.derivedComparisons} derived comparisons; ${report.timestamps} timestamps`);
}finally{await browser.close();}
