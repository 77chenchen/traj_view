import type { GraphNode, StepIndex } from './model';
import { sourceIndex } from './model';

export function ExecutionContents({node,locate}:{node:GraphNode;locate:(index:StepIndex)=>void}){
  const summary=node.view?.summary;
  if(!summary)return null;
  return <details className="execution-contents">
    <summary>Section contents <span>{summary.description}</span></summary>
    <div>
      <strong>{node.label}</strong><p>{summary.basis}</p>
      <dl>{summary.activities.map(activity=><div key={activity.label}><dt>{activity.label}</dt><dd><button className="button small quiet" onClick={()=>locate(activity.indices[0])}>{activity.count} records · show first</button></dd></div>)}</dl>
      <p>{node.count} source records · {summary.failures} flagged errors · {summary.retries} internal retry links</p>
      <h3>Recorded examples</h3>
      <ul>{summary.examples.map(example=><li key={String(example.index)}><button className="node-result" onClick={()=>locate(example.index)}><b>{sourceIndex(example.index)}</b><span>{example.label}</span></button></li>)}</ul>
    </div>
  </details>;
}
