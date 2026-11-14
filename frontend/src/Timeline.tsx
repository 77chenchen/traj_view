import { useEffect, useMemo, useRef, useState } from 'react';
import { type GraphNode, type Run, type Step, type StepIndex, sourceIndex } from './model';
import { categoryName, clock, failed, fullScreen, label, patchStats } from './Evidence';
import { Icon } from './ui';

export function useTimeAxis(steps: Step[]) {
  return useMemo(() => {
    const times = steps.map(s => s.ts ? Date.parse(s.ts) : NaN);
    const timed = times.length > 1 && times.every(Number.isFinite) && times.every((t,i) => !i || t >= times[i-1]) && times.at(-1)! > times[0];
    const values = steps.map((_,i) => timed ? (times[i]-times[0])/1000 : i);
    return {timed, values, span:Math.max(timed ? .001 : 1, values.at(-1) ?? 0)};
  },[steps]);
}
export function EventTimeline({ runId, steps, nodes, selected, select }: {
  runId: string; steps: Step[]; nodes: GraphNode[]; selected: StepIndex; select: (idx: StepIndex) => void;
}) {
  const [zoom,setZoom] = useState(1);
  const [stages,setStages] = useState(true);
  const [events,setEvents] = useState(true);
  const scroll = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLElement>(null);
  const [viewportWidth,setViewportWidth] = useState(650);
  useEffect(() => {
    const target=scroll.current;if(!target)return;
    const observer=new ResizeObserver(() => setViewportWidth(target.clientWidth));observer.observe(target);return () => observer.disconnect();
  },[]);
  const {timed,values,span}=useTimeAxis(steps);
  const baseWidth=Math.max(650,viewportWidth-24)-144;
  const plotWidth=baseWidth*zoom, pointWidth=12*zoom, edgePadding=Math.max(8,pointWidth/2+2);
  const toX=(value:number)=>value/span*plotWidth;
  const displaySpan = Math.max(span, span / zoom);
  const desired=Math.max(timed ? .001 : 1,span/(4*zoom));
  const magnitude=10**Math.floor(Math.log10(desired));
  const tickStep=[1,2,5,10].find(f=>f*magnitude>=desired)!*magnitude;
  const ticks=Array.from({length:Math.floor(displaySpan/tickStep)+1},(_,i)=>i*tickStep);
  if(displaySpan-ticks.at(-1)!>tickStep*1e-8)ticks.push(displaySpan);
  const format=(v:number)=>timed ? span<1 ? (v*1000).toFixed(0)+'ms' : clock(v) : String(v+1);
  const by=new Map(nodes.map(n=>[String(n.first_idx),n]));
  useEffect(() => {
    const viewport=scroll.current;
    const point=viewport?.querySelector('.timeline-event[aria-pressed="true"]');
    if(!viewport||!point)return;
    const a=point.getBoundingClientRect(),b=viewport.getBoundingClientRect();
    const start=b.left+156,end=b.right-20;
    if(a.left<start)viewport.scrollLeft-=start-a.left;
    else if(a.right>end)viewport.scrollLeft+=a.right-end;
  },[selected,zoom,viewportWidth,events]);
  const lanes=[
    {name:'User Task',icon:'user' as const,accepts:(s:Step,i:number)=>i===0&&!s.action},
    {name:'Reasoning (recorded text)',icon:'spark' as const,accepts:(s:Step)=>Boolean(s.thought)&&!s.tags.includes('final_message')},
    {name:'Tool Calls',icon:'terminal' as const,accepts:(s:Step)=>Boolean(s.action)},
    {name:'File Changes',icon:'file' as const,accepts:(s:Step)=>by.get(String(s.idx))?.category==='edit'},
    {name:'Sub-agents',icon:'layers' as const,accepts:()=>false},
    {name:'Final Answer',icon:'check' as const,accepts:(s:Step)=>s.tags.includes('final_message')},
  ];
  const segments: {start:number;end:number;step:Step;name:string}[]=[];
  steps.forEach((s,i) => {
    const name=failed(s)?'Error':s.tags.includes('final_message')?'Completion':
      by.get(String(s.idx))?.category==='validate'&&s.observation?.exit_code===0?'Validation Passed':by.get(String(s.idx))?.category ?? 'text';
    const prev=segments.at(-1);if(prev?.name===name)prev.end=i;else segments.push({start:i,end:i,step:s,name});
  });
  return <section className="panel event-timeline" aria-label="Execution timeline" ref={panel}>
    <div className="panel-head"><div><h2>Execution Timeline <small>({runId})</small></h2></div><div className="timeline-zoom">
      <button className="button small" aria-label="Fit timeline" onClick={()=>setZoom(1)}>Fit</button>
      <div className="segments">{[60,120,300].map(s=><button key={s} aria-label={s/60+' minute timeline scale'} aria-pressed={timed&&Math.abs(span/zoom-s)<.1} disabled={!timed} title={timed?'Show '+s+' seconds per viewport':'Timestamps unrecorded; use ordinal zoom'} onClick={()=>setZoom(Math.max(.05,Math.min(8,span/s)))}>{s/60}m</button>)}</div>
      <button className="button small icon-button" aria-label="Zoom out timeline" disabled={zoom<=.125} onClick={()=>setZoom(Math.max(.125,zoom/2))}><Icon name="minus" size={14}/></button>
      <button className="button small icon-button" aria-label="Zoom in timeline" disabled={zoom>=8} onClick={()=>setZoom(Math.min(8,zoom*2))}><Icon name="plus" size={14}/></button>
      <label><input type="checkbox" checked={stages} onChange={e=>setStages(e.target.checked)}/>Stages</label><label><input type="checkbox" checked={events} onChange={e=>setEvents(e.target.checked)}/>Events</label>
      <button className="button small icon-button" aria-label="Fullscreen timeline" onClick={()=>fullScreen(panel.current)}><Icon name="fit" size={15}/></button>
    </div></div>
    <div className="event-timeline-scroll" ref={scroll}><div className="event-timeline-inner" style={{width:Math.max(baseWidth,plotWidth)+144+2*edgePadding}}>
      <div className="event-axis"><span>{timed?'Elapsed':'Step'}</span><div style={{marginInline:edgePadding}}>{ticks.map(v=><span key={v} data-timeline-tick={v} style={{left:toX(v)}}>{format(v)}</span>)}</div></div>
      {stages&&<div className="stage-axis"><strong>Stages</strong><div style={{marginInline:edgePadding}}>{segments.map((s,i)=><button key={i} className={'phase-arrow '+(failed(s.step)?'phase-failed':s.name==='Validation Passed'?'phase-success':'')} data-phase-source={String(s.step.idx)} aria-label={'Phase '+s.name+' source '+sourceIndex(s.step.idx)} style={{left:toX(values[s.start]),width:Math.max(3,toX((values[s.end+1]??span)-values[s.start]))}} title={s.name+' · '+sourceIndex(s.step.idx)+' · phase band between recorded events'} onClick={()=>select(s.step.idx)}>{s.name}</button>)}</div></div>}
      {lanes.map(lane=><div className="event-lane" key={lane.name}><strong><Icon name={lane.icon} size={16}/>{lane.name}</strong><div style={{marginInline:edgePadding}}>
        {ticks.map(v=><i key={v} className="timeline-gridline" data-timeline-tick={v} style={{left:toX(v)}} aria-hidden="true"/>)}
        {events&&steps.map((s,i)=>lane.accepts(s,i)&&<button key={String(s.idx)} className={'timeline-event '+(failed(s)?'failed':by.get(String(s.idx))?.category||'message')}
          data-timeline-value={values[i]} style={{left:toX(values[i]),width:pointWidth}} aria-pressed={s.idx===selected}
          aria-label={lane.name==='Tool Calls'?(failed(s)?'Errors: '+sourceIndex(s.idx)+' error':'Tool calls: '+sourceIndex(s.idx)+' '+s.action?.tool):lane.name+': '+sourceIndex(s.idx)}
          title={sourceIndex(s.idx)+' · '+label(s)+' · '+(timed?'timestamp point, duration unrecorded':'source step position')} onClick={()=>select(s.idx)}>
          {steps.length<=16&&<span className="timeline-point-label">{lane.name==='File Changes'?s.action?.targets[0]+' +'+(patchStats(s).added??'?')+' −'+(patchStats(s).removed??'?'):s.action?.tool||by.get(String(s.idx))?.category||'text'}</span>}</button>)}
        {lane.name==='Sub-agents'&&<span className="empty-lane">Per-step agent identity unrecorded</span>}
      </div></div>)}
    </div></div>
    <p className="timeline-footnote"><span>{timed?'Recorded timestamp points · no call durations recorded':'Source step position · complete monotonic timestamps unavailable'}</span> <span>· Phase bands connect event positions; lanes do not imply parallelism.</span></p>
  </section>;
}
export function AgentActivity({ run,steps,nodes,select }: {run:Run;steps:Step[];nodes:GraphNode[];select:(idx:StepIndex)=>void}) {
  const [view,setView]=useState('agent');
  const {timed,values,span}=useTimeAxis(steps);
  const by=new Map(nodes.map(n=>[String(n.first_idx),n]));
  const rows=view==='agent'?[run.agent||'Agent unrecorded']:['Reasoning','Tool Calls','File Changes','Final Answer'];
  return <section className="panel agent-activity" aria-label="Agent activity timeline"><div className="panel-head"><div><h2>Agent Activity Timeline <Icon name="info" size={14}/></h2><p>{timed?'Recorded event points over '+clock(span):'Source step position'} · active duration and per-step agents unrecorded</p></div><label>View: <select aria-label="Activity grouping" value={view} onChange={e=>setView(e.target.value)}><option value="agent">By Agent</option><option value="category">By Category</option></select></label><button className="button small icon-button" aria-label="Expand activity timeline" onClick={e=>fullScreen(e.currentTarget.closest('section'))}><Icon name="fit" size={14}/></button></div>
    <div className="activity-table"><div className="activity-row activity-ruler"><strong>Agent / Category</strong><span>Total Active</span><div>{[0,.25,.5,.75,1].map(v=><time key={v} style={{left:v*100+'%'}}>{timed?clock(v*span):Math.round(v*span)+1}</time>)}</div></div>
      {rows.map(row=><div className="activity-row" key={row}><strong><Icon name={view==='agent'?'user':'events'} size={15}/>{row}</strong><span className="muted">Unrecorded</span><div>{steps.map((s,i)=>(view==='agent'||categoryName(s,by.get(String(s.idx)))===row)&&<button key={String(s.idx)} className={failed(s)?'failed':''} style={{left:values[i]/span*100+'%'}} title={sourceIndex(s.idx)+' · '+label(s)} aria-label={'Activity '+sourceIndex(s.idx)} onClick={()=>select(s.idx)}/>)}</div></div>)}
    </div>
  </section>;
}
