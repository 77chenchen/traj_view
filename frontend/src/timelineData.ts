/** Screen-space grouping of recorded point events, never inferred durations. */
export type TimelinePoint = { position: number; x: number };
export type TimelineToken = { positions: number[]; x: number; width: number };

export function timelineTokens(points: TimelinePoint[]): TimelineToken[] {
  const groups: { positions: number[]; first: number; last: number; x: number }[] = [];
  for (const point of points) {
    let group = { positions: [point.position], first: point.x, last: point.x, x: point.x };
    while (groups.length && group.x - groups.at(-1)!.x < 28) {
      const previous = groups.pop()!;
      group = { positions: [...previous.positions, ...group.positions], first: previous.first, last: group.last, x: (previous.first + group.last) / 2 };
    }
    groups.push(group);
  }
  return groups.map((group, index) => {
    const gap = Math.min(index ? group.x - groups[index - 1].x : Infinity, index < groups.length - 1 ? groups[index + 1].x - group.x : Infinity);
    return { positions: group.positions, x: group.x, width: Math.min(96, Number.isFinite(gap) ? gap * .8 : 48) };
  });
}
