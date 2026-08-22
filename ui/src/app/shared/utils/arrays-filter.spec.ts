import { groupBySize, combinations } from './arrays-filter';
import { FrequencyGroupResponse } from '../models/lottery.models';

describe('arrays-filter', () => {
  describe('combinations', () => {
    it('should compute C(n, k) correctly', () => {
      expect(combinations(37, 1)).toBe(37);
      expect(combinations(37, 2)).toBe(666);
      expect(combinations(6, 3)).toBe(20);
      expect(combinations(5, 0)).toBe(1);
      expect(combinations(5, 5)).toBe(1);
      expect(combinations(3, 5)).toBe(0);
    });
  });

  describe('groupBySize', () => {
    it('should return 6 groups even with no API data', () => {
      const groups = groupBySize(undefined, 6);
      expect(groups.length).toBe(6);
      groups.forEach((g, i) => {
        expect(g.size).toBe(i + 1);
        expect(g.entries.length).toBe(0);
        expect(g.total).toBe(0);
      });
    });

    it('should map API frequency groups to AnalyzedGroup entries', () => {
      const apiGroups: FrequencyGroupResponse[] = [
        {
          size: 1,
          combos: 37,
          entries: [
            { numbers: [7], count: 100 },
            { numbers: [3], count: 50 },
          ],
        },
        {
          size: 2,
          combos: 666,
          entries: [
            { numbers: [7, 14], count: 30 },
            { numbers: [3, 21], count: 15 },
          ],
        },
      ];

      const groups = groupBySize(apiGroups, 6, 'en');

      expect(groups.length).toBe(6);
      expect(groups[0].size).toBe(1);
      expect(groups[0].combos).toBe(37);
      expect(groups[0].entries.length).toBe(2);
      expect(groups[0].entries[0].numbers).toEqual([7]);
      expect(groups[0].entries[0].count).toBe(100);
      expect(groups[0].total).toBe(150);

      expect(groups[1].size).toBe(2);
      expect(groups[1].entries.length).toBe(2);
      expect(groups[1].entries[0].numbers).toEqual([7, 14]);
      expect(groups[1].total).toBe(45);

      // Sizes 3–6 should be empty
      expect(groups[2].entries.length).toBe(0);
      expect(groups[5].entries.length).toBe(0);
    });

    it('should use Hebrew titles with ratio when lang is he', () => {
      const groups = groupBySize(undefined, 6, 'he');
      expect(groups[0].title).toContain('1');
      expect(groups[0].title).toContain('מספרים');
      expect(groups[0].title).toContain(':');
      expect(groups[0].title).toMatch(/\d+\.\d{3}/);
    });

    it('should use English titles with ratio when lang is en', () => {
      const groups = groupBySize(undefined, 6, 'en');
      expect(groups[0].title).toBe('Frequency of 1 numbers: 0.000');
    });

    it('should compute ratio from total/combos', () => {
      const apiGroups: FrequencyGroupResponse[] = [
        {
          size: 1,
          combos: 37,
          entries: [
            { numbers: [7], count: 100 },
            { numbers: [3], count: 50 },
          ],
        },
      ];
      const groups = groupBySize(apiGroups, 6, 'en');
      // total=150, combos=37, ratio=150/37=4.054...
      expect(groups[0].title).toBe('Frequency of 1 numbers: 4.054');
    });
  });
});
