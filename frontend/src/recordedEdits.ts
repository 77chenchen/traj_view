import type { Step } from './model';

export interface LiteralWrite { path:string; content:string }
export interface PatchEvidence { text:string; path?:string; note?:string; derived:boolean }

export function savedPatch(step?:Step):string|null{
  for(const value of [step?.action?.args.patch,step?.action?.args.input,step?.action?.args.diff,step?.action?.command])
    if(typeof value==='string'&&/(?:^|\n)(?:@@|\*\*\* (?:Begin Patch|Update File)|--- )/m.test(value))return value;
  return null;
}

// Static decoding only. Never execute trace commands. Reject shell expansion,
// unquoted heredocs, append redirections and ambiguous/dynamic paths.
function shellBody(command:string):string|null{
  const outer=command.match(/^(?:\/[^\s]+\/)?(?:ba|z|da)?sh\s+-[a-z]*c\s+([\s\S]+)$/);
  if(!outer)return command;
  const quoted=outer[1];
  if(quoted[0]==="'"&&quoted.at(-1)==="'"&&!quoted.slice(1,-1).includes("'"))return quoted.slice(1,-1);
  if(quoted[0]!=='"'||quoted.at(-1)!=='"')return null;
  let value='';
  for(let i=1;i<quoted.length-1;i++){
    const char=quoted[i];
    if(char==='\\'&&/["$`\\\n]/.test(quoted[i+1]??'')){if(quoted[i+1]!=='\n')value+=quoted[i+1];i++;}
    else if(char==='$'||char==='`'||char==='"')return null;
    else value+=char;
  }
  return value;
}
function literalPath(token:string):string|null{
  const value=/^(['"])[^'"\n]+\1$/.test(token)?token.slice(1,-1):token;
  return value&&!/[\s$`\\*?;|&<>"']/.test(value)?value.replace(/^\.\//,''):null;
}
export function literalFileWrites(step?:Step):LiteralWrite[]{
  const command=step?.action?.command;
  if(!command||command.length>2_000_000)return [];
  const body=shellBody(command);if(body==null)return [];
  const lines=body.split('\n'),writes:LiteralWrite[]=[];
  const path="((?:'[^'\\n]+'|\"[^\"\\n]+\"|[^\\s<>;&|]+))";
  const first=new RegExp('^cat\\s*>\\s*'+path+'\\s*<<\\s*([\'\"])([A-Za-z_][A-Za-z_0-9]*)\\2\\s*;?\\s*$');
  const second=new RegExp('^cat\\s*<<\\s*([\'\"])([A-Za-z_][A-Za-z_0-9]*)\\1\\s*>\\s*'+path+'\\s*;?\\s*$');
  for(let i=0;i<lines.length;i++){
    const line=lines[i].trim();if(!line)continue;
    // Setup may precede a literal write, but no command after it is interpreted.
    if(/^mkdir\s+-p\s+[\w./ -]+$/.test(line))continue;
    const a=line.match(first),b=line.match(second);
    if(!a&&!b)return [];
    const target=literalPath(a?a[1]:b![3]),delimiter=a?a[3]:b![2];if(!target)return [];
    const start=++i;while(i<lines.length&&lines[i]!==delimiter)i++;
    if(i===lines.length)return [];
    writes.push({path:target,content:lines.slice(start,i).join('\n')+'\n'});
  }
  return writes;
}

function unified(path:string,before:string,after:string):string{
  const lines=(value:string)=>{const result=value.split('\n');if(result.at(-1)==='')result.pop();return result;};
  const a=lines(before),b=lines(after),rows:string[]=[];
  // Bound work for large recorded files; a whole-file replacement is still a
  // valid comparison when computing a minimal edit script would be expensive.
  if(a.length*b.length>250_000){rows.push(...a.map(line=>'-'+line),...b.map(line=>'+'+line));}
  else{
    const table=Array.from({length:a.length+1},()=>new Uint32Array(b.length+1));
    for(let i=a.length-1;i>=0;i--)for(let j=b.length-1;j>=0;j--)table[i][j]=a[i]===b[j]?table[i+1][j+1]+1:Math.max(table[i+1][j],table[i][j+1]);
    let i=0,j=0;
    while(i<a.length||j<b.length){
      if(i<a.length&&j<b.length&&a[i]===b[j]){rows.push(' '+a[i]);i++;j++;}
      else if(i<a.length&&(j===b.length||table[i+1][j]>=table[i][j+1]))rows.push('-'+a[i++]);
      else rows.push('+'+b[j++]);
    }
  }
  return [`--- a/${path}`,`+++ b/${path}`,`@@ -${a.length?1:0},${a.length} +${b.length?1:0},${b.length} @@`,...rows].join('\n');
}
export function patchEvidence(step:Step|undefined,steps:readonly Step[]=[]):PatchEvidence|null{
  const saved=savedPatch(step);if(saved)return {text:saved,derived:false};
  if(!step||step.observation?.exit_code!==0)return null;
  const ordinal=steps.findIndex(s=>String(s.idx)===String(step.idx));
  const previous=steps.slice(0,Math.max(0,ordinal)).filter(s=>!!s.action).at(-1);
  if(previous?.observation?.exit_code!==0)return null;
  const before=literalFileWrites(previous),after=literalFileWrites(step);
  const changes=after.flatMap(file=>{
    const prior=before.find(old=>old.path===file.path);
    return prior&&prior.content!==file.content?[{path:file.path,text:unified(file.path,prior.content,file.content)}]:[];
  });
  if(!changes.length)return null;
  return {text:changes.map(change=>change.text).join('\n'),path:changes.map(change=>change.path).join(', '),derived:true,
    note:`Submitted write comparison · source #${previous!.idx} → #${step.idx}. Derived from consecutive literal writes with exit 0; filesystem versions were not recorded.`};
}
