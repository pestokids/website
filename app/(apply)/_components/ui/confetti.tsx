"use client";

import { useEffect, useImperativeHandle, useRef, type Ref } from "react";

export type ConfettiHandle = {
  /** Throws a burst of confetti from a point on the page (client coordinates). */
  burst: (x: number, y: number) => void;
};

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
 * A full-screen canvas that confetti falls across. Decorative, never in the
 * way of taps, and does nothing under reduced motion. Drawn at 2× in device
 * pixels; the loop stops once every piece has fallen off the bottom.
 */
export function Confetti({ ref }: { ref: Ref<ConfettiHandle> }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const frame = useRef(0);

  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  useImperativeHandle(ref, () => ({
    burst(x, y) {
      const cv = canvas.current;
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
    },
  }));

  return (
    <canvas
      ref={canvas}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-50 size-full"
    />
  );
}
