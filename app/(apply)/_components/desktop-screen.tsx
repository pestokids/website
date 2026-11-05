"use client";

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { desktop, pesto as pestoLines, welcome } from "@/content/apply";
import { config } from "@/lib/config";
import { handoffUrl } from "../_lib/desktop";
import { track } from "../_lib/track";
import { desk, pz } from "./classes";
import { ForestNight } from "./forest-night";
import { PestoBubble, PestoFace } from "./pesto/pesto";
import { pestoSvg } from "./pesto/pesto-svg";
import { useIdleCheckIn } from "./pesto/use-idle-check-in";
import { prefersReducedMotion, usePesto } from "./pesto/use-pesto";
import { QrCode } from "./ui/qr-code";
import { IconSticker } from "./ui/sticker";

const COPIED_MS = 2000;
/** Browser bar tint on this screen: Forest night. */
const THEME_COLOR = "#003F2E";
/** Quiet time before Pesto checks in. */
const CHECK_IN_MS = 20_000;
/** How long a reaction stays in his bubble before he's back to "Scan me!". */
const REACTION_MS = 2600;

/** The dotted path from the QR card down to the phone (artboard 41). */
const TRAIL = "M0 0C18.3 38.9 55 62.2 110 70";

/** Forest night's glow sits behind the QR card; the wordmark lines up with the content (apply.css, .pz-desk). */
const forestGlow: CSSProperties = {
  left: "var(--pz-desk-glow-x)",
  top: "51%",
  width: "var(--pz-desk-glow-size)",
  height: "var(--pz-desk-glow-size)",
  // Smaller than the tablets' glow, so it fades all the way out (no rim).
  background: "radial-gradient(closest-side, rgb(189 245 63 / 0.32), rgb(189 245 63 / 0))",
};
const forestLogo: CSSProperties = {
  top: 44,
  left: "var(--pz-desk-col)",
  fontSize: 32,
  lineHeight: "38px",
  letterSpacing: 0,
};

/** Pesto's face, still, in the middle of the QR code and on the phone. */
const qrFace = { __html: pestoSvg("pzqr-") };
const phoneFace = { __html: pestoSvg("pzph-") };

/**
 * "Let's continue on your phone." Replaces the flow on computers, on Forest
 * night. Pesto peeks over the QR card: his eyes follow the mouse, he perks up
 * when you point at the code, gives a thumbs-up when you copy the link, and
 * checks in once after 20 quiet seconds. Never touches the draft or
 * attribution, and fires no Linkrunner events. Only rendered on the client
 * (see DesktopGate), so `window` is safe here.
 */
