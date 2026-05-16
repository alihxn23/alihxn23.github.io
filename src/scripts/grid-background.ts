/**
 * Grid Background Animation
 *
 * Renders an invisible grid where, near the mouse cursor, horizontal and
 * vertical line segments appear at grid intersections — like energy flowing
 * through circuit traces. Lines vary in length and direction, forming
 * cross/plus patterns at nodes.
 *
 * Key behaviors:
 * - Grid points are invisible (no dots)
 * - Lines extend horizontally or vertically from grid nodes
 * - Each node randomly picks H, V, or both (cross) directions
 * - Lines activate within a radius of the cursor
 * - Lines fade in/out smoothly with persistence
 * - Directions re-randomize periodically for dynamic feel
 *
 * Respects prefers-reduced-motion.
 */

interface GridNode {
  x: number;
  y: number;
  // Each node can have up to 2 lines: horizontal and vertical
  hLength: number;       // target horizontal line length
  vLength: number;       // target vertical line length
  hCurrent: number;      // current animated horizontal length
  vCurrent: number;      // current animated vertical length
  hDir: number;          // horizontal direction: 1 or -1
  vDir: number;          // vertical direction: 1 or -1
  hActive: boolean;      // whether horizontal line is enabled
  vActive: boolean;      // whether vertical line is enabled
  opacity: number;       // current opacity (0-1)
  targetOpacity: number;
  lastShuffle: number;   // when directions last changed
  shuffleInterval: number;
}

interface GridConfig {
  spacing: number;
  mouseRadius: number;
  maxLineLength: number;
  minLineLength: number;
  lineWidth: number;
  color: string;
  maxOpacity: number;
  fadeInSpeed: number;
  fadeOutSpeed: number;
  shuffleMinInterval: number;
  shuffleMaxInterval: number;
}

const DEFAULT_CONFIG: GridConfig = {
  spacing: 80,
  mouseRadius: 120,
  maxLineLength: 55,
  minLineLength: 20,
  lineWidth: 1.5,
  color: "0, 255, 65",
  maxOpacity: 0.7,
  fadeInSpeed: 0.08,
  fadeOutSpeed: 0.03,
  shuffleMinInterval: 600,
  shuffleMaxInterval: 2000,
};

