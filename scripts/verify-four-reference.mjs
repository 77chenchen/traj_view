import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { frontendRequire,root } from './frontend-dependencies.mjs';
import { checkFourReference } from '../tests/e2e/four-reference.mjs';
const {chromium}=frontendRequire('playwright');
const artifacts=join(root,'test-results/four-reference');
mkdirSync(artifacts,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
const result={chrome:browser.version()};
try {
 for(const offline of [false,true]) {
  const context=await browser.newContext({viewport:{width:1586,height:912},locale:'en-US',offline,serviceWorkers:'block'});
  if(offline)await context.route(/^https?:\/\//,r=>r.abort());
  const page=await context.newPage();page.setDefaultTimeout(12000);
  result[offline?'offline':'local']=await checkFourReference(page,offline?pathToFileURL(join(root,'trajviz-report.html')).href:(process.env.TRAJVIZ_URL||'http://127.0.0.1:8765/'),artifacts,offline);
  await context.close();
 }
 writeFileSync(join(artifacts,'verification.json'),JSON.stringify(result,null,2)+'\n');
 console.log('PASS four-reference local and offline operation chains; 1586/1280/390; zero page errors and offline HTTP');
} catch(error) {
 writeFileSync(join(artifacts,'verification-failure.txt'),error.stack+'\n');
 throw error;
} finally {await browser.close();}
