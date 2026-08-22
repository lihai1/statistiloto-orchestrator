/**
 * Ports the legacy `arrays-filter` pipe logic.
 *
 * The analyze API now returns grouped frequency data: one FrequencyGroupResponse
 * per group size (1–6), each containing FrequencyEntryResponse items with the
 * number combination and its occurrence count.
 *
 * This utility converts the API response into AnalyzedGroup objects that the
 * Analyze page and Analyze modal render as numbered tabs (1–6), mirroring the
 * legacy ArraysFilter pipe that grouped the old 2D-array output by row length.
 */

import { FrequencyGroupResponse } from '../models/lottery.models';

export interface AnalyzedGroup {
  /** Pair/group size (1–6) */
  size: number;
  /** Number of possible combinations for this group size */
  combos: number;
  /** Entries in this group */
  entries: { numbers: number[]; count: number }[];
  /** Total occurrences (sum of entry counts) */
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
 * Convert API frequency groups into AnalyzedGroup objects for display.
 *
 * The API returns one FrequencyGroupResponse per size (1–6). We map each
 * to an AnalyzedGroup, computing the total occurrences and a localized title.
 * If the API response is missing groups, we fill in empty placeholders for
 * sizes 1–6 so the tabs always render.
 */
export function groupBySize(
  frequencyGroups: FrequencyGroupResponse[] | undefined,
  maxSplit = 6,
  lang: 'he' | 'en' = 'he',
): AnalyzedGroup[] {
  const groupMap = new Map<number, FrequencyGroupResponse>();
  if (frequencyGroups) {
    for (const g of frequencyGroups) {
      groupMap.set(g.size, g);
    }
  }

  const groups: AnalyzedGroup[] = [];
  for (let size = 1; size <= maxSplit; size++) {
    const apiGroup = groupMap.get(size);
    const entries = (apiGroup?.entries ?? []).map((e) => ({
      numbers: e.numbers,
      count: e.count,
    }));
    const total = entries.reduce((sum, e) => sum + e.count, 0);
    const combos = apiGroup?.combos ?? combinations(37, size);
    const ratio = combos > 0 ? (total / combos).toFixed(3) : '0.000';

    groups.push({
      size,
      combos,
      entries,
      total,
      title: lang === 'he'
        ? `שכיחות של ${size} מספרים: ${ratio}`
        : `Frequency of ${size} numbers: ${ratio}`,
    });
  }

  return groups;
}
