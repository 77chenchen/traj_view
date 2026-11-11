import { useState, type ReactNode } from 'react';
import { type Outcome, type Run, percent } from './model';

const paths = {
  logo: 'M5 18l5-12 4 8 5-7M5 18h.01M10 6h.01M14 14h.01M19 7h.01',
  runs: 'M4 5h16v14H4zM4 10h16M9 10v9M4 14.5h16',
  graph: 'M8 8l8 8m0-8L8 16M4 4h4v4H4zM16 4h4v4h-4zM4 16h4v4H4zM16 16h4v4h-4z',
  compare: 'M4 4h6v16H4zm10 0h6v16h-6zM6 8h2m8 4h2m-12 4h2m8 1h2',
  sankey: 'M4 5h3v5H4zm0 10h3v4H4zm13-10h3v4h-3zm0 8h3v6h-3zM7 7c5 0 5 8 10 8M7 17c5 0 5-10 10-10',
  search: 'M15.5 15.5L20 20m-3-9a6 6 0 1 1-12 0 6 6 0 0 1 12 0z',
  download: 'M12 3v12m-4-4 4 4 4-4M5 16v4h14v-4',
  arrow: 'M5 12h14m-6-6 6 6-6 6',
  left: 'M15 6l-6 6 6 6',
  right: 'M9 6l6 6-6 6',
  down: 'M6 9l6 6 6-6',
  close: 'M6 6l12 12M18 6 6 18',
  sun: 'M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5m-3 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0z',
  moon: 'M20 15A8.5 8.5 0 0 1 9 4a8.5 8.5 0 1 0 11 11z',
  database: 'M4 7c0-2 16-2 16 0v10c0 3-16 3-16 0V7zm0 0c0 3 16 3 16 0M4 12c0 3 16 3 16 0',
  layers: 'M12 3l9 5-9 5-9-5 9-5zm-9 9 9 5 9-5m-18 4 9 5 9-5',
  target: 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0zm-5 0a4 4 0 1 1-8 0 4 4 0 0 1 8 0z',
  model: 'M8 8h8v8H8zM4 4h16v16H4zM9 1v3m6-3v3M9 20v3m6-3v3M1 9h3m-3 6h3m16-6h3m-3 6h3',
  check: 'M5 12l4 4L19 6',
  info: 'M12 11v6m0-10h.01m9 5a9 9 0 1 1-18 0 9 9 0 0 1 18 0z',
  play: 'M8 5l12 7-12 7V5z',
  pause: 'M9 5v14m6-14v14',
  plus: 'M5 12h14M12 5v14',
  minus: 'M5 12h14',
  fit: 'M9 4H4v5m11-5h5v5M4 15v5h5m11-5v5h-5',
  copy: 'M8 8h12v12H8zM16 4H4v12',
} as const;

export type IconName = keyof typeof paths;
export function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth={1.65} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={paths[name]} />
  </svg>;
}

export function Heading({ title, children, actions }: { title: string; children?: ReactNode; actions?: ReactNode }) {
  return <header className="page-heading">
    <div><h1>{title}</h1>{children && <p>{children}</p>}</div>
    {actions && <div className="heading-actions">{actions}</div>}
  </header>;
}

export function OutcomeBadge({ outcome }: { outcome: Outcome }) {
  const detail = [outcome.finish_reason, outcome.partial_score == null ? null : `Partial score ${outcome.partial_score}`]
    .filter(Boolean).join(' · ');
  return <span className={`outcome ${outcome.passed === true ? 'passed' : outcome.passed === false ? 'failed' : ''}`}
    title={detail || outcome.label}>
    <span aria-hidden="true" />{outcome.label}
  </span>;
}

export function Empty({ icon = 'runs', title, children, actions }: {
  icon?: IconName; title: string; children?: ReactNode; actions?: ReactNode;
}) {
  return <div className="empty">
    <div className="empty-icon"><Icon name={icon} size={27} /></div>
    <h2>{title}</h2>
    {children && <p>{children}</p>}
    {actions}
  </div>;
}

export function Loading({ children }: { children: ReactNode }) {
  return <div className="loading" role="status"><span />{children}</div>;
}

export function LoadError({ message, retry }: { message: string; retry: () => void }) {
  return <div className="notice error" role="alert">
    <Icon name="info" /><span>{message}</span><button className="button small" onClick={retry}>Retry</button>
  </div>;
}

export function Stat({ icon, label, value, detail }: {
  icon: IconName; label: string; value: ReactNode; detail?: ReactNode;
}) {
  return <div className="stat">
    <div className="stat-label"><span className="stat-icon"><Icon name={icon} size={16} /></span>{label}</div>
    <strong>{value}</strong>{detail && <small>{detail}</small>}
  </div>;
}

export function PassStat({ runs }: { runs: Run[] }) {
  const reported = runs.filter((run) => run.outcome.passed != null);
  const passed = reported.filter((run) => run.outcome.passed).length;
  return <Stat icon="check" label="Source pass rate" value={reported.length ? percent.format(passed / reported.length) : '—'}
    detail={reported.length ? `${passed} of ${reported.length} reported outcomes` : 'No pass status reported'} />;
}

export function download(content: Blob, filename: string) {
  const href = URL.createObjectURL(content);
  const link = document.createElement('a');
  link.href = href;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(href), 1000);
}

function csvCell(value: unknown) {
  let cell = value == null ? '' : typeof value === 'object' ? JSON.stringify(value) : String(value);
  if (typeof value === 'string' && /^[\s\uFEFF]*[=+@-]/u.test(cell)) cell = "'" + cell;
  return '"' + cell.replaceAll('"', '""') + '"';
}

export function exportMetrics(runs: Run[]) {
  if (!runs.length) return;
  const metricKeys = Object.keys(runs[0].metrics) as (keyof Run['metrics'])[];
  const rows = [
    ['run_id', 'task_id', 'model', 'agent', 'condition', 'source_format', 'outcome', 'passed', ...metricKeys],
    ...runs.map((run) => [run.id, run.task_id, run.model, run.agent, run.condition, run.source_format, run.outcome.label,
      run.outcome.passed, ...metricKeys.map((key) => run.metrics[key])]),
  ];
  download(new Blob([rows.map((row) => row.map(csvCell).join(',')).join('\r\n') + '\r\n'],
    { type: 'text/csv;charset=utf-8' }), 'trajviz-metrics.csv');
}

export function CopyButton({ text }: { text: string }) {
  const [status, setStatus] = useState('');
  async function copy() {
    try {
      if (navigator.clipboard?.writeText) {
        try {
          await navigator.clipboard.writeText(text);
          setStatus('Copied');
          return;
        } catch { /* Try the selection fallback for local reports. */ }
      }
      const field = document.createElement('textarea');
      const focused = document.activeElement;
      field.value = text;
      field.style.position = 'fixed';
      field.style.opacity = '0';
      document.body.append(field);
      field.select();
      try {
        if (!document.execCommand('copy')) throw new Error('Clipboard unavailable');
      } finally {
        field.remove();
        if (focused instanceof HTMLElement) focused.focus();
      }
      setStatus('Copied');
    } catch {
      setStatus('Copy failed');
    }
  }

  return <button className="button small quiet" onClick={copy}>
    <Icon name="copy" size={14} /><span aria-live="polite">{status || 'Copy'}</span>
  </button>;
}
