/**
 * Scroll Reveal Module
 *
 * Uses IntersectionObserver to detect when sections enter the viewport and
 * triggers a terminal-style reveal animation. Content is revealed by toggling
 * CSS classes (opacity/visibility) rather than manipulating text content
 * directly, preserving HTML structure.
 *
 * Sections are marked with a "revealed" class after animation to prevent
 * re-animation on subsequent scrolls. Respects prefers-reduced-motion by
 * showing content immediately without animation.
 *
 * Exports initScrollReveal(selector) for external use and auto-initializes
 * on DOMContentLoaded targeting [data-scroll-reveal] elements.
 */

export interface ScrollRevealConfig {
  /** IntersectionObserver threshold (0-1). Default: 0.1 */
  threshold: number;
  /** Delay between each character reveal step in milliseconds. Default: 20 */
  charDelay: number;
  /** CSS class added when section is fully revealed. Default: "revealed" */
  revealedClass: string;
  /** CSS class added during the reveal animation. Default: "revealing" */
  revealingClass: string;
}

const DEFAULT_CONFIG: ScrollRevealConfig = {
  threshold: 0.1,
  charDelay: 20,
  revealedClass: 'revealed',
  revealingClass: 'revealing',
};

/**
 * Collects all text nodes within an element (recursive).
 * Used to determine total character count for the reveal animation timing.
 */
export function collectTextNodes(element: Element): Text[] {
  const textNodes: Text[] = [];
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);

  let node: Text | null;
  while ((node = walker.nextNode() as Text | null)) {
    if (node.textContent && node.textContent.trim().length > 0) {
      textNodes.push(node);
    }
  }

  return textNodes;
}

/**
 * Calculates the total character count across all text nodes in an element.
 */
export function getTotalCharCount(element: Element): number {
  const textNodes = collectTextNodes(element);
  return textNodes.reduce((sum, node) => sum + (node.textContent?.length ?? 0), 0);
}

/**
 * Performs the terminal-style reveal animation on a section element.
 * Uses a CSS custom property (--reveal-progress) that goes from 0 to 1,
 * combined with a clip-path or max-height transition to simulate
 * character-by-character output. The actual reveal is CSS-driven via
 * the "revealing" class, with JS controlling the timing.
 *
 * @param element - The section element to reveal
 * @param config - Configuration options
 * @returns A promise that resolves when the reveal animation completes
 */
export function revealSection(
  element: HTMLElement,
  config: ScrollRevealConfig
): Promise<void> {
  return new Promise((resolve) => {
    const totalChars = getTotalCharCount(element);
    // Cap the animation duration to avoid excessively long reveals
    const maxSteps = Math.min(totalChars, 60);
    const totalDuration = maxSteps * config.charDelay;

    // Add revealing class to start the animation
    element.classList.add(config.revealingClass);
    element.style.setProperty('--reveal-progress', '0');

    let step = 0;
    const intervalId = setInterval(() => {
      step++;
      const progress = Math.min(step / maxSteps, 1);
      element.style.setProperty('--reveal-progress', String(progress));

      if (step >= maxSteps) {
        clearInterval(intervalId);
        // Mark as fully revealed
        element.classList.remove(config.revealingClass);
        element.classList.add(config.revealedClass);
        element.style.removeProperty('--reveal-progress');
        resolve();
      }
    }, config.charDelay);
  });
}

/**
 * Immediately reveals a section without animation.
 * Used when prefers-reduced-motion is enabled.
 */
export function revealImmediately(
  element: HTMLElement,
  config: ScrollRevealConfig
): void {
  element.classList.add(config.revealedClass);
  element.style.removeProperty('--reveal-progress');
}

/**
 * Initializes scroll-reveal behavior on all elements matching the given selector.
 * Sets up an IntersectionObserver that triggers the reveal animation when
 * elements enter the viewport.
 *
 * Respects prefers-reduced-motion by immediately revealing all content.
 *
 * @param selector - CSS selector for target elements
 * @param config - Optional partial configuration
 * @returns A cleanup function that disconnects the observer, or null if in non-browser env
 */
export function initScrollReveal(
  selector: string,
  config: Partial<ScrollRevealConfig> = {}
): (() => void) | null {
  // Guard for non-browser environments
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return null;
  }

  const mergedConfig: ScrollRevealConfig = {
    ...DEFAULT_CONFIG,
    ...config,
  };

  const elements = document.querySelectorAll<HTMLElement>(selector);

  // Check for reduced motion preference
  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

  if (motionQuery.matches) {
    // Immediately reveal all sections without animation
    elements.forEach((el) => revealImmediately(el, mergedConfig));
    return () => {};
  }

  // Set up IntersectionObserver
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const el = entry.target as HTMLElement;

        // Skip if already revealed or currently revealing
        if (
          el.classList.contains(mergedConfig.revealedClass) ||
          el.classList.contains(mergedConfig.revealingClass)
        ) {
          return;
        }

        if (entry.isIntersecting) {
          // Unobserve immediately to prevent re-triggering
          observer.unobserve(el);
          revealSection(el, mergedConfig);
        }
      });
    },
    { threshold: mergedConfig.threshold }
  );

  // Observe all target elements
  elements.forEach((el) => {
    // Skip elements already revealed (e.g., from a previous initialization)
    if (el.classList.contains(mergedConfig.revealedClass)) {
      return;
    }
    observer.observe(el);
  });

  // Listen for dynamic reduced-motion changes
  const handleMotionChange = (e: MediaQueryListEvent) => {
    if (e.matches) {
      // Immediately reveal all remaining unrevealed sections
      elements.forEach((el) => {
        if (!el.classList.contains(mergedConfig.revealedClass)) {
          el.classList.remove(mergedConfig.revealingClass);
          revealImmediately(el, mergedConfig);
        }
      });
      observer.disconnect();
    }
  };
  motionQuery.addEventListener('change', handleMotionChange);

  // Return cleanup function
  return () => {
    observer.disconnect();
    motionQuery.removeEventListener('change', handleMotionChange);
  };
}

// Auto-initialize on DOMContentLoaded (guard for non-browser environments)
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    initScrollReveal('[data-scroll-reveal]');
  });
}
