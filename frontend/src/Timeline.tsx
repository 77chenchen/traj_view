import { useEffect, useMemo, useRef, useState } from 'react';
import { type GraphNode, type Run, type Step, type StepIndex, sourceIndex } from './model';
import { categoryIcon, categoryName, clock, failed, fullScreen, label } from './Evidence';
import { Icon } from './ui';
import { timelineTokens } from './timelineData';

export function useTimeAxis(steps: Step[]) {
  return useMemo(() => {
    const times = steps.map(s => s.ts ? Date.parse(s.ts) : NaN);
    const timed = times.length > 1 && times.every(Number.isFinite) && times.every((t,i) => !i || t >= times[i-1]) && times.at(-1)! > times[0];
    const values = steps.map((_,i) => timed ? (times[i]-times[0])/1000 : i);
    return {timed, values, span:Math.max(timed ? .001 : 1, values.at(-1) ?? 0)};
  },[steps]);
}
export function EventTimeline({ runId, steps, nodes, selected, select, revealDetails }: {
  runId: string; steps: Step[]; nodes: GraphNode[]; selected: StepIndex; select: (idx: StepIndex) => void; revealDetails?: () => void;
}) {
  const [zoom,setZoom] = useState(1);
  const [stages,setStages] = useState(true);
  const [events,setEvents] = useState(true);
  const [openGroup,setOpenGroup] = useState<number[] | null>(null);
  const [fullscreen,setFullscreen] = useState(false);
  const scroll = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLElement>(null);
  const fullscreenButton = useRef<HTMLButtonElement>(null);
  const wasFullscreen = useRef(false);
  const groupButton = useRef<HTMLButtonElement | null>(null);
  const [viewportWidth,setViewportWidth] = useState(650);
  useEffect(() => {
    const target=scroll.current;if(!target)return;
    const observer=new ResizeObserver(() => setViewportWidth(target.clientWidth));observer.observe(target);return () => observer.disconnect();
  },[]);
  const {timed,values,span}=useTimeAxis(steps);
  const edgePadding=54;
  const baseWidth=Math.max(650,viewportWidth-24)-144-2*edgePadding;
  const plotWidth=baseWidth*zoom;
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
  },[selected,zoom,viewportWidth,events,fullscreen]);
  useEffect(() => {
    const update=()=>{
      const next=Boolean(document.fullscreenElement?.contains(panel.current));
      if(wasFullscreen.current&&!next&&!document.fullscreenElement&&panel.current?.closest('.graph-workspace'))requestAnimationFrame(()=>{
        const selectedEvent=panel.current?.querySelector<HTMLButtonElement>('.timeline-event[aria-pressed="true"]');
        (selectedEvent??fullscreenButton.current)?.focus({preventScroll:true});
      });
      wasFullscreen.current=next;setFullscreen(next);
    };
    document.addEventListener('fullscreenchange',update);update();return()=>document.removeEventListener('fullscreenchange',update);
  },[]);
  useEffect(()=>setOpenGroup(null),[zoom,events,runId]);
  useEffect(()=>{if(openGroup)panel.current?.querySelector<HTMLButtonElement>('.timeline-cluster-popover .node-result')?.focus({preventScroll:true});},[openGroup]);
  const closeGroup=()=>{setOpenGroup(null);requestAnimationFrame(()=>groupButton.current?.focus({preventScroll:true}));};
  const toggleFullscreen=()=>{
    if(fullscreen){fullScreen(null);requestAnimationFrame(()=>fullscreenButton.current?.focus({preventScroll:true}));return;}
    revealDetails?.();
    fullScreen(panel.current?.closest<HTMLElement>('.timeline-workspace,.graph-workspace')??panel.current);
  };
  const lanes=[
    {name:'User Task',icon:'user' as const,accepts:(s:Step,i:number)=>i===0&&!s.action},
    {name:'Recorded text',icon:'message' as const,accepts:(s:Step)=>Boolean(s.thought)&&!s.tags.includes('final_message')},
    {name:'Tool Calls',icon:'terminal' as const,accepts:(s:Step)=>Boolean(s.action)},
    {name:'File Changes',icon:'file' as const,accepts:(s:Step)=>by.get(String(s.idx))?.category==='edit'},
    {name:'Sub-agents',icon:'layers' as const,accepts:()=>false},
    {name:'Final Answer',icon:'check' as const,accepts:(s:Step)=>s.tags.includes('final_message')},
  ];
  const segments: {start:number;end:number;step:Step;name:string}[]=[];
  const laneTokens=lanes.map(lane=>timelineTokens(steps.flatMap((step,position)=>lane.accepts(step,position)?[{position,x:toX(values[position])}]:[])));
  const grouped=laneTokens.some(tokens=>tokens.some(token=>token.positions.length>1));
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
      <button ref={fullscreenButton} className="button small icon-button" aria-label={fullscreen?'Exit fullscreen timeline':'Fullscreen timeline'} title={fullscreen?'Exit fullscreen':'Fullscreen with Inspector'} onClick={toggleFullscreen}><Icon name={fullscreen?'close':'fit'} size={15}/></button>
    </div></div>
    <div className="event-timeline-scroll" ref={scroll}><div className="event-timeline-inner" style={{width:Math.max(baseWidth,plotWidth)+144+2*edgePadding}}>
      <div className="event-axis"><span>{timed?'Elapsed':'Step'}</span><div style={{marginInline:edgePadding}}>{ticks.map(v=><span key={v} data-timeline-tick={v} style={{left:toX(v)}}>{format(v)}</span>)}</div></div>
      {stages&&<div className="stage-axis"><strong>Stages</strong><div style={{marginInline:edgePadding}}>{segments.map((s,i)=>{
        const width=Math.max(3,toX((values[s.end+1]??span)-values[s.start]));
        return <button key={i} data-kind={failed(s.step)?'failure':s.name==='Validation Passed'?'validate':by.get(String(s.step.idx))?.category} className={'phase-arrow '+(failed(s.step)?'phase-failed':s.name==='Validation Passed'?'phase-success':'')} data-phase-source={String(s.step.idx)} data-stage-density={width<20?'mark':width<64?'icon':'label'} aria-label={'Phase '+s.name+' source '+sourceIndex(s.step.idx)} style={{left:toX(values[s.start]),width}} title={s.name+' · '+sourceIndex(s.step.idx)+' · phase band between recorded events'} onClick={()=>select(s.step.idx)}>{width>=64?s.name:width>=20?<Icon name={failed(s.step)?'info':categoryIcon(s.step,by.get(String(s.step.idx)))} size={12}/>:null}</button>;
      })}</div></div>}
      {lanes.map((lane,laneIndex)=><div className="event-lane" key={lane.name}><strong title={lane.name}><Icon name={lane.icon} size={16}/>{lane.name}</strong><div style={{marginInline:edgePadding}}>
        {ticks.map(v=><i key={v} className="timeline-gridline" data-timeline-tick={v} style={{left:toX(v)}} aria-hidden="true"/>)}
        {events&&laneTokens[laneIndex].map(token=>{
          const members=token.positions.map(i=>steps[i]),s=members[0],i=token.positions[0],multiple=members.length>1;
          const category=by.get(String(s.idx))?.category||'message',mixed=members.some(s=>by.get(String(s.idx))?.category!==category),hasError=members.some(failed);
          return <button key={members.map(s=>s.idx).join(',')} className={'timeline-event '+(hasError?'failed':category)+(multiple?' event-cluster':'')} data-timeline-sources={members.map(s=>s.idx).join(',')} data-timeline-value={values[i]} data-token-mode={multiple?'group':token.width>=64?'label':'icon'}
            data-cluster-icon={multiple&&token.width>=40?'visible':'hidden'} style={{left:token.x,width:token.width}} aria-pressed={members.some(s=>String(s.idx)===String(selected))}
            aria-label={multiple?lane.name+': '+members.length+' recorded events, source '+sourceIndex(s.idx)+' to '+sourceIndex(members.at(-1)!.idx):lane.name==='Tool Calls'?(failed(s)?'Errors: '+sourceIndex(s.idx)+' error':'Tool calls: '+sourceIndex(s.idx)+' '+s.action?.tool):lane.name+': '+sourceIndex(s.idx)}
            title={multiple?members.length+' recorded events · '+sourceIndex(s.idx)+' → '+sourceIndex(members.at(-1)!.idx)+(hasError?' · contains '+members.filter(failed).length+' failed event(s)':'')+' · click to choose a source':sourceIndex(s.idx)+' · '+label(s)+' · '+(timed?'timestamp point, duration unrecorded':'source step position')}
            onClick={event=>{if(multiple){groupButton.current=event.currentTarget;setOpenGroup(token.positions);}else select(s.idx);}}>
            <Icon name={multiple&&mixed?'layers':categoryIcon(s,by.get(String(s.idx)))} size={13}/>
            {multiple?<span className="timeline-token-count">{members.length}</span>:token.width>=64&&<span className="timeline-token-label">{lane.name==='File Changes'?s.action?.targets[0]?.split('/').at(-1):s.action?.tool||category}</span>}
          </button>;
        })}
        {lane.name==='Sub-agents'&&<span className="empty-lane">Per-step agent identity unrecorded</span>}
      </div></div>)}
    </div></div>
    <div className="timeline-footnote"><span>{timed?'Recorded timestamp points · no call durations recorded':'Source step position · complete monotonic timestamps unavailable'}</span><details className="timeline-reading-guide"><summary><Icon name="info" size={13}/>Reading guide</summary><p>Phase bands connect event positions; lanes do not imply parallelism. Numbered groups contain nearby events; zoom in or click a group to choose a source.{grouped?' Nearby events are grouped at this scale.':''}</p></details></div>
    {openGroup&&<aside className="timeline-cluster-popover" aria-label="Timeline event group" onKeyDown={event=>{if(event.key==='Escape'){event.preventDefault();closeGroup();}}}><div className="panel-head"><h3>{openGroup.length} recorded events</h3><button className="button small icon-button" aria-label="Close event group" onClick={closeGroup}><Icon name="close" size={14}/></button></div><div>{openGroup.map(i=><button className="node-result" key={String(steps[i].idx)} onClick={()=>{select(steps[i].idx);closeGroup();}}><Icon name={categoryIcon(steps[i],by.get(String(steps[i].idx)))} size={14}/><strong>{sourceIndex(steps[i].idx)}</strong><span>{steps[i].action?.tool||'Recorded text'}</span>{failed(steps[i])&&<span className="error-text">Failed</span>}</button>)}</div></aside>}
  </section>;
}
export function AgentActivity({ run,steps,nodes,select,selected }: {run:Run;steps:Step[];nodes:GraphNode[];select:(idx:StepIndex)=>void;selected?:StepIndex|null}) {
  const [view,setView]=useState('agent');
  const {timed,values,span}=useTimeAxis(steps);
  const by=new Map(nodes.map(n=>[String(n.first_idx),n]));
  const rows=view==='agent'?[run.agent||'Agent unrecorded']:['Recorded text','Tool Calls','File Changes','Final Answer'];
  return <section className="panel agent-activity" aria-label="Agent activity timeline"><div className="panel-head"><div><h2>Agent Activity Timeline <Icon name="info" size={14}/></h2><p>{timed?'Recorded event points over '+clock(span):'Source step position'} · active duration and per-step agents unrecorded</p></div><label>View: <select aria-label="Activity grouping" value={view} onChange={e=>setView(e.target.value)}><option value="agent">By Agent</option><option value="category">By Category</option></select></label><button className="button small icon-button" aria-label="Expand activity timeline" onClick={e=>fullScreen(e.currentTarget.closest('section'))}><Icon name="fit" size={14}/></button></div>
    <div className="activity-table"><div className="activity-row activity-ruler"><strong>Agent / Category</strong><span>Total Active</span><div>{[0,.25,.5,.75,1].map(v=><time key={v} style={{left:v*100+'%'}}>{timed?clock(v*span):Math.round(v*span)+1}</time>)}</div></div>
      {rows.map(row=><div className="activity-row" key={row}><strong><Icon name={view==='agent'?'user':'events'} size={15}/>{row}</strong><span className="muted">Unrecorded</span><div>{steps.map((s,i)=>(view==='agent'||categoryName(s,by.get(String(s.idx)))===row)&&<button key={String(s.idx)} className={failed(s)?'failed':''} style={{left:values[i]/span*100+'%'}} title={sourceIndex(s.idx)+' · '+label(s)} aria-label={'Activity '+sourceIndex(s.idx)} aria-pressed={selected==null?undefined:String(selected)===String(s.idx)} onClick={()=>select(s.idx)}/>)}</div></div>)}
    </div>
  </section>;
}
