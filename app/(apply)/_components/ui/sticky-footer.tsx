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
 * Wide screens: set `--footer-lift` on an ancestor to raise an `end` footer
 * off the bottom of the step while the keyboard is closed, e.g.
 * `max(0px, 100dvh - 984px)` to pin it 110px below its 874px-phone position.
 * Ignored while the keyboard is open, so it behaves exactly as on a phone.
 */
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
          ? "mt-auto mb-[var(--footer-lift,0px)] bg-linear-to-t from-cream/85 from-40% to-transparent pt-6 pb-6 data-[keyboard=open]:mb-0 data-[keyboard=open]:pb-3"
          : "py-3"
      } ${className}`}
    >
      {children}
    </div>
  );
}
