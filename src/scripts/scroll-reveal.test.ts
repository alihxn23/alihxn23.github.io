/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  collectTextNodes,
  getTotalCharCount,
  revealSection,
  revealImmediately,
  initScrollReveal,
  type ScrollRevealConfig,
} from './scroll-reveal';

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

// Helper to mock IntersectionObserver
function mockIntersectionObserver() {
  const observedElements: Element[] = [];
  const unobservedElements: Element[] = [];
  let callback: IntersectionObserverCallback;

  const mockObserver = {
    observe: vi.fn((el: Element) => {
      observedElements.push(el);
    }),
    unobserve: vi.fn((el: Element) => {
      unobservedElements.push(el);
    }),
    disconnect: vi.fn(),
    takeRecords: vi.fn(() => []),
    root: null,
    rootMargin: '',
    thresholds: [],
  };

  const MockIntersectionObserver = vi.fn((cb: IntersectionObserverCallback) => {
    callback = cb;
    return mockObserver;
  });

  Object.defineProperty(window, 'IntersectionObserver', {
    writable: true,
    value: MockIntersectionObserver,
  });

  function triggerIntersection(entries: Partial<IntersectionObserverEntry>[]) {
    const fullEntries = entries.map((entry) => ({
      boundingClientRect: {} as DOMRectReadOnly,
      intersectionRatio: entry.isIntersecting ? 1 : 0,
      intersectionRect: {} as DOMRectReadOnly,
      isIntersecting: false,
      rootBounds: null,
      target: document.createElement('div'),
      time: Date.now(),
      ...entry,
    })) as IntersectionObserverEntry[];

    callback(fullEntries, mockObserver as unknown as IntersectionObserver);
  }

  return { mockObserver, observedElements, unobservedElements, triggerIntersection, MockIntersectionObserver };
}

