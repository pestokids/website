"use client";

import { useId } from "react";
import { ageOptions, ages as copy } from "@/content/apply";
import { useFlow } from "../apply-flow";
import { StepScreen } from "../step-screen";
import { PrimaryButton } from "../ui/button";
import { AgeTile } from "../ui/chip";
import { FrostedCard } from "../ui/frosted-card";

// Pesto peeks in under the card's tail. On a 402×874 phone he fills the space
// to the bottom edge, and shorter screens crop him. Taller screens keep him
// under the tail; in the wide column his cut-off edges would float there, so
// they fade out.
const MASCOT_SIZE = 232;
const MASCOT_GAP = 34;

export function AgeStep({ kidIndex }: { kidIndex: 0 | 1 }) {
  const { draft, dispatch, advance } = useFlow();
  const questionId = useId();
  const kid = draft.kids[kidIndex];
  const first = draft.kids[0];
  if (!kid) return null;

  const eyebrow =
    kidIndex === 1 && first.age ? copy.eyebrowSecond(first.name, first.age) : copy.eyebrow;
  const question = kidIndex === 1 ? copy.questionSecond(kid.name) : copy.question(kid.name);

  return (
    // No sticky footer: the button sits inside the card.
    <StepScreen name={`age-${kidIndex + 1}`}>
      <FrostedCard className="relative z-10 px-6 pt-7 pb-6">
        <p className="text-xs leading-4 font-bold tracking-[0.8px] text-lime-text uppercase">
          {eyebrow}
        </p>
        <h1 id={questionId} className="mt-1.5 font-display text-[26px] leading-8 font-extrabold">
          {question}
        </h1>

        <div role="group" aria-labelledby={questionId} className="mt-6 grid grid-cols-3 gap-3">
          {ageOptions.map((age) => (
            <AgeTile
              key={age}
              unit={copy.unit}
              pressed={kid.age === age}
              onClick={() => dispatch({ type: "setAge", kidIndex, age })}
            >
              {age}
            </AgeTile>
          ))}
        </div>

        <p className="mt-6 text-[13px] leading-[18px] text-muted">{copy.hint}</p>

        <PrimaryButton className="mt-5 w-full" disabled={!kid.age} onClick={() => advance()}>
          {kid.age ? copy.confirm(kid.name) : copy.pick}
        </PrimaryButton>

        {/* Speech-bubble tail, pointing down at Pesto. More opaque than the
            card so the card's drop shadow under it doesn't grey it out. */}
        <span
          aria-hidden="true"
          className="absolute top-full left-[74px] h-8 w-[34px] bg-white/85 backdrop-blur-[36px] [clip-path:polygon(0_0,100%_0,22%_100%)]"
        />
      </FrostedCard>

      <div
        aria-hidden="true"
        className="relative -mx-[var(--margin-page)] flex-1 overflow-hidden"
        // Always room for at least his eyes, even on a short screen.
        style={{ minHeight: MASCOT_GAP + 96 }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- static decorative SVG */}
        <img
          src="/mascots/mascot-primary-cutout.svg"
          alt=""
          width={MASCOT_SIZE}
          height={MASCOT_SIZE}
          className="absolute left-0 select-none min-[600px]:[mask-composite:intersect] min-[600px]:[mask-image:linear-gradient(to_right,transparent,#000_40px),linear-gradient(to_top,transparent,#000_72px)]"
          style={{ top: MASCOT_GAP }}
          draggable={false}
        />
      </div>
    </StepScreen>
  );
}
