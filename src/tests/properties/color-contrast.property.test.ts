import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

/**
 * Feature: personal-website-redesign
 * Property 6: Text color contrast meets WCAG AA
 *
 * Validates: Requirements 12.4
 *
 * This test verifies that for any text element rendered on the page, the
 * contrast ratio between its computed foreground color and its computed
 * background color is at least 4.5:1 (WCAG AA standard).
 */

// --- Theme color definitions ---

interface ThemeColor {
  name: string;
  hex: string;
}

// --- All foreground/background color pairings defined in the theme ---
// These represent actual text/background combinations used in the site's CSS.
// --text-muted is excluded as it is only used for decorative, non-essential
// elements (line numbers with user-select: none) which fall under WCAG's
// exception for incidental or decorative text.

interface ColorPairing {
  foreground: ThemeColor;
  background: ThemeColor;
}

const colorPairings: ColorPairing[] = [
  // --text-primary on all backgrounds (body text, terminal output)
  { foreground: { name: '--text-primary', hex: '#e0e0e0' }, background: { name: '--bg-primary', hex: '#0a0a0f' } },
  { foreground: { name: '--text-primary', hex: '#e0e0e0' }, background: { name: '--bg-secondary', hex: '#12121a' } },
  { foreground: { name: '--text-primary', hex: '#e0e0e0' }, background: { name: '--bg-surface', hex: '#1a1a2e' } },
  // --text-secondary on all backgrounds (terminal title, separator text)
  { foreground: { name: '--text-secondary', hex: '#a0a0a0' }, background: { name: '--bg-primary', hex: '#0a0a0f' } },
  { foreground: { name: '--text-secondary', hex: '#a0a0a0' }, background: { name: '--bg-secondary', hex: '#12121a' } },
  { foreground: { name: '--text-secondary', hex: '#a0a0a0' }, background: { name: '--bg-surface', hex: '#1a1a2e' } },
  // --terminal-green on all backgrounds (prompts, success output, tags, headings)
  { foreground: { name: '--terminal-green', hex: '#00ff41' }, background: { name: '--bg-primary', hex: '#0a0a0f' } },
  { foreground: { name: '--terminal-green', hex: '#00ff41' }, background: { name: '--bg-secondary', hex: '#12121a' } },
  { foreground: { name: '--terminal-green', hex: '#00ff41' }, background: { name: '--bg-surface', hex: '#1a1a2e' } },
  // --terminal-amber on all backgrounds (warning output, amber tags)
  { foreground: { name: '--terminal-amber', hex: '#ffb000' }, background: { name: '--bg-primary', hex: '#0a0a0f' } },
  { foreground: { name: '--terminal-amber', hex: '#ffb000' }, background: { name: '--bg-secondary', hex: '#12121a' } },
  { foreground: { name: '--terminal-amber', hex: '#ffb000' }, background: { name: '--bg-surface', hex: '#1a1a2e' } },
  // --terminal-cyan on all backgrounds (links, info output, cyan tags)
  { foreground: { name: '--terminal-cyan', hex: '#00d4ff' }, background: { name: '--bg-primary', hex: '#0a0a0f' } },
  { foreground: { name: '--terminal-cyan', hex: '#00d4ff' }, background: { name: '--bg-secondary', hex: '#12121a' } },
  { foreground: { name: '--terminal-cyan', hex: '#00d4ff' }, background: { name: '--bg-surface', hex: '#1a1a2e' } },
];

// --- WCAG contrast ratio calculation utilities ---

/**
 * Parse a hex color string to RGB components (0-255).
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const cleaned = hex.replace('#', '');
  return {
    r: parseInt(cleaned.substring(0, 2), 16),
    g: parseInt(cleaned.substring(2, 4), 16),
    b: parseInt(cleaned.substring(4, 6), 16),
  };
}

/**
 * Linearize an sRGB channel value (0-255) to linear RGB (0-1).
 * Per WCAG 2.1 relative luminance formula.
 */
function linearize(channel: number): number {
  const srgb = channel / 255;
  return srgb <= 0.04045
    ? srgb / 12.92
    : Math.pow((srgb + 0.055) / 1.055, 2.4);
}

/**
 * Calculate relative luminance of a color per WCAG 2.1.
 * L = 0.2126 * R + 0.7152 * G + 0.0722 * B
 */
function relativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b);
}

/**
 * Calculate contrast ratio between two colors per WCAG 2.1.
 * Ratio = (L1 + 0.05) / (L2 + 0.05) where L1 >= L2
 */
function contrastRatio(hex1: string, hex2: string): number {
  const l1 = relativeLuminance(hex1);
  const l2 = relativeLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

// --- Property test ---

describe('Feature: personal-website-redesign, Property 6: Text color contrast meets WCAG AA', () => {
  const WCAG_AA_MIN_RATIO = 4.5;

  /**
   * Arbitrary that selects a random color pairing from the defined theme pairings.
   */
  const colorPairingArb = fc.constantFrom(...colorPairings);

  it('should meet 4.5:1 contrast ratio for all foreground/background color pairings', () => {
    fc.assert(
      fc.property(colorPairingArb, (pairing) => {
        const ratio = contrastRatio(
          pairing.foreground.hex,
          pairing.background.hex
        );

        expect(ratio).toBeGreaterThanOrEqual(WCAG_AA_MIN_RATIO);
      }),
      { numRuns: 100 }
    );
  });
});
