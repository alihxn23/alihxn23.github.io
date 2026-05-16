/**
 * Glitch Effect Module
 *
 * Applies a CSS-driven glitch distortion effect on hover/focus of target elements.
 * Uses CSS clip-path slicing and RGB channel offset via CSS custom properties
 * (--glitch-offset-x, --glitch-clip) driven by JS. Duration is limited to 300ms
 * maximum to avoid seizure risk. Respects prefers-reduced-motion.
 *
 * Exports initGlitchEffect(selector) for external use and auto-initializes
 * on DOMContentLoaded for .section-header__title and .terminal-nav__link elements.
 */

export interface GlitchConfig {
  /** Maximum intensity of the horizontal offset in pixels */
  intensity: number;
  /** Duration of the glitch effect in milliseconds (capped at 300ms) */
  duration: number;
  /** Number of horizontal clip-path slices */
  sliceCount: number;
}

const DEFAULT_CONFIG: GlitchConfig = {
  intensity: 5,
  duration: 300,
  sliceCount: 5,
};

/** Maximum allowed duration to avoid seizure risk (WCAG) */
const MAX_DURATION_MS = 300;

/**
 * Generates a random CSS clip-path polygon representing horizontal slices.
 * Each slice is a random horizontal band across the element.
 */
export function generateClipPath(sliceCount: number): string {
  const slices: string[] = [];
  const sliceHeight = 100 / sliceCount;

  for (let i = 0; i < sliceCount; i++) {
    const top = i * sliceHeight;
    const bottom = top + sliceHeight;
    // Randomly decide if this slice is visible (creates the slicing effect)
    if (Math.random() > 0.3) {
      slices.push(
        `polygon(0% ${top}%, 100% ${top}%, 100% ${bottom}%, 0% ${bottom}%)`
      );
    }
  }

  // If no slices selected, show at least one
  if (slices.length === 0) {
    slices.push('polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)');
  }

  // Combine slices into a single clip-path using the first slice
  // (CSS clip-path only supports one polygon, so we pick a random subset)
  const randomSliceIndex = Math.floor(Math.random() * slices.length);
  return slices[randomSliceIndex];
}

/**
 * Generates a random horizontal offset value for RGB channel shift.
 */
export function generateOffset(intensity: number): number {
  return (Math.random() - 0.5) * 2 * intensity;
}

/**
 * Applies the glitch effect to a single element.
 * Sets CSS custom properties --glitch-offset-x and --glitch-clip,
 * then cleans up after the duration expires.
 */
export function applyGlitch(element: HTMLElement, config: GlitchConfig): void {
  const safeDuration = Math.min(config.duration, MAX_DURATION_MS);
  const offsetX = generateOffset(config.intensity);
  const clipPath = generateClipPath(config.sliceCount);

  // Apply CSS custom properties for the glitch visual
  element.style.setProperty('--glitch-offset-x', `${offsetX}px`);
  element.style.setProperty('--glitch-clip', clipPath);
  element.style.setProperty('transform', `translate3d(${offsetX}px, 0, 0)`);
  element.style.setProperty('clip-path', clipPath);

  // Clean up after duration
  setTimeout(() => {
    cleanupGlitch(element);
  }, safeDuration);
}

/**
 * Removes all glitch-related inline styles from an element.
 */
export function cleanupGlitch(element: HTMLElement): void {
  element.style.removeProperty('--glitch-offset-x');
  element.style.removeProperty('--glitch-clip');
  element.style.removeProperty('transform');
  element.style.removeProperty('clip-path');
}

/**
 * Initializes the glitch effect on all elements matching the given selector.
 * Attaches mouseenter/focus listeners that trigger the glitch, and
 * mouseleave/blur listeners that clean up.
 *
 * Skips all effects if prefers-reduced-motion is enabled.
 *
 * @param selector - CSS selector for target elements
 * @param config - Optional partial configuration
 * @returns A cleanup function that removes all event listeners
 */
export function initGlitchEffect(
  selector: string,
  config: Partial<GlitchConfig> = {}
): (() => void) | null {
  // Guard for non-browser environments
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return null;
  }

  // Respect prefers-reduced-motion
  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (motionQuery.matches) {
    return null;
  }

  const mergedConfig: GlitchConfig = {
    ...DEFAULT_CONFIG,
    ...config,
    // Always cap duration at MAX_DURATION_MS for seizure safety
    duration: Math.min(config.duration ?? DEFAULT_CONFIG.duration, MAX_DURATION_MS),
  };

  const elements = document.querySelectorAll<HTMLElement>(selector);
  const cleanupFns: Array<() => void> = [];

  elements.forEach((element) => {
    const handleActivate = () => {
      applyGlitch(element, mergedConfig);
    };

    const handleDeactivate = () => {
      cleanupGlitch(element);
    };

    element.addEventListener('mouseenter', handleActivate);
    element.addEventListener('focus', handleActivate);
    element.addEventListener('mouseleave', handleDeactivate);
    element.addEventListener('blur', handleDeactivate);

    cleanupFns.push(() => {
      element.removeEventListener('mouseenter', handleActivate);
      element.removeEventListener('focus', handleActivate);
      element.removeEventListener('mouseleave', handleDeactivate);
      element.removeEventListener('blur', handleDeactivate);
      cleanupGlitch(element);
    });
  });

  // Listen for dynamic reduced-motion changes
  const handleMotionChange = (e: MediaQueryListEvent) => {
    if (e.matches) {
      // Clean up all elements when reduced motion is enabled
      elements.forEach((el) => cleanupGlitch(el));
    }
  };
  motionQuery.addEventListener('change', handleMotionChange);

  // Return cleanup function
  return () => {
    cleanupFns.forEach((fn) => fn());
    motionQuery.removeEventListener('change', handleMotionChange);
  };
}

// Auto-initialize on DOMContentLoaded (guard for non-browser environments)
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    initGlitchEffect('.section-header__title, .terminal-nav__link');
  });
}
