import { tableCircleSize } from './table-size';

export interface LayoutTableInput {
  id: string;
  chairs: number;
  label: string;
  x: number;
  y: number;
}

export interface LayoutTableResult {
  id: string;
  x: number;
  y: number;
  diameter: number;
}

// Chair ring is placed at 65% of the table diameter from its center, plus the
// chair's own radius. Two tables overlap once their footprints (not just the
// circles) intersect.
const CHAIR_RING_RATIO = 0.65;
const CHAIR_RADIUS = 14;
const DEFAULT_GAP = 32;
const DEFAULT_ITERATIONS = 40;
const MIN_MARGIN = 20;

function footprintRadius(diameter: number): number {
  return CHAIR_RING_RATIO * diameter + CHAIR_RADIUS;
}

/**
 * Pushes overlapping tables apart so none overlap, preserving the relative
 * arrangement (seeded from each table's current top-left position). Pure: it
 * returns new positions and never mutates the inputs.
 */
export function relaxTableLayout(
  tables: LayoutTableInput[],
  opts: { gap?: number; iterations?: number } = {},
): LayoutTableResult[] {
  const gap = opts.gap ?? DEFAULT_GAP;
  const iterations = opts.iterations ?? DEFAULT_ITERATIONS;

  const items = tables.map((t) => {
    const diameter = tableCircleSize(t.chairs, t.label);
    return {
      id: t.id,
      diameter,
      radius: footprintRadius(diameter),
      cx: t.x + diameter / 2,
      cy: t.y + diameter / 2,
    };
  });

  for (let iter = 0; iter < iterations; iter++) {
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const a = items[i];
        const b = items[j];
        let dx = b.cx - a.cx;
        let dy = b.cy - a.cy;
        let dist = Math.hypot(dx, dy);
        const minDist = a.radius + b.radius + gap;
        if (dist >= minDist) continue;

        if (dist === 0) {
          // Coincident centers: nudge deterministically to break the tie.
          dx = 1;
          dy = 0;
          dist = 1;
        }
        const push = (minDist - dist) / 2;
        const nx = (dx / dist) * push;
        const ny = (dy / dist) * push;
        a.cx -= nx;
        a.cy -= ny;
        b.cx += nx;
        b.cy += ny;
      }
    }
  }

  return items.map((it) => ({
    id: it.id,
    x: Math.max(MIN_MARGIN, it.cx - it.diameter / 2),
    y: Math.max(MIN_MARGIN, it.cy - it.diameter / 2),
    diameter: it.diameter,
  }));
}
