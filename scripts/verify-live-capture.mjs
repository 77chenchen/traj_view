// Local-only QA: this can capture private trace content. Keep its output ignored.
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { frontendRequire } from './frontend-dependencies.mjs';

const args=process.argv.slice(2);
const option=(name,fallback)=>{const i=args.indexOf(name);return i<0?fallback:args[i+1];};
const url=option('--url','http://127.0.0.1:8766');
assert.match(url,/^http:\/\/127\.0\.0\.1:\d+\/?$/,'QA must stay on loopback');
const output=resolve(option('--output','.workers/local/nl2repo-50-qa'));
const portable=option('--html',null);
const expected=Number(option('--expected-runs','50'));
mkdirSync(output,{recursive:true});
const index=await (await fetch(url+'/data/index.json')).json();
assert.equal(index.schema_version,1);
assert.equal(index.runs.length,expected);
assert.equal(new Set(index.runs.map(run=>run.task_id)).size,expected);
const run=[...index.runs].sort((a,b)=>b.metrics.steps-a.metrics.steps)[0];
assert.ok(run.metrics.steps>1,'At least one actual multi-step trajectory is required');
const payload=await (await fetch(url+'/data/'+run.steps_file)).json();
const source=payload.steps.findLast(step=>step.action);
assert.ok(source,'A recorded tool call is required');
const {chromium}=frontendRequire('playwright',process.env.PLAYWRIGHT_PATH);
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
const report={chrome:browser.version(),runs:index.runs.length,tasks:expected,inspectedRun:run.id,inspectedSource:source.idx,checks:[]};
async function inspect(page,location,offline=false){
  const errors=[];const network=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('request',request=>{if(/^https?:/.test(request.url()))network.push(request.url());});
  await page.goto(location);
  if(!offline){
    await page.getByText(new RegExp(`Live capture · ${expected} runs`)).waitFor();
    await page.getByRole('button',{name:'Pause updates',exact:true}).click();
  }
  await page.getByRole('searchbox',{name:'Search runs and steps',exact:true}).fill(run.id);
  await page.getByRole('button',{name:run.id,exact:true}).click();
  const graph=page.getByRole('group',{name:`Process graph for ${run.id}-expanded`,exact:true});
  await graph.locator('[data-node]').first().waitFor();
  const search=page.getByRole('searchbox',{name:`Find a node in ${run.id}-expanded`,exact:true});
  await search.fill('#'+source.idx);await search.press('Enter');
  const inspector=page.getByRole('complementary',{name:'Step inspector'});
  await inspector.getByText('#'+source.idx,{exact:true}).waitFor();
  await inspector.getByRole('heading',{name:'Raw reference',exact:true}).waitFor();
  await page.getByRole('button',{name:'Hierarchy',exact:true}).click();
  const group=graph.getByRole('button',{name:/^(Loop|Phase) ·/}).first();
  const label=await group.getAttribute('aria-label');
  await group.focus();await group.press('Enter');
  if(label?.startsWith('Loop')){
    const iteration=graph.getByRole('button',{name:/^Iteration 1/}).first();
    await iteration.focus();await iteration.press('Enter');
  }
  assert.ok(await graph.locator('[data-edge-type="structural"]').count()>0);
  await page.getByRole('button',{name:'Zoom in',exact:true}).click();
  await page.getByRole('button',{name:'Zoom out',exact:true}).click();
  await page.evaluate(()=>{document.activeElement?.blur();window.scrollTo(0,0);});
  await page.screenshot({path:join(output,offline?'offline-hierarchy.png':'live-hierarchy.png'),fullPage:true,animations:'disabled'});
  assert.deepEqual(errors,[]);
  if(offline)assert.deepEqual(network,[],'Offline report must make zero HTTP requests');
  else {
    assert.ok(network.every(request=>new URL(request).origin===url.replace(/\/$/,'')),'All live requests stay local');
    await page.getByRole('button',{name:'Resume updates',exact:true}).click();
  }
  report.checks.push({mode:offline?'offline':'live',inspector:true,hierarchy:true,zoom:true,pageErrors:errors.length,httpRequests:network.length});
}
try{
  const live=await browser.newContext({viewport:{width:1440,height:950}});
  await inspect(await live.newPage(),url);await live.close();
  if(portable){
    const offline=await browser.newContext({viewport:{width:1440,height:950},offline:true,serviceWorkers:'block'});
    await offline.route(/^https?:\/\//,route=>route.abort());
    await inspect(await offline.newPage(),pathToFileURL(resolve(portable)).href,true);
    await offline.close();
  }
  writeFileSync(join(output,'browser-report.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report,null,2));
}finally{await browser.close();}
