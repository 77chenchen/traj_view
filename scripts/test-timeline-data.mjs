import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {frontendRequire,root} from './frontend-dependencies.mjs';
const ts=frontendRequire('typescript');
const code=ts.transpileModule(readFileSync(join(root,'frontend/src/timelineData.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {timelineTokens}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
let cases=0;
for(const count of [0,1,12,96,500,2000])for(const zoom of [.125,.25,.5,1,2,4,8])for(const style of ['ordinal','simultaneous','irregular']){
  let x=0;
  const points=Array.from({length:count},(_,position)=>{x+=style==='simultaneous'?0:style==='ordinal'?650/Math.max(1,count-1)*zoom:(position%7)*zoom;return{position,x};});
  const tokens=timelineTokens(points);
  assert.deepEqual(tokens.flatMap(t=>t.positions),points.map(p=>p.position),'Grouping retains every exact source position once in order');
  for(let i=0;i<tokens.length;i++){
    const token=tokens[i];assert.ok(token.width>0&&token.width<=96);
    const members=token.positions.map(p=>points[p]);
    assert.equal(token.x,(members[0].x+members.at(-1).x)/2,'A group is centered on its saved event range');
    if(i)assert.ok(tokens[i-1].x+tokens[i-1].width/2<token.x-token.width/2,'Adjacent tokens never overlap');
  }
  cases++;
}
console.log(`PASS timeline density: ${cases} layouts; exact ordered source coverage, simultaneous timestamps and no overlapping tokens`);
