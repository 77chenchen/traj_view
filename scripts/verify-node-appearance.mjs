import {mkdirSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {frontendRequire,root} from './frontend-dependencies.mjs';
import {checkNodeAppearance} from '../tests/e2e/node-appearance.mjs';
import {checkPlaybackPreferences} from '../tests/e2e/playback-preferences.mjs';
const {chromium}=frontendRequire('playwright');
const artifacts=join(root,'test-results/node-appearance');mkdirSync(artifacts,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
const result={chrome:browser.version(),scope:'Desktop 1586×912 and 1280×800; category silhouettes, fullscreen evidence, shared theme'};
try{
  for(const offline of [false,true]){
    const context=await browser.newContext({viewport:{width:1586,height:912},locale:'en-US',offline,serviceWorkers:'block'});
    if(offline)await context.route(/^https?:\/\//,r=>r.abort());
    const page=await context.newPage();page.setDefaultTimeout(12000);
    try{
      const url=offline?pathToFileURL(join(root,'trajviz-report.html')).href:(process.env.TRAJVIZ_URL||'http://127.0.0.1:8765/');
      result[offline?'offline':'local']=await checkNodeAppearance(page,url,artifacts,offline);
      result[offline?'offline':'local'].playback=await checkPlaybackPreferences(page,url,artifacts,offline);
    }
    catch(error){await page.screenshot({path:join(artifacts,'failure.png'),fullPage:true}).catch(()=>{});throw error;}
    finally{await context.close();}
    writeFileSync(join(artifacts,'verification.json'),JSON.stringify(result,null,2)+'\n');
  }
  console.log('PASS category silhouettes, fullscreen failure/patch/validation, nested diff, stable playback preferences without reload, shared theme, merged inline sections and exact offline HTML');
}finally{await browser.close();}
