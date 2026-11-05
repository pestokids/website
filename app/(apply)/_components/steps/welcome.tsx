"use client";

/* eslint-disable @next/next/no-img-element -- tiny static SVGs */
import { useEffect, useRef, type CSSProperties } from "react";
import { pesto as lines, pestoCheckInLine, pestoNthLine, welcome, type IconName } from "@/content/apply";
import { config } from "@/lib/config";
import { useFlow } from "../apply-flow";
import { PestoBubble, PestoFace, pestoPose } from "../pesto/pesto";
import { useIdleCheckIn } from "../pesto/use-idle-check-in";
import { prefersReducedMotion, usePesto } from "../pesto/use-pesto";
import { useEntrance } from "../step-screen";
import { PrimaryButton } from "../ui/button";
import { day } from "../classes";
import { Marker } from "../ui/marker";
import { Sparkle } from "../ui/progress-header";
import { StickyFooter } from "../ui/sticky-footer";

/** The four stickers around Pesto: icon, position in the 252px hero, tilt and float phase. */
const stickers: { icon: IconName; style: CSSProperties }[] = [
  { icon: "book", style: { left: 4, top: 28, rotate: "-10deg", animationDelay: "-0.4s" } },
  { icon: "puzzle", style: { right: 4, top: 20, rotate: "9deg", animationDelay: "-1.6s" } },
  { icon: "bubble", style: { right: 2, top: 170, rotate: "-7deg", animationDelay: "-2.4s" } },
  { icon: "telescope", style: { left: 8, top: 178, rotate: "8deg", animationDelay: "-3.1s" } },
];

const sparks: { color: string; size: number; style: CSSProperties }[] = [
  { color: "#f6c33b", size: 14, style: { left: 74, top: 20, animationDelay: "-0.6s" } },
  { color: "#ff6420", size: 11, style: { right: 62, top: 118, animationDelay: "-1.4s" } },
  { color: "#6ea300", size: 10, style: { left: 86, top: 222, animationDelay: "-2s" } },
];

/** Where Pesto glances now and then (eye offsets), the last one straight ahead. */
const glances = [
  [-40, -18],
  [44, 10],
  [10, 46],
  [0, 0],
] as const;

const HI_AT_MS = 700;

/**
 * Screen 1. No header: the wordmark, Pesto in his sticker garden, the
 * tagline, the facts, then the consent line and the button at the bottom
 * (lifted on wide screens by <FlowColumn>). Pesto breathes, glances around
 * and says hi; tapping him makes him hop and say the next line. On short
 * screens the hero shrinks so everything fits.
 */
