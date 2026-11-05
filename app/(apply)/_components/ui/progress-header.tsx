"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { Spark } from "../../_lib/celebrate";
import { withCelebration } from "../../_lib/feel";
import { day } from "../classes";
import { ChevronLeftIcon } from "./icons";
import { replayClass } from "./replay";

const SPARK_PATH =
  "M5 0C5.5 3.6 6.4 4.5 10 5 6.4 5.5 5.5 6.4 5 10 4.5 6.4 3.6 5.5 0 5 3.6 4.5 4.5 3.6 5 0Z";

/** A gold four-point star. */
export function Sparkle({ size, className = "", style }: { size: number; className?: string; style?: CSSProperties }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 10 10"
      aria-hidden="true"
      focusable="false"
      className={className}
      style={style}
    >
      <path fill="currentColor" d={SPARK_PATH} />
    </svg>
  );
}

/** Knob position along the track, kept off the very ends. */
const knobLeft = (step: number, total: number) => `${Math.min(95, Math.max(4, (step / total) * 100))}%`;

/**
 * Round back button, a lime progress track and "3/7". The track ends in a
 * gold star in a white circle: on a new step it moves along with one small
 * hop and spin, then stays still. `burst` (a counter) pops it into a spray
 * of sparkles (the final submit; the spray comes from _lib/celebrate.ts,
 * loaded by then). The track is a progressbar labelled "Step n of N".
 */
export function ProgressHeader({
  current,
  total,
  label,
  backLabel,
  onBack,
  burst = 0,
}: {
  /** 1-based. */
  current: number;
  total: number;
  /** e.g. "Step 3 of 7". */
  label: string;
  backLabel: string;
  onBack: () => void;
  /** Bump to burst the star. */
  burst?: number;
}) {
  // Starts one step back and moves on after mount, so arriving from the
  // welcome screen (or a reload) shows the hop too.
  const [shown, setShown] = useState(Math.max(0, current - 1));
  const knob = useRef<HTMLDivElement>(null);
  const [sparks, setSparks] = useState<Spark[]>([]);
  const [popped, setPopped] = useState(false);

  const shownRef = useRef(shown);

  useEffect(() => {
    let inner = 0;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => {
        if (shownRef.current !== current) replayClass(knob.current, day.hopping, 460);
        shownRef.current = current;
        setShown(current);
      });
    });
    return () => {
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
    };
  }, [current]);

  useEffect(() => {
    if (!burst) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- a one-off animation triggered from outside
    setPopped(true);
    let live = true;
    withCelebration(({ sparkSpray }) => {
      if (live) setSparks(sparkSpray(burst));
    });
    const clear = setTimeout(() => {
      live = false;
      setSparks([]);
    }, 800);
    // If the submit fails and the screen stays, the star comes back.
    const restore = setTimeout(() => setPopped(false), 1500);
    return () => {
      live = false;
      clearTimeout(clear);
      clearTimeout(restore);
    };
  }, [burst]);

  return (
    <header className="flex items-center gap-3 px-[var(--margin-page)] pt-3.5">
      <button
        type="button"
        onClick={onBack}
        aria-label={backLabel}
        // 36px visual, 44px tap target.
        className="relative grid size-9 shrink-0 place-items-center rounded-full bg-day-tile text-forest transition-transform duration-100 before:absolute before:-inset-1 before:content-[''] active:scale-[0.94]"
      >
        <ChevronLeftIcon size={15} strokeWidth={2.6} />
      </button>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={1}
        aria-valuemax={total}
        aria-valuenow={current}
        className="relative h-[11px] flex-1 rounded-full bg-day-track"
      >
        <div
          className={`absolute inset-y-0 left-0 rounded-full bg-day-lime shadow-[inset_0_2px_0_rgb(255_255_255/0.45)] ${day.knob}`}
          style={{ width: `${(shown / total) * 100}%`, transitionProperty: "width" }}
        />
        <div
          ref={knob}
          className={`absolute -top-[9px] -ml-3.5 size-7 ${day.knob}`}
          style={{ left: knobLeft(shown, total) }}
        >
          <div
            className={`grid size-full place-items-center rounded-full bg-white text-day-star shadow-[0_0_0_2px_var(--color-day-lime-edge),0_3px_0_2px_var(--color-day-lime-edge)] ${
              popped ? day.popOut : ""
            }`}
          >
            <Sparkle size={16} className={day.star} />
          </div>
          {sparks.map((s) => (
            <span
              key={s.id}
              className={day.spark}
              style={
                {
                  left: "50%",
                  top: "50%",
                  color: s.color,
                  "--dx": `${s.dx}px`,
                  "--dy": `${s.dy}px`,
                } as CSSProperties
              }
            >
              <Sparkle size={s.size} />
            </span>
          ))}
        </div>
      </div>
      <p aria-hidden="true" className="min-w-[30px] pl-1 text-right text-[13px] font-extrabold text-day-sub">
        {current}/{total}
      </p>
    </header>
  );
}
