import { useEffect, useState } from 'react';
import { invalidateData, isOffline } from './data';

type LiveState = { enabled: boolean; revision: number; runs: number; error?: string | null; progress?: Record<string, number> };

export function LiveStatus({ liveOnly = false }: { liveOnly?: boolean }) {
  const [status, setStatus] = useState<LiveState | null>(null);
  const [paused, setPaused] = useState(false);
  const [connected, setConnected] = useState(false);
  useEffect(() => {
    if (isOffline) return;
    let active = true;
    let events: EventSource | undefined;
    let previous = -1;
    fetch('/api/live/status').then((response) => response.ok ? response.json() : null).then((initial: LiveState | null) => {
      if (!active || !initial?.enabled) return;
      setStatus(initial);
      if (paused) return;
      events = new EventSource('/api/live/events');
      events.onopen = () => setConnected(true);
      events.onerror = () => setConnected(false);
      events.onmessage = (event) => {
        try {
          const next: LiveState = JSON.parse(event.data);
          setStatus(next);
          if (next.revision !== previous) {
            previous = next.revision;
            invalidateData();
          }
        } catch { setConnected(false); }
      };
    }).catch(() => { /* Static hosting remains fully usable. */ });
    return () => { active = false; events?.close(); };
  }, [paused]);
  if (!status?.enabled) return liveOnly ? null : <div className="source-chip"><i />{isOffline ? 'Offline report' : 'Local dataset'}</div>;
  return <div className="live-status" role="status">
    <span className={`source-chip ${connected && !paused ? 'is-live' : ''}`}><i />
      {paused ? 'Updates paused' : connected ? 'Live capture' : 'Reconnecting'} · {status.runs} runs</span>
    {status.progress && <span className="live-counts">{status.progress.completed ?? 0} completed · {status.progress.running ?? 0} running · {status.progress.failed ?? 0} failed</span>}
    <button className="button small quiet" onClick={() => setPaused(!paused)}>{paused ? 'Resume updates' : 'Pause updates'}</button>
    {status.error && <span className="error-text">{status.error}</span>}
  </div>;
}
