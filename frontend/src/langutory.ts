import { useEffect, useState } from 'react';
import type { Run } from './model';

const source = [
  'self.onmessage = ({ data }) => {',
  '  try {',
  '    const pattern = new RegExp(data.regex);',
  '    self.postMessage({ ids: data.runs.filter((run) => pattern.test(run.langutory)).map((run) => run.id) });',
  '  } catch (error) { self.postMessage({ error: "Invalid pattern. " + error.message }); }',
  '};',
].join('\n');

type Result = { matches?: Set<string>; error?: string };
const empty: Result = {};

export function useLangutory(regex: string, runs: Run[]) {
  const [result, setResult] = useState<{ regex: string; runs: Run[]; result: Result }>();
  useEffect(() => {
    if (!regex) return;
    const url = URL.createObjectURL(new Blob([source], { type: 'text/javascript' }));
    let worker: Worker;
    try {
      worker = new Worker(url);
    } catch {
      URL.revokeObjectURL(url);
      setResult({ regex, runs, result: { error: 'Pattern search is unavailable in this browser.' } });
      return;
    }
    const finish = (result: Result) => {
      window.clearTimeout(timeout);
      worker.terminate();
      setResult({ regex, runs, result });
    };
    const timeout = window.setTimeout(() => finish({ error: 'Pattern search timed out. Try a simpler expression.' }), 1000);
    worker.onmessage = ({ data }: MessageEvent<{ ids?: string[]; error?: string }>) => {
      finish(data.error ? { error: data.error } : { matches: new Set(data.ids) });
    };
    worker.onerror = () => finish({ error: 'Pattern search is unavailable in this browser.' });
    worker.postMessage({ regex, runs: runs.map(({ id, langutory }) => ({ id, langutory })) });
    return () => {
      window.clearTimeout(timeout);
      worker.terminate();
      URL.revokeObjectURL(url);
    };
  }, [regex, runs]);
  return regex && result?.regex === regex && result.runs === runs ? result.result : empty;
}
