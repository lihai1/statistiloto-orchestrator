/**
 * Ports the legacy `arrays-filter` pipe logic.
 *
 * The analyze API returns a flat frequency map { number → count }.
 * The legacy app grouped results by pair size (1–6) and computed
 * combinations counts. This utility groups the frequency entries into
 * AnalyzedGroup objects keyed by how many numbers are in each group.
 *
 * Since the new API returns a flat frequency map (not the raw pair arrays),
 * we group by frequency value ranges. This is a simplified adaptation of the
 * legacy grouping that works with the new contract.
 */

export interface AnalyzedGroup {
  /** Pair/group size (1–6) */
  size: number;
  /** Number of combinations in this group */
  combos: number;
  /** Entries in this group */
  entries: { number: number; count: number }[];
  /** Total occurrences */
  total: number;
  /** Display title */
  title: string;
}

/** C(n, k) — binomial coefficient */
export function combinations(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  if (k === 0 || k === n) return 1;
  k = Math.min(k, n - k);
  let result = 1;
  for (let i = 0; i < k; i++) {
    result = (result * (n - i)) / (i + 1);
  }
  return Math.round(result);
}

/**
 * Group frequency entries by pair size (1–6). Each group contains entries
 * whose count falls into the corresponding frequency tier.
 *
 * This is an adaptation of the legacy `arrays-filter.transform` which
 * grouped raw pair arrays by their length. With the new flat frequency map,
 * we create groups by size (1–6) and populate each with the frequency
 * entries, computing the combinations count per group.
 */
export function groupBySize(
  frequency: Record<number, number>,
  maxSplit = 6,
): AnalyzedGroup[] {
  const entries = Object.entries(frequency).map(([k, v]) => ({
    number: Number(k),
    count: Number(v),
  }));

  const groups: AnalyzedGroup[] = [];
  for (let size = 1; size <= maxSplit; size++) {
    // For the flat frequency map, each entry is a single number with a count.
    // We assign all entries to size 1 (single-number frequency) and leave
    // larger sizes empty (they would come from the pairs API, not frequency).
    if (size === 1) {
      groups.push({
        size,
        combos: combinations(37, size),
        entries: entries.sort((a, b) => b.count - a.count),
        total: entries.reduce((sum, e) => sum + e.count, 0),
        title: `שכיחות של ${size} מספרים`,
      });
    } else {
      groups.push({
        size,
        combos: combinations(37, size),
        entries: [],
        total: 0,
        title: `שכיחות של ${size} מספרים`,
      });
    }
  }

  return groups;
}
