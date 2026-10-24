"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode, type RefObject } from "react";
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
 *   only lifts when the keyboard would cover it. When there isn't room for
 *   it below the content, the page scrolls instead (see useRevealInline), so
 *   the row never floats over the field's chips.
 *
 * Wide screens: `--footer-lift` on an ancestor raises an `end` footer off
 * the bottom of the step while the keyboard is closed. <FlowColumn> sets it
 * for every step. Ignored while the keyboard is open, so it behaves exactly
 * as on a phone.
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
  const end = useRef<HTMLDivElement>(null);
  useRevealInline(end, placement === "inline");

  return (
    <>
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
      {/* Marks where the row ends when it isn't floating. */}
      {placement === "inline" && <div ref={end} aria-hidden />}
    </>
  );
}

/**
 * An inline row floats over whatever is under it when the screen is too
 * short for it (keyboard open on a small phone). When that happens, scroll
 * the page just enough to put the row back in its place below the content,
 * without scrolling the focused field off the top. Runs when the visible
 * area or the content changes size, never on the user's own scrolling.
 */
function useRevealInline(end: RefObject<HTMLDivElement | null>, enabled: boolean) {
  useEffect(() => {
    const marker = end.current;
    const content = marker?.parentElement;
    if (!enabled || !marker || !content) return;

    const reveal = () => {
      const vv = window.visualViewport;
      const visibleBottom = vv ? vv.offsetTop + vv.height : window.innerHeight;
      const overflow = marker.getBoundingClientRect().top - visibleBottom;
      if (overflow < 1) return;
      const focusedTop = document.activeElement?.getBoundingClientRect().top ?? overflow;
      const by = Math.min(overflow, focusedTop - 8);
      if (by >= 1) window.scrollBy(0, Math.ceil(by));
    };

    const observer = new ResizeObserver(reveal);
    observer.observe(content);
    window.addEventListener("resize", reveal);
    window.visualViewport?.addEventListener("resize", reveal);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", reveal);
      window.visualViewport?.removeEventListener("resize", reveal);
    };
  }, [end, enabled]);
}
