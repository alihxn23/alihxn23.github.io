/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { typeText, createCursor, initTypingAnimation } from './typing-animation';

describe('typing-animation', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    document.body.innerHTML = '';
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('createCursor', () => {
    it('creates a span with cursor-blink class', () => {
      const cursor = createCursor();
      expect(cursor.tagName).toBe('SPAN');
      expect(cursor.classList.contains('cursor-blink')).toBe(true);
    });

    it('has aria-hidden attribute for accessibility', () => {
      const cursor = createCursor();
      expect(cursor.getAttribute('aria-hidden')).toBe('true');
    });
  });

  describe('typeText', () => {
    it('types characters one by one with default delay', async () => {
      const target = document.createElement('div');
      document.body.appendChild(target);

      typeText(target, 'Hello');

      // First character is typed immediately
      expect(target.textContent).toContain('H');

      // After first delay, second character appears
      await vi.advanceTimersByTimeAsync(80);
      expect(target.textContent).toContain('He');

      // After second delay
      await vi.advanceTimersByTimeAsync(80);
      expect(target.textContent).toContain('Hel');

      // Complete all remaining characters
      await vi.advanceTimersByTimeAsync(80 * 2);
      expect(target.textContent).toContain('Hello');
    });

    it('uses configurable delay', async () => {
      const target = document.createElement('div');
      document.body.appendChild(target);

      const promise = typeText(target, 'AB', { delay: 200 });

      // At 80ms (default), nothing should have typed yet
      await vi.advanceTimersByTimeAsync(80);
      // The text node exists but only has content after the first delay fires
      // First char appears at 200ms
      await vi.advanceTimersByTimeAsync(120);
      expect(target.textContent).toContain('A');

      await vi.advanceTimersByTimeAsync(200);
      await promise;
      expect(target.textContent).toContain('AB');
    });

    it('shows blinking cursor during typing', () => {
      const target = document.createElement('div');
      document.body.appendChild(target);

      typeText(target, 'Test');

      const cursor = target.querySelector('.cursor-blink');
      expect(cursor).not.toBeNull();
    });

    it('keeps cursor after typing when showCursorAfter is true', async () => {
      const target = document.createElement('div');
      document.body.appendChild(target);

      const promise = typeText(target, 'Hi', { showCursorAfter: true });

      await vi.advanceTimersByTimeAsync(80 * 2);
      await promise;

      const cursor = target.querySelector('.cursor-blink');
      expect(cursor).not.toBeNull();
    });

    it('removes cursor after typing when showCursorAfter is false', async () => {
      const target = document.createElement('div');
      document.body.appendChild(target);

      const promise = typeText(target, 'Hi', { showCursorAfter: false });

      await vi.advanceTimersByTimeAsync(80 * 2);
      await promise;

      const cursor = target.querySelector('.cursor-blink');
      expect(cursor).toBeNull();
    });

    it('resolves the promise when typing is complete', async () => {
      const target = document.createElement('div');
      document.body.appendChild(target);

      const promise = typeText(target, 'ABC');

      await vi.advanceTimersByTimeAsync(80 * 3);
      await expect(promise).resolves.toBeUndefined();
    });

    it('handles empty string', async () => {
      const target = document.createElement('div');
      document.body.appendChild(target);

      const promise = typeText(target, '');
      // Empty string resolves immediately (no setTimeout needed)
      await promise;

      expect(target.textContent).toBe('');
    });
  });

  describe('initTypingAnimation', () => {
    it('does nothing if typing-target element is not found', () => {
      // No element in DOM
      initTypingAnimation();
      // Should not throw
    });

    it('shows text immediately when prefers-reduced-motion is enabled', () => {
      // Set up the DOM
      document.body.innerHTML = `
        <h1 id="typing-target">
          <span class="terminal-prompt__symbol">$</span> Muhammad Ali Hasan
        </h1>
      `;

      // Mock matchMedia to return reduced motion
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation((query: string) => ({
          matches: query === '(prefers-reduced-motion: reduce)',
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      });

      initTypingAnimation();

      // Text should remain as-is (not cleared for animation)
      const target = document.getElementById('typing-target');
      expect(target?.textContent).toContain('Muhammad Ali Hasan');
    });

    it('clears text and starts typing when motion is allowed', async () => {
      document.body.innerHTML = `
        <h1 id="typing-target">
          <span class="terminal-prompt__symbol">$</span> Muhammad Ali Hasan
        </h1>
      `;

      // Mock matchMedia to allow motion
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation((query: string) => ({
          matches: false,
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      });

      initTypingAnimation();

      const target = document.getElementById('typing-target');

      // The prompt symbol should still be there
      const promptSymbol = target?.querySelector('.terminal-prompt__symbol');
      expect(promptSymbol?.textContent).toBe('$');

      // A cursor should be present
      const cursor = target?.querySelector('.cursor-blink');
      expect(cursor).not.toBeNull();

      // After enough time, the full name should be typed
      await vi.advanceTimersByTimeAsync(80 * 20);

      expect(target?.textContent).toContain('Muhammad Ali Hasan');
    });
  });
});
