// Isolated, public synthetic recording QA; never reads the active local dataset.
import assert from 'node:assert/strict';
import {execFileSync,spawn} from 'node:child_process';
import {mkdirSync,mkdtempSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {frontendRequire,root} from './frontend-dependencies.mjs';
import {checkRecording} from '../tests/e2e/recording.mjs';

const args=process.argv.slice(2),at=args.indexOf('--output');
const output=resolve(at<0?'test-results/recording':args[at+1]);
const scratch=mkdtempSync(join(tmpdir(),'trajviz-recording-')),input=join(scratch,'input'),dataset=join(scratch,'out'),html=join(scratch,'report.html');
const python=process.env.PYTHON||'python',run=argv=>execFileSync(python,argv,{cwd:root,stdio:'inherit',timeout:120000});
mkdirSync(input);mkdirSync(output,{recursive:true});
let server,browser;
try{
  run(['-c','from pathlib import Path; import runpy, sys; runpy.run_path("tests/e2e/traces.py")["write_recording"](Path(sys.argv[1]))',input]);
  run(['-m','backend.cli','build',input,'-o',dataset,'--redact']);
  run(['-m','backend.cli','export',dataset,'--html',html]);
  server=spawn(python,['-m','backend.cli','serve',dataset,'--port','0'],{cwd:root,stdio:['ignore','pipe','pipe']});
  const url=await new Promise((resolveUrl,reject)=>{
    let log='';const timer=setTimeout(()=>reject(Error('Fixture server startup timed out')),12000);
    const receive=chunk=>{log=(log+chunk).slice(-4096);const match=log.match(/http:\/\/127\.0\.0\.1:\d+/);if(match){clearTimeout(timer);resolveUrl(match[0]+'/');}};
    server.stdout.on('data',receive);server.stderr.on('data',receive);
    server.once('error',error=>{clearTimeout(timer);reject(error);});
    server.once('exit',code=>{clearTimeout(timer);reject(Error('Fixture server exited: '+code));});
  });
  const {chromium}=frontendRequire('playwright');
  browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
  const verification={chrome:browser.version(),source:'Generated qa-recording synthetic fixture',checks:[]};
  for(const offline of [false,true]){
    const context=await browser.newContext({viewport:{width:1586,height:912},locale:'en-US',offline,serviceWorkers:'block'});
    if(offline)await context.route(/^https?:\/\//,route=>route.abort());
    const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));page.setDefaultTimeout(20000);
    const result=await checkRecording(page,offline?pathToFileURL(html).href:url,output,offline);
    assert.deepEqual(errors,[]);verification.checks.push({...result,pageErrors:0,viewports:[[1586,912],[1280,800]],...(offline?{httpRequests:0}:{})});
    await context.close();
  }
  writeFileSync(join(output,'verification.json'),JSON.stringify(verification,null,2)+'\n');
  console.log('PASS recording: native patch, source metadata, messages, tokens, Timeline, Replay and zero-HTTP offline; 16 full-page captures');
}finally{
  await browser?.close();server?.kill('SIGTERM');rmSync(scratch,{recursive:true,force:true});
}
