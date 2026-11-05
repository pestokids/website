"use client";

import { useCallback, useId, useMemo, type CSSProperties } from "react";
import { pz as styles } from "../classes";
import { pestoSvg } from "./pesto-svg";
import type { PestoController } from "./use-pesto";

const THUMB_PATH =
  "M7 10v11H3V10h4Zm2 11h8.6a2 2 0 0 0 2-1.7l1.3-7.6A2 2 0 0 0 19 9.4h-5.2l.8-4a1.7 1.7 0 0 0-3-1.4L9 9v12Z";

/**
 * Pesto's round face, inlined from the rigged artwork so his eyes, lids,
 * cheeks, brows and jaw can move. Ids are unique per instance. Decorative:
 * what he says is in <PestoBubble>. With `onTap` he's a button (welcome,
 * received), otherwise not focusable.
 */
export function PestoFace({
  pesto,
  size,
  onTap,
  tapLabel,
  className = "",
  holderClassName = "",
  style,
  badges = false,
}: {
  pesto: PestoController;
  /** Diameter: px, or any CSS length (the computer screen scales him). */
  size: number | string;
  onTap?: () => void;
  tapLabel?: string;
  /** Classes on the outer holder (position, entrance animation). */
  className?: string;
  /** Pose classes on the holder (e.g. `pestoPose.bob`). */
  holderClassName?: string;
  style?: CSSProperties;
  /** Renders the thumbs-up and "?" badges (email screen). */
  badges?: boolean;
}) {
  const prefix = `p${useId().replace(/[^a-zA-Z0-9]/g, "")}-`;
  const markup = useMemo(() => ({ __html: pestoSvg(prefix) }), [prefix]);

  const holderRef = useCallback(
    (holder: HTMLDivElement | null) => {
      const face = holder?.querySelector<HTMLElement>(`.${styles.face}`) ?? null;
      pesto.attachFace(face, holder);
    },
    [pesto],
  );

  const face = (
    <span
      className={styles.face}
      style={{ width: size, height: size }}
      dangerouslySetInnerHTML={markup}
    />
  );

  return (
    <div
      ref={holderRef}
      className={`${styles.holder} ${holderClassName} ${className}`}
      style={style}
    >
      {onTap ? (
        <button type="button" aria-label={tapLabel} onClick={onTap} className={styles.tap}>
          {face}
        </button>
      ) : (
        face
      )}
      {badges && (
        <>
          <span aria-hidden="true" className={`${styles.badge} ${styles.thumb}`}>
            <svg viewBox="0 0 24 24">
              <path fill="#fff" d={THUMB_PATH} />
            </svg>
          </span>
          <span aria-hidden="true" className={`${styles.badge} ${styles.qmark}`}>
            ?
          </span>
        </>
      )}
    </div>
  );
}

/** Pose classes for <PestoFace holderClassName>. */
export const pestoPose = {
  bob: styles.bob,
  popIn: styles.popIn,
} as const;

export type BubbleVariant = "side" | "cream" | "dark-down" | "dark-down-left" | "dark-down-right";

/**
 * Pesto's speech bubble. It grows with its line and wraps inside itself.
 * The visible, typed text is drawn from data attributes (CSS `content`), so
 * it isn't page text; screen readers (and text search) get the whole line
 * once, from a polite live region.
 *
 * `side` (question screens) sits beside him and always shows a line.
 * `cream` (computer screen) sits above him on the dark background, tail down
 * and to the left, and always shows a line. The dark variants float near him
 * and only show while he's talking.
 */
export function PestoBubble({
  pesto,
  variant = "side",
  className = "",
  style,
}: {
  pesto: PestoController;
  variant?: BubbleVariant;
  className?: string;
  style?: CSSProperties;
}) {
  const ref = useCallback(
    (root: HTMLDivElement | null) => {
      if (!root) {
        pesto.attachBubble(null);
        return;
      }
      pesto.attachBubble({
        root,
        shown: root.querySelector<HTMLElement>("[data-shown]")!,
        rest: root.querySelector<HTMLElement>("[data-rest]")!,
        live: root.querySelector<HTMLElement>("[data-live]")!,
      });
    },
    [pesto],
  );

  const look =
    variant === "side"
      ? styles.side
      : variant === "cream"
        ? styles.cream
        : `${styles.dark} ${
          variant === "dark-down"
            ? styles.tailDown
            : variant === "dark-down-left"
              ? styles.tailDownLeft
              : styles.tailDownRight
        }`;

  return (
    <div ref={ref} className={`${styles.bubble} ${look} ${className}`} style={style}>
      <span aria-hidden="true">
        <span data-shown="" className="before:content-[attr(data-text)]" />
        <span data-rest="" className="invisible before:content-[attr(data-text)]" />
      </span>
      <span data-live="" aria-live="polite" className="sr-only" />
    </div>
  );
}

/** The row at the top of every question screen: Pesto (60px) and his bubble, which hugs its line. */
export function PestoSays({ pesto, badges = false }: { pesto: PestoController; badges?: boolean }) {
  return (
    <div className="relative mt-3 flex min-h-[66px] shrink-0 items-center gap-3">
      <PestoFace pesto={pesto} size={60} badges={badges} />
      <PestoBubble pesto={pesto} className="min-w-0" />
    </div>
  );
}
