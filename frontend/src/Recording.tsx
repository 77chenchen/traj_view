import { useState } from 'react';
import { useResource } from './data';
import { type Run, type Step, number } from './model';
import { CopyButton, download, LoadError, Loading } from './ui';

interface Reference { file:string; line:number }
interface StepRecording {
  source_type?:string; role?:string; channel?:string; call_id?:string; wrapper_tool?:string;
  output_timestamp?:string; output_ref?:Reference; call_interval_s?:number|null;
  reported_wall_s?:number; wall_scope?:string; token_scope?:string; token_ref?:Reference;
  token_usage?:Record<string,number>; unmatched_output?:boolean;
}
interface Recording {
  session?:Record<string,string>; raw_records?:number; event_counts?:Record<string,number>;
  steps?:Record<string,StepRecording>; token_totals?:Record<string,number>;
  timing?:{start:{timestamp:string};end:{timestamp:string};elapsed_s:number;scope:string};
  messages?:{role:string;channel?:string;timestamp?:string;text?:string;source_ref:Reference}[];
}
interface Canonical { steps:Step[];meta:{rollout?:Recording;raw_text?:string} }
const seconds=(value:number)=>`${Number(value.toFixed(3))} s`;
const ref=(value:Reference)=>`${value.file}:${value.line}`;

export function StepRecordingFields({run,step,open}:{run:Run;step:Step;open:boolean}) {
  const resource=useResource<Canonical>(open?[run.canonical_file]:[],true);
  const detail=resource.state.status==='ready'?resource.state.data.meta.rollout?.steps?.[String(step.idx)]:undefined;
  return <>
    <div><dt>Recorded timestamp</dt><dd className="mono">{step.ts??'Unrecorded'}</dd></div>
    <div><dt>{detail?.call_interval_s!=null?'Call interval':'Duration'}</dt><dd>{detail?.call_interval_s!=null?<>{seconds(detail.call_interval_s)}<small> · call → matching output, including waits</small></>:'Unrecorded'}</dd></div>
    {resource.state.status==='loading'&&<div><dt>Source metadata</dt><dd>Loading…</dd></div>}
    {resource.state.status==='error'&&<div><dt>Source metadata</dt><dd><LoadError message={resource.state.message} retry={resource.retry}/></dd></div>}
    {detail&&<>
      <div><dt>Source type</dt><dd>{detail.source_type}</dd></div>
      {detail.unmatched_output&&<div><dt>Source mapping</dt><dd>Unmatched tool output<small>Corresponding call not recorded; duration unrecorded.</small></dd></div>}
      {detail.role&&<div><dt>Source role / channel</dt><dd>{detail.role} / {detail.channel??'Unrecorded'}</dd></div>}
      {!detail.role&&detail.channel&&<div><dt>Source channel</dt><dd>{detail.channel}</dd></div>}
      {detail.call_id&&<div><dt>Call ID</dt><dd className="mono">{detail.call_id}<CopyButton label="Copy call ID" text={detail.call_id}/></dd></div>}
      {detail.wrapper_tool&&<div><dt>Recorded wrapper</dt><dd>{detail.wrapper_tool}<small> · one literal call decoded; original input retained in arguments</small></dd></div>}
      {detail.output_timestamp&&<div><dt>Output timestamp</dt><dd className="mono">{detail.output_timestamp}</dd></div>}
      {detail.reported_wall_s!=null&&<div><dt>Reported wall time</dt><dd>{seconds(detail.reported_wall_s)}<small> · {detail.wall_scope}</small></dd></div>}
      {detail.output_ref&&<div><dt>Output reference</dt><dd className="mono">{ref(detail.output_ref)}</dd></div>}
      {detail.token_scope&&<div><dt>Token attribution</dt><dd>{detail.token_scope}</dd></div>}
      {detail.token_usage&&Object.entries(detail.token_usage).filter(([key])=>!['input_tokens','output_tokens'].includes(key)).map(([key,value])=><div key={key}><dt>{key.replaceAll('_',' ')}</dt><dd>{number.format(value)}</dd></div>)}
      {detail.token_ref&&<div><dt>Token reference</dt><dd className="mono">{ref(detail.token_ref)}</dd></div>}
    </>}
  </>;
}

