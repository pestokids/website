"use client";

import { useEffect, useId, type MouseEvent } from "react";
import { ageOptions, ages as copy, pesto as lines, pestoAgeLine, pestoCheckInLine } from "@/content/apply";
import { buzz } from "../../_lib/feel";
import { useFlow } from "../apply-flow";
import { PestoSays } from "../pesto/pesto";
import { useIdleCheckIn } from "../pesto/use-idle-check-in";
import { usePesto } from "../pesto/use-pesto";
import { QuestionScreen } from "../step-screen";
import { PrimaryButton } from "../ui/button";
import { AgeTile } from "../ui/chip";
import { day } from "../classes";
import { MarkedNames } from "../ui/marker";
import { replayClass } from "../ui/replay";

/** Number colour per age tile, in `ageOptions` order (forest once picked). */
const ageColours = ["#f05a14", "#13235f", "#5c8a00", "#2f8fd1", "#b88700", "#e05a8a"];

export function AgeStep({ kidIndex }: { kidIndex: 0 | 1 }) {
  const { draft, dispatch, advance } = useFlow();
  const questionId = useId();
  const kid = draft.kids[kidIndex];
  const first = draft.kids[0];
  const nextKid = kidIndex === 0 ? draft.kids[1] : undefined;

  const pesto = usePesto();
  useIdleCheckIn(pesto, pestoCheckInLine("age"));
  const name = kid?.name;
  useEffect(() => {
    if (name) pesto.say(kidIndex === 1 ? lines.ages.second(name) : lines.ages.first(name));
  }, [pesto, kidIndex, name]);

  if (!kid) return null;

  const eyebrow =
    kidIndex === 1 && first.age ? copy.eyebrowSecond(first.name, first.age) : copy.eyebrow;
  const question = kidIndex === 1 ? copy.questionSecond(kid.name) : copy.question(kid.name);

  const pick = (age: (typeof ageOptions)[number]) => (event: MouseEvent<HTMLButtonElement>) => {
    replayClass(event.currentTarget, day.squish, 400);
    buzz();
    pesto.say(pestoAgeLine(age));
    dispatch({ type: "setAge", kidIndex, age });
  };

  return (
    <QuestionScreen
      name={`age-${kidIndex + 1}`}
      says={<PestoSays pesto={pesto} />}
      questionId={questionId}
      eyebrow={eyebrow}
      question={<MarkedNames text={question} names={[kid.name]} />}
      sub={nextKid ? copy.nextKid(nextKid.name) : copy.hint}
      footer={
        <PrimaryButton disabled={!kid.age} onClick={() => advance()}>
          {kid.age ? copy.confirm(kid.name) : copy.pick}
        </PrimaryButton>
      }
    >
      <div role="group" aria-labelledby={questionId} className="mt-1 grid grid-cols-3 gap-3">
        {ageOptions.map((age, i) => (
          <AgeTile
            key={age}
            unit={copy.unit}
            color={ageColours[i]}
            pressed={kid.age === age}
            onClick={pick(age)}
          >
            {age}
          </AgeTile>
        ))}
      </div>
    </QuestionScreen>
  );
}
