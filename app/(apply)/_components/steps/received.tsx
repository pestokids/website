"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { pesto as lines, pestoNthLine, received as copy } from "@/content/apply";
import { googleCalendarLink } from "@/lib/calendar";
import { config } from "@/lib/config";
import { whatsappLink } from "@/lib/whatsapp";
import { nextSteps, receivedDates } from "../../_lib/received";
import { track } from "../../_lib/track";
import { useFlow } from "../apply-flow";
import { PestoBubble, PestoFace, pestoPose } from "../pesto/pesto";
import { prefersReducedMotion, usePesto } from "../pesto/use-pesto";
import { StepScreen } from "../step-screen";
import { Confetti, type ConfettiHandle } from "../ui/confetti";
import { day } from "../classes";
import { CheckIcon } from "../ui/icons";
import { MarkedNames } from "../ui/marker";
import { replayClass } from "../ui/replay";

/** The celebration's beats (ms after the screen appears). */
const CONFETTI_AT = 450;
const YAY_AT = 900;
const NUDGE_AT = 4500;
const SECOND_NUDGE_AT = 12_000;

/**
 * Screen 9. Shown after submit and on every later visit (from the stored
 * submitted record), with no back button. Pesto pops in, the check stamps
 * down and confetti falls; tapping him celebrates again. The WhatsApp button
 * gets a nudge at ~4.5 s and another, with a line, at ~12 s.
 */
export function ReceivedStep() {
  const { submitted, family } = useFlow();
  const pesto = usePesto();
  const confetti = useRef<ConfettiHandle>(null);
  const hero = useRef<HTMLDivElement>(null);
  const whatsapp = useRef<HTMLAnchorElement>(null);
  const cheers = useRef(0);

  /** Confetti from behind Pesto. */
  const celebrate = () => {
    const r = hero.current?.getBoundingClientRect();
    if (r) confetti.current?.burst(r.left + r.width / 2, r.top + r.height / 2);
  };

  useEffect(() => {
    pesto.later(() => {
      const r = hero.current?.getBoundingClientRect();
      if (r) confetti.current?.burst(r.left + r.width / 2, r.top + r.height / 2);
    }, CONFETTI_AT);
    pesto.later(() => {
      pesto.set("happy", true);
      pesto.say(lines.received.yay, { hideAfter: 2600 });
    }, YAY_AT);
    if (prefersReducedMotion()) return;
    const nudge = (withLine: boolean) => {
      replayClass(whatsapp.current, day.wiggle, 750);
      pesto.set("happy", false);
      pesto.look(6, 44);
      pesto.later(() => pesto.look(0, 0), 1400);
      if (withLine) pesto.say(lines.received.nudge, { hideAfter: 2000 });
    };
    pesto.later(() => nudge(false), NUDGE_AT);
    pesto.later(() => nudge(true), SECOND_NUDGE_AT);
  }, [pesto]);

  if (!submitted) return null;

  const { receivedOn, sentWhen } = receivedDates(submitted.submittedAt, new Date());
  const { betaDate } = config;
  const steps = nextSteps(betaDate);

  const tap = () => {
    celebrate();
    pesto.hop();
    pesto.set("happy", true);
    pesto.say(pestoNthLine(lines.received.cheers(family), cheers.current++), { hideAfter: 2200 });
  };

  return (
    <StepScreen
      name="received"
      footer={
        <>
          <p className="-mb-1 text-center text-[13px] leading-[18px] text-day-sub [overflow-wrap:anywhere]">
            {copy.footer(submitted.email)}
          </p>
          {/* Same tab: in-app browsers hand wa.me off to the WhatsApp app. */}
          <a
            ref={whatsapp}
            href={whatsappLink(config.whatsappNumber, submitted.refCode)}
            onClick={() => track.whatsappOpened(submitted.kidNames.length)}
            className="flex h-[54px] items-center justify-center gap-2.5 rounded-[15px] bg-whatsapp-grad font-display text-lg leading-none font-extrabold text-white shadow-[0_4px_0_var(--color-day-whatsapp-edge)] transition-[transform,box-shadow] duration-100 active:translate-y-[3px] active:shadow-[0_1px_0_var(--color-day-whatsapp-edge)]"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- static SVG */}
            <img src="/logos/logo-whatsapp-white.svg" alt="" width={22} height={22} />
            {copy.sayHi.cta}
          </a>
        </>
      }
    >
      <Confetti ref={confetti} />

      <div ref={hero} className="relative mt-[22px] grid h-[140px] shrink-0 place-items-center">
        <PestoFace
          pesto={pesto}
          size={112}
          onTap={tap}
          tapLabel={lines.celebrateLabel}
          holderClassName={pestoPose.popIn}
        />
        <span
          aria-hidden="true"
          className={`absolute top-[84px] left-[calc(50%+26px)] z-10 grid size-10 place-items-center rounded-full bg-day-lime-deep text-white shadow-[0_0_0_4px_#fff] ${day.stamp}`}
        >
          <CheckIcon size={20} strokeWidth={3} />
        </span>
        <PestoBubble
          pesto={pesto}
          variant="dark-down-left"
          // Anchored to the right edge so "Yay! You’re in!" stays on one line on narrow phones.
          className="absolute -top-[22px] -right-2 z-20 w-max max-w-[calc(50%+4px)]"
        />
      </div>

      <h1 className="mt-3 text-center font-display text-[26px] leading-[1.15] font-extrabold text-balance">
        <MarkedNames text={copy.title(family)} names={family.kidNames} />
      </h1>
      <p className="mt-1 text-center text-[13px] leading-[18px] text-day-sub">{copy.meta(receivedOn)}</p>

      <section className="mt-3 mb-1 rounded-[18px] border-2 border-day-border px-3.5 py-3 shadow-[0_4px_0_var(--color-day-border)]">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-display text-[15px] leading-6 font-extrabold">{copy.nextTitle}</h2>
          <p className="text-xs leading-4 font-bold text-day-sub">{copy.doneCount(steps.total)}</p>
        </div>

        <ol className="mt-2 flex flex-col gap-[11px]">
          <TimelineStep marker={<DoneMarker />}>
            <StepTitle>{copy.sent.title}</StepTitle>
            <StepSub>{sentWhen}</StepSub>
          </TimelineStep>

          <TimelineStep
            marker={<NowMarker />}
            aside={
              <span className="rounded-full bg-day-peach px-2 py-1 text-[10px] leading-none font-extrabold text-day-orange-text">
                {copy.sayHi.eyebrow}
              </span>
            }
          >
            <StepTitle>{copy.sayHi.title}</StepTitle>
            <StepSub>{copy.sayHi.sub(family)}</StepSub>
            <div className="mt-1.5 rounded-xl bg-day-tile px-2.5 py-1.5">
              <p className="text-[11px] leading-4 font-extrabold text-whatsapp-text">{copy.sayHi.chatName}</p>
              <div className="flex items-end justify-between gap-2">
                <p className="text-xs leading-4">{copy.sayHi.chatMessage(family)}</p>
                <p className="shrink-0 text-[10px] leading-3 text-day-sub">{copy.sayHi.chatTime}</p>
              </div>
            </div>
          </TimelineStep>

          <TimelineStep marker={<NumberMarker n={3} />}>
            <StepTitle>{copy.letter.title}</StepTitle>
            <StepSub>{copy.letter.sub}</StepSub>
          </TimelineStep>

          {/* Only once the beta day is set (NEXT_PUBLIC_BETA_DATE is optional). */}
          {betaDate && (
            <TimelineStep
              marker={<NumberMarker n={4} />}
              aside={
                <a
                  href={googleCalendarLink(copy.betaDay.calendarTitle, betaDate.iso)}
                  onClick={() => track.calendarAdded(submitted.kidNames.length)}
                  target="_blank"
                  rel="noopener noreferrer"
                  // 30px visual, 44px tap target.
                  className="relative inline-flex h-[30px] shrink-0 items-center rounded-full bg-day-tile px-3 text-[13px] font-extrabold text-forest transition-transform duration-100 before:absolute before:-inset-y-[7px] before:inset-x-0 before:content-[''] active:translate-y-px"
                >
                  {copy.betaDay.cta}
                </a>
              }
            >
              <StepTitle>{copy.betaDay.title}</StepTitle>
              <StepSub>{betaDate.long}</StepSub>
            </TimelineStep>
          )}
        </ol>
      </section>
    </StepScreen>
  );
}

