"use client";

import { afterSchool as copy, afterSchoolOptions } from "@/content/apply";
import { useFlow } from "../apply-flow";
import { StepPlaceholder } from "../placeholder";
import { PrimaryButton } from "../ui/button";
import { Chip } from "../ui/chip";

export function AfterSchoolStep() {
  const { draft, dispatch, advance, family } = useFlow();
  const picked = draft.afterSchool;
  const headline = copy.headline(family);

  return (
    <StepPlaceholder
      name="after-school"
      state={`${picked.length} picked`}
      footer={
        <PrimaryButton disabled={picked.length === 0} onClick={() => advance()}>
          {picked.length === 0 ? copy.pick : copy.confirm}
        </PrimaryButton>
      }
    >
      <h1 className="font-display text-[28px] leading-8 font-extrabold">{headline}</h1>
      <p className="text-muted">{copy.sub}</p>
      <div role="group" aria-label={headline} className="flex flex-wrap gap-2">
        {afterSchoolOptions.map((o) => (
          <Chip
            key={o.slug}
            icon={o.icon}
            pressed={picked.includes(o.slug)}
            onClick={() => dispatch({ type: "toggleAfterSchool", slug: o.slug })}
          >
            {o.label}
          </Chip>
        ))}
      </div>
    </StepPlaceholder>
  );
}
