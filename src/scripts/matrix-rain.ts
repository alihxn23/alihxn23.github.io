/**
 * Matrix Rain Animation Module
 *
 * Canvas-based falling green characters effect using requestAnimationFrame.
 * Renders random katakana, latin, and numeric characters falling in columns
 * with a fade trail effect. Respects prefers-reduced-motion and pauses when
 * the tab is hidden via the Page Visibility API.
 */

/** Configuration options for the matrix rain effect */
export interface MatrixRainConfig {
  /** Font size in pixels for the falling characters */
  fontSize: number;
  /** Speed multiplier for the fall rate (higher = faster) */
  speed: number;
  /** Density of active columns (0-1, where 1 = all columns active) */
  density: number;
  /** Color of the falling characters (CSS color string) */
  color: string;
  /** Opacity of the fade overlay each frame (0-1, lower = longer trails) */
  fadeOpacity: number;
}

/** Default configuration values */
const DEFAULT_CONFIG: MatrixRainConfig = {
  fontSize: 14,
  speed: 1,
  density: 0.8,
  color: '#00ff41',
  fadeOpacity: 0.05,
};

/** Character sets used for the rain drops */
const KATAKANA = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン';
const LATIN = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const NUMBERS = '0123456789';
const ALL_CHARACTERS = KATAKANA + LATIN + NUMBERS;

/**
 * Returns a random character from the combined character set.
 */
export function getRandomChar(): string {
  return ALL_CHARACTERS[Math.floor(Math.random() * ALL_CHARACTERS.length)];
}

/**
 * Debounces a function call by the specified delay in milliseconds.
 */
export function debounce<T extends (...args: unknown[]) => void>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<T>) => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      fn(...args);
      timeoutId = null;
    }, delay);
  };
}

/**
 * MatrixRain class manages the canvas-based falling characters animation.
 */
export class MatrixRain {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D | null;
  private config: MatrixRainConfig;
  private columns: number[] = [];
  private columnCount = 0;
  private animationId: number | null = null;
  private isRunning = false;
  private isDisabled = false;
  private debouncedResize: () => void;
  private boundHandleVisibility: () => void;
  private reducedMotionQuery: MediaQueryList;
  private boundHandleMotionChange: (e: MediaQueryListEvent) => void;

  constructor(canvas: HTMLCanvasElement, config: Partial<MatrixRainConfig> = {}) {
    this.canvas = canvas;
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.ctx = canvas.getContext('2d');

    // Bind event handlers
    this.boundHandleVisibility = this.handleVisibilityChange.bind(this);
    this.boundHandleMotionChange = this.handleMotionChange.bind(this);
    this.debouncedResize = debounce(() => this.reinitialize(), 150);

    // Check reduced motion preference
    this.reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    if (this.reducedMotionQuery.matches) {
      this.isDisabled = true;
      return;
    }

    this.initCanvas();
    this.attachEventListeners();
  }

  /**
   * Initializes canvas dimensions and column state.
   */
  private initCanvas(): void {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;

    this.columnCount = Math.floor(this.canvas.width / this.config.fontSize);

    // Initialize columns with random starting positions
    this.columns = [];
    for (let i = 0; i < this.columnCount; i++) {
      // Only activate columns based on density setting
      if (Math.random() < this.config.density) {
        this.columns[i] = Math.floor(Math.random() * (this.canvas.height / this.config.fontSize));
      } else {
        this.columns[i] = -1; // Inactive column
      }
    }
  }

  /**
   * Attaches event listeners for visibility, resize, and motion preference changes.
   */
  private attachEventListeners(): void {
    document.addEventListener('visibilitychange', this.boundHandleVisibility);
    window.addEventListener('resize', this.debouncedResize);
    this.reducedMotionQuery.addEventListener('change', this.boundHandleMotionChange);
  }

