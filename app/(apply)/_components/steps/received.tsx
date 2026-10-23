"use client";

import type { ReactNode } from "react";
import { received as copy } from "@/content/apply";
import { googleCalendarLink } from "@/lib/calendar";
import { config } from "@/lib/config";
import { whatsappLink } from "@/lib/whatsapp";
import { receivedDates } from "../../_lib/received";
import { track } from "../../_lib/track";
import { useFlow } from "../apply-flow";
import { StepScreen } from "../step-screen";
import { FrostedCard } from "../ui/frosted-card";
import { CheckIcon } from "../ui/icons";


/**
 * Screen 9. Shown after submit and on every later visit (from the stored
 * submitted record), with no back button.
 */
export function ReceivedStep() {
  const { submitted, family } = useFlow();
  if (!submitted) return null;

  const { receivedOn, sentWhen } = receivedDates(submitted.submittedAt, new Date());

  return (
    <StepScreen name="received" className="pb-8">
      {/* Pesto peeks in from the left edge; the card covers his bottom. */}
      <div className="relative mt-[18px] flex min-h-[102px] justify-end">
        {/* eslint-disable-next-line @next/next/no-img-element -- static SVG */}
        <img
          src="/mascots/mascot-primary-cutout.svg"
          alt=""
          width={132}
          height={132}
          className="pointer-events-none absolute top-2.5 -left-[var(--margin-page)] size-[132px] select-none"
        />
        <div className="relative ml-[105px] flex-1 rounded-card bg-white px-[18px] py-4 shadow-frosted">
          <span
            aria-hidden="true"
            className="absolute top-[68px] -left-[9px] h-4 w-2.5 bg-white [clip-path:polygon(100%_0,0_55%,100%_100%)]"
          />
          <h1 className="font-display text-xl leading-[25px] font-extrabold">{copy.title(family)}</h1>
          <p className="mt-1.5 text-[13px] leading-[18px] text-muted">{copy.meta(receivedOn)}</p>
        </div>
      </div>

      <div className="relative -mx-2 mt-[30px]">
        {/* Faint glows only behind the card, so the frosting reads (spec exception). */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-16 right-0 size-48 rounded-full bg-glow-lime/50 blur-[70px]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute bottom-10 left-0 size-44 rounded-full bg-glow-peach/35 blur-[70px]"
        />

        <FrostedCard className="relative px-[18px] pt-6 pb-6">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="font-display text-lg leading-6 font-extrabold">{copy.nextTitle}</h2>
            <p className="text-[13px] leading-[18px] font-medium text-lime-text">{copy.doneCount}</p>
          </div>

          <ol className="mt-5">
            <TimelineStep marker={<DoneMarker />} connector="bg-lime-deep">
              <StepTitle>{copy.sent.title}</StepTitle>
              <StepSub>{sentWhen}</StepSub>
            </TimelineStep>

            <TimelineStep marker={<WhatsappMarker />} markerOffset="pt-4" connector="bg-pale">
              <p className="text-xs leading-4 font-bold tracking-[0.8px] text-whatsapp-text">
                {copy.sayHi.eyebrow}
              </p>
              <StepTitle>{copy.sayHi.title}</StepTitle>
              <p className="mt-1 text-base leading-5 text-forest/80">{copy.sayHi.sub(family)}</p>

              <div className="mt-3 rounded-[18px] bg-forest/[0.05] p-2.5">
                <div className="rounded-xl bg-white py-2 pr-2.5 pl-3 shadow-unselected">
                  <p className="text-xs leading-4 font-bold text-whatsapp-text">
                    {copy.sayHi.chatName}
                  </p>
                  <p className="text-[13px] leading-[18px]">{copy.sayHi.chatMessage(family)}</p>
                  <p className="-mt-0.5 text-right text-[10px] leading-3 text-muted">
                    {copy.sayHi.chatTime}
                  </p>
                </div>
              </div>

              {/* Same tab: in-app browsers hand wa.me off to the WhatsApp app. */}
              <a
                href={whatsappLink(config.whatsappNumber, submitted.refCode)}
                onClick={() => track.whatsappOpened(submitted.kidNames.length)}
                className="mt-3 flex h-[52px] items-center justify-center gap-2.5 rounded-full bg-whatsapp-grad font-display text-[17px] leading-none font-extrabold text-white shadow-[inset_0_1.5px_0_rgb(255_255_255/0.25),0_10px_22px_-6px_rgb(30_190_90/0.45)] transition-transform duration-150 ease-step motion-safe:active:scale-[0.97]"
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- static SVG */}
                <img src="/logos/logo-whatsapp-white.svg" alt="" width={24} height={24} />
                {copy.sayHi.cta}
              </a>
            </TimelineStep>

            <TimelineStep marker={<TodoMarker />} connector="bg-pale">
              <StepTitle muted>{copy.letter.title}</StepTitle>
              <StepSub>{copy.letter.sub}</StepSub>
            </TimelineStep>

            <TimelineStep marker={<TodoMarker />} last>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <StepTitle muted>{copy.betaDay.title}</StepTitle>
                  <StepSub>{config.betaDate.long}</StepSub>
                </div>
                <a
                  href={googleCalendarLink(copy.betaDay.calendarTitle, config.betaDate.iso)}
                  onClick={() => track.calendarAdded(submitted.kidNames.length)}
                  target="_blank"
                  rel="noopener noreferrer"
                  // 30px visual, 44px tap target.
                  className="relative inline-flex h-[30px] shrink-0 items-center rounded-full border border-pale bg-pale/40 px-4 text-sm font-semibold text-forest transition-transform duration-150 ease-step before:absolute before:-inset-y-[7px] before:inset-x-0 before:content-[''] motion-safe:active:scale-[0.97]"
                >
                  {copy.betaDay.cta}
                </a>
              </div>
            </TimelineStep>
          </ol>
        </FrostedCard>
      </div>

      <p className="mt-4 px-2 text-center text-[13px] leading-[18px] text-muted [overflow-wrap:anywhere]">
        {copy.footer(submitted.email)}
      </p>
    </StepScreen>
  );
}

