"use client";

import { useId } from "react";
import { afterSchool as copy, afterSchoolOptions } from "@/content/apply";
import { useFlow } from "../apply-flow";
import { StepScreen } from "../step-screen";
import { PrimaryButton } from "../ui/button";
import { Chip } from "../ui/chip";

export function AfterSchoolStep() {
  const { draft, dispatch, advance, family } = useFlow();
  const headlineId = useId();
  const picked = draft.afterSchool;

  return (
    <StepScreen
      name="after-school"
      footer={
        <PrimaryButton disabled={picked.length === 0} onClick={() => advance()}>
          {picked.length === 0 ? copy.pick : copy.confirm}
        </PrimaryButton>
      }
    >
      <h1 id={headlineId} className="font-display text-[28px] leading-8 font-extrabold">
        {copy.headline(family)}
      </h1>
      <p className="mt-2 text-base leading-[22px] text-muted">{copy.sub}</p>

      <div role="group" aria-labelledby={headlineId} className="mt-6 flex flex-wrap gap-2.5">
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
    </StepScreen>
  );
}
