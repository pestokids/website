"use client";

/* eslint-disable @next/next/no-img-element -- tiny static SVGs */
import { useEffect, type CSSProperties } from "react";
import { how, pestoCheckInLine } from "@/content/apply";
import { useFlow } from "../apply-flow";
import { PestoBubble, PestoFace, pestoPose } from "../pesto/pesto";
import { useIdleCheckIn } from "../pesto/use-idle-check-in";
import { prefersReducedMotion, usePesto } from "../pesto/use-pesto";
import { StepScreen } from "../step-screen";
import { PrimaryButton } from "../ui/button";
import { day } from "../classes";

/** When each line slides in (s): "Play." ×3, then "Learn." */
const lineDelays = [0, 0.25, 0.5, 0.9];
const ASIDE_DELAY = 1.3;
const TRAIL_DELAYS = [1.5, 1.7, 1.9];
/** Pesto winks as "Learn." lands. */
const WINK_AT_MS = 1050;

const delay = (s: number): CSSProperties => ({ animationDelay: `${s}s` });

export function HowStep() {
  const { advance, family } = useFlow();
  const last = how.lines.length - 1;

  const pesto = usePesto();
  useIdleCheckIn(pesto, pestoCheckInLine("how"));
  useEffect(() => {
    if (prefersReducedMotion()) return;
    pesto.later(() => pesto.look(-40, 10), 300);
    pesto.later(() => pesto.flash("wink", 420), WINK_AT_MS);
    pesto.later(() => pesto.look(0, 0), 1500);
  }, [pesto]);

  return (
    <StepScreen
      name="how"
      footer={<PrimaryButton onClick={() => advance()}>{how.cta}</PrimaryButton>}
    >
      <div className="relative">
        <h1 className="mt-[22px] font-display text-[50px] leading-none font-extrabold tracking-[-0.5px]">
          {how.lines.map((line, i) => (
            <span
              key={i}
              className={`block ${day.slideIn} ${i === last ? "text-orange" : ""}`}
              style={delay(lineDelays[i])}
            >
              {line}
            </span>
          ))}
        </h1>
        <p
          className={`mt-1 text-sm leading-5 font-extrabold text-lime-text ${day.slideIn}`}
          style={delay(ASIDE_DELAY)}
        >
          {how.aside}
        </p>

        <div className="absolute top-[34px] right-1.5">
          <PestoBubble
            pesto={pesto}
            variant="dark-down"
            className="absolute bottom-[calc(100%+10px)] left-1/2 w-max max-w-[180px] -translate-x-1/2"
          />
          <PestoFace pesto={pesto} size={120} holderClassName={pestoPose.bob} />
        </div>
      </div>

      <p className="mt-3.5 text-sm leading-[1.45] text-day-sub">{how.sub(family)}</p>

      <ul className="relative mt-5 flex justify-between before:absolute before:inset-x-[30px] before:top-[30px] before:border-t-2 before:border-dashed before:border-day-ring before:content-['']">
        {how.trail.map((item, i) => (
          <li
            key={item.label}
            className={`relative grid justify-items-center gap-1.5 font-display text-sm font-extrabold ${day.slideIn}`}
            style={delay(TRAIL_DELAYS[i])}
          >
            <span className="grid size-[60px] place-items-center rounded-2xl border-2 border-day-border bg-white shadow-[0_4px_0_var(--color-day-border)]">
              <img src={`/icons/md/${item.icon}.svg`} alt="" width={36} height={36} />
            </span>
            {item.label}
          </li>
        ))}
      </ul>
    </StepScreen>
  );
}
