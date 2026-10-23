"use client";

import { useId, useRef, type MouseEvent } from "react";
import { goalOptions, goals as copy, MAX_GOALS, type GoalSlug } from "@/content/apply";
import { useFlow } from "../apply-flow";
import { StepScreen } from "../step-screen";
import { PrimaryButton } from "../ui/button";
import { Chip } from "../ui/chip";

/**
 * Fill in the blank: each option lives in exactly one place, either dropped
 * into the sentence (pressed; tap to take it out) or in the list below.
 */
export function GoalsStep() {
  const { draft, dispatch, advance, family } = useFlow();
  const headlineId = useId();
  const groupRef = useRef<HTMLDivElement>(null);

  const picked = draft.goals;
  const full = picked.length >= MAX_GOALS;
  const pickedOptions = picked.map((slug) => goalOptions.find((o) => o.slug === slug)!);
  const unpicked = goalOptions.filter((o) => !picked.includes(o.slug));
  const sentence = copy.sentence(family);

  // A chip moves between the sentence and the list when toggled, so the
  // button that had focus unmounts. Keep keyboard focus on the same option.
  const toggle = (slug: GoalSlug) => (event: MouseEvent<HTMLButtonElement>) => {
    const hadFocus = document.activeElement === event.currentTarget;
    dispatch({ type: "toggleGoal", slug });
    if (hadFocus) {
      requestAnimationFrame(() =>
        groupRef.current?.querySelector<HTMLButtonElement>(`[data-goal="${slug}"]`)?.focus(),
      );
    }
  };

  return (
    <StepScreen
      name="goals"
      footer={
        <PrimaryButton disabled={picked.length === 0} onClick={() => advance()}>
          {picked.length === 0 ? copy.pick : copy.confirm}
        </PrimaryButton>
      }
    >
      <h1 id={headlineId} className="font-display text-[28px] leading-8 font-extrabold">
        {sentence.map((line, i) => (
          <span key={i} className="block">
            {line}
          </span>
        ))}
      </h1>

      <div ref={groupRef} role="group" aria-labelledby={headlineId} className="mt-6 flex flex-col">
        {/* The sentence. Two rows tall at rest, so the list doesn't jump as it fills. */}
        <div className="flex min-h-[98px] flex-wrap content-start items-center gap-2.5">
          {pickedOptions.map((o, i) => (
            <span key={o.slug} className="inline-flex items-center gap-2.5">
              {i > 0 && (
                <span className="font-display text-xl leading-none font-extrabold">
                  {copy.joiner}
                </span>
              )}
              <Chip
                data-goal={o.slug}
                icon={o.icon}
                pressed
                onClick={toggle(o.slug)}
                className="motion-safe:animate-drop-in"
              >
                {o.label}
              </Chip>
            </span>
          ))}
          {!full && (
            <span className="inline-flex h-11 items-center rounded-full border-2 border-dashed border-lime-deep/45 px-10 font-display text-[17px] leading-none font-bold whitespace-nowrap text-muted/55">
              {picked.length === 0 ? copy.emptySlot : copy.moreSlot}
            </span>
          )}
        </div>

        <div className="mt-9 flex items-center justify-between text-xs leading-4 font-bold tracking-[0.8px]">
          <span className="text-muted">{copy.pickLabel}</span>
          <span className="flex items-center gap-2.5">
            <span aria-live="polite">{copy.counter(picked.length)}</span>
            <span aria-hidden="true" className="flex gap-1">
              {Array.from({ length: MAX_GOALS }, (_, i) => (
                <span
                  key={i}
                  className={`size-2 rounded-full ${
                    i < picked.length ? "bg-lime-deep" : "border-[1.5px] border-muted/35"
                  }`}
                />
              ))}
            </span>
          </span>
        </div>

        <div className="mt-3 flex flex-wrap gap-2.5">
          {unpicked.map((o) => (
            <Chip
              key={o.slug}
              data-goal={o.slug}
              icon={o.icon}
              pressed={false}
              disabled={full}
              onClick={toggle(o.slug)}
            >
              {o.label}
            </Chip>
          ))}
        </div>
      </div>
    </StepScreen>
  );
}
