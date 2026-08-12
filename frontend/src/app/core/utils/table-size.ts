/**
 * Computes the pixel diameter of a table's circular surface.
 *
 * The base size scales with the number of chairs (so the ring of chairs has
 * room), but the circle also grows to fit a longer custom name, capped so a
 * very long name can't blow up the layout. The label is allowed to wrap inside
 * the cap.
 */
export function tableCircleSize(chairs: number, label?: string | null): number {
  const base = 60 + Math.max(0, chairs) * 2;
  const text = (label ?? '').toString().trim();
  if (!text) {
    return base;
  }
  const estimated = Math.max(70, text.length * 11 + 28); // ~11px per char + padding
  return Math.min(Math.max(base, estimated), 240);
}
