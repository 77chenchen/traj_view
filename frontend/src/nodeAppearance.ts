import type { Category } from './model';

export type NodeOutline = Category | 'group';

// Keep every silhouette inside its layout box. Ports remain at the top/bottom
// midpoint, so changing appearance never changes source order or edge routing.
export function nodeOutline(kind: NodeOutline, width: number, height: number): string {
  const l = -width / 2, r = width / 2, t = -height / 2, b = height / 2;
  switch (kind) {
    case 'read':
      return `M${l+4} ${t}H${r-14}L${r} ${t+14}V${b-4}Q${r} ${b} ${r-4} ${b}H${l+4}Q${l} ${b} ${l} ${b-4}V${t+4}Q${l} ${t} ${l+4} ${t}Z`;
    case 'edit':
      return `M${l+12} ${t}H${r}V${b-12}L${r-12} ${b}H${l}V${t+12}Z`;
    case 'validate':
      return `M${l+14} ${t}H${r-14}L${r} 0 ${r-14} ${b}H${l+14}L${l} 0Z`;
    case 'plan': {
      const a = height / 2;
      return `M${l+a} ${t}H${r-a}A${a} ${a} 0 0 1 ${r-a} ${b}H${l+a}A${a} ${a} 0 0 1 ${l+a} ${t}Z`;
    }
    case 'message':
      return `M${l+6} ${t}H${r-6}Q${r} ${t} ${r} ${t+6}V${b-12}Q${r} ${b-6} ${r-6} ${b-6}H${l+34}L${l+23} ${b}V${b-6}H${l+6}Q${l} ${b-6} ${l} ${b-12}V${t+6}Q${l} ${t} ${l+6} ${t}Z`;
    case 'tool':
      return `M${l+8} ${t}H${r-8}L${r} ${t+8}V${b-8}L${r-8} ${b}H${l+8}L${l} ${b-8}V${t+8}Z`;
    case 'group': {
      const scale = Math.min(1, width / 120);
      return `M${l+5} ${t+8}H${l+18*scale}L${l+26*scale} ${t}H${l+84*scale}L${l+92*scale} ${t+8}H${r-5}Q${r} ${t+8} ${r} ${t+13}V${b-5}Q${r} ${b} ${r-5} ${b}H${l+5}Q${l} ${b} ${l} ${b-5}V${t+13}Q${l} ${t+8} ${l+5} ${t+8}Z`;
    }
    default:
      return `M${l+4} ${t}H${r-4}Q${r} ${t} ${r} ${t+4}V${b-4}Q${r} ${b} ${r-4} ${b}H${l+4}Q${l} ${b} ${l} ${b-4}V${t+4}Q${l} ${t} ${l+4} ${t}Z`;
  }
}

export const nodeAppearances: Record<NodeOutline, { label: string; shape: string; fill: string; stroke: string }> = {
  shell: { label: 'Terminal', shape: 'window', fill: '#eef3f8', stroke: '#6a8199' },
  read: { label: 'Read file', shape: 'folded file', fill: '#eef6f5', stroke: '#64867c' },
  edit: { label: 'Code edit', shape: 'cut corners', fill: '#faf3e8', stroke: '#a38a5b' },
  validate: { label: 'Validation', shape: 'hexagon', fill: '#eef6ef', stroke: '#678a70' },
  plan: { label: 'Plan', shape: 'capsule', fill: '#f0f2f8', stroke: '#7986a0' },
  message: { label: 'Recorded text', shape: 'speech bubble', fill: '#f3f4f6', stroke: '#7e8793' },
  tool: { label: 'Other tool', shape: 'beveled block', fill: '#eef3f3', stroke: '#75878b' },
  group: { label: 'Merged steps', shape: 'folder', fill: '#f3f5f7', stroke: '#81909d' },
};
