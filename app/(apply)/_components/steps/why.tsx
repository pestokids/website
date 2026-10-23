"use client";

/* eslint-disable @next/next/no-img-element -- small static SVGs, no optimisation needed */
import { why } from "@/content/apply";
import { useFlow } from "../apply-flow";
import { StepScreen } from "../step-screen";
import { PrimaryButton } from "../ui/button";

type Rank = (typeof why.podium)[number]["rank"];

/**
 * Podium geometry, from the 402px design. Every column's top area is the
 * same height, so the bars share a baseline and the labels line up.
 */
const TOP_AREA = 272;
const bar: Record<Rank, { height: number; className: string; numberClassName: string }> = {
  1: {
    height: 185,
    className: "bg-lime-grad shadow-selected",
    numberClassName: "text-forest",
  },
  2: {
    height: 116,
    className: "bg-cream bg-linear-to-b from-lime/35 to-lime/55",
    numberClassName: "text-muted/80",
  },
  3: {
    height: 60,
    className: "bg-cream bg-linear-to-b from-forest/5 to-forest/10 shadow-unselected",
    numberClassName: "text-muted/80",
  },
};
/** Visual order, left to right: 2, 1, 3. The DOM stays 1, 2, 3. */
const columnOrder: Record<Rank, string> = { 1: "order-2", 2: "order-1", 3: "order-3" };

export function WhyStep() {
  const { advance } = useFlow();

  return (
    <StepScreen
      name="why"
      footer={<PrimaryButton onClick={() => advance()}>{why.cta}</PrimaryButton>}
    >
      <h1 className="font-display text-[28px] leading-8 font-extrabold">
        {why.headline.map((line, i) => (
          <span key={i} className="block">
            {line}
          </span>
        ))}
      </h1>
      <p className="mt-2 text-base leading-[22px] text-muted">{why.sub}</p>

      <ol className="mt-[clamp(16px,calc(100dvh-700px),56px)] grid grid-cols-3 gap-x-[7px]">
        {why.podium.map((p) => (
          <li key={p.rank} className={`relative flex flex-col ${columnOrder[p.rank]}`}>
            <div className="flex flex-col items-center justify-end" style={{ height: TOP_AREA }}>
              {p.icon ? (
                <span className="mb-4 grid size-12 place-items-center rounded-[14px] border border-hairline bg-white shadow-sticker">
                  <img src={`/icons/md/${p.icon}.svg`} alt="" width={36} height={36} />
                </span>
              ) : (
                <PestoBadge />
              )}
              <div
                className={`flex w-full justify-center rounded-t-[16px] rounded-b-[6px] pt-3 ${bar[p.rank].className}`}
                style={{ height: bar[p.rank].height }}
              >
                <span
                  className={`font-display text-[40px] leading-10 font-extrabold ${bar[p.rank].numberClassName}`}
                >
                  {p.rank}
                </span>
              </div>
            </div>

            <p className="mt-5 flex flex-col items-center text-center">
              <span
                className={
                  p.rank === 1
                    ? "font-display text-[17px] leading-[22px] font-extrabold"
                    : "text-[15px] leading-[18px] text-muted"
                }
              >
                {p.label}
              </span>
              {p.tag && (
                <span
                  className={`mt-1 text-xs leading-4 font-bold tracking-[0.15em] ${
                    p.rank === 1 ? "text-lime-deep" : "text-muted/80"
                  }`}
                >
                  {p.tag}
                </span>
              )}
            </p>

            {p.rank === 1 && <Seal />}
          </li>
        ))}
      </ol>
    </StepScreen>
  );
}

/** Pesto in a white-rimmed circle with an orange star, on top of bar 1. */
function PestoBadge() {
  return (
    <span className="relative mb-3 size-[75px] shrink-0" aria-hidden="true">
      <span className="block size-full overflow-hidden rounded-full border-4 border-white bg-forest shadow-sticker">
        <img
          src="/mascots/mascot-primary.svg"
          alt=""
          width={75}
          height={75}
          className="size-full origin-[45%_40%] scale-[1.15]"
        />
      </span>
      <span className="absolute -top-2 -right-3 grid size-8 place-items-center rounded-full border-[3px] border-white bg-orange text-white shadow-sticker">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="m12 2.5 2.9 6 6.6.8-4.9 4.5 1.3 6.5L12 17l-5.9 3.3 1.3-6.5-4.9-4.5 6.6-.8z" />
        </svg>
      </span>
    </span>
  );
}

/** 16-point starburst outline, 100×100, centred on (50, 50). */
const STARBURST = Array.from({ length: 32 }, (_, i) => {
  const r = i % 2 === 0 ? 47 : 39;
  const a = (Math.PI * i) / 16 - Math.PI / 2;
  return `${(50 + r * Math.cos(a)).toFixed(2)},${(50 + r * Math.sin(a)).toFixed(2)}`;
}).join(" ");

/**
 * Orange "3× BETTER OUTCOMES" seal, just right of bar 1, with a dotted
 * pointer down into it. Positioned against bar 1's column (the top area
 * has a fixed height, so offsets from the top match the design).
 */
function Seal() {
  return (
    <>
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute top-[103px] left-[calc(100%-14px)] z-10 h-[26px] w-[45px] overflow-visible"
        viewBox="0 0 45 26"
        fill="none"
      >
        <path
          d="M42 1c-2 16-18 25-41 22"
          stroke="var(--color-orange)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray="3 4"
        />
      </svg>
      <div className="absolute top-[10px] left-[calc(100%+2px)] z-10 grid size-[100px] place-items-center">
        <svg
          aria-hidden="true"
          viewBox="0 0 100 100"
          className="absolute inset-0 size-full drop-shadow-[0_6px_10px_rgb(255_100_32/0.3)]"
        >
          <polygon
            points={STARBURST}
            fill="var(--color-orange)"
            stroke="white"
            strokeWidth="3"
            strokeLinejoin="round"
          />
        </svg>
        <p className="relative flex flex-col items-center text-white">
          <span className="font-display text-[32px] leading-[30px] font-extrabold">
            {why.seal.figure}
          </span>
          {why.seal.caption.map((line) => (
            <span key={line} className="text-[9.5px] leading-[11px] font-bold tracking-[0.08em]">
              {line}
            </span>
          ))}
        </p>
      </div>
    </>
  );
}
