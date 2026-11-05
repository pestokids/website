"use client";

import { useEffect, useState } from "react";
import { pz as styles } from "../classes";

/** The expressions and poses Pesto can hold. */
export type PestoState = "happy" | "surprised" | "puzzled" | "wink" | "lean" | "thumbs-up";

/** ms per typed character in the bubble. */
const TYPE_MS = 30;

export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

type BubbleParts = { root: HTMLElement; shown: HTMLElement; rest: HTMLElement; live: HTMLElement };

/**
 * Drives one Pesto: his face and body (<PestoFace>) and his speech bubble
 * (<PestoBubble>). Everything is imperative class and text changes on the
 * DOM, so a blink or a typed letter never re-renders the screen.
 *
 * - look(x, y): eyes, in the artwork's units (about ±60 is the edge).
 * - say(text): types the line into the bubble while the jaw moves; screen
 *   readers get the whole line once, politely.
 * - set / flash: the states (`happy`, `surprised`, `puzzled`, `wink`, `lean`,
 *   `thumbs-up`).
 * - blink, hop, checkIn: one-off moves.
 *
 * Idle blinking runs on its own every 2.5–5.5 s (sometimes twice) unless
 * the user prefers reduced motion. Under reduced motion lines show at once
 * and nothing loops.
 */
export class PestoController {
  face: HTMLElement | null = null;
  holder: HTMLElement | null = null;
  private bubble: BubbleParts | null = null;
  private timers = new Set<ReturnType<typeof setTimeout>>();
  private typer: ReturnType<typeof setInterval> | undefined;
  private hideTimer: ReturnType<typeof setTimeout> | undefined;
  private blinkTimer: ReturnType<typeof setTimeout> | undefined;
  private pendingLine: { text: string; hideAfter?: number } | null = null;
  private disposed = false;

  attachFace = (face: HTMLElement | null, holder: HTMLElement | null) => {
    this.face = face;
    this.holder = holder;
  };

  attachBubble = (parts: BubbleParts | null) => {
    this.bubble = parts;
    if (parts && this.pendingLine) {
      const { text, hideAfter } = this.pendingLine;
      this.pendingLine = null;
      this.say(text, { hideAfter });
    }
  };

  /** Runs `fn` after `ms`, cancelled when the screen goes away. */
  later(fn: () => void, ms: number) {
    const id = setTimeout(() => {
      this.timers.delete(id);
      if (!this.disposed) fn();
    }, ms);
    this.timers.add(id);
    return id;
  }

  look(x: number, y: number) {
    if (!this.face) return;
    // Happy (cheeks up) leaves less room below the eyes.
    if (this.face.classList.contains(styles.happy)) y = Math.min(y, 8);
    // The far eye moves less: it's smaller and turned away.
    this.face.querySelectorAll<SVGGElement>(".gaze").forEach((g, i) => {
      g.style.transform = `translate(${x * (i ? 1 : 0.5)}px, ${y * (i ? 1 : 0.6)}px)`;
    });
  }

  /** Points the eyes at a spot on the page (client coordinates). */
  lookAtPoint(px: number, py: number) {
    if (!this.face) return;
    const r = this.face.getBoundingClientRect();
    const dx = px - (r.left + r.width / 2);
    const dy = py - (r.top + r.height / 2);
    const a = Math.atan2(dy, dx);
    const d = Math.min(1, Math.hypot(dx, dy) / 220);
    this.look(Math.cos(a) * 62 * d, Math.sin(a) * 46 * Math.max(0.6, d));
  }

  set(state: PestoState, on: boolean) {
    const target = state === "lean" || state === "thumbs-up" ? this.holder : this.face;
    if (!target) return;
    const cls = {
      happy: styles.happy,
      surprised: styles.surprised,
      puzzled: styles.puzzled,
      wink: styles.wink,
      lean: styles.lean,
      "thumbs-up": styles.thumbsUp,
    }[state];
    target.classList.toggle(cls, on);
    // Puzzled also tilts the head and shows the "?".
    if (state === "puzzled") {
      this.holder?.classList.toggle(styles.tilt, on);
      this.holder?.classList.toggle(styles.puzzledHolder, on);
    }
    // A thumbs-up comes with happy eyes.
    if (state === "thumbs-up") this.face?.classList.toggle(styles.happy, on);
  }

