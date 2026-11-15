import {mkdirSync,readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {frontendRequire,root} from './frontend-dependencies.mjs';
import {checkAnalytics,checkCollapseAll} from '../tests/e2e/analytics.mjs';
const {chromium}=frontendRequire('playwright');
const output=join(root,'docs/research/analytics-workspace');mkdirSync(output,{recursive:true});
const index=JSON.parse(readFileSync(join(root,'out/index.json'),'utf8'));
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
const report={chrome:browser.version(),scope:'Analytics and visible Graph Collapse all; public synthetic fixtures only'};
async function capture(page,name){
  await page.evaluate(async()=>{scrollTo(0,0);await document.fonts.ready;await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));});
  await page.mouse.move(0,0);await page.screenshot({path:join(output,name+'.png'),fullPage:true,animations:'disabled'});
  if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw new Error('Horizontal document overflow in '+name);
}
try{
  for(const offline of [false,true]){
    const context=await browser.newContext({viewport:{width:1586,height:912},locale:'en-US',offline,serviceWorkers:'block'});
    if(offline)await context.route(/^https?:/,route=>route.abort());
    const page=await context.newPage();page.setDefaultTimeout(12000);
    const url=offline?pathToFileURL(join(root,'trajviz-report.html')).href:(process.env.TRAJVIZ_URL||'http://127.0.0.1:8765/');
    try{
      report[offline?'offline':'local']={analytics:await checkAnalytics(page,url,index,output,offline),collapse:await checkCollapseAll(page,url,output,offline)};
      if(!offline){
        await page.setViewportSize({width:1586,height:912});await page.goto(url+'#view=sankey');
        await page.getByRole('button',{name:'Side by side',exact:true}).click();
        await page.getByRole('combobox',{name:'Second group',exact:true}).selectOption('orion-4');
        await capture(page,'analytics-two-groups');
        await page.locator('.analytics-definitions > summary').click();await capture(page,'analytics-definitions');
        await page.getByRole('navigation',{name:'Workspace',exact:true}).getByRole('button',{name:'Runs',exact:true}).click();
        await page.locator('.dataset-utilities > summary').click();await page.getByRole('button',{name:'Dark theme',exact:true}).click();
        await page.getByRole('navigation',{name:'Workspace',exact:true}).getByRole('button',{name:'Sankey',exact:true}).click();
        await capture(page,'analytics-dark');
      }
    }
    catch(error){await page.screenshot({path:join(output,'failure.png'),fullPage:true}).catch(()=>{});throw error;}
    finally{await context.close();}
  }
  const emptyContext=await browser.newContext({viewport:{width:1280,height:800},locale:'en-US'});
  try{
    await emptyContext.route('**/data/index.json',route=>route.fulfill({contentType:'application/json',body:JSON.stringify({...index,runs:[]})}));
    const empty=await emptyContext.newPage();await empty.goto((process.env.TRAJVIZ_URL||'http://127.0.0.1:8765/')+'#view=sankey');
    await empty.getByRole('heading',{name:'No runs to analyze',exact:true}).waitFor();
    if(!await empty.getByRole('button',{name:'Export CSV',exact:true}).isDisabled())throw new Error('Empty data cannot export run metrics');
    await capture(empty,'analytics-empty');report.emptyDataset={syntheticResponse:true,clearEmptyState:true,exportDisabled:true};
  }finally{await emptyContext.close();}
  writeFileSync(join(output,'verification.json'),JSON.stringify(report,null,2)+'\n');
  const captures=readdirSync(output).filter(name=>name.endsWith('.png')&&!/first-pass|failure/.test(name)).sort().map(name=>{
    const buffer=readFileSync(join(output,name));
    const graph=name.includes('collapse-');
    return{file:name,width:buffer.readUInt32BE(16),height:buffer.readUInt32BE(20),sha256:createHash('sha256').update(buffer).digest('hex'),
      origin:'Actual Chrome full-page screenshot; synthetic fixture data; no crop or compositing',
      mode:name.startsWith('offline-')?'network-disabled standalone HTML':'local',
      fixture:graph?'execution-long-synthetic':name.includes('empty')?'isolated synthetic empty index':'public out/index.json',
      source:graph?'10000000000000053':null,fromDocumentTop:true,
      revision:name.includes('before')?'e67113d':'current working tree'};
  });
  writeFileSync(join(output,'capture-manifest.json'),JSON.stringify({chrome:browser.version(),captures},null,2)+'\n');
  console.log('PASS Analytics and Collapse all: scoped metrics, unknown/zero, groups, CSV, review→Graph, two desktop sizes, same-canvas collapse, exact source/pinned patch and network-disabled HTML');
}finally{await browser.close();}
