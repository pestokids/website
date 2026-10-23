"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { desktop, welcome } from "@/content/apply";
import { config } from "@/lib/config";
import { handoffUrl } from "../_lib/desktop";
import { FrostedCard } from "./ui/frosted-card";
import { QrCode } from "./ui/qr-code";
import { IconSticker, PestoSticker } from "./ui/sticker";

const COPIED_MS = 2000;
/** Browser bar tint on this screen: cream, not the flow's forest. */
const THEME_COLOR = "#FFFBEB";

const CARD_W = 880;
const CARD_H = 480;
const STICKER = 72;

/**
 * Corner stickers (diya, moon, bow, deer): centre points relative to the
 * card's top-left. Below 1152px wide they tuck in (`tight`) so they stay on
 * screen down to 1024.
 */
const corners = [
  { x: -54, tight: -24, y: -30, tilt: -8 },
  { x: CARD_W + 53, tight: CARD_W + 24, y: -44, tilt: 6 },
  { x: -46, tight: -20, y: CARD_H + 23, tilt: -6 },
  { x: CARD_W + 46, tight: CARD_W + 20, y: CARD_H + 10, tilt: 8 },
];

/**
 * "Let's continue on your phone." Replaces the flow on computers. Never
 * touches the draft or attribution, and fires no Linkrunner events.
 * Only rendered on the client (see DesktopGate), so `window` is safe here.
 */
export function DesktopScreen() {
  const [url] = useState(() => handoffUrl(window.location.href));
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    // TODO(analytics): capture `ff_desktop_gate_viewed` once the PostHog helper exists.
    const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    const previous = meta?.content;
    if (meta) meta.content = THEME_COLOR;
    return () => {
      if (meta && previous) meta.content = previous;
      clearTimeout(timer.current);
    };
  }, []);

  const copy = async () => {
    if (!(await copyText(url))) return;
    // TODO(analytics): capture `ff_desktop_link_copied` once the PostHog helper exists.
    setCopied(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), COPIED_MS);
  };

  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-x-clip px-6 py-24">
      <div className="relative">
        {desktop.stickers.map((icon, i) => (
          <IconSticker
            key={icon}
            icon={icon}
            tilt={corners[i].tilt}
            size={STICKER}
            className="absolute left-(--tight) min-[1152px]:left-(--wide)"
            style={
              {
                "--wide": `${corners[i].x - STICKER / 2}px`,
                "--tight": `${corners[i].tight - STICKER / 2}px`,
                top: corners[i].y - STICKER / 2,
              } as CSSProperties
            }
          />
        ))}

        <FrostedCard
          className="relative flex justify-between pt-8 pr-14 pb-8 pl-16"
          style={{ width: CARD_W, minHeight: CARD_H }}
        >
          <div className="flex flex-col items-start">
            <PestoSticker className="-ml-2" />
            <p className="mt-[27px] text-xs leading-4 font-bold tracking-[0.8px] text-lime-deep uppercase">
              {desktop.eyebrow}
            </p>
            <h1 className="mt-1 font-display text-[44px] leading-[48px] font-extrabold">
              {desktop.headline.map((line, i) => (
                <span key={i} className="block">
                  {line}
                </span>
              ))}
            </h1>
            <p className="mt-3.5 max-w-[420px] text-lg leading-[26px] text-muted">{desktop.sub}</p>

            <div className="mt-6 flex h-12 w-[300px] items-center justify-between rounded-full border border-hairline bg-white pr-1.5 pl-5 shadow-unselected">
              <span className="truncate text-[17px] font-medium">{desktop.linkLabel}</span>
              <button
                type="button"
                onClick={copy}
                className="h-9 min-w-[100px] shrink-0 rounded-full bg-forest-grad px-4 font-display text-[15px] leading-none font-bold text-cream shadow-primary transition-transform duration-150 ease-step motion-safe:active:scale-[0.97]"
              >
                {copied ? desktop.copied : desktop.copy}
              </button>
              <span role="status" className="sr-only">
                {copied ? desktop.copied : ""}
              </span>
            </div>
          </div>

          <div className="flex w-[278px] shrink-0 flex-col items-center pt-5">
            <div className="grid size-[278px] place-items-center rounded-card-lg border border-hairline bg-white shadow-[0_12px_28px_-12px_rgb(0_63_46/0.14)]">
              <QrCode value={url} label={desktop.qrLabel} />
            </div>
            <p className="mt-[18px] text-base leading-[22px] font-medium">{desktop.qrCaption}</p>
            <p className="mt-0.5 text-[13px] leading-[18px] text-muted">{desktop.qrSub}</p>
          </div>
        </FrostedCard>
      </div>

      <p className="absolute inset-x-0 bottom-9 text-center text-[13px] text-muted">
        {welcome.footer(config.admissionsCloseDate.short)}
      </p>
    </main>
  );
}

/** Clipboard API, with the old execCommand route as a fallback. */
async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const field = document.createElement("textarea");
    field.value = text;
    field.setAttribute("readonly", "");
    field.style.position = "fixed";
    field.style.opacity = "0";
    document.body.append(field);
    field.select();
    const ok = document.execCommand("copy");
    field.remove();
    return ok;
  }
}