export function DesktopScreen() {
  const [url] = useState(() => handoffUrl(window.location.href));
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const backToRest = useRef<ReturnType<typeof setTimeout>>(undefined);
  const line = useRef<string>(pestoLines.desktop.scanMe);
  const lines = pestoLines.desktop;
  const [line1, line2] = desktop.headline.lines;
  const [beforeHighlight] = line2.split(desktop.headline.highlight);

  const pesto = usePesto();
  useIdleCheckIn(pesto, lines.checkIn, CHECK_IN_MS);

  useEffect(() => {
    track.desktopGateViewed(window.location.href, document.referrer);
    const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    const previous = meta?.content;
    if (meta) meta.content = THEME_COLOR;
    return () => {
      if (meta && previous) meta.content = previous;
      clearTimeout(timer.current);
    };
  }, []);

  // "Scan me!" before the first paint, so the bubble never shows up empty.
  useLayoutEffect(() => pesto.say(lines.scanMe), [pesto, lines.scanMe]);

  // His eyes follow the mouse.
  useEffect(() => {
    if (prefersReducedMotion()) return;
    let frame = 0;
    let x = 0;
    let y = 0;
    const move = (e: PointerEvent) => {
      x = e.clientX;
      y = e.clientY;
      frame ||= requestAnimationFrame(() => {
        frame = 0;
        pesto.lookAtPoint(x, y);
      });
    };
    window.addEventListener("pointermove", move, { passive: true });
    return () => {
      window.removeEventListener("pointermove", move);
      cancelAnimationFrame(frame);
    };
  }, [pesto]);

  /** Says `text`, then goes back to "Scan me!". */
  const react = (text: string) => {
    line.current = text;
    pesto.say(text);
    clearTimeout(backToRest.current);
    backToRest.current = pesto.later(() => {
      line.current = lines.scanMe;
      pesto.say(lines.scanMe);
    }, REACTION_MS);
  };

  const perkUp = () => {
    pesto.set("surprised", true);
    pesto.hop();
    if (line.current !== lines.qrHover) react(lines.qrHover);
  };

  const copy = async () => {
    if (!(await copyText(url))) return;
    track.desktopLinkCopied();
    setCopied(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), COPIED_MS);
    pesto.flash("thumbs-up", COPIED_MS);
    react(lines.copied);
  };

  return (
    <main className={desk.screen}>
      <ForestNight glowStyle={forestGlow} logoStyle={forestLogo} />

      <div className={desk.frame}>
        <div className={desk.copy}>
          <p className={desk.pill}>{desktop.pill(config.admissionsCloseDate.short)}</p>
          <h1 className={desk.headline}>
            <span className="block">{line1}</span>{" "}
            <span className="block">
              {beforeHighlight}
              <span className={desk.highlight}>{desktop.headline.highlight}</span>
            </span>
          </h1>
          <p className={desk.sub}>{desktop.sub}</p>

          <div className={desk.link}>
            <span className={desk.field}>{desktop.linkLabel}</span>
            <button type="button" onClick={copy} className={desk.button}>
              {copied ? desktop.copied : desktop.copy}
            </button>
            <span role="status" className="sr-only">
              {copied ? desktop.copied : ""}
            </span>
          </div>
        </div>

        <div className={desk.art}>
          <IconSticker
            icon="book"
            tilt={10}
            className={desk.sticker}
            style={{ left: "0em", top: "480em", width: "66em", height: "66em" }}
          />
          <IconSticker
            icon="puzzle"
            tilt={-9}
            className={desk.sticker}
            style={{ left: "544em", top: "120em", width: "60em", height: "60em" }}
          />

          <svg aria-hidden="true" focusable="false" viewBox="-4 -4 118 78" className={desk.path}>
            <mask id="pz-desk-trail" maskUnits="userSpaceOnUse" x="-4" y="-4" width="118" height="78">
              <path
                d={TRAIL}
                pathLength={1}
                fill="none"
                stroke="#fff"
                strokeWidth={8}
                className={desk.pathDraw}
              />
            </mask>
            <path
              d={TRAIL}
              fill="none"
              stroke="#bdf53f"
              strokeWidth={3}
              strokeLinecap="round"
              strokeDasharray="2 10"
              mask="url(#pz-desk-trail)"
            />
          </svg>

          <div aria-hidden="true" className={desk.phone}>
            <span className={`${pz.face} ${pz.happy} ${desk.phoneFace}`} dangerouslySetInnerHTML={phoneFace} />
          </div>

          <div
            className={desk.card}
            onPointerEnter={perkUp}
            onPointerLeave={() => pesto.set("surprised", false)}
          >
            <div className={desk.qr}>
              <QrCode value={url} label={desktop.qrLabel} />
              <span aria-hidden="true" className={`${pz.face} ${desk.qrFace}`} dangerouslySetInnerHTML={qrFace} />
            </div>
            <p className={desk.caption}>{desktop.qrCaption}</p>
          </div>

          <PestoFace pesto={pesto} size="150em" badges className={desk.pesto} />
          <PestoBubble pesto={pesto} variant="cream" className={desk.bubble} />
        </div>
      </div>

      <p className={desk.consent}>
        {welcome.consent.before}
        <a href={welcome.consent.terms.href} target="_blank" rel="noopener">
          {welcome.consent.terms.label}
        </a>
        {welcome.consent.between}
        <a href={welcome.consent.privacy.href} target="_blank" rel="noopener">
          {welcome.consent.privacy.label}
        </a>
        {welcome.consent.after}
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
