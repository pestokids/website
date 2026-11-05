"use client";

import { useEffect, useImperativeHandle, useRef, type Ref } from "react";
import { preloadCelebration, withCelebration } from "../../_lib/feel";

export type ConfettiHandle = {
  /** Throws a burst of confetti from a point on the page (client coordinates). */
  burst: (x: number, y: number) => void;
};

/**
 * A full-screen canvas that confetti falls across. Decorative, never in the
 * way of taps, and does nothing under reduced motion. The physics live in
 * _lib/celebrate.ts, fetched when this mounts (it's long loaded by the first
 * burst, 450 ms in).
 */
export function Confetti({ ref }: { ref: Ref<ConfettiHandle> }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const frame = useRef(0);

  useEffect(() => preloadCelebration(), []);
  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  useImperativeHandle(ref, () => ({
    burst(x, y) {
      withCelebration(({ throwConfetti }) => throwConfetti(canvas.current, x, y, frame));
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
