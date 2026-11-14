import {mkdirSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {frontendRequire,root} from './frontend-dependencies.mjs';
import {checkDensity} from '../tests/e2e/density.mjs';
const {chromium}=frontendRequire('playwright');
const artifacts=join(root,'test-results/density');mkdirSync(artifacts,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
const results={chrome:browser.version()};
try {
  for(const offline of [false,true]) {
    const context=await browser.newContext({viewport:{width:1586,height:912},locale:'en-US',offline,serviceWorkers:'block'});
    if(offline)await context.route(/^https?:\/\//,r=>r.abort());
    const page=await context.newPage();page.setDefaultTimeout(12000);
    try {results[offline?'offline':'local']=await checkDensity(page,offline?pathToFileURL(join(root,'trajviz-report.html')).href:(process.env.TRAJVIZ_URL||'http://127.0.0.1:8765/'),artifacts,offline);}
    catch(error){await page.screenshot({path:join(artifacts,'failure.png')}).catch(()=>{});throw error;}
    finally {await context.close();}
  }
  writeFileSync(join(artifacts,'verification.json'),JSON.stringify(results,null,2)+'\n');
  console.log('PASS information hierarchy; four views at 1586/1280/390; source identity; local and exact offline HTML');
}finally {await browser.close();}
