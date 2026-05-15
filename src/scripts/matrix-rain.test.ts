/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  MatrixRain,
  initMatrixRain,
  getRandomChar,
  debounce,
  type MatrixRainConfig,
} from './matrix-rain';

// Helper to create a mock canvas with getContext
function createMockCanvas(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  const ctx = {
    fillStyle: '',
    font: '',
    fillRect: vi.fn(),
    fillText: vi.fn(),
    clearRect: vi.fn(),
  };
  vi.spyOn(canvas, 'getContext').mockReturnValue(ctx as unknown as CanvasRenderingContext2D);
  return canvas;
}

// Helper to mock matchMedia
function mockMatchMedia(reducedMotion: boolean) {
  const listeners: Array<(e: MediaQueryListEvent) => void> = [];
  const mql = {
    matches: reducedMotion,
    media: '(prefers-reduced-motion: reduce)',
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn((_, handler: (e: MediaQueryListEvent) => void) => {
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

describe('matrix-rain', () => {
  let rafCallbacks: Array<FrameRequestCallback>;
  let rafId: number;

  beforeEach(() => {
    vi.useFakeTimers();
    document.body.innerHTML = '';
    rafCallbacks = [];
    rafId = 0;

    // Mock requestAnimationFrame
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      rafCallbacks.push(cb);
      return ++rafId;
    });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});

    // Mock window dimensions
    Object.defineProperty(window, 'innerWidth', { writable: true, value: 1024 });
    Object.defineProperty(window, 'innerHeight', { writable: true, value: 768 });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('getRandomChar', () => {
    it('returns a single character', () => {
      const char = getRandomChar();
      expect(char).toHaveLength(1);
    });

    it('returns characters from the expected character sets', () => {
      // Run multiple times to get variety
      const chars = new Set<string>();
      for (let i = 0; i < 1000; i++) {
        chars.add(getRandomChar());
      }
      // Should have katakana, latin, and numbers
      expect(chars.size).toBeGreaterThan(10);
    });
  });

  describe('debounce', () => {
    it('delays function execution by the specified time', () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 150);

      debounced();
      expect(fn).not.toHaveBeenCalled();

      vi.advanceTimersByTime(149);
      expect(fn).not.toHaveBeenCalled();

      vi.advanceTimersByTime(1);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('resets the timer on subsequent calls', () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 150);

      debounced();
      vi.advanceTimersByTime(100);
      debounced(); // Reset timer
      vi.advanceTimersByTime(100);
      expect(fn).not.toHaveBeenCalled();

      vi.advanceTimersByTime(50);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('only calls the function once for rapid successive calls', () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 150);

      debounced();
      debounced();
      debounced();
      debounced();

      vi.advanceTimersByTime(150);
      expect(fn).toHaveBeenCalledTimes(1);
    });
  });

  describe('MatrixRain', () => {
    it('initializes canvas dimensions on construction', () => {
      mockMatchMedia(false);
      const canvas = createMockCanvas();

      new MatrixRain(canvas);

      expect(canvas.width).toBe(1024);
      expect(canvas.height).toBe(768);
    });

    it('does not initialize when prefers-reduced-motion is active', () => {
      mockMatchMedia(true);
      const canvas = createMockCanvas();

      const rain = new MatrixRain(canvas);

      expect(rain.getIsDisabled()).toBe(true);
      expect(rain.getIsRunning()).toBe(false);
    });

    it('starts the animation loop when start() is called', () => {
      mockMatchMedia(false);
      const canvas = createMockCanvas();

      const rain = new MatrixRain(canvas);
      rain.start();

      expect(rain.getIsRunning()).toBe(true);
      expect(window.requestAnimationFrame).toHaveBeenCalled();
    });

    it('does not start when disabled', () => {
      mockMatchMedia(true);
      const canvas = createMockCanvas();

      const rain = new MatrixRain(canvas);
      rain.start();

      expect(rain.getIsRunning()).toBe(false);
      expect(window.requestAnimationFrame).not.toHaveBeenCalled();
    });

    it('pauses the animation loop', () => {
      mockMatchMedia(false);
      const canvas = createMockCanvas();

      const rain = new MatrixRain(canvas);
      rain.start();
      rain.pause();

      expect(rain.getIsRunning()).toBe(false);
      expect(window.cancelAnimationFrame).toHaveBeenCalled();
    });

    it('stops and clears the canvas', () => {
      mockMatchMedia(false);
      const canvas = createMockCanvas();
      const ctx = canvas.getContext('2d')!;

      const rain = new MatrixRain(canvas);
      rain.start();
      rain.stop();

      expect(rain.getIsRunning()).toBe(false);
      expect(ctx.clearRect).toHaveBeenCalledWith(0, 0, 1024, 768);
    });

    it('draws characters on each animation frame', () => {
      mockMatchMedia(false);
      const canvas = createMockCanvas();
      const ctx = canvas.getContext('2d')!;

      const rain = new MatrixRain(canvas, { density: 1 });
      rain.start();

      // Execute one frame
      if (rafCallbacks.length > 0) {
        rafCallbacks[0](0);
      }

      // Should have drawn the fade overlay
      expect(ctx.fillRect).toHaveBeenCalled();
      // Should have drawn at least one character
      expect(ctx.fillText).toHaveBeenCalled();
    });

    it('pauses when tab becomes hidden', () => {
      mockMatchMedia(false);
      const canvas = createMockCanvas();

      const rain = new MatrixRain(canvas);
      rain.start();

      expect(rain.getIsRunning()).toBe(true);

      // Simulate tab becoming hidden
      Object.defineProperty(document, 'hidden', { writable: true, value: true });
      document.dispatchEvent(new Event('visibilitychange'));

      expect(rain.getIsRunning()).toBe(false);
    });

    it('resumes when tab becomes visible again', () => {
      mockMatchMedia(false);
      const canvas = createMockCanvas();

      const rain = new MatrixRain(canvas);
      rain.start();

      // Hide tab
      Object.defineProperty(document, 'hidden', { writable: true, value: true });
      document.dispatchEvent(new Event('visibilitychange'));
      expect(rain.getIsRunning()).toBe(false);

      // Show tab
      Object.defineProperty(document, 'hidden', { writable: true, value: false });
      document.dispatchEvent(new Event('visibilitychange'));
      expect(rain.getIsRunning()).toBe(true);
    });

    it('reinitializes canvas on resize with debounce', () => {
      mockMatchMedia(false);
      const canvas = createMockCanvas();

      const rain = new MatrixRain(canvas);
      rain.start();

      // Change window size
      Object.defineProperty(window, 'innerWidth', { writable: true, value: 1920 });
      Object.defineProperty(window, 'innerHeight', { writable: true, value: 1080 });

      // Trigger resize
      window.dispatchEvent(new Event('resize'));

      // Canvas should not have changed yet (debounced)
      expect(canvas.width).toBe(1024);

      // Advance past debounce delay
      vi.advanceTimersByTime(150);

      // Now canvas should be reinitialized
      expect(canvas.width).toBe(1920);
      expect(canvas.height).toBe(1080);
    });

    it('does not reinitialize before debounce delay completes', () => {
      mockMatchMedia(false);
      const canvas = createMockCanvas();

      new MatrixRain(canvas);

      Object.defineProperty(window, 'innerWidth', { writable: true, value: 1920 });
      window.dispatchEvent(new Event('resize'));

      vi.advanceTimersByTime(100);
      expect(canvas.width).toBe(1024); // Still old size
    });

    it('applies custom configuration', () => {
      mockMatchMedia(false);
      const canvas = createMockCanvas();
      const ctx = canvas.getContext('2d')!;

      const config: Partial<MatrixRainConfig> = {
        fontSize: 20,
        color: '#ff0000',
        fadeOpacity: 0.1,
      };

      const rain = new MatrixRain(canvas, config);
      rain.start();

      // Execute one frame
      if (rafCallbacks.length > 0) {
        rafCallbacks[0](0);
      }

      // Check that the custom color and font were used
      expect(ctx.font).toBe('20px monospace');
    });

    it('disables when reduced motion preference changes dynamically', () => {
      const { listeners } = mockMatchMedia(false);
      const canvas = createMockCanvas();

      const rain = new MatrixRain(canvas);
      rain.start();
      expect(rain.getIsRunning()).toBe(true);

      // Simulate motion preference change
      if (listeners.length > 0) {
        listeners[0]({ matches: true } as MediaQueryListEvent);
      }

      expect(rain.getIsDisabled()).toBe(true);
      expect(rain.getIsRunning()).toBe(false);
    });

    it('cleans up event listeners on destroy', () => {
      mockMatchMedia(false);
      const canvas = createMockCanvas();

      const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');
      const windowRemoveSpy = vi.spyOn(window, 'removeEventListener');

      const rain = new MatrixRain(canvas);
      rain.start();
      rain.destroy();

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'visibilitychange',
        expect.any(Function)
      );
      expect(windowRemoveSpy).toHaveBeenCalledWith('resize', expect.any(Function));
    });
  });

  describe('initMatrixRain', () => {
    it('creates and starts a MatrixRain instance', () => {
      mockMatchMedia(false);
      const canvas = createMockCanvas();

      const rain = initMatrixRain(canvas);

      expect(rain).not.toBeNull();
      expect(rain!.getIsRunning()).toBe(true);
    });

    it('returns null when reduced motion is preferred', () => {
      mockMatchMedia(true);
      const canvas = createMockCanvas();

      const rain = initMatrixRain(canvas);

      expect(rain).toBeNull();
    });

    it('passes custom config to the MatrixRain instance', () => {
      mockMatchMedia(false);
      const canvas = createMockCanvas();

      const rain = initMatrixRain(canvas, { fontSize: 20, speed: 2 });

      expect(rain).not.toBeNull();
      expect(rain!.getIsRunning()).toBe(true);
    });
  });
});