/** One row of the "What happens next" timeline: marker column with a connector, then content. */
function TimelineStep({
  marker,
  markerOffset = "",
  connector,
  last = false,
  children,
}: {
  marker: ReactNode;
  /** Pushes the marker down to line up with the title (step 2 has an eyebrow). */
  markerOffset?: string;
  /** Colour class of the line down to the next step. */
  connector?: string;
  last?: boolean;
  children: ReactNode;
}) {
  return (
    <li className="grid grid-cols-[28px_1fr] gap-x-4">
      <div className={`flex flex-col items-center ${markerOffset}`}>
        {marker}
        {!last && <span aria-hidden="true" className={`my-1.5 w-0.5 flex-1 rounded-full ${connector}`} />}
      </div>
      <div className={`min-w-0 ${last ? "" : "pb-6"}`}>{children}</div>
    </li>
  );
}

function StepTitle({ muted = false, children }: { muted?: boolean; children: ReactNode }) {
  return (
    <p className={`font-display text-lg leading-6 font-extrabold ${muted ? "text-forest/80" : ""}`}>
      {children}
    </p>
  );
}

function StepSub({ children }: { children: ReactNode }) {
  return <p className="mt-0.5 text-[15px] leading-5 text-muted">{children}</p>;
}

function DoneMarker() {
  return (
    <span className="grid size-7 shrink-0 place-items-center rounded-full bg-lime text-forest">
      <CheckIcon size={15} />
    </span>
  );
}

function WhatsappMarker() {
  return (
    <span className="grid size-7 shrink-0 place-items-center rounded-full bg-whatsapp-grad shadow-[0_0_0_6px_rgb(37_211_102/0.15)]">
      {/* eslint-disable-next-line @next/next/no-img-element -- static SVG */}
      <img src="/logos/logo-whatsapp-white.svg" alt="" width={16} height={16} />
    </span>
  );
}

function TodoMarker() {
  return <span className="size-7 shrink-0 rounded-full border-2 border-pale bg-white/60" />;
}
