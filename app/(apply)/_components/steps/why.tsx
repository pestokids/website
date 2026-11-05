"use client";

import { useEffect, useState } from "react";
import { pestoCheckInLine, why } from "@/content/apply";
import { useFlow } from "../apply-flow";
import { PestoBubble, PestoFace } from "../pesto/pesto";
import { useIdleCheckIn } from "../pesto/use-idle-check-in";
import { prefersReducedMotion, usePesto } from "../pesto/use-pesto";
import { StepScreen } from "../step-screen";
import { PrimaryButton } from "../ui/button";
import { day } from "../classes";

type Rank = (typeof why.podium)[number]["rank"];

/** Bar heights once grown, and their look. */
const bar: Record<Rank, { height: number; delay: number; className: string }> = {
  1: { height: 190, delay: 0, className: "bg-day-lime shadow-[0_4px_0_var(--color-day-lime-deep)]" },
  2: { height: 120, delay: 0.15, className: "bg-[#e9eeeb]" },
  3: { height: 70, delay: 0.3, className: "bg-day-tile" },
};
/** Visual order, left to right: 2, 1, 3. The DOM stays 1, 2, 3. */
const columnOrder: Record<Rank, string> = { 1: "order-2", 2: "order-1", 3: "order-3" };

/** When the podium starts growing, and when Pesto (landed on #1) gets happy eyes. */
const GROW_AT_MS = 250;
const HAPPY_AT_MS = 1300;

/** 12-point starburst, 100×100, centred on (50, 50). */
const STARBURST = Array.from({ length: 24 }, (_, i) => {
  const a = (i * Math.PI) / 12;
  const r = i % 2 ? 42 : 50;
  return `${i ? "L" : "M"}${(50 + r * Math.cos(a)).toFixed(1)} ${(50 + r * Math.sin(a)).toFixed(1)}`;
}).join("") + "Z";

/**
 * The podium grows, Pesto lands on #1 and the 3× seal stamps on. With
 * reduced motion it's all there from the start.
 */
export function WhyStep() {
  const { advance } = useFlow();
  // Under reduced motion it starts grown.
  const [grown, setGrown] = useState(prefersReducedMotion);

  const pesto = usePesto();
  useIdleCheckIn(pesto, pestoCheckInLine("why"));
  useEffect(() => {
    if (prefersReducedMotion()) {
      pesto.set("happy", true);
      return;
    }
    pesto.later(() => setGrown(true), GROW_AT_MS);
    pesto.later(() => pesto.set("happy", true), HAPPY_AT_MS);
  }, [pesto]);

  return (
    <StepScreen
      name="why"
      footer={<PrimaryButton onClick={() => advance()}>{why.cta}</PrimaryButton>}
    >
      <h1 className="mt-[22px] font-display text-[25px] leading-[1.15] font-extrabold tracking-[-0.3px] text-balance">
        {why.headline.join(" ")}
      </h1>
      <p className="mt-1 text-sm leading-[1.45] text-day-sub">{why.sub}</p>

      <div
        className={`relative mt-[clamp(8px,calc(100dvh-640px),48px)] mb-10 ${grown ? day.grown : ""}`}
      >
        <ol className="flex h-[min(300px,max(240px,calc(100dvh-420px)))] items-end justify-center gap-2.5">
          {why.podium.map((p) => (
            <li
              key={p.rank}
              className={`relative grid w-[30%] max-w-[92px] justify-items-center rounded-t-[14px] rounded-b-[6px] pt-2.5 font-display text-[30px] leading-none font-extrabold ${
                day.bar
              } ${bar[p.rank].className} ${columnOrder[p.rank]}`}
              style={{ height: grown ? bar[p.rank].height : 0, transitionDelay: `${bar[p.rank].delay}s` }}
            >
              {p.rank === 1 && (
                <div className={`absolute -top-[74px] ${day.lands}`}>
                  <PestoBubble
                    pesto={pesto}
                    variant="dark-down"
                    className="absolute bottom-[calc(100%+10px)] left-1/2 w-max max-w-[170px] -translate-x-1/2"
                  />
                  <PestoFace pesto={pesto} size={64} />
                </div>
              )}
              <span aria-hidden="true">{p.rank}</span>
              <span
                className={`absolute -bottom-[34px] w-[110px] text-center font-body text-[11.5px] leading-[1.2] font-extrabold ${
                  p.rank === 1 ? "text-lime-text" : "text-day-sub"
                }`}
              >
                <span className="sr-only">{p.rank}. </span>
                {p.label}
              </span>
            </li>
          ))}
        </ol>
        <p className={`absolute top-1.5 -right-0.5 grid size-[84px] place-items-center text-center text-white ${day.seal}`}>
          <svg aria-hidden="true" viewBox="0 0 100 100" className="absolute inset-0">
            <path fill="var(--color-orange)" d={STARBURST} />
          </svg>
          <span className="relative font-display text-[26px] leading-none font-extrabold">
            {why.seal.figure}
            {why.seal.caption.map((line) => (
              <small key={line} className="block font-body text-[8.5px] leading-[1.15] font-extrabold tracking-[0.5px]">
                {line}
              </small>
            ))}
          </span>
        </p>
      </div>
    </StepScreen>
  );
}