/** One row of "What happens next": a marker, the content, and an optional tag or action. */
function TimelineStep({
  marker,
  aside,
  children,
}: {
  marker: ReactNode;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <li className="grid grid-cols-[26px_1fr_auto] items-start gap-x-[11px]">
      {marker}
      <div className="min-w-0">{children}</div>
      {aside ?? <span />}
    </li>
  );
}

function StepTitle({ children }: { children: ReactNode }) {
  return <p className="font-display text-sm leading-[1.2] font-extrabold">{children}</p>;
}

function StepSub({ children }: { children: ReactNode }) {
  return <p className="text-xs leading-[1.3] text-day-sub">{children}</p>;
}

function DoneMarker() {
  return (
    <span className="grid size-[26px] place-items-center rounded-full bg-day-lime-deep text-white">
      <CheckIcon size={12} strokeWidth={2.8} />
    </span>
  );
}

function NowMarker() {
  return (
    <span className="grid size-[26px] place-items-center rounded-full border-2 border-day-lime-deep">
      <span className={`size-2.5 rounded-full bg-day-lime-deep ${day.pulse}`} />
    </span>
  );
}

function NumberMarker({ n }: { n: number }) {
  return (
    <span
      aria-hidden="true"
      className="grid size-[26px] place-items-center rounded-full border-2 border-day-ring text-xs font-extrabold text-day-sub"
    >
      {n}
    </span>
  );
}