export function WelcomeStep() {
  const { advance } = useFlow();
  const entrance = useEntrance();
  const facts = welcome.facts(config.admissionsCloseDate.short);
  const [line1, line2] = welcome.tagline.lines;
  const [beforeHighlight, afterHighlight] = line1.split(welcome.tagline.highlight);

  const pesto = usePesto();
  useIdleCheckIn(pesto, pestoCheckInLine("welcome"));
  const taps = useRef(0);
  useEffect(() => {
    pesto.later(() => pesto.say(lines.welcome.hi, { hideAfter: 2400 }), HI_AT_MS);
    if (prefersReducedMotion()) return;
    const glance = () => {
      const [x, y] = glances[Math.floor(Math.random() * glances.length)];
      pesto.look(x, y);
      pesto.later(() => pesto.look(0, 0), 1100);
      pesto.later(glance, 3800 + Math.random() * 2500);
    };
    pesto.later(glance, 2600);
  }, [pesto]);

  const tap = () => {
    pesto.hop();
    pesto.say(pestoNthLine(lines.welcome.taps, taps.current++), { hideAfter: 2200 });
  };

  return (
    <section data-step="welcome" className={`flex flex-1 flex-col items-center ${entrance}`}>
      <p
        aria-hidden="true"
        className="mt-[calc(env(safe-area-inset-top)+16px)] font-display text-[26px] leading-none font-extrabold tracking-[-0.4px]"
      >
        {welcome.brand}
      </p>

      {/* The hero is drawn at 252px and scaled down on short screens. */}
      <div className="relative mt-2.5 h-[252px] w-full max-w-[320px] shrink-0 [@media(max-height:700px)]:h-[176px]">
        <div className="absolute inset-x-0 top-0 grid h-[252px] origin-top place-items-center [@media(max-height:700px)]:scale-[0.7]">
          <div aria-hidden="true" className="absolute size-[238px] rounded-full bg-day-tint" />
          {stickers.map((s) => (
            <span
              key={s.icon}
              aria-hidden="true"
              className={`absolute z-[1] grid size-[52px] place-items-center rounded-[14px] border-2 border-day-border bg-white shadow-[0_4px_0_var(--color-day-border)] ${day.float}`}
              style={s.style}
            >
              <img src={`/icons/md/${s.icon}.svg`} alt="" width={33} height={33} />
            </span>
          ))}
          {sparks.map((s, i) => (
            <span key={i} aria-hidden="true" className={`absolute ${day.twinkle}`} style={{ ...s.style, color: s.color }}>
              <Sparkle size={s.size} />
            </span>
          ))}
          <PestoFace
            pesto={pesto}
            size={140}
            onTap={tap}
            tapLabel={lines.tapLabel}
            className="z-[2]"
            holderClassName={pestoPose.bob}
          />
          <PestoBubble
            pesto={pesto}
            variant="dark-down"
            className="absolute top-1 left-1/2 z-[3] w-max max-w-[260px] -translate-x-1/2"
          />
        </div>
      </div>

      <p className="mt-1.5 rounded-full bg-day-peach px-3 py-1.5 text-xs leading-4 font-extrabold text-day-orange-text">
        {welcome.pill}
      </p>
      <h1 className="mt-3 text-center font-display text-[clamp(27px,8.4vw,31px)] leading-[1.12] font-extrabold tracking-[-0.4px]">
        <span className="block">
          {beforeHighlight}
          <Marker delay={0.5}>{welcome.tagline.highlight}</Marker>
          {afterHighlight}
        </span>{" "}
        <span className="block">{line2}</span>
      </h1>
      <p className="mx-2 mt-2.5 max-w-[340px] text-center text-[14.5px] leading-[1.45] text-day-sub">
        {welcome.sub}
      </p>

      <dl className="mt-4 mb-2 grid w-full grid-cols-3 gap-2.5">
        {facts.map((f) => (
          <div
            key={f.label}
            className={`flex flex-col-reverse rounded-[14px] border-2 border-day-border px-1 pt-2 pb-[7px] text-center shadow-[0_4px_0_var(--color-day-border)] ${
              "hot" in f ? day.nudge : ""
            }`}
          >
            <dt className="text-[11px] leading-4 text-day-sub">{f.label}</dt>
            <dd
              className={`font-display text-[19px] leading-[1.2] font-extrabold ${
                "hot" in f ? "text-[#e8571a]" : ""
              }`}
            >
              {f.value}
            </dd>
          </div>
        ))}
      </dl>

      <StickyFooter className="w-full pb-2!">
        {/* Fine print right above the button. */}
        <p className="-mb-0.5 text-center text-[11.5px] leading-4 text-balance text-day-sub">
          {welcome.consent.before}
          <ConsentLink {...welcome.consent.terms} />
          {welcome.consent.between}
          <ConsentLink {...welcome.consent.privacy} />
          {welcome.consent.after}
        </p>
        <PrimaryButton onClick={() => advance()}>{welcome.cta}</PrimaryButton>
      </StickyFooter>
    </section>
  );
}

function ConsentLink({ label, href }: { label: string; href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener"
      className="whitespace-nowrap underline decoration-day-sub/40 underline-offset-2"
    >
      {label}
    </a>
  );
}
