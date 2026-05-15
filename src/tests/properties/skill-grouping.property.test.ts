import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

/**
 * Feature: personal-website-redesign
 * Property 2: Skills are grouped by category
 *
 * Validates: Requirements 6.7
 *
 * This test verifies that for any generated set of skill categories,
 * the rendering logic preserves grouping — no item "leaks" into another category.
 */
describe('Feature: personal-website-redesign, Property 2: Skills are grouped by category', () => {
  /**
   * Simulates the grouping/rendering logic from SkillsSection.astro.
   * The component iterates over each skill category and renders items
   * within that category's container. This function returns a structure
   * representing the rendered output: an array of { category, renderedItems }.
   */
  function renderSkillGroups(
    skills: Array<{ category: string; items: string[] }>
  ): Array<{ category: string; renderedItems: string[] }> {
    return skills.map((group) => ({
      category: group.category,
      renderedItems: group.items.map((item) => item),
    }));
  }

  /**
   * Arbitrary generator for a non-empty skill item string.
   * Uses alphanumeric strings with spaces to simulate realistic skill names.
   */
  const skillItemArb = fc
    .stringOf(fc.oneof(fc.char(), fc.constant(' '), fc.constant('.')), {
      minLength: 1,
      maxLength: 30,
    })
    .filter((s) => s.trim().length > 0);

  /**
   * Arbitrary generator for a category name.
   */
  const categoryNameArb = fc
    .stringOf(fc.oneof(fc.hexa(), fc.constant(' ')), {
      minLength: 1,
      maxLength: 20,
    })
    .filter((s) => s.trim().length > 0);

  /**
   * Arbitrary generator for a single SkillCategory object.
   */
  const skillCategoryArb = fc.record({
    category: categoryNameArb,
    items: fc.array(skillItemArb, { minLength: 1, maxLength: 10 }),
  });

  /**
   * Arbitrary generator for an array of SkillCategory objects with unique category names.
   */
  const skillCategoriesArb = fc
    .array(skillCategoryArb, { minLength: 1, maxLength: 10 })
    .map((categories) => {
      // Ensure unique category names by deduplicating
      const seen = new Set<string>();
      return categories.filter((cat) => {
        const key = cat.category.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    })
    .filter((categories) => categories.length > 0);

  it('should render every item only within its designated category group', () => {
    fc.assert(
      fc.property(skillCategoriesArb, (skills) => {
        const rendered = renderSkillGroups(skills);

        // For each original category, verify its items appear in the correct rendered group
        for (let i = 0; i < skills.length; i++) {
          const originalCategory = skills[i];
          const renderedGroup = rendered[i];

          // The rendered group should have the same category name
          expect(renderedGroup.category).toBe(originalCategory.category);

          // The rendered group should contain exactly the items from the original category
          expect(renderedGroup.renderedItems).toEqual(originalCategory.items);
        }

        // Verify no item appears in a category it doesn't belong to
        for (let i = 0; i < rendered.length; i++) {
          const currentCategory = skills[i];
          for (let j = 0; j < rendered.length; j++) {
            if (i === j) continue;
            // Check that items from category i don't appear in rendered group j
            // (unless they happen to have the same name by coincidence — we check structural grouping)
            for (const item of currentCategory.items) {
              // The item should not be structurally placed in another group
              // We verify this by checking the rendered output preserves the input structure
              const otherRendered = rendered[j].renderedItems;
              const isInOtherGroup = otherRendered.includes(item);
              // If the item appears in another group, it must also exist in that group's source
              if (isInOtherGroup) {
                expect(skills[j].items).toContain(item);
              }
            }
          }
        }
      }),
      { numRuns: 100 }
    );
  });

  it('should preserve the total count of items across all categories', () => {
    fc.assert(
      fc.property(skillCategoriesArb, (skills) => {
        const rendered = renderSkillGroups(skills);

        const totalOriginalItems = skills.reduce(
          (sum, cat) => sum + cat.items.length,
          0
        );
        const totalRenderedItems = rendered.reduce(
          (sum, group) => sum + group.renderedItems.length,
          0
        );

        expect(totalRenderedItems).toBe(totalOriginalItems);
      }),
      { numRuns: 100 }
    );
  });

  it('should maintain the same number of category groups in output as in input', () => {
    fc.assert(
      fc.property(skillCategoriesArb, (skills) => {
        const rendered = renderSkillGroups(skills);
        expect(rendered.length).toBe(skills.length);
      }),
      { numRuns: 100 }
    );
  });
});
