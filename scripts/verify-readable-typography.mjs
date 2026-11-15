import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {frontendRequire,root} from './frontend-dependencies.mjs';

const {chromium}=frontendRequire('playwright');
const output=join(root,'docs/research/readable-typography');
mkdirSync(output,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
const report={chrome:browser.version(),fixtures:'Public labeled synthetic traces only',captures:[],fonts:[],errors:[],offlineHttp:[]};
const settle=page=>page.evaluate(async()=>{await document.fonts.ready;await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));});
const inspect=page=>page.getByRole('complementary',{name:'Step inspector',exact:true});
try {
  for(const offline of [false,true]) {
    const context=await browser.newContext({viewport:{width:1586,height:912},locale:'en-US',offline,serviceWorkers:'block'});
    const page=await context.newPage();page.setDefaultTimeout(12000);
    page.on('pageerror',e=>report.errors.push(e.message));
    if(offline) { page.on('request',r=>{if(/^https?:/.test(r.url()))report.offlineHttp.push(r.url());});await context.route(/^https?:/,r=>r.abort()); }
    const url=offline?pathToFileURL(join(root,'trajviz-report.html')).href:(process.env.TRAJVIZ_URL||'http://127.0.0.1:8765/');
    const open=async hash=>{await page.goto(url+'#'+hash);await page.reload();};
    const capture=async(file,fixture,source)=>{
      await page.mouse.move(0,0);await settle(page);
      const data=await page.screenshot({path:join(output,file),fullPage:true,animations:'disabled'});
      assert.equal(data.readUInt32BE(16),page.viewportSize().width);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),page.viewportSize().width,'No page-level horizontal overflow');
      report.captures.push({file,fixture,source,url:page.url(),mode:offline?'offline':'local',...page.viewportSize(),imageHeight:data.readUInt32BE(20),fullPage:true,scroll:await page.evaluate(()=>scrollY)});
    };
    for(const [width,height] of [[1586,912],[1280,800]]) {
      await page.setViewportSize({width,height});
      await open('view=graph&run=node-types-synthetic');await page.locator('[data-node]').first().waitFor();
      await page.getByRole('button',{name:'Fullscreen graph',exact:true}).click();await page.waitForFunction(()=>!!document.fullscreenElement);
      const search=page.getByRole('searchbox',{name:/Find a node in/});await search.fill('#60');await search.press('Enter');
      await inspect(page).getByRole('button',{name:'Code Diff',exact:true}).click();await inspect(page).getByLabel('Recorded patch',{exact:true}).waitFor();await settle(page);
      const fonts=await page.evaluate(()=>{
        const roles={body:'body',navigation:'.sidebar-tabs button',node:'.graph-node [data-node-title]',selected:'.inspection-status strong',label:'.step-meta dt',value:'.step-meta dd:not(.mono)',source:'.step-meta .source-identity',code:'.inspector .code-lines',path:'.recorded-path',tab:'.inspector-tabs button',toolbar:'.graph-toolbar .button'};
        return{roles:Object.fromEntries(Object.entries(roles).map(([role,s])=>{const e=document.querySelector(s),c=getComputedStyle(e);return[role,{family:c.fontFamily,size:parseFloat(c.fontSize),weight:c.fontWeight,lineHeight:c.lineHeight,color:c.color}];})),codeLoaded:[...document.fonts].some(f=>f.family==='JetBrains Mono'&&f.status==='loaded')};
      });
      assert.ok(fonts.codeLoaded);assert.equal(fonts.roles.code.size,15);assert.equal(fonts.roles.body.size,16);
      assert.ok(fonts.roles.selected.size>fonts.roles.value.size&&fonts.roles.value.size>fonts.roles.label.size,'Reading roles have a visible hierarchy');
      const prefix=offline?'offline-':'';report.fonts.push({width,height,offline,...fonts});
      await capture(prefix+'after-'+width+'.png','node-types-synthetic','60');
      await page.getByRole('button',{name:'Exit fullscreen',exact:true}).click();
      if(offline)continue;
      for(const view of ['graph','timeline','replay','compare']) {
        const run='dashboard-baseline';
        await open(`view=${view}&run=${run}&step=60`+(view==='compare'?'&compare=dashboard-baseline&compare=dashboard-variant':''));
        await page.locator({graph:'.graph-frame [data-node]',timeline:'.timeline-event',replay:'.recorded-workspace [aria-label="Recorded patch"]',compare:'.reference-alignment'}[view]).first().waitFor();
        if(view==='graph') {await inspect(page).getByRole('button',{name:'Code Diff',exact:true}).click();await inspect(page).getByLabel('Recorded patch',{exact:true}).waitFor();}
        if(view==='replay')await page.getByRole('button',{name:'Show inspection',exact:true}).click();
        await capture(view+'-'+width+'.png',run,'60');
      }
    }
    await context.close();
  }
  assert.deepEqual(report.errors,[]);assert.deepEqual(report.offlineHttp,[]);
  writeFileSync(join(output,'verification.json'),JSON.stringify(report,null,2)+'\n');
  console.log(`PASS readable typography: ${report.captures.length} full-page captures, two desktop sizes, locally loaded JetBrains Mono, reading hierarchy, no horizontal overflow, zero offline HTTP/page errors`);
} finally {await browser.close();}
