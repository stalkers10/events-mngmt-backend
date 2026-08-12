/**
 * Renders a table's display label.
 *
 * Custom names are shown as-is. Numeric-only values (the default, auto-assigned
 * table ids) get a "T" prefix so an unnamed table "1" shows as "T1".
 */
export function formatTableName(value: string | number | null | undefined): string {
  const str = value === null || value === undefined ? '' : String(value);
  return /^\d+$/.test(str) ? `T${str}` : str;
}
