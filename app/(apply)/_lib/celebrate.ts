/**
 * The end of the flow's celebration: the chirp's two blips, the star burst's
 * sparkles and the confetti. Only the submit and Received use them, so this
 * module is its own chunk, fetched through `loadCelebration()` (feel.ts) when
 * the email step or Received mounts. Browser-only.
 */

/** Two rising sine blips (~0.2 s) on an already unlocked audio context. */
export function playChirp(audio: AudioContext) {
  try {
    const t = audio.currentTime;
    for (const [delay, from, to] of [
      [0, 1900, 2900],
      [0.11, 2300, 3400],
    ]) {
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(from, t + delay);
      osc.frequency.exponentialRampToValueAtTime(to, t + delay + 0.07);
      gain.gain.setValueAtTime(0, t + delay);
      gain.gain.linearRampToValueAtTime(0.18, t + delay + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, t + delay + 0.09);
      osc.connect(gain).connect(audio.destination);
      osc.start(t + delay);
      osc.stop(t + delay + 0.1);
    }
  } catch {
    // No audio is fine.
  }
}

// ── Star burst ───────────────────────────────────────────────────────────────

const BURST_COLOURS = ["#f6b82b", "#a6e81f", "#ff6420", "#f6d36b", "#6ea300"];

export type Spark = { id: number; dx: number; dy: number; size: number; color: string };

/** The 14 sparkles the progress bar's star bursts into; `burst` is the burst's count. */
export function sparkSpray(burst: number): Spark[] {
  return Array.from({ length: 14 }, (_, k) => {
    const a = (k / 14) * Math.PI * 2 + Math.random() * 0.3;
    const d = 40 + Math.random() * 46;
    return {
      id: burst * 100 + k,
      dx: Math.cos(a) * d,
      dy: Math.sin(a) * d,
      size: 9 + Math.random() * 9,
      color: BURST_COLOURS[k % BURST_COLOURS.length],
    };
  });
}

// ── Confetti ─────────────────────────────────────────────────────────────────

const PALETTE = ["#a6e81f", "#ff6420", "#f6c33b", "#5bb8f5", "#13235f", "#ff8fb1"];
const PIECES = 120;

type Piece = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  vr: number;
  w: number;
  h: number;
  c: string;
  round: boolean;
};

/**
 * Throws a burst of confetti across `cv` from a point on the page (client
 * coordinates). Drawn at 2× in device pixels; the loop stops once every piece
 * has fallen off the bottom. `frame` holds the running animation frame, so
 * the caller can cancel it. Nothing under reduced motion.
 */
export function throwConfetti(cv: HTMLCanvasElement | null, x: number, y: number, frame: { current: number }) {
  const ctx = cv?.getContext("2d");
  if (!cv || !ctx || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const scale = 2;
  cv.width = window.innerWidth * scale;
  cv.height = window.innerHeight * scale;
  const parts: Piece[] = Array.from({ length: PIECES }, () => ({
    x: x * scale + (Math.random() - 0.5) * 60,
    y: y * scale,
    vx: (Math.random() - 0.5) * 28,
    vy: -Math.random() * 26 - 8,
    r: Math.random() * 6.28,
    vr: (Math.random() - 0.5) * 0.4,
    w: 10 + Math.random() * 10,
    h: 6 + Math.random() * 8,
    c: PALETTE[Math.floor(Math.random() * PALETTE.length)],
    round: Math.random() < 0.3,
  }));
  cancelAnimationFrame(frame.current);
  const tick = () => {
    ctx.clearRect(0, 0, cv.width, cv.height);
    let alive = 0;
    for (const p of parts) {
      p.vy += 0.7;
      p.vx *= 0.985;
      p.x += p.vx;
      p.y += p.vy;
      p.r += p.vr;
      if (p.y < cv.height + 40) alive++;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.r);
      ctx.fillStyle = p.c;
      if (p.round) {
        ctx.beginPath();
        ctx.arc(0, 0, p.h * 0.6, 0, 6.28);
        ctx.fill();
      } else {
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * Math.abs(Math.cos(p.r * 2)) + 2);
      }
      ctx.restore();
    }
    if (alive) frame.current = requestAnimationFrame(tick);
    else ctx.clearRect(0, 0, cv.width, cv.height);
  };
  tick();
}
