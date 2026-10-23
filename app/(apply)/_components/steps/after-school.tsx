"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  afterSchool as copy,
  afterSchoolOptions,
  type AfterSchoolSlug,
} from "@/content/apply";
import { clearsOtherAfterSchool } from "../../_lib/flow";
import { useFlow } from "../apply-flow";
import { StepScreen } from "../step-screen";
import { PrimaryButton } from "../ui/button";
import { Chip } from "../ui/chip";

/** How long the "we cleared the others" hint stays before it fades, and the fade. */
const HINT_MS = 3000;
const FADE_MS = 300;

export function AfterSchoolStep() {
  const { draft, dispatch, advance, family } = useFlow();
  const headlineId = useId();
  const picked = draft.afterSchool;

  // "shown" → "fading" → null. Keyed by `hintKey` so a repeat is re-announced.
  const [hint, setHint] = useState<"shown" | "fading" | null>(null);
  const [hintKey, setHintKey] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const fadeHint = (after: number) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setHint("fading");
      timer.current = setTimeout(() => setHint(null), FADE_MS);
    }, after);
  };

  const toggle = (slug: AfterSchoolSlug) => {
    if (clearsOtherAfterSchool(picked, slug)) {
      setHint("shown");
      setHintKey((k) => k + 1);
      fadeHint(HINT_MS);
    } else if (hint === "shown") {
      // Any other tap makes "just school" stale.
      fadeHint(0);
    }
    dispatch({ type: "toggleAfterSchool", slug });
  };

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
            onClick={() => toggle(o.slug)}
          >
            {o.label}
          </Chip>
        ))}
      </div>

      {/* Always rendered with its line reserved, so the hint never shifts the layout
          and the live region exists before it's filled. */}
      <p
        aria-live="polite"
        data-hint={hint ?? undefined}
        className={`mt-3 min-h-5 text-[15px] leading-5 font-medium text-forest transition-opacity duration-300 ease-step motion-reduce:transition-none ${
          hint === "shown" ? "opacity-100" : "opacity-0"
        }`}
      >
        {hint && <span key={hintKey}>{copy.cleared}</span>}
      </p>
    </StepScreen>
  );
}
