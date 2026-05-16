/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  generateClipPath,
  generateOffset,
  applyGlitch,
  cleanupGlitch,
  initGlitchEffect,
  type GlitchConfig,
} from './glitch-effect';

// Helper to mock matchMedia
function mockMatchMedia(reducedMotion: boolean) {
  const listeners: Array<(e: MediaQueryListEvent) => void> = [];
  const mql = {
    matches: reducedMotion,
    media: '(prefers-reduced-motion: reduce)',
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn((_: string, handler: (e: MediaQueryListEvent) => void) => {
      listeners.push(handler);
    }),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  };

  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockReturnValue(mql),
  });

  return { mql, listeners };
}

describe('glitch-effect', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    document.body.innerHTML = '';
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('generateClipPath', () => {
    it('returns a valid CSS polygon string', () => {
      const clip = generateClipPath(5);
      expect(clip).toMatch(/^polygon\(/);
      expect(clip).toMatch(/\)$/);
    });

    it('always returns a non-empty clip path', () => {
      // Run multiple times to cover the random branch
      for (let i = 0; i < 50; i++) {
        const clip = generateClipPath(5);
        expect(clip.length).toBeGreaterThan(0);
        expect(clip).toContain('polygon');
      }
    });

    it('handles a single slice', () => {
      const clip = generateClipPath(1);
      expect(clip).toMatch(/^polygon\(/);
    });
  });

  describe('generateOffset', () => {
    it('returns a value within the intensity range', () => {
      for (let i = 0; i < 100; i++) {
        const offset = generateOffset(5);
        expect(offset).toBeGreaterThanOrEqual(-5);
        expect(offset).toBeLessThanOrEqual(5);
      }
    });

    it('returns 0 when intensity is 0', () => {
      const offset = generateOffset(0);
      expect(Math.abs(offset)).toBe(0);
    });
  });

  describe('applyGlitch', () => {
    it('sets CSS custom properties on the element', () => {
      const el = document.createElement('div');
      const config: GlitchConfig = { intensity: 5, duration: 200, sliceCount: 3 };

      applyGlitch(el, config);

      expect(el.style.getPropertyValue('--glitch-offset-x')).toBeTruthy();
      expect(el.style.getPropertyValue('--glitch-clip')).toBeTruthy();
      expect(el.style.transform).toBeTruthy();
      expect(el.style.clipPath).toBeTruthy();
    });

    it('cleans up after the specified duration', () => {
      const el = document.createElement('div');
      const config: GlitchConfig = { intensity: 5, duration: 200, sliceCount: 3 };

      applyGlitch(el, config);

      // Before timeout, styles should be present
      expect(el.style.getPropertyValue('--glitch-offset-x')).toBeTruthy();

      // After timeout, styles should be removed
      vi.advanceTimersByTime(200);
      expect(el.style.getPropertyValue('--glitch-offset-x')).toBe('');
      expect(el.style.getPropertyValue('--glitch-clip')).toBe('');
      expect(el.style.transform).toBe('');
      expect(el.style.clipPath).toBe('');
    });

    it('caps duration at 300ms even if config specifies longer', () => {
      const el = document.createElement('div');
      const config: GlitchConfig = { intensity: 5, duration: 1000, sliceCount: 3 };

      applyGlitch(el, config);

      // Should clean up at 300ms, not 1000ms
      vi.advanceTimersByTime(300);
      expect(el.style.getPropertyValue('--glitch-offset-x')).toBe('');
    });
  });

  describe('cleanupGlitch', () => {
    it('removes all glitch-related inline styles', () => {
      const el = document.createElement('div');
      el.style.setProperty('--glitch-offset-x', '3px');
      el.style.setProperty('--glitch-clip', 'polygon(0% 0%, 100% 0%, 100% 50%, 0% 50%)');
      el.style.setProperty('transform', 'translate3d(3px, 0, 0)');
      el.style.setProperty('clip-path', 'polygon(0% 0%, 100% 0%, 100% 50%, 0% 50%)');

      cleanupGlitch(el);

      expect(el.style.getPropertyValue('--glitch-offset-x')).toBe('');
      expect(el.style.getPropertyValue('--glitch-clip')).toBe('');
      expect(el.style.transform).toBe('');
      expect(el.style.clipPath).toBe('');
    });
  });

  describe('initGlitchEffect', () => {
    it('attaches event listeners to matching elements', () => {
      mockMatchMedia(false);
      document.body.innerHTML = `
        <a class="terminal-nav__link" href="#hero">About</a>
        <h2 class="section-header__title">Experience</h2>
      `;

      const cleanup = initGlitchEffect('.terminal-nav__link, .section-header__title');
      expect(cleanup).not.toBeNull();

      // Trigger hover on the link
      const link = document.querySelector('.terminal-nav__link') as HTMLElement;
      link.dispatchEvent(new Event('mouseenter'));

      // Should have glitch styles applied
      expect(link.style.getPropertyValue('--glitch-offset-x')).toBeTruthy();

      cleanup!();
    });

    it('returns null when prefers-reduced-motion is enabled', () => {
      mockMatchMedia(true);
      document.body.innerHTML = `
        <a class="terminal-nav__link" href="#hero">About</a>
      `;

      const cleanup = initGlitchEffect('.terminal-nav__link');
      expect(cleanup).toBeNull();
    });

    it('cleans up styles on mouseleave', () => {
      mockMatchMedia(false);
      document.body.innerHTML = `
        <a class="terminal-nav__link" href="#hero">About</a>
      `;

      initGlitchEffect('.terminal-nav__link');

      const link = document.querySelector('.terminal-nav__link') as HTMLElement;
      link.dispatchEvent(new Event('mouseenter'));
      expect(link.style.getPropertyValue('--glitch-offset-x')).toBeTruthy();

      link.dispatchEvent(new Event('mouseleave'));
      expect(link.style.getPropertyValue('--glitch-offset-x')).toBe('');
    });

    it('triggers glitch on focus event', () => {
      mockMatchMedia(false);
      document.body.innerHTML = `
        <a class="terminal-nav__link" href="#hero">About</a>
      `;

      initGlitchEffect('.terminal-nav__link');

      const link = document.querySelector('.terminal-nav__link') as HTMLElement;
      link.dispatchEvent(new Event('focus'));

      expect(link.style.getPropertyValue('--glitch-offset-x')).toBeTruthy();
    });

    it('cleans up styles on blur event', () => {
      mockMatchMedia(false);
      document.body.innerHTML = `
        <a class="terminal-nav__link" href="#hero">About</a>
      `;

      initGlitchEffect('.terminal-nav__link');

      const link = document.querySelector('.terminal-nav__link') as HTMLElement;
      link.dispatchEvent(new Event('focus'));
      expect(link.style.getPropertyValue('--glitch-offset-x')).toBeTruthy();

      link.dispatchEvent(new Event('blur'));
      expect(link.style.getPropertyValue('--glitch-offset-x')).toBe('');
    });

    it('cleanup function removes all event listeners and styles', () => {
      mockMatchMedia(false);
      document.body.innerHTML = `
        <a class="terminal-nav__link" href="#hero">About</a>
      `;

      const cleanup = initGlitchEffect('.terminal-nav__link');
      const link = document.querySelector('.terminal-nav__link') as HTMLElement;

      // Apply glitch first
      link.dispatchEvent(new Event('mouseenter'));
      expect(link.style.getPropertyValue('--glitch-offset-x')).toBeTruthy();

      // Run cleanup
      cleanup!();

      // Styles should be removed
      expect(link.style.getPropertyValue('--glitch-offset-x')).toBe('');

      // New events should not trigger glitch (listeners removed)
      link.dispatchEvent(new Event('mouseenter'));
      expect(link.style.getPropertyValue('--glitch-offset-x')).toBe('');
    });

    it('cleans up all elements when reduced motion is enabled dynamically', () => {
      const { listeners } = mockMatchMedia(false);
      document.body.innerHTML = `
        <a class="terminal-nav__link" href="#hero">About</a>
      `;

      initGlitchEffect('.terminal-nav__link');

      const link = document.querySelector('.terminal-nav__link') as HTMLElement;
      link.dispatchEvent(new Event('mouseenter'));
      expect(link.style.getPropertyValue('--glitch-offset-x')).toBeTruthy();

      // Simulate reduced motion preference change
      if (listeners.length > 0) {
        listeners[0]({ matches: true } as MediaQueryListEvent);
      }

      expect(link.style.getPropertyValue('--glitch-offset-x')).toBe('');
    });

    it('accepts custom configuration', () => {
      mockMatchMedia(false);
      document.body.innerHTML = `
        <a class="terminal-nav__link" href="#hero">About</a>
      `;

      initGlitchEffect('.terminal-nav__link', { intensity: 10, sliceCount: 8 });

      const link = document.querySelector('.terminal-nav__link') as HTMLElement;
      link.dispatchEvent(new Event('mouseenter'));

      // Should have applied the effect (we can't easily verify intensity value
      // due to randomness, but the property should be set)
      expect(link.style.getPropertyValue('--glitch-offset-x')).toBeTruthy();
    });

    it('handles empty selector gracefully', () => {
      mockMatchMedia(false);
      document.body.innerHTML = '<div>No matching elements</div>';

      const cleanup = initGlitchEffect('.nonexistent-class');
      expect(cleanup).not.toBeNull();

      // Should not throw
      cleanup!();
    });
  });
});
