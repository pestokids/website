"use client";

import { useEffect } from "react";
import { onIdle } from "@/lib/idle";

type NetworkInformation = { saveData?: boolean };

/**
 * Loads the parallax handler once the page is idle, on the closest
 * `.landing` scene. Skipped with reduced motion or Save-Data. Renders nothing.
 */
export function ParallaxLoader() {
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const connection = (navigator as Navigator & { connection?: NetworkInformation }).connection;
    if (connection?.saveData) return;

    const scene = document.querySelector<HTMLElement>(".landing");
    if (!scene) return;

    let stop: (() => void) | undefined;
    let cancelled = false;
    const start = () =>
      import("./parallax").then(({ startParallax }) => {
        if (!cancelled) stop = startParallax(scene);
      });

    const cancelIdle = onIdle(start, 3000);

    return () => {
      cancelled = true;
      cancelIdle();
      stop?.();
    };
  }, []);

  return null;
}
