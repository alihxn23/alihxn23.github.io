/**
 * Lightning Grid Background
 *
 * Full-viewport canvas effect inspired by tapestryenergy.com:
 *
 * - A faint dot grid marks every intersection.
 * - A glowing lime orb smoothly follows the cursor.
 * - Short "lightning" segments flash along grid lines — a steady ambient
 *   trickle across the whole field, plus a denser burst around the cursor.
 *   Each lightning is a 1–3 segment polyline that snaps in (power2.out) and
 *   then fades out.
 *
 * Mouse is tracked on `window` so the effect reacts everywhere while the
 * content above stays fully interactive (canvas is pointer-events:none).
 *
 * Respects prefers-reduced-motion (renders a single static dot grid).
 */

interface GridConfig {
  spacing: number; // grid cell size in px
  dotRadius: number;
  dotColor: string; // "r, g, b"
  dotAlpha: number;
  lineColor: string; // bolt color "r, g, b"
  orbColor: string; // cursor orb core "r, g, b"
  orbRadius: number;
  orbGlow: number; // shadowBlur for the orb
  lineWidth: number;
  ambientRate: number; // ambient lightnings spawned per second
  cursorRate: number; // extra lightnings/sec spawned near the cursor
  cursorRadius: number; // px radius around cursor for spawn + emphasis
  maxBolts: number;
  growMs: number; // time for a bolt to draw in (power2.out)
  holdMs: number; // time fully lit before fading
  fadeMs: number; // fade-out duration
}

const DEFAULT_CONFIG: GridConfig = {
  spacing: 40,
  dotRadius: 1,
  dotColor: "120, 130, 90",
  dotAlpha: 0.22,
  lineColor: "225, 255, 41", // #E1FF29
  orbColor: "225, 255, 41",
  orbRadius: 9,
  orbGlow: 22,
  lineWidth: 1.6,
  ambientRate: 7,
  cursorRate: 10,
  cursorRadius: 170,
  maxBolts: 40,
  growMs: 220,
  holdMs: 120,
  fadeMs: 520,
};

interface Bolt {
  pts: Array<{ x: number; y: number }>; // polyline along grid nodes
  totalLen: number;
  segLens: number[];
  born: number; // performance.now() at spawn
  near: boolean; // spawned near cursor (slightly brighter)
}

