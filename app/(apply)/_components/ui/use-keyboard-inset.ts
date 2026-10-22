"use client";

import { useSyncExternalStore } from "react";

/**
 * How many px of the layout viewport the on-screen keyboard covers.
 *
 * iOS doesn't resize the layout viewport when the keyboard opens; it
 * shrinks (and may scroll) the visual viewport instead, so we measure the
 * gap between the bottom of the visual viewport and the bottom of the
 * layout viewport. Android resizes the layout viewport itself
 * (`interactive-widget=resizes-content`), so this stays ~0 there.
 */
export function keyboardInset(): number {
  const vv = window.visualViewport;
  if (!vv) return 0;
  const covered = window.innerHeight - (vv.height + vv.offsetTop);
  // Ignore sub-pixel noise and the few px of toolbar collapse while scrolling.
  return covered > 40 ? Math.round(covered) : 0;
}

function subscribe(onChange: () => void) {
  const vv = window.visualViewport;
  if (!vv) return () => {};
  vv.addEventListener("resize", onChange);
  vv.addEventListener("scroll", onChange);
  return () => {
    vv.removeEventListener("resize", onChange);
    vv.removeEventListener("scroll", onChange);
  };
}

const serverInset = () => 0;

export function useKeyboardInset(): number {
  return useSyncExternalStore(subscribe, keyboardInset, serverInset);
}
