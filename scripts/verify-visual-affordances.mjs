import {mkdirSync,readdirSync,readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {parseArgs} from 'node:util';
import {frontendRequire,root} from './frontend-dependencies.mjs';
import {checkVisualAffordances} from '../tests/e2e/visual-affordances.mjs';
const {chromium}=frontendRequire('playwright');
const {values}=parseArgs({options:{output:{type:'string',default:'docs/research/visual-affordances'},baseline:{type:'string',default:'2d4ab83'}}});
const output=resolve(root,values.output);mkdirSync(output,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
const report={chrome:browser.version(),scope:'Six-route semantic colors and direct evidence navigation. Public synthetic fixtures only.'};
try{
  for(const offline of [false,true]){
    const context=await browser.newContext({viewport:{width:1586,height:912},locale:'en-US',offline,serviceWorkers:'block'});
    if(offline)await context.route(/^https?:/,route=>route.abort());
    const page=await context.newPage();page.setDefaultTimeout(12000);
    try{report[offline?'offline':'local']=await checkVisualAffordances(page,offline?pathToFileURL(join(root,'trajviz-report.html')).href:process.env.TRAJVIZ_URL||'http://127.0.0.1:8765/',output,offline);}
    catch(error){await page.screenshot({path:join(output,'failure.png'),fullPage:true}).catch(()=>{});throw error;}
    finally{await context.close();}
  }
  writeFileSync(join(output,'verification.json'),JSON.stringify(report,null,2)+'\n');
  const captures=readdirSync(output).filter(name=>name.endsWith('.png')&&!/first-pass|failure\.png/.test(name)).sort().map(name=>{
    const buffer=readFileSync(join(output,name));return{file:name,width:buffer.readUInt32BE(16),height:buffer.readUInt32BE(20),sha256:createHash('sha256').update(buffer).digest('hex'),origin:'Full-page Chrome screenshot from document top; synthetic fixtures; no crop/compositing',revision:name.includes('-before')?values.baseline:'current working tree',mode:name.startsWith('offline-')?'network-disabled standalone HTML':'local'};
  });
  writeFileSync(join(output,'capture-manifest.json'),JSON.stringify({chrome:browser.version(),captures},null,2)+'\n');
  console.log('PASS six routes, two desktop sizes, semantic contrast, direct failure→edit→validation, pinned Diff, fullscreen evidence and zero-HTTP offline report');
}finally{await browser.close();}
