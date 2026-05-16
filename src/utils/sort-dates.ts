/**
 * Parses a date string in "YYYY-MM" format into a numeric value for comparison.
 * Returns Infinity for null/undefined dates (representing "Present"/current).
 */
export function parseDateValue(dateStr: string | null): number {
  if (!dateStr) return Infinity;
  const [year, month] = dateStr.split('-').map(Number);
  return year * 12 + month;
}

/**
 * Sorts an array of objects with a startDate field in reverse chronological order
 * (most recent first). Entries with null startDate are treated as "Present" and sort first.
 */
export function sortByDateDescending<T extends { startDate: string | null }>(
  entries: T[]
): T[] {
  return [...entries].sort(
    (a, b) => parseDateValue(b.startDate) - parseDateValue(a.startDate)
  );
}
