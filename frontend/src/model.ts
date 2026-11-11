export interface Phase {
  id: string;
  label: string;
  symbol: string;
  color: string;
}

export interface Outcome {
  label: string;
  passed: boolean | null;
  partial_score: number | null;
  finish_reason: string | null;
}

export interface Metrics {
  steps: number;
  nodes: number;
  edges: number;
  aggregate_nodes: number;
  aggregate_edges: number;
  cycles: number;
  repeated_actions: number;
  error_rate: number;
  first_edit: number | null;
  first_validate: number | null;
  validated_after_last_edit: boolean | null;
  edit_validate_edit: boolean;
  phase_transitions: Record<string, Record<string, number>>;
  max_steps_hit: boolean;
  empty_termination: boolean;
  skill_read_steps: number[];
  skill_read_count: number;
}

export interface Run {
  id: string;
  source_format: string;
  task_id: string;
  model: string;
  agent: string;
  condition: string;
  outcome: Outcome;
  limits: { max_steps: number | null; wall_clock_s: number | null } | null;
  usage: { input_tokens: number | null; output_tokens: number | null; wall_s: number | null } | null;
  metrics: Metrics;
  langutory: string;
  file: string;
  steps_file: string;
  canonical_file: string;
}

export interface Dataset {
  schema_version: 1;
  phases: Phase[];
  runs: Run[];
  search_file: string;
}

export const edgeTypes = ['temporal', 'dependency', 'retry', 'structural'] as const;
export type EdgeType = typeof edgeTypes[number];
export const categories = ['shell', 'read', 'edit', 'validate', 'plan', 'tool', 'message'] as const;
export type Category = typeof categories[number];

export interface GraphNode {
  id: string;
  label: string;
  signature: string;
  tool: string | null;
  category: Category;
  phase: string;
  count: number;
  first_idx: number;
  step_indices: number[];
  error: boolean;
  phase_counts: Record<string, number>;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: EdgeType;
  count: number;
}

export interface Graph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface RunGraphs {
  id: string;
  expanded: Graph;
  aggregated: Graph;
}

export interface Step {
  idx: number;
  ts: string | null;
  thought: string | null;
  action: { tool: string; args: Record<string, unknown>; command: string | null; targets: string[] } | null;
  observation: { text: string; truncated: boolean; error: boolean; exit_code: number | null } | null;
  tokens: { in: number | null; out: number | null } | null;
  raw_ref: { file: string; line: number | null };
  phase: string | null;
  phase_source: 'rule' | 'llm' | null;
  tags: string[];
}

export const number = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 });
export const percent = new Intl.NumberFormat(undefined, { style: 'percent', maximumFractionDigits: 1 });
export const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);
export const sourceIndex = (value: number | null | undefined) => value == null ? '—' : `#${value}`;
export const phaseColor = (phase?: Phase) =>
  phase && /^#[0-9a-f]{6}$/i.test(phase.color) ? phase.color : '#77758e';

export const metricColumns: { key: keyof Metrics; label: string }[] = [
  { key: 'steps', label: 'Steps' },
  { key: 'aggregate_nodes', label: 'Unique signatures' },
  { key: 'repeated_actions', label: 'Repeated actions' },
  { key: 'error_rate', label: 'Error rate' },
  { key: 'cycles', label: 'Cycles' },
  { key: 'first_edit', label: 'First edit' },
  { key: 'first_validate', label: 'First validate' },
  { key: 'validated_after_last_edit', label: 'Validated after last edit' },
  { key: 'edit_validate_edit', label: 'Edit → validate → edit' },
  { key: 'skill_read_count', label: 'Skill reads' },
];

export function formatMetric(key: keyof Metrics, value: Metrics[keyof Metrics]): string {
  if (value == null) return '—';
  if (key === 'error_rate') return percent.format(value as number);
  if (key === 'first_edit' || key === 'first_validate') return sourceIndex(value as number);
  if (typeof value === 'number') return number.format(value);
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return JSON.stringify(value);
}
