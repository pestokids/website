"use client";

import { goalOptions, goals as copy, MAX_GOALS } from "@/content/apply";
import { useFlow } from "../apply-flow";
import { Chip, Headline, PrimaryButton, StepPlaceholder } from "../placeholder";

export function GoalsStep() {
  const { draft, dispatch, advance, family } = useFlow();
  const picked = draft.goals;
  const full = picked.length >= MAX_GOALS;
  const pickedLabels = picked.map((slug) => goalOptions.find((o) => o.slug === slug)!.label);
  const sentence = copy.sentence(family);

  return (
    <StepPlaceholder
      name="goals"
      state={`${picked.length} of ${MAX_GOALS} picked${full ? " · max" : ""}`}
      footer={
        <PrimaryButton disabled={picked.length === 0} onClick={() => advance()}>
          {picked.length === 0 ? copy.pick : copy.confirm}
        </PrimaryButton>
      }
    >
      <Headline lines={sentence} />
      <p className="font-display text-xl font-bold">
        {pickedLabels.join(` ${copy.joiner} `)}
        {!full && (
          <span className="text-muted">
            {picked.length > 0 ? ` ${copy.joiner} ` : ""}
            {picked.length === 0 ? copy.emptySlot : copy.moreSlot}
          </span>
        )}
      </p>
      <p className="flex justify-between text-xs font-bold tracking-[0.8px] text-muted">
        <span>{copy.pickLabel}</span>
        <span>{copy.counter(picked.length)}</span>
      </p>
      <div role="group" aria-label={sentence.join(" ")} className="flex flex-wrap gap-2">
        {goalOptions.map((o) => {
          const on = picked.includes(o.slug);
          return (
            <Chip
              key={o.slug}
              icon={o.icon}
              pressed={on}
              disabled={full && !on}
              onClick={() => dispatch({ type: "toggleGoal", slug: o.slug })}
            >
              {o.label}
            </Chip>
          );
        })}
      </div>
    </StepPlaceholder>
  );
}
