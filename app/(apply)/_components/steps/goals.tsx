"use client";

import { useEffect, useId, useRef, useState, type MouseEvent } from "react";
import {
  goalOptions,
  goals as copy,
  MAX_GOALS,
  pesto as lines,
  pestoCheckInLine,
  pestoGoalLine,
  retiredGoalOptions,
  type GoalSlug,
} from "@/content/apply";
import { buzz } from "../../_lib/feel";
import { useFlow } from "../apply-flow";
import { PestoSays } from "../pesto/pesto";
import { useIdleCheckIn } from "../pesto/use-idle-check-in";
import { usePesto } from "../pesto/use-pesto";
import { QuestionScreen } from "../step-screen";
import { PrimaryButton } from "../ui/button";
import { Chip } from "../ui/chip";
import { day } from "../classes";

/** Offered goals, then retired ones (only ever shown when a resumed draft has them picked). */
const allGoals = [...goalOptions, ...retiredGoalOptions];

/** How long Pesto keeps happy eyes after the third goal. */
const HAPPY_MS = 1600;

/**
 * Fill in the blank: each option lives in exactly one place, either dropped
 * into the sentence (pressed; tap to take it out) or in the list below.
 */
export function GoalsStep() {
  const { draft, dispatch, advance, family } = useFlow();
  const headlineId = useId();
  const groupRef = useRef<HTMLDivElement>(null);
  // The last goal dropped in, so only it plays the drop.
  const [dropped, setDropped] = useState<GoalSlug | null>(null);

  const pesto = usePesto();
  useIdleCheckIn(pesto, pestoCheckInLine("goals"));
  useEffect(() => {
    pesto.say(lines.goals.intro);
  }, [pesto]);

  const picked = draft.goals;
  const full = picked.length >= MAX_GOALS;
  const pickedOptions = picked.map((slug) => allGoals.find((o) => o.slug === slug)!);
  const unpicked = goalOptions.filter((o) => !picked.includes(o.slug));
  const sentence = copy.sentence(family);

  // A chip moves between the sentence and the list when toggled, so the
  // button that had focus unmounts. Keep keyboard focus on the same option.
  const toggle = (slug: GoalSlug) => (event: MouseEvent<HTMLButtonElement>) => {
    const hadFocus = document.activeElement === event.currentTarget;
    const adding = !picked.includes(slug);
    if (adding && !full) {
      setDropped(slug);
      buzz();
      const count = picked.length + 1;
      pesto.say(pestoGoalLine(slug, count));
      if (count >= MAX_GOALS) pesto.flash("happy", HAPPY_MS);
    } else {
      setDropped(null);
    }
    dispatch({ type: "toggleGoal", slug });
    if (hadFocus) {
      requestAnimationFrame(() =>
        groupRef.current?.querySelector<HTMLButtonElement>(`[data-goal="${slug}"]`)?.focus(),
      );
    }
  };

  return (
    <QuestionScreen
      name="goals"
      says={<PestoSays pesto={pesto} />}
      questionId={headlineId}
      question={sentence.join(" ")}
      footer={
        <PrimaryButton disabled={picked.length === 0} onClick={() => advance()}>
          {picked.length === 0 ? copy.pick : copy.confirm}
        </PrimaryButton>
      }
    >
      <div ref={groupRef} role="group" aria-labelledby={headlineId} className="flex flex-col">
        {/* The sentence. Two rows tall at rest, so the list doesn't jump as it fills. */}
        <div className="flex min-h-[96px] flex-wrap content-start items-center gap-2">
          {pickedOptions.map((o, i) => (
            <span key={o.slug} className="inline-flex items-center gap-2">
              {i > 0 && (
                <span className="text-[15px] leading-none font-extrabold text-day-sub">
                  {copy.joiner}
                </span>
              )}
              <Chip
                data-goal={o.slug}
                icon={o.icon}
                pressed
                onClick={toggle(o.slug)}
                className={`!shadow-none ${dropped === o.slug ? day.drop : ""}`}
              >
                {o.label}
              </Chip>
            </span>
          ))}
          {!full && (
            <span className="inline-flex items-center gap-2">
              {picked.length > 0 && (
                <span className="text-[15px] leading-none font-extrabold text-day-sub">
                  {copy.joiner}
                </span>
              )}
              <span className="inline-flex h-11 items-center rounded-full border-2 border-dashed border-day-ring px-3.5 text-sm leading-none font-bold whitespace-nowrap text-day-sub">
                {picked.length === 0 ? copy.emptySlot : copy.moreSlot}
              </span>
            </span>
          )}
        </div>

        <div className="mt-2 flex items-center justify-between text-[11px] leading-4 font-extrabold tracking-[0.8px] text-day-sub">
          <span>{copy.pickLabel}</span>
          <span className="flex items-center gap-2.5">
            <span aria-live="polite">{copy.counter(picked.length)}</span>
            <span aria-hidden="true" className="flex gap-1">
              {Array.from({ length: MAX_GOALS }, (_, i) => (
                <span
                  key={i}
                  className={`size-2 rounded-full ${
                    i < picked.length ? "bg-day-lime-deep" : "border-[1.5px] border-day-ring"
                  }`}
                />
              ))}
            </span>
          </span>
        </div>

        <div className="mt-2.5 flex flex-wrap gap-2">
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
    </QuestionScreen>
  );
}
