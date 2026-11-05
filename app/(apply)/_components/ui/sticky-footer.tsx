"use client";

import type { CSSProperties, ReactNode } from "react";
import { useKeyboardInset } from "./use-keyboard-inset";

/**
 * Action row that stays on screen and floats directly above the keyboard.
 *
 * It's `position: sticky` to the bottom of the visible area: the keyboard
 * inset on iOS (visualViewport), else the safe-area inset. On Android the
 * layout viewport shrinks with the keyboard (`interactive-widget`), so
 * plain sticky does the job.
 *
 * - `placement="end"` (default) pushes it to the bottom of the step.
 * - `placement="inline"` leaves it in the flow (email's submit row); it
 *   only lifts when the keyboard would cover it.
 *
 * Wide screens: `--footer-lift` on an ancestor raises an `end` footer off
 * the bottom of the step while the keyboard is closed. <FlowColumn> sets it
 * for every step. Ignored while the keyboard is open, so it behaves exactly
 * as on a phone.
 */
/**
 * Phones: solid white, so the screen's content scrolls up behind the
 * footer's top edge and never shows through it; a white strip below covers
 * the safe area under it. Being sticky in the flow, the footer always sits
 * after the content once it's scrolled to the end.
 */
const phoneSurface =
  "bg-white after:pointer-events-none after:absolute after:inset-x-0 after:top-full after:h-[env(safe-area-inset-bottom)] after:bg-white after:content-['']";
/** Wide screens (tablets, foldables) keep the soft fade over the page wash. */
const wideSurface =
  "min-[600px]:bg-transparent min-[600px]:bg-linear-to-t min-[600px]:from-cream/85 min-[600px]:from-40% min-[600px]:to-transparent min-[600px]:pt-6 min-[600px]:after:hidden";

export function StickyFooter({
  children,
  placement = "end",
  className = "",
}: {
  children: ReactNode;
  placement?: "end" | "inline";
  className?: string;
}) {
  const inset = useKeyboardInset();
  const keyboardOpen = inset > 0;

  return (
    <div
      data-keyboard={keyboardOpen ? "open" : "closed"}
      style={{ "--keyboard-inset": `${inset}px` } as CSSProperties}
      className={`sticky bottom-[max(var(--keyboard-inset),env(safe-area-inset-bottom))] z-10 flex flex-col gap-3 ${
        placement === "end"
          ? `mt-auto mb-[var(--footer-lift,0px)] pt-4 pb-6 data-[keyboard=open]:mb-0 data-[keyboard=open]:pb-3 ${phoneSurface} ${wideSurface}`
          : "py-3"
      } ${className}`}
    >
      {children}
    </div>
  );
}