  /** Holds a state for `ms`, then lets it go. */
  flash(state: PestoState, ms: number) {
    this.set(state, true);
    this.later(() => this.set(state, false), ms);
  }

  blink() {
    const face = this.face;
    if (!face) return;
    face.classList.add(styles.blink);
    this.later(() => face.classList.remove(styles.blink), 130);
  }

  /** Restarts a one-shot animation class on the holder. */
  private replay(cls: string, ms: number) {
    const h = this.holder;
    if (!h || prefersReducedMotion()) return;
    h.classList.remove(cls);
    void h.offsetWidth;
    h.classList.add(cls);
    this.later(() => h.classList.remove(cls), ms);
  }

  hop() {
    this.replay(styles.hop, 460);
  }

  /** The idle check-in: a head tilt, a glance up, and the line. */
  checkIn(line: string) {
    this.replay(styles.checkin, 1300);
    this.look(-30, -20);
    this.later(() => this.look(0, 0), 1200);
    this.say(line, { hideAfter: 2400 });
  }

  /**
   * Types `text` into the bubble. Dark bubbles show while he speaks and hide
   * `hideAfter` ms after the line is typed; side bubbles keep the line.
   */
  say(text: string, { hideAfter }: { hideAfter?: number } = {}) {
    const b = this.bubble;
    if (!b) {
      this.pendingLine = { text, hideAfter };
      return;
    }
    clearInterval(this.typer);
    clearTimeout(this.hideTimer);
    const face = this.face;
    const reduce = prefersReducedMotion();

    b.live.textContent = text;
    b.root.classList.add(styles.shown);
    b.root.classList.remove(styles.pop);
    if (!reduce) {
      void b.root.offsetWidth;
      b.root.classList.add(styles.pop);
      face?.classList.add(styles.surprised);
      this.later(() => face?.classList.remove(styles.surprised), 800);
    }

    const hide = () => {
      if (hideAfter === undefined) return;
      this.hideTimer = setTimeout(() => b.root.classList.remove(styles.shown), hideAfter);
    };

    if (reduce) {
      b.shown.dataset.text = text;
      b.rest.dataset.text = "";
      hide();
      return;
    }

    // The untyped rest stays in the layout (invisible), so the bubble takes
    // its final size at once and wraps exactly as the whole line will.
    const chars = [...text];
    let i = 0;
    b.shown.dataset.text = "";
    b.rest.dataset.text = text;
    face?.classList.add(styles.talking);
    this.typer = setInterval(() => {
      i += 1;
      b.shown.dataset.text = chars.slice(0, i).join("");
      b.rest.dataset.text = chars.slice(i).join("");
      if (i >= chars.length) {
        clearInterval(this.typer);
        face?.classList.remove(styles.talking);
        hide();
      }
    }, TYPE_MS);
  }

  /** Hides a dark bubble now. */
  hush() {
    this.bubble?.root.classList.remove(styles.shown);
  }

  /** Starts the idle blinks (and revives a controller after a Strict Mode remount). */
  startBlinking() {
    this.disposed = false;
    if (prefersReducedMotion()) return;
    const loop = () => {
      if (this.disposed) return;
      if (Math.random() < 0.7) this.blink();
      // Sometimes a double blink.
      if (Math.random() < 0.25) this.later(() => this.blink(), 260);
      this.blinkTimer = setTimeout(loop, 2500 + Math.random() * 3000);
    };
    this.blinkTimer = setTimeout(loop, 2500 + Math.random() * 3000);
  }

  dispose() {
    this.disposed = true;
    clearInterval(this.typer);
    clearTimeout(this.hideTimer);
    clearTimeout(this.blinkTimer);
    this.timers.forEach(clearTimeout);
    this.timers.clear();
  }
}

/** One Pesto controller for the lifetime of a screen. */
export function usePesto(): PestoController {
  const [pesto] = useState(() => new PestoController());
  useEffect(() => {
    pesto.startBlinking();
    return () => pesto.dispose();
  }, [pesto]);
  return pesto;
}
