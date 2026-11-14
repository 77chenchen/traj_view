import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { frontendRequire, root } from './frontend-dependencies.mjs';
const {chromium}=frontendRequire('playwright');
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
const dest=join(root,'test-results/four-reference');
mkdirSync(dest,{recursive:true});
const errors=[];
try {
 const context=await browser.newContext({viewport:{width:1586,height:912},locale:'en-US'});
 const page=await context.newPage();
 page.on('pageerror',e=>errors.push(e.message));
 for(const view of ['replay','timeline','graph','compare']) {
  const hash=new URLSearchParams({view,run:'dashboard-baseline',step:view==='timeline'?'50':'60'});
  if(view==='compare') {hash.append('compare','dashboard-short');hash.append('compare','dashboard-baseline');}
  await page.goto('http://127.0.0.1:8765/#'+hash);
  await page.getByRole('heading',{level:1}).waitFor();
  if(view==='graph')await page.locator('[data-node]').first().waitFor();
  else if(view==='compare')await page.locator('.reference-compare-grid').waitFor();
  else if(view==='timeline')await page.locator('.timeline-event-table').waitFor();
  else await page.getByRole('slider',{name:'Replay position',exact:true}).waitFor();
  await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  await page.screenshot({path:join(dest,view+'-desktop.png')});
  await page.screenshot({path:join(dest,view+'-full.png'),fullPage:true});
  console.log(view,await page.evaluate(()=>({w:innerWidth,h:innerHeight,sw:document.documentElement.scrollWidth,sh:document.documentElement.scrollHeight,panes:[...document.querySelectorAll('.replay-workspace,.timeline-workspace,.graph-workspace,.replay-transport,.reference-compare-grid')].map(n=>({class:n.className,...n.getBoundingClientRect().toJSON()}))})));
 }
 writeFileSync(join(dest,'initial-errors.json'),JSON.stringify(errors));
} finally {await browser.close();}
