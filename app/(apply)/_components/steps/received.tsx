"use client";

import { received, whatsappPrefillFor } from "@/content/apply";
import { config } from "@/lib/config";
import { useFlow } from "../apply-flow";
import { StepPlaceholder } from "../placeholder";

export function ReceivedStep() {
  const { submitted, family } = useFlow();
  if (!submitted) return null;

  const today = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(
    new Date(),
  );
  const whatsappHref = `https://wa.me/${config.whatsappNumber}?text=${encodeURIComponent(
    whatsappPrefillFor(submitted.refCode),
  )}`;

  return (
    <StepPlaceholder name="received" state={family.plural ? "2 kids" : "1 kid"}>
      <h1 className="font-display text-[28px] leading-8 font-extrabold">{received.title(family)}</h1>
      <p className="text-[13px] text-muted">{received.meta(today)}</p>
      <p>{received.sayHi.sub(family)}</p>
      <p className="text-[13px]">“{received.sayHi.chatMessage(family)}”</p>
      <a
        href={whatsappHref}
        className="grid h-[52px] place-items-center rounded-full bg-whatsapp-grad font-display text-[17px] font-extrabold text-white"
      >
        {received.sayHi.cta}
      </a>
      <p>
        {received.betaDay.title}: {config.betaDate.long}
      </p>
      <p className="text-[13px] text-muted">{received.footer(submitted.email)}</p>
    </StepPlaceholder>
  );
}
