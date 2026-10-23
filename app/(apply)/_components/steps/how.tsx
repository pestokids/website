"use client";

import { how } from "@/content/apply";
import { useFlow } from "../apply-flow";
import { StepScreen } from "../step-screen";
import { PrimaryButton } from "../ui/button";
import { IconSticker, PestoSticker } from "../ui/sticker";

/** Per trail sticker (Stories, Questions, Games): tilt, and how far it rises. */
const trailStyle: { tilt: number; lift: number }[] = [
  { tilt: -8, lift: 0 },
  { tilt: 4, lift: 22 },
  { tilt: -5, lift: -6 },
];

export function HowStep() {
  const { advance, family } = useFlow();
  const last = how.lines.length - 1;

  return (
    <StepScreen
      name="how"
      footer={<PrimaryButton onClick={() => advance()}>{how.cta}</PrimaryButton>}
    >
      <div className="relative pt-1">
        <h1 className="font-display text-[54px] leading-[56px] font-extrabold">
          {how.lines.map((line, i) => (
            <span key={i} className={`block ${i === last ? "text-orange" : ""}`}>
              {line}
            </span>
          ))}
        </h1>
        <PestoSticker size={120} tilt={7} zoom={1.15} className="absolute top-1 right-1" />
      </div>

      <p className="mt-2 flex items-center gap-2 text-[15px] leading-5 font-bold text-orange">
        <Squiggle />
        {how.aside}
      </p>

      <p className="mt-4 text-base leading-[22px] text-muted">{how.sub(family)}</p>

      <div className="relative mt-[clamp(28px,calc(100dvh-706px),48px)] pb-2">
        <TrailDots />
        <ul className="relative -left-3 grid grid-cols-3">
          {how.trail.map((item, i) => {
            const s = trailStyle[i];
            return (
              <li
                key={item.label}
                className="flex flex-col items-center gap-1.5"
                style={{ translate: `0 ${-s.lift}px` }}
              >
                <IconSticker icon={item.icon} size={66} tilt={s.tilt} />
                <span
                  className="font-display text-[17px] leading-6 font-extrabold text-forest/80"
                  style={{ rotate: `${s.tilt}deg` }}
                >
                  {item.label}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </StepScreen>
  );
}

/** Lime wave under "Learn.", before the aside. */
function Squiggle() {
  return (
    <svg width="126" height="20" viewBox="0 0 126 20" fill="none" aria-hidden="true" className="shrink-0">
      <path
        d="M3 13C17 4 31 4 45 10s28 8 40 2 26-9 38-2"
        stroke="var(--color-lime)"
        strokeWidth="6"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * Dotted path linking the three trail stickers. Stretches with the column;
 * the stroke and dot spacing stay the same size.
 */
function TrailDots() {
  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 top-0 h-[66px] w-full"
      viewBox="0 0 362 66"
      preserveAspectRatio="none"
      fill="none"
    >
      <path
        d="M84 38C100 42 118 43 134 40M206 20C222 23 238 30 254 40"
        stroke="var(--color-pale)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray="0 8"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
