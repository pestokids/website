"use client";

import { progress } from "@/content/apply";
import { PROGRESS_SEGMENTS } from "@/content/apply";
import { progressSegment } from "../_lib/flow";
import { useFlow } from "./apply-flow";

/** Back button + 7 segments, on screens 2–8. */
export function ProgressHeader() {
  const { step, back } = useFlow();
  const current = progressSegment(step);
  if (current === null) return null;

  return (
    <header className="flex items-center gap-4 px-[var(--margin-page)] pt-4 pb-2">
      <button
        type="button"
        onClick={back}
        aria-label={progress.back}
        className="grid size-10 shrink-0 place-items-center rounded-full border border-hairline bg-white/90 shadow-unselected"
      >
        <svg width="10" height="16" viewBox="0 0 10 16" aria-hidden="true">
          <path
            d="M8 2 2 8l6 6"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      <div
        role="progressbar"
        aria-label={progress.label(current)}
        aria-valuemin={1}
        aria-valuemax={PROGRESS_SEGMENTS}
        aria-valuenow={current}
        className="flex flex-1 gap-[5px]"
      >
        {Array.from({ length: PROGRESS_SEGMENTS }, (_, i) => (
          <span
            key={i}
            className={`h-1.5 flex-1 rounded-segment ${
              i < current ? "bg-lime-deep" : "bg-segment-todo"
            } ${i === current - 1 ? "shadow-[0_0_8px_rgb(169_236_25/0.8)]" : ""}`}
          />
        ))}
      </div>
    </header>
  );
}