  /**
   * Removes all event listeners.
   */
  private detachEventListeners(): void {
    document.removeEventListener('visibilitychange', this.boundHandleVisibility);
    window.removeEventListener('resize', this.debouncedResize);
    this.reducedMotionQuery.removeEventListener('change', this.boundHandleMotionChange);
  }

  /**
   * Handles the Page Visibility API change event.
   * Pauses animation when tab is hidden, resumes when visible.
   */
  private handleVisibilityChange(): void {
    if (document.hidden) {
      this.pause();
    } else {
      this.start();
    }
  }

  /**
   * Handles changes to the prefers-reduced-motion media query.
   */
  private handleMotionChange(e: MediaQueryListEvent): void {
    if (e.matches) {
      this.isDisabled = true;
      this.stop();
    } else {
      this.isDisabled = false;
      this.initCanvas();
      this.start();
    }
  }

  /**
   * Reinitializes the canvas dimensions and column state (called on resize).
   */
  private reinitialize(): void {
    const wasRunning = this.isRunning;

    if (this.isRunning) {
      this.pause();
    }

    this.initCanvas();

    if (wasRunning) {
      this.start();
    }
  }

  /**
   * Draws a single frame of the matrix rain animation.
   */
  private draw(): void {
    if (!this.ctx) return;

    const { fontSize, color, fadeOpacity, speed } = this.config;

    // Draw semi-transparent black rectangle to create fade trail
    this.ctx.fillStyle = `rgba(0, 0, 0, ${fadeOpacity})`;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Set character style
    this.ctx.fillStyle = color;
    this.ctx.font = `${fontSize}px monospace`;

    // Draw characters for each column
    for (let i = 0; i < this.columnCount; i++) {
      if (this.columns[i] < 0) {
        // Inactive column - randomly activate it
        if (Math.random() < 0.002 * speed) {
          this.columns[i] = 0;
        }
        continue;
      }

      const char = getRandomChar();
      const x = i * fontSize;
      const y = this.columns[i] * fontSize;

      this.ctx.fillText(char, x, y);

      // Reset column to top when it reaches the bottom, or randomly
      if (y > this.canvas.height && Math.random() > 0.975) {
        this.columns[i] = 0;
      } else {
        this.columns[i] += speed;
      }
    }
  }

  /**
   * The animation loop using requestAnimationFrame.
   */
  private animate = (): void => {
    if (!this.isRunning) return;

    this.draw();
    this.animationId = requestAnimationFrame(this.animate);
  };

  /**
   * Starts the animation loop.
   */
  start(): void {
    if (this.isDisabled || this.isRunning || !this.ctx) return;

    this.isRunning = true;
    this.animationId = requestAnimationFrame(this.animate);
  }

  /**
   * Pauses the animation loop without cleaning up.
   */
  pause(): void {
    this.isRunning = false;
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  /**
   * Stops the animation and cleans up all event listeners.
   */
  stop(): void {
    this.pause();
    if (this.ctx) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }

  /**
   * Fully destroys the instance, removing all event listeners and stopping animation.
   */
  destroy(): void {
    this.stop();
    this.detachEventListeners();
  }

  /**
   * Returns whether the animation is currently running.
   */
  getIsRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Returns whether the animation is disabled (due to reduced motion preference).
   */
  getIsDisabled(): boolean {
    return this.isDisabled;
  }
}

/**
 * Initializes the matrix rain effect on a canvas element.
 * Convenience function that creates a MatrixRain instance and starts it.
 *
 * @param canvas - The canvas element to render on
 * @param config - Optional partial configuration
 * @returns The MatrixRain instance, or null if disabled or canvas context unavailable
 */
export function initMatrixRain(
  canvas: HTMLCanvasElement,
  config: Partial<MatrixRainConfig> = {}
): MatrixRain | null {
  const rain = new MatrixRain(canvas, config);

  if (rain.getIsDisabled()) {
    return null;
  }

  rain.start();
  return rain;
}
