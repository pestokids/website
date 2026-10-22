"use client";

import { ageOptions, ages as copy } from "@/content/apply";
import { useFlow } from "../apply-flow";
import { Chip, PrimaryButton, StepPlaceholder } from "../placeholder";

export function AgeStep({ kidIndex }: { kidIndex: 0 | 1 }) {
  const { draft, dispatch, advance } = useFlow();
  const kid = draft.kids[kidIndex];
  const first = draft.kids[0];
  if (!kid) return null;

  const eyebrow =
    kidIndex === 1 && first.age ? copy.eyebrowSecond(first.name, first.age) : copy.eyebrow;
  const question = kidIndex === 1 ? copy.questionSecond(kid.name) : copy.question(kid.name);

  return (
    <StepPlaceholder
      name={`age-${kidIndex + 1}`}
      state={kid.age ? `picked ${kid.age}` : "nothing picked"}
      footer={
        <PrimaryButton disabled={!kid.age} onClick={() => advance()}>
          {kid.age ? copy.confirm(kid.name) : copy.pick}
        </PrimaryButton>
      }
    >
      <p className="text-xs font-bold tracking-[0.8px]">{eyebrow}</p>
      <h1 className="font-display text-[26px] leading-8 font-extrabold">{question}</h1>
      <div role="group" aria-label={question} className="flex flex-wrap gap-2">
        {ageOptions.map((age) => (
          <Chip
            key={age}
            pressed={kid.age === age}
            onClick={() => dispatch({ type: "setAge", kidIndex, age })}
          >
            {age} {copy.unit}
          </Chip>
        ))}
      </div>
      <p className="text-[13px] text-muted">{copy.hint}</p>
    </StepPlaceholder>
  );
}
