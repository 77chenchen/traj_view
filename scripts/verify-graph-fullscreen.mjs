import {mkdirSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {frontendRequire,root} from './frontend-dependencies.mjs';
import {checkGraphFullscreen} from '../tests/e2e/graph-fullscreen.mjs';
const {chromium}=frontendRequire('playwright');
const artifacts=join(root,'test-results/graph-fullscreen');mkdirSync(artifacts,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
const result={chrome:browser.version(),scope:'Graph fullscreen; desktop 1586×912 and 1280×800; public synthetic fixtures'};
try{
  for(const offline of [false,true]){
    const context=await browser.newContext({viewport:{width:1586,height:912},locale:'en-US',offline,serviceWorkers:'block'});
    if(offline)await context.route(/^https?:\/\//,r=>r.abort());
    const page=await context.newPage();page.setDefaultTimeout(12000);
    try{result[offline?'offline':'local']=await checkGraphFullscreen(page,offline?pathToFileURL(join(root,'trajviz-report.html')).href:(process.env.TRAJVIZ_URL||'http://127.0.0.1:8765/'),artifacts,offline);}
    catch(error){await page.screenshot({path:join(artifacts,'failure.png'),fullPage:true}).catch(()=>{});throw error;}
    finally{await context.close();}
  }
  writeFileSync(join(artifacts,'verification.json'),JSON.stringify(result,null,2)+'\n');
  console.log('PASS Graph fullscreen: all seven nodes fit, exact-source framing, two-level inspection, missing/recorded patches, bounded activity, camera recovery, focus, SVG/PNG and offline HTML');
}finally{await browser.close();}