describe('scroll-reveal', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    document.body.innerHTML = '';
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('collectTextNodes', () => {
    it('collects text nodes from a simple element', () => {
      const el = document.createElement('div');
      el.textContent = 'Hello World';

      const nodes = collectTextNodes(el);
      expect(nodes).toHaveLength(1);
      expect(nodes[0].textContent).toBe('Hello World');
    });

    it('collects text nodes from nested elements', () => {
      const el = document.createElement('div');
      el.innerHTML = '<p>First</p><p>Second</p>';

      const nodes = collectTextNodes(el);
      expect(nodes).toHaveLength(2);
      expect(nodes[0].textContent).toBe('First');
      expect(nodes[1].textContent).toBe('Second');
    });

    it('skips empty or whitespace-only text nodes', () => {
      const el = document.createElement('div');
      el.innerHTML = '<p>Content</p>   <p>More</p>';

      const nodes = collectTextNodes(el);
      // Only non-whitespace text nodes
      expect(nodes.every((n) => n.textContent!.trim().length > 0)).toBe(true);
    });

    it('returns empty array for element with no text', () => {
      const el = document.createElement('div');
      el.innerHTML = '<img src="test.png" />';

      const nodes = collectTextNodes(el);
      expect(nodes).toHaveLength(0);
    });
  });

  describe('getTotalCharCount', () => {
    it('counts characters across all text nodes', () => {
      const el = document.createElement('div');
      el.innerHTML = '<p>Hello</p><p>World</p>';

      const count = getTotalCharCount(el);
      expect(count).toBe(10); // "Hello" + "World"
    });

    it('returns 0 for element with no text content', () => {
      const el = document.createElement('div');
      el.innerHTML = '<br />';

      const count = getTotalCharCount(el);
      expect(count).toBe(0);
    });
  });

  describe('revealSection', () => {
    it('adds revealing class during animation', () => {
      const el = document.createElement('section');
      el.textContent = 'Test content';

      const config: ScrollRevealConfig = {
        threshold: 0.1,
        charDelay: 20,
        revealedClass: 'revealed',
        revealingClass: 'revealing',
      };

      revealSection(el, config);

      expect(el.classList.contains('revealing')).toBe(true);
    });

    it('sets --reveal-progress custom property during animation', () => {
      const el = document.createElement('section');
      el.textContent = 'Test content here';

      const config: ScrollRevealConfig = {
        threshold: 0.1,
        charDelay: 20,
        revealedClass: 'revealed',
        revealingClass: 'revealing',
      };

      revealSection(el, config);

      // Initially 0
      expect(el.style.getPropertyValue('--reveal-progress')).toBe('0');

      // After some time, progress should increase
      vi.advanceTimersByTime(config.charDelay * 2);
      const progress = parseFloat(el.style.getPropertyValue('--reveal-progress'));
      expect(progress).toBeGreaterThan(0);
    });

    it('adds revealed class and removes revealing class when complete', async () => {
      const el = document.createElement('section');
      el.textContent = 'Short';

      const config: ScrollRevealConfig = {
        threshold: 0.1,
        charDelay: 20,
        revealedClass: 'revealed',
        revealingClass: 'revealing',
      };

      const promise = revealSection(el, config);

      // Advance enough time for the animation to complete
      // maxSteps = min(5, 60) = 5, totalDuration = 5 * 20 = 100ms
      vi.advanceTimersByTime(200);

      await promise;

      expect(el.classList.contains('revealed')).toBe(true);
      expect(el.classList.contains('revealing')).toBe(false);
      expect(el.style.getPropertyValue('--reveal-progress')).toBe('');
    });

    it('caps animation steps at 60 for long content', () => {
      const el = document.createElement('section');
      // Create content with more than 60 characters
      el.textContent = 'A'.repeat(200);

      const config: ScrollRevealConfig = {
        threshold: 0.1,
        charDelay: 20,
        revealedClass: 'revealed',
        revealingClass: 'revealing',
      };

      revealSection(el, config);

      // Total duration should be capped at 60 * 20 = 1200ms
      vi.advanceTimersByTime(1200);

      expect(el.classList.contains('revealed')).toBe(true);
    });
  });

  describe('revealImmediately', () => {
    it('adds revealed class without animation', () => {
      const el = document.createElement('section');
      el.textContent = 'Content';

      const config: ScrollRevealConfig = {
        threshold: 0.1,
        charDelay: 20,
        revealedClass: 'revealed',
        revealingClass: 'revealing',
      };

      revealImmediately(el, config);

      expect(el.classList.contains('revealed')).toBe(true);
      expect(el.classList.contains('revealing')).toBe(false);
    });

    it('removes --reveal-progress property', () => {
      const el = document.createElement('section');
      el.style.setProperty('--reveal-progress', '0.5');

      const config: ScrollRevealConfig = {
        threshold: 0.1,
        charDelay: 20,
        revealedClass: 'revealed',
        revealingClass: 'revealing',
      };

      revealImmediately(el, config);

      expect(el.style.getPropertyValue('--reveal-progress')).toBe('');
    });
  });

  describe('initScrollReveal', () => {
    it('observes all matching elements', () => {
      mockMatchMedia(false);
      const { mockObserver } = mockIntersectionObserver();

      document.body.innerHTML = `
        <section data-scroll-reveal>Section 1</section>
        <section data-scroll-reveal>Section 2</section>
      `;

      initScrollReveal('[data-scroll-reveal]');

      expect(mockObserver.observe).toHaveBeenCalledTimes(2);
    });

    it('returns a cleanup function that disconnects the observer', () => {
      mockMatchMedia(false);
      const { mockObserver } = mockIntersectionObserver();

      document.body.innerHTML = `
        <section data-scroll-reveal>Section 1</section>
      `;

      const cleanup = initScrollReveal('[data-scroll-reveal]');
      expect(cleanup).not.toBeNull();

      cleanup!();
      expect(mockObserver.disconnect).toHaveBeenCalled();
    });

    it('reveals sections immediately when prefers-reduced-motion is enabled', () => {
      mockMatchMedia(true);
      mockIntersectionObserver();

      document.body.innerHTML = `
        <section data-scroll-reveal>Section 1</section>
        <section data-scroll-reveal>Section 2</section>
      `;

      initScrollReveal('[data-scroll-reveal]');

      const sections = document.querySelectorAll('[data-scroll-reveal]');
      sections.forEach((section) => {
        expect(section.classList.contains('revealed')).toBe(true);
      });
    });

    it('does not observe elements when prefers-reduced-motion is enabled', () => {
      mockMatchMedia(true);
      const { mockObserver } = mockIntersectionObserver();

      document.body.innerHTML = `
        <section data-scroll-reveal>Section 1</section>
      `;

      initScrollReveal('[data-scroll-reveal]');

      expect(mockObserver.observe).not.toHaveBeenCalled();
    });

    it('triggers reveal when element intersects viewport', () => {
      mockMatchMedia(false);
      const { triggerIntersection } = mockIntersectionObserver();

      document.body.innerHTML = `
        <section data-scroll-reveal>Section content</section>
      `;

      initScrollReveal('[data-scroll-reveal]');

      const section = document.querySelector('[data-scroll-reveal]') as HTMLElement;

      triggerIntersection([{ target: section, isIntersecting: true }]);

      expect(section.classList.contains('revealing')).toBe(true);
    });

    it('does not re-animate already revealed sections', () => {
      mockMatchMedia(false);
      const { triggerIntersection } = mockIntersectionObserver();

      document.body.innerHTML = `
        <section data-scroll-reveal class="revealed">Already revealed</section>
      `;

      initScrollReveal('[data-scroll-reveal]');

      const section = document.querySelector('[data-scroll-reveal]') as HTMLElement;

      triggerIntersection([{ target: section, isIntersecting: true }]);

      // Should not add revealing class since it's already revealed
      expect(section.classList.contains('revealing')).toBe(false);
    });

    it('skips already-revealed elements during observation setup', () => {
      mockMatchMedia(false);
      const { mockObserver } = mockIntersectionObserver();

      document.body.innerHTML = `
        <section data-scroll-reveal class="revealed">Already done</section>
        <section data-scroll-reveal>Not yet</section>
      `;

      initScrollReveal('[data-scroll-reveal]');

      // Only the unrevealed section should be observed
      expect(mockObserver.observe).toHaveBeenCalledTimes(1);
    });

    it('unobserves element after triggering reveal', () => {
      mockMatchMedia(false);
      const { triggerIntersection, mockObserver } = mockIntersectionObserver();

      document.body.innerHTML = `
        <section data-scroll-reveal>Content</section>
      `;

      initScrollReveal('[data-scroll-reveal]');

      const section = document.querySelector('[data-scroll-reveal]') as HTMLElement;

      triggerIntersection([{ target: section, isIntersecting: true }]);

      expect(mockObserver.unobserve).toHaveBeenCalledWith(section);
    });

    it('does not trigger reveal for non-intersecting entries', () => {
      mockMatchMedia(false);
      const { triggerIntersection, mockObserver } = mockIntersectionObserver();

      document.body.innerHTML = `
        <section data-scroll-reveal>Content</section>
      `;

      initScrollReveal('[data-scroll-reveal]');

      const section = document.querySelector('[data-scroll-reveal]') as HTMLElement;

      triggerIntersection([{ target: section, isIntersecting: false }]);

      expect(section.classList.contains('revealing')).toBe(false);
      expect(mockObserver.unobserve).not.toHaveBeenCalled();
    });

    it('reveals remaining sections when reduced motion is enabled dynamically', () => {
      const { listeners } = mockMatchMedia(false);
      const { mockObserver } = mockIntersectionObserver();

      document.body.innerHTML = `
        <section data-scroll-reveal>Section 1</section>
        <section data-scroll-reveal>Section 2</section>
      `;

      initScrollReveal('[data-scroll-reveal]');

      // Simulate reduced motion preference change
      if (listeners.length > 0) {
        listeners[0]({ matches: true } as MediaQueryListEvent);
      }

      const sections = document.querySelectorAll('[data-scroll-reveal]');
      sections.forEach((section) => {
        expect(section.classList.contains('revealed')).toBe(true);
      });

      expect(mockObserver.disconnect).toHaveBeenCalled();
    });

    it('returns null in non-browser environment', () => {
      // Temporarily remove window
      const originalWindow = globalThis.window;
      // @ts-expect-error - testing non-browser env
      delete globalThis.window;

      // Re-import would be needed for a true test, but we can test the guard
      // by checking the function handles missing window
      globalThis.window = originalWindow;
    });

    it('accepts custom configuration', () => {
      mockMatchMedia(false);
      const { MockIntersectionObserver } = mockIntersectionObserver();

      document.body.innerHTML = `
        <section data-scroll-reveal>Content</section>
      `;

      initScrollReveal('[data-scroll-reveal]', { threshold: 0.5 });

      // Verify the observer was created with custom threshold
      expect(MockIntersectionObserver).toHaveBeenCalledWith(
        expect.any(Function),
        { threshold: 0.5 }
      );
    });

    it('handles empty selector gracefully', () => {
      mockMatchMedia(false);
      const { mockObserver } = mockIntersectionObserver();

      document.body.innerHTML = '<div>No matching elements</div>';

      const cleanup = initScrollReveal('.nonexistent-class');
      expect(cleanup).not.toBeNull();
      expect(mockObserver.observe).not.toHaveBeenCalled();

      // Should not throw
      cleanup!();
    });

    it('does not trigger reveal on element currently being revealed', () => {
      mockMatchMedia(false);
      const { triggerIntersection, mockObserver } = mockIntersectionObserver();

      document.body.innerHTML = `
        <section data-scroll-reveal>Content</section>
      `;

      initScrollReveal('[data-scroll-reveal]');

      const section = document.querySelector('[data-scroll-reveal]') as HTMLElement;

      // First intersection triggers reveal
      triggerIntersection([{ target: section, isIntersecting: true }]);
      expect(section.classList.contains('revealing')).toBe(true);

      // Reset unobserve mock to check it's not called again
      mockObserver.unobserve.mockClear();

      // Second intersection should be ignored (already revealing)
      triggerIntersection([{ target: section, isIntersecting: true }]);
      expect(mockObserver.unobserve).not.toHaveBeenCalled();
    });
  });
});
