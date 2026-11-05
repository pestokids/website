"use client";

import { useEffect, useId, useRef, useState, type MouseEvent } from "react";
import {
  afterSchool as copy,
  afterSchoolOptions,
  EXCLUSIVE_AFTER_SCHOOL,
  pesto as lines,
  pestoAfterSchoolLine,
  pestoCheckInLine,
  retiredAfterSchoolOptions,
  type AfterSchoolSlug,
} from "@/content/apply";
import { buzz } from "../../_lib/feel";
import { clearsOtherAfterSchool } from "../../_lib/flow";
import { useFlow } from "../apply-flow";
import { PestoSays } from "../pesto/pesto";
import { useIdleCheckIn } from "../pesto/use-idle-check-in";
import { usePesto } from "../pesto/use-pesto";
import { QuestionScreen } from "../step-screen";
import { PrimaryButton } from "../ui/button";
import { OptionTile } from "../ui/chip";
import { day } from "../classes";
import { Marker } from "../ui/marker";
import { replayClass } from "../ui/replay";

/** How long the "we cleared the others" line stays before it goes, and the fade. */
const HINT_MS = 3000;
const FADE_MS = 300;

const exclusive = afterSchoolOptions.find((o) => o.slug === EXCLUSIVE_AFTER_SCHOOL)!;
const others = afterSchoolOptions.filter((o) => o.slug !== EXCLUSIVE_AFTER_SCHOOL);

export function AfterSchoolStep() {
  const { draft, dispatch, advance, family } = useFlow();
  const headlineId = useId();
  const picked = draft.afterSchool;
  const gridRef = useRef<HTMLDivElement>(null);

  const pesto = usePesto();
  useIdleCheckIn(pesto, pestoCheckInLine("after-school"));
  // What Pesto last said, so the hint only takes back its own line.
  const said = useRef("");
  const say = (line: string) => {
    said.current = line;
    pesto.say(line);
  };
  useEffect(() => {
    said.current = lines.afterSchool.intro;
    pesto.say(lines.afterSchool.intro);
  }, [pesto]);

  // "shown" → "fading" → null. Keyed by `hintKey` so a repeat is re-announced.
  // Pesto says the hint in his bubble, then goes back to his opening line.
  const [hint, setHint] = useState<"shown" | "fading" | null>(null);
  const [hintKey, setHintKey] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(() => {
    if (hint === "shown") say(copy.cleared);
    else if (said.current === copy.cleared) say(lines.afterSchool.intro);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reacts to the hint only
  }, [hint, hintKey]);

  const fadeHint = (after: number) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setHint("fading");
      timer.current = setTimeout(() => setHint(null), FADE_MS);
    }, after);
  };

  const toggle = (slug: AfterSchoolSlug, event: MouseEvent<HTMLButtonElement>) => {
    replayClass(event.currentTarget, day.squish, 400);
    buzz();
    const clears = clearsOtherAfterSchool(picked, slug);
    if (clears) {
      // The other picks wiggle away as they clear.
      gridRef.current
        ?.querySelectorAll('[aria-pressed="true"]')
        .forEach((tile) => replayClass(tile, day.out, 400));
      setHint("shown");
      setHintKey((k) => k + 1);
      fadeHint(HINT_MS);
    } else if (hint === "shown") {
      // Any other tap makes "just school" stale.
      fadeHint(0);
    }
    if (!clears && !picked.includes(slug)) say(pestoAfterSchoolLine(slug));
    dispatch({ type: "toggleAfterSchool", slug });
  };

  // Retired options only show while a resumed draft still has them picked.
  const grid = [...others, ...retiredAfterSchoolOptions.filter((o) => picked.includes(o.slug))];

  return (
    <QuestionScreen
      name="after-school"
      says={<PestoSays pesto={pesto} />}
      questionId={headlineId}
      question={
        family.plural ? (
          copy.headline(family)
        ) : (
          <>
            {copy.headline(family).split(family.possessive)[0]}
            <Marker>{family.possessive}</Marker>
            {copy.headline(family).split(family.possessive).slice(1).join(family.possessive)}
          </>
        )
      }
      sub={copy.sub}
      footer={
        <PrimaryButton disabled={picked.length === 0} onClick={() => advance()}>
          {picked.length === 0 ? copy.pick : copy.confirm}
        </PrimaryButton>
      }
    >
      <div role="group" aria-labelledby={headlineId}>
        <div ref={gridRef} className="grid grid-cols-2 gap-[9px]">
          {grid.map((o) => (
            <OptionTile
              key={o.slug}
              icon={o.icon}
              pressed={picked.includes(o.slug)}
              onClick={(e) => toggle(o.slug, e)}
            >
              {o.label}
            </OptionTile>
          ))}
        </div>
        <div
          aria-hidden="true"
          className="my-[9px] flex items-center gap-2.5 text-xs font-extrabold text-day-sub before:h-0.5 before:flex-1 before:bg-day-border before:content-[''] after:h-0.5 after:flex-1 after:bg-day-border after:content-['']"
        >
          {copy.or}
        </div>
        <OptionTile
          wide
          icon={exclusive.icon}
          pressed={picked.includes(exclusive.slug)}
          onClick={(e) => toggle(exclusive.slug, e)}
        >
          {exclusive.label}
        </OptionTile>
      </div>
    </QuestionScreen>
  );
}
