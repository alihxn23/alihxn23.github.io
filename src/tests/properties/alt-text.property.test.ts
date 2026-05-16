import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { JSDOM } from 'jsdom';

/**
 * Feature: personal-website-redesign
 * Property 5: Non-decorative images have alt text
 *
 * Validates: Requirements 12.3
 *
 * This test reads the built HTML output and verifies that all <img> elements
 * that are not marked as decorative (role="presentation" or aria-hidden="true")
 * have a non-empty alt attribute.
 */
describe('Feature: personal-website-redesign, Property 5: Non-decorative images have alt text', () => {
  const distPath = resolve(process.cwd(), 'dist', 'index.html');

  function getNonDecorativeImages(): Element[] {
    const html = readFileSync(distPath, 'utf-8');
    const dom = new JSDOM(html);
    const document = dom.window.document;

    const allImages = Array.from(document.querySelectorAll('img'));

    // Filter out decorative images (role="presentation" or aria-hidden="true")
    return allImages.filter((img) => {
      const role = img.getAttribute('role');
      const ariaHidden = img.getAttribute('aria-hidden');
      return role !== 'presentation' && ariaHidden !== 'true';
    });
  }

  it('should have non-empty alt attributes on all non-decorative images', () => {
    const nonDecorativeImages = getNonDecorativeImages();

    // If there are no non-decorative images, the property holds vacuously
    // (no violations possible). We still run fast-check to validate the property
    // framework is working correctly.
    if (nonDecorativeImages.length === 0) {
      // Vacuously true: no non-decorative images means no violations
      expect(nonDecorativeImages).toHaveLength(0);
      return;
    }

    // Use fast-check to select arbitrary indices into the non-decorative images array
    // and verify each selected image has a non-empty alt attribute
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: nonDecorativeImages.length - 1 }),
        (index) => {
          const img = nonDecorativeImages[index];
          const alt = img.getAttribute('alt');
          const src = img.getAttribute('src') || '(no src)';

          // alt must exist and be non-empty
          expect(alt, `Image "${src}" is missing a non-empty alt attribute`).toBeTruthy();
          expect(
            (alt as string).trim().length,
            `Image "${src}" has an empty alt attribute`
          ).toBeGreaterThan(0);
        }
      ),
      { numRuns: Math.min(100, Math.max(1, nonDecorativeImages.length * 10)) }
    );
  });

  it('should not have any non-decorative images without alt text (exhaustive check)', () => {
    const nonDecorativeImages = getNonDecorativeImages();

    // Exhaustively check every non-decorative image
    const violations = nonDecorativeImages.filter((img) => {
      const alt = img.getAttribute('alt');
      return !alt || alt.trim().length === 0;
    });

    expect(
      violations,
      `Found ${violations.length} non-decorative image(s) without alt text: ${violations
        .map((img) => img.getAttribute('src') || '(no src)')
        .join(', ')}`
    ).toHaveLength(0);
  });
});
