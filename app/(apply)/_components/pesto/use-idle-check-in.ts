"use client";

import { useEffect } from "react";
import type { PestoController } from "./use-pesto";

/** Quiet time before Pesto checks in. */
export const IDLE_CHECK_IN_MS = 10_000;

/**
 * After 10 quiet seconds on a screen (no tap, key or typing), Pesto tilts his
 * head and says `line`, once per visit to the screen.
 */
export function useIdleCheckIn(pesto: PestoController, line: string) {
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const arm = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        pesto.checkIn(line);
        stop();
      }, IDLE_CHECK_IN_MS);
    };
    const events = ["pointerdown", "keydown", "input"] as const;
    const stop = () => {
      clearTimeout(timer);
      events.forEach((e) => document.removeEventListener(e, arm, true));
    };
    events.forEach((e) => document.addEventListener(e, arm, true));
    arm();
    return stop;
  }, [pesto, line]);
}
