import {mkdirSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {frontendRequire,root} from './frontend-dependencies.mjs';
import {checkTimelineWorkspace} from '../tests/e2e/timeline-workspace.mjs';
const {chromium}=frontendRequire('playwright'),artifacts=join(root,'test-results/timeline-workspace');mkdirSync(artifacts,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
const result={chrome:browser.version()};
try{
 for(const offline of [false,true]){
  const context=await browser.newContext({viewport:{width:1586,height:912},offline,serviceWorkers:'block'});
  if(offline)await context.route(/^https?:\/\//,r=>r.abort());
  const page=await context.newPage();page.setDefaultTimeout(12000);
  try{result[offline?'offline':'local']=await checkTimelineWorkspace(page,offline?pathToFileURL(join(root,'trajviz-report.html')).href:process.env.TRAJVIZ_URL||'http://127.0.0.1:8765/',artifacts,offline);}
  catch(error){await page.screenshot({path:join(artifacts,'failure.png'),fullPage:true});throw error;}
  finally{await context.close();}
 }
 writeFileSync(join(artifacts,'verification.json'),JSON.stringify(result,null,2)+'\n');
 console.log('PASS Timeline fixed labels, semantic zoom, precise grouped sources and workspace fullscreen with Inspector, local and offline');
}finally{await browser.close();}
