import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { parseDateValue, sortByDateDescending } from '../../utils/sort-dates';

/**
 * Feature: personal-website-redesign
 * Property 1: Dated entries are rendered in reverse chronological order
 *
 * Validates: Requirements 5.6, 8.4
 */
describe('Feature: personal-website-redesign, Property 1: Dated entries are rendered in reverse chronological order', () => {
  /**
   * Arbitrary generator for valid "YYYY-MM" date strings.
   * Generates years between 1970 and 2099, months between 01 and 12.
   */
  const dateStringArb = fc
    .record({
      year: fc.integer({ min: 1970, max: 2099 }),
      month: fc.integer({ min: 1, max: 12 }),
    })
    .map(({ year, month }) => `${year}-${String(month).padStart(2, '0')}`);

  /**
   * Arbitrary generator for startDate: either a valid "YYYY-MM" string or null (representing "Present").
   */
  const startDateArb = fc.oneof(
    { weight: 5, arbitrary: dateStringArb },
    { weight: 1, arbitrary: fc.constant(null) }
  );

  /**
   * Arbitrary generator for an entry with a startDate field.
   */
  const entryArb = startDateArb.map((startDate) => ({ startDate }));

  it('should sort entries in descending order by startDate (most recent first)', () => {
    fc.assert(
      fc.property(fc.array(entryArb, { minLength: 0, maxLength: 50 }), (entries) => {
        const sorted = sortByDateDescending(entries);

        // Verify the sorted array is in descending order of parseDateValue
        for (let i = 0; i < sorted.length - 1; i++) {
          const currentValue = parseDateValue(sorted[i].startDate);
          const nextValue = parseDateValue(sorted[i + 1].startDate);
          expect(currentValue).toBeGreaterThanOrEqual(nextValue);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('should preserve all original entries (no entries lost or added)', () => {
    fc.assert(
      fc.property(fc.array(entryArb, { minLength: 0, maxLength: 50 }), (entries) => {
        const sorted = sortByDateDescending(entries);

        // Same length
        expect(sorted).toHaveLength(entries.length);

        // Same elements (sorted is a permutation of the input)
        const originalDates = entries.map((e) => e.startDate).sort();
        const sortedDates = sorted.map((e) => e.startDate).sort();
        expect(sortedDates).toEqual(originalDates);
      }),
      { numRuns: 100 }
    );
  });

  it('should place null startDate entries (Present) first since they have the highest value', () => {
    fc.assert(
      fc.property(
        fc.array(entryArb, { minLength: 1, maxLength: 50 }).filter(
          (entries) => entries.some((e) => e.startDate === null) && entries.some((e) => e.startDate !== null)
        ),
        (entries) => {
          const sorted = sortByDateDescending(entries);

          // Find the last index of a null-startDate entry
          const lastNullIndex = sorted.reduce(
            (lastIdx, entry, idx) => (entry.startDate === null ? idx : lastIdx),
            -1
          );

          // Find the first index of a non-null-startDate entry
          const firstNonNullIndex = sorted.findIndex((e) => e.startDate !== null);

          // All null entries should come before all non-null entries
          if (lastNullIndex !== -1 && firstNonNullIndex !== -1) {
            expect(lastNullIndex).toBeLessThan(firstNonNullIndex);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