export function initGridBackground(
  canvas: HTMLCanvasElement,
  config: Partial<GridConfig> = {},
  orbCanvas?: HTMLCanvasElement,
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  // Optional top-layer canvas: orb is drawn here so it sits above all content.
  const orbCtx = orbCanvas ? orbCanvas.getContext("2d") : null;

  const cfg = { ...DEFAULT_CONFIG, ...config };

  let width = 0;
  let height = 0;
  let cols = 0;
  let rows = 0;
  let bolts: Bolt[] = [];
  let animationId: number | null = null;
  let isVisible = true;

  // Mouse: raw target + smoothed (lerped) position for the orb.
  let mouseX = -9999;
  let mouseY = -9999;
  let orbX = -9999;
  let orbY = -9999;
  let mouseInside = false;

  let lastFrame = 0;
  let ambientAcc = 0;
  let cursorAcc = 0;

  // Static dot grid is rendered once to an offscreen canvas, then blitted each
  // frame — avoids re-stroking ~rows×cols arcs 60×/sec.
  const dotCanvas = document.createElement("canvas");
  const dotCtx = dotCanvas.getContext("2d");

  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  // The orb + animation only make sense with a fine pointer (mouse/trackpad).
  // On touch/coarse devices we render a cheap static grid and skip the loop.
  const finePointer = window.matchMedia("(pointer: fine)").matches;

  function rand(min: number, max: number): number {
    return min + Math.random() * (max - min);
  }

  // Build a 1–3 segment polyline walking between adjacent grid nodes.
  function buildBolt(startCol: number, startRow: number, near: boolean): Bolt {
    // Mostly short dashes (1 seg), sometimes a small bend/cross (2 segs).
    const segCount = Math.random() < 0.65 ? 1 : 2;
    const pts = [{ x: startCol * cfg.spacing, y: startRow * cfg.spacing }];
    let c = startCol;
    let r = startRow;
    let horizontal = Math.random() < 0.5;

    for (let i = 0; i < segCount; i++) {
      const len = 1; // single cell per segment — keeps bolts short
      const dir = Math.random() < 0.5 ? 1 : -1;
      if (horizontal) c = Math.max(0, Math.min(cols, c + dir * len));
      else r = Math.max(0, Math.min(rows, r + dir * len));
      pts.push({ x: c * cfg.spacing, y: r * cfg.spacing });
      horizontal = !horizontal; // turn 90° each segment
    }

    const segLens: number[] = [];
    let totalLen = 0;
    for (let i = 1; i < pts.length; i++) {
      const d = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
      segLens.push(d);
      totalLen += d;
    }

    return { pts, segLens, totalLen, born: performance.now(), near };
  }

  function spawnAmbient(): void {
    if (bolts.length >= cfg.maxBolts) return;
    const c = Math.floor(rand(0, cols + 1));
    const r = Math.floor(rand(0, rows + 1));
    bolts.push(buildBolt(c, r, false));
  }

  function spawnNearCursor(): void {
    if (bolts.length >= cfg.maxBolts || !mouseInside) return;
    const ang = rand(0, Math.PI * 2);
    const dist = rand(0, cfg.cursorRadius);
    const px = mouseX + Math.cos(ang) * dist;
    const py = mouseY + Math.sin(ang) * dist;
    const c = Math.round(px / cfg.spacing);
    const r = Math.round(py / cfg.spacing);
    bolts.push(buildBolt(c, r, true));
  }

  // power2.out easing
  function easeOut(t: number): number {
    const u = 1 - t;
    return 1 - u * u;
  }

  // Render the dot grid into the offscreen cache (called on resize only).
  function buildDotCache(dpr: number): void {
    if (!dotCtx) return;
    dotCanvas.width = width * dpr;
    dotCanvas.height = height * dpr;
    dotCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    dotCtx.clearRect(0, 0, width, height);
    dotCtx.fillStyle = `rgba(${cfg.dotColor}, ${cfg.dotAlpha})`;
    for (let r = 0; r <= rows; r++) {
      const y = r * cfg.spacing;
      for (let c = 0; c <= cols; c++) {
        dotCtx.beginPath();
        dotCtx.arc(c * cfg.spacing, y, cfg.dotRadius, 0, Math.PI * 2);
        dotCtx.fill();
      }
    }
  }

  // Blit the cached dot grid (device-res cache scaled back to CSS pixels).
  function drawDots(): void {
    if (dotCtx) ctx!.drawImage(dotCanvas, 0, 0, width, height);
  }

  function drawBolt(b: Bolt, now: number): boolean {
    const age = now - b.born;
    const total = cfg.growMs + cfg.holdMs + cfg.fadeMs;
    if (age >= total) return false;

    // Reveal progress along the polyline (power2.out).
    const grow = Math.min(1, age / cfg.growMs);
    const reveal = easeOut(grow) * b.totalLen;

    // Alpha: full during grow+hold, then fade.
    let alpha = 1;
    if (age > cfg.growMs + cfg.holdMs) {
      const f = (age - cfg.growMs - cfg.holdMs) / cfg.fadeMs;
      alpha = 1 - f;
    }
    alpha *= b.near ? 1 : 0.8;

    ctx!.strokeStyle = `rgba(${cfg.lineColor}, ${alpha})`;
    ctx!.lineWidth = cfg.lineWidth;
    ctx!.lineCap = "round";

    ctx!.beginPath();
    ctx!.moveTo(b.pts[0].x, b.pts[0].y);
    let drawn = 0;
    for (let i = 1; i < b.pts.length; i++) {
      const seg = b.segLens[i - 1];
      if (drawn + seg <= reveal) {
        ctx!.lineTo(b.pts[i].x, b.pts[i].y);
        drawn += seg;
      } else {
        // Partial segment.
        const remain = reveal - drawn;
        const t = seg > 0 ? remain / seg : 0;
        const x = b.pts[i - 1].x + (b.pts[i].x - b.pts[i - 1].x) * t;
        const y = b.pts[i - 1].y + (b.pts[i].y - b.pts[i - 1].y) * t;
        ctx!.lineTo(x, y);
        break;
      }
    }
    ctx!.stroke();
    return true;
  }

  function drawOrb(): void {
    // Prefer the dedicated top-layer context so the orb sits above content.
    const octx = orbCtx ?? ctx!;
    if (orbCtx) orbCtx.clearRect(0, 0, width, height);
    if (orbX < -1000 || !mouseInside) return;

    // Soft halo.
    const halo = octx.createRadialGradient(orbX, orbY, 0, orbX, orbY, cfg.orbRadius * 4);
    halo.addColorStop(0, `rgba(${cfg.orbColor}, 0.35)`);
    halo.addColorStop(1, `rgba(${cfg.orbColor}, 0)`);
    octx.fillStyle = halo;
    octx.fillRect(
      orbX - cfg.orbRadius * 4,
      orbY - cfg.orbRadius * 4,
      cfg.orbRadius * 8,
      cfg.orbRadius * 8,
    );

    // Bright core with glow.
    octx.shadowColor = `rgba(${cfg.orbColor}, 1)`;
    octx.shadowBlur = cfg.orbGlow;
    octx.fillStyle = `rgba(${cfg.orbColor}, 1)`;
    octx.beginPath();
    octx.arc(orbX, orbY, cfg.orbRadius, 0, Math.PI * 2);
    octx.fill();
    octx.shadowBlur = 0;
  }

  function frame(now: number): void {
    if (!isVisible) return;
    const dt = lastFrame ? (now - lastFrame) / 1000 : 0;
    lastFrame = now;

    // Spawn bolts at configured rates.
    ambientAcc += dt * cfg.ambientRate;
    while (ambientAcc >= 1) {
      spawnAmbient();
      ambientAcc -= 1;
    }
    if (mouseInside) {
      cursorAcc += dt * cfg.cursorRate;
      while (cursorAcc >= 1) {
        spawnNearCursor();
        cursorAcc -= 1;
      }
    }

    // Smooth orb toward cursor.
    if (orbX < -1000) {
      orbX = mouseX;
      orbY = mouseY;
    } else {
      orbX += (mouseX - orbX) * 0.35;
      orbY += (mouseY - orbY) * 0.35;
    }

    ctx!.clearRect(0, 0, width, height);
    drawDots();
    bolts = bolts.filter((b) => drawBolt(b, now));
    drawOrb();

    animationId = requestAnimationFrame(frame);
  }

  function resize(): void {
    const dpr = window.devicePixelRatio || 1;
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (orbCanvas && orbCtx) {
      orbCanvas.width = width * dpr;
      orbCanvas.height = height * dpr;
      orbCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    cols = Math.ceil(width / cfg.spacing);
    rows = Math.ceil(height / cfg.spacing);
    buildDotCache(dpr);
  }

  function onMouseMove(e: MouseEvent): void {
    mouseX = e.clientX;
    mouseY = e.clientY;
    mouseInside = true;
  }

  function onMouseLeave(): void {
    mouseInside = false;
  }

  function handleVisibility(): void {
    if (document.hidden) {
      isVisible = false;
      if (animationId !== null) {
        cancelAnimationFrame(animationId);
        animationId = null;
      }
    } else {
      isVisible = true;
      lastFrame = 0;
      if (!animationId) animationId = requestAnimationFrame(frame);
    }
  }

  // Static-only when motion is reduced or there's no fine pointer (touch).
  const staticOnly = prefersReducedMotion || !finePointer;

  let resizeTimeout: ReturnType<typeof setTimeout>;
  function onResize(): void {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      resize();
      if (staticOnly) {
        ctx!.clearRect(0, 0, width, height);
        drawDots();
      }
    }, 150);
  }

  resize();

  if (staticOnly) {
    ctx!.clearRect(0, 0, width, height);
    drawDots();
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      clearTimeout(resizeTimeout);
    };
  }

  // Animated path: replace the native cursor with the orb (top layer only).
  if (orbCtx) document.documentElement.classList.add("orb-cursor");

  window.addEventListener("mousemove", onMouseMove, { passive: true });
  document.addEventListener("mouseleave", onMouseLeave);
  document.addEventListener("visibilitychange", handleVisibility);
  window.addEventListener("resize", onResize);

  animationId = requestAnimationFrame(frame);

  // Teardown: remove listeners, stop the loop, restore the cursor.
  return () => {
    window.removeEventListener("mousemove", onMouseMove);
    document.removeEventListener("mouseleave", onMouseLeave);
    document.removeEventListener("visibilitychange", handleVisibility);
    window.removeEventListener("resize", onResize);
    clearTimeout(resizeTimeout);
    if (animationId !== null) cancelAnimationFrame(animationId);
    animationId = null;
    document.documentElement.classList.remove("orb-cursor");
    ctx!.clearRect(0, 0, width, height);
    if (orbCtx) orbCtx.clearRect(0, 0, width, height);
  };
}