export function SessionRecording({run,open}:{run:Run;open:boolean}) {
  const resource=useResource<Canonical>(open?[run.canonical_file]:[],true);
  const [showMessages,setShowMessages]=useState(false);
  if(resource.state.status==='loading')return <Loading>Loading source metadata…</Loading>;
  if(resource.state.status==='error')return <LoadError message={resource.state.message} retry={resource.retry}/>;
  if(resource.state.status!=='ready')return null;
  const {meta,steps}=resource.state.data,record=meta.rollout;
  const phases=steps.reduce<Record<string,number>>((all,step)=>{const phase=step.phase??'other';all[phase]=(all[phase]??0)+1;return all;},{});
  const phaseSources=steps.reduce<Record<string,number>>((all,step)=>{const source=step.phase_source??'Unrecorded';all[source]=(all[source]??0)+1;return all;},{});
  return <section className="source-recording" aria-label="Recorded session data">
    <h3>Source coverage</h3><dl>
      <div><dt>Timestamps</dt><dd>{steps.filter(step=>step.ts!=null).length} / {steps.length} steps</dd></div>
      {record?.steps&&<div><dt>Source metadata</dt><dd>{Object.keys(record.steps).length} / {steps.length} steps</dd></div>}
      {record?.steps&&Object.values(record.steps).some(step=>step.unmatched_output)&&<div><dt>Unmatched outputs</dt><dd>{Object.values(record.steps).filter(step=>step.unmatched_output).length}<small>Preserved as source steps; corresponding calls unrecorded.</small></dd></div>}
      <div><dt>Response tokens</dt><dd>{steps.filter(step=>step.tokens!=null).length} attributed steps</dd></div>
      <div><dt>Phases</dt><dd>{Object.entries(phases).map(([phase,count])=>`${phase}: ${count}`).join(' · ')}</dd></div>
      <div><dt>Phase sources</dt><dd>{Object.entries(phaseSources).map(([source,count])=>`${source}: ${count}`).join(' · ')}<small>Labels derived during import; unclassified steps remain other.</small></dd></div>
      {record?.raw_records!=null&&<div><dt>Raw records</dt><dd>{number.format(record.raw_records)} · preserved in full source</dd></div>}
      {record?.timing&&<><div><dt>Start</dt><dd className="mono">{record.timing.start.timestamp}</dd></div><div><dt>Completion</dt><dd className="mono">{record.timing.end.timestamp}</dd></div><div><dt>Time basis</dt><dd>{record.timing.scope}</dd></div></>}
      {record?.session&&Object.entries(record.session).filter(([key])=>!['id','timestamp'].includes(key)).map(([key,value])=><div key={key}><dt>{key.replaceAll('_',' ')}</dt><dd>{value}</dd></div>)}
      {record?.token_totals&&Object.entries(record.token_totals).map(([key,value])=><div key={key}><dt>{key.replaceAll('_',' ')}</dt><dd>{number.format(value)}</dd></div>)}
    </dl>
    <p className="muted">Cache and reasoning counters are subsets, not extra tokens. Source timestamps do not establish parallel activity. Cost, missing exit codes and filesystem versions remain unrecorded.</p>
    {record?.event_counts&&<details><summary>Raw event categories</summary><dl>{Object.entries(record.event_counts).map(([key,value])=><div key={key}><dt>{key}</dt><dd>{value}</dd></div>)}</dl></details>}
    {!!record?.messages?.length&&<details onToggle={event=>setShowMessages(event.currentTarget.open)}><summary>Source messages ({record.messages.length})</summary>{showMessages&&record.messages.map((message,i)=><details key={i}><summary>{message.role}{message.channel?' · '+message.channel:''} · {message.timestamp??'Time unrecorded'}</summary><p className="mono">{ref(message.source_ref)}</p><pre>{message.text??'Text unrecorded'}</pre>{message.text&&<CopyButton text={message.text}/>}</details>)}</details>}
    {meta.raw_text&&<button className="button small" onClick={()=>download(new Blob([meta.raw_text!],{type:'application/x-ndjson'}),`${run.id}-recorded-source.jsonl`)}>Download recorded source</button>}
  </section>;
}