export function initGridBackground(canvas: HTMLCanvasElement, config: Partial<GridConfig> = {}, sharedState?: { cursorOnAnyCanvas: boolean }) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const cfg = { ...DEFAULT_CONFIG, ...config };
  const shared = sharedState || { cursorOnAnyCanvas: false };
  let nodes: GridNode[] = [];
  let mouseX = -1000;
  let mouseY = -1000;
  let animationId: number | null = null;
  let isVisible = true;
  let lastMoveTime = 0;
  let isOnCanvas = false;
  let isIdle = true;
  let lastAmbientSpark = 0;
  const idleTimeout = 800; // ms before lines start fading after mouse stops
  const ambientInterval = 400; // ms between random ambient sparks

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function randomLineLength(): number {
    return cfg.minLineLength + Math.random() * (cfg.maxLineLength - cfg.minLineLength);
  }

  function randomShuffleInterval(): number {
    return cfg.shuffleMinInterval + Math.random() * (cfg.shuffleMaxInterval - cfg.shuffleMinInterval);
  }

  function shuffleNode(node: GridNode) {
    // Only ~50% of nodes show lines at any time for a sparser look
    const roll = Math.random();
    if (roll < 0.25) {
      // Horizontal only
      node.hActive = true;
      node.vActive = false;
    } else if (roll < 0.5) {
      // Vertical only
      node.hActive = false;
      node.vActive = true;
    } else if (roll < 0.65) {
      // Cross (both)
      node.hActive = true;
      node.vActive = true;
    } else {
      // Nothing — this node stays dark
      node.hActive = false;
      node.vActive = false;
    }
    node.hLength = randomLineLength();
    node.vLength = randomLineLength();
    node.hCurrent = 0;
    node.vCurrent = 0;
    node.hDir = Math.random() > 0.5 ? 1 : -1;
    node.vDir = Math.random() > 0.5 ? 1 : -1;
    node.shuffleInterval = randomShuffleInterval();
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    generateNodes(rect.width, rect.height);
  }

  function generateNodes(width: number, height: number) {
    nodes = [];
    const cols = Math.ceil(width / cfg.spacing) + 1;
    const rows = Math.ceil(height / cfg.spacing) + 1;
    const now = performance.now();

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const node: GridNode = {
          x: col * cfg.spacing,
          y: row * cfg.spacing,
          hLength: randomLineLength(),
          vLength: randomLineLength(),
          hCurrent: 0,
          vCurrent: 0,
          hDir: Math.random() > 0.5 ? 1 : -1,
          vDir: Math.random() > 0.5 ? 1 : -1,
          hActive: Math.random() > 0.4,
          vActive: Math.random() > 0.4,
          opacity: 0,
          targetOpacity: 0,
          lastShuffle: now + Math.random() * 1000,
          shuffleInterval: randomShuffleInterval(),
        };
        nodes.push(node);
      }
    }
  }

  function update() {
    const now = performance.now();
    isIdle = (now - lastMoveTime) > idleTimeout;

    // Ambient mode: only when cursor is NOT on any canvas (user is in main area)
    const inMainArea = !shared.cursorOnAnyCanvas;
    if (inMainArea && nodes.length > 0) {
      if (now - lastAmbientSpark > ambientInterval) {
        // Pick a random node and activate it
        const idx = Math.floor(Math.random() * nodes.length);
        const node = nodes[idx];
        shuffleNode(node);
        if (node.hActive || node.vActive) {
          node.targetOpacity = cfg.maxOpacity;
          node.lastShuffle = now;
        }
        lastAmbientSpark = now;
      }
    }

    for (const node of nodes) {
      // Cursor-following mode (only when cursor is on canvas and moving)
      if (isOnCanvas && !isIdle) {
        const dx = mouseX - node.x;
        const dy = mouseY - node.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < cfg.mouseRadius) {
          node.targetOpacity = cfg.maxOpacity;

          if (now - node.lastShuffle > node.shuffleInterval) {
            shuffleNode(node);
            node.lastShuffle = now;
          }
        } else if (node.targetOpacity === cfg.maxOpacity) {
          // Only fade nodes that were cursor-activated (not ambient)
          node.targetOpacity = 0;
        }
      }

      // Fade out nodes that have reached their target
      if (node.targetOpacity > 0 && node.opacity >= node.targetOpacity * 0.95) {
        // Start fading only after lines have fully extended
        const hDone = !node.hActive || node.hCurrent >= node.hLength * 0.9;
        const vDone = !node.vActive || node.vCurrent >= node.vLength * 0.9;
        if (hDone && vDone && (!isOnCanvas || isIdle)) {
          node.targetOpacity = 0;
        }
      }

      // Smooth opacity transitions
      if (node.opacity < node.targetOpacity) {
        node.opacity += cfg.fadeInSpeed;
        if (node.opacity > node.targetOpacity) node.opacity = node.targetOpacity;
      } else if (node.opacity > node.targetOpacity) {
        node.opacity -= cfg.fadeOutSpeed;
        if (node.opacity < 0) node.opacity = 0;
      }

      // Ease-out line growth: fast start, slows as it approaches target
      if (node.opacity > 0) {
        node.hCurrent += (node.hLength - node.hCurrent) * 0.15;
        node.vCurrent += (node.vLength - node.vCurrent) * 0.15;
      } else {
        node.hCurrent *= 0.85;
        node.vCurrent *= 0.85;
      }
    }
  }

  function draw() {
    const rect = canvas.getBoundingClientRect();
    ctx!.clearRect(0, 0, rect.width, rect.height);

    for (const node of nodes) {
      if (node.opacity < 0.01) continue;

      const alpha = node.opacity;

      // Draw horizontal line — shoot away from cursor (or stored dir in ambient)
      if (node.hActive && node.hCurrent > 0.5) {
        const dirH = isOnCanvas && !isIdle ? (mouseX < node.x ? 1 : -1) : node.hDir;
        ctx!.beginPath();
        ctx!.moveTo(node.x, node.y);
        ctx!.lineTo(node.x + dirH * node.hCurrent * 2, node.y);
        ctx!.strokeStyle = `rgba(${cfg.color}, ${alpha})`;
        ctx!.lineWidth = cfg.lineWidth;
        ctx!.stroke();
      }

      // Draw vertical line — shoot away from cursor (or stored dir in ambient)
      if (node.vActive && node.vCurrent > 0.5) {
        const dirV = isOnCanvas && !isIdle ? (mouseY < node.y ? 1 : -1) : node.vDir;
        ctx!.beginPath();
        ctx!.moveTo(node.x, node.y);
        ctx!.lineTo(node.x, node.y + dirV * node.vCurrent * 2);
        ctx!.strokeStyle = `rgba(${cfg.color}, ${alpha})`;
        ctx!.lineWidth = cfg.lineWidth;
        ctx!.stroke();
      }
    }
  }

  function animate() {
    if (!isVisible) return;
    update();
    draw();
    animationId = requestAnimationFrame(animate);
  }

  function handleMouseMove(e: MouseEvent) {
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;
    lastMoveTime = performance.now();
    isOnCanvas = true;
    shared.cursorOnAnyCanvas = true;
  }

  function handleMouseLeave() {
    mouseX = -1000;
    mouseY = -1000;
    isOnCanvas = false;
    // Only clear shared state if no other canvas has it
    // Small delay to avoid flicker during transitions
    setTimeout(() => {
      if (!isOnCanvas) shared.cursorOnAnyCanvas = false;
    }, 50);
  }

  function handleVisibility() {
    if (document.hidden) {
      isVisible = false;
      if (animationId !== null) {
        cancelAnimationFrame(animationId);
        animationId = null;
      }
    } else {
      isVisible = true;
      if (!animationId) animate();
    }
  }

  // Initialize
  resize();

  if (prefersReducedMotion) {
    return; // No static render needed — grid is invisible without cursor
  }

  canvas.addEventListener("mousemove", handleMouseMove);
  canvas.addEventListener("mouseleave", handleMouseLeave);
  document.addEventListener("visibilitychange", handleVisibility);

  let resizeTimeout: ReturnType<typeof setTimeout>;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(resize, 150);
  });

  animate();
}
