import {mkdirSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {frontendRequire,root} from './frontend-dependencies.mjs';
import {checkNeutralVertical} from '../tests/e2e/neutral-vertical.mjs';
const {chromium}=frontendRequire('playwright'),artifacts=join(root,'test-results/neutral-vertical');mkdirSync(artifacts,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true}),report={chrome:browser.version()};
try{
  for(const offline of [false,true]){
    const context=await browser.newContext({viewport:{width:1586,height:912},locale:'en-US',offline,serviceWorkers:'block'});
    if(offline)await context.route(/^https?:\/\//,route=>route.abort());
    const page=await context.newPage();page.setDefaultTimeout(12000);
    try{report[offline?'offline':'local']=await checkNeutralVertical(page,offline?pathToFileURL(join(root,'trajviz-report.html')).href:process.env.TRAJVIZ_URL||'http://127.0.0.1:8765/',artifacts,offline);}
    catch(error){await page.screenshot({path:join(artifacts,'failure.png'),fullPage:true});throw error;}
    finally{await context.close();}
  }
  writeFileSync(join(artifacts,'verification.json'),JSON.stringify(report,null,2)+'\n');
  console.log('PASS neutral top navigation, white vertical DAG, wheel and modifier zoom, inline expansion, exact source, fullscreen Inspector and current-state SVG; local and offline at both desktop sizes');
}finally{await browser.close();}
