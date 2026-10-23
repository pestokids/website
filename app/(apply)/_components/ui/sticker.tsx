/* eslint-disable @next/next/no-img-element -- tiny static SVGs */
import type { CSSProperties } from "react";
import type { IconName } from "@/content/apply";

/** Tile colour per icon. Anything not listed sits on pale. */
const tints: Partial<Record<IconName, string>> = {
  diya: "bg-sticker-peach",
  moon: "bg-pale",
  bow: "bg-sticker-butter",
  deer: "bg-sticker-lime",
  book: "bg-sticker-butter",
  bubble: "bg-sticker-lime",
  dice: "bg-sticker-peach",
};

/**
 * Tilted icon sticker: an md icon on a tinted tile with a white border
 * (welcome, desktop corners, how it works). Decorative.
 */
export function IconSticker({
  icon,
  tilt = 0,
  size = 72,
  className = "",
  style,
}: {
  icon: IconName;
  /** Degrees, clockwise. */
  tilt?: number;
  size?: number;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <span
      aria-hidden="true"
      className={`grid shrink-0 place-items-center rounded-[22px] border-[5px] border-white shadow-sticker ${tints[icon] ?? "bg-pale"} ${className}`}
      style={{ width: size, height: size, rotate: `${tilt}deg`, ...style }}
    >
      <img src={`/icons/md/${icon}.svg`} alt="" width={size * 0.56} height={size * 0.56} />
    </span>
  );
}

/**
 * The Pesto mascot as a tilted app-icon sticker: lime frame, white border.
 * Proportions scale with `size` (136 is the welcome/desktop size). `zoom`
 * crops in on the face, as on the how-it-works screen. `glow` adds the soft
 * lime haze behind it (welcome). Decorative.
 */
export function PestoSticker({
  tilt = -4,
  size = 136,
  zoom = 1,
  glow = false,
  className = "",
}: {
  /** Degrees, clockwise. */
  tilt?: number;
  size?: number;
  /** Scale of the mascot inside its frame; 1 shows the whole artwork. */
  zoom?: number;
  glow?: boolean;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={`block shrink-0 rounded-[25%] bg-white ${glow ? "shadow-sticker-glow" : "shadow-sticker"} ${className}`}
      // Border and frame are 5px and 9px at the 136px base size.
      style={{ width: size, height: size, padding: size * (5 / 136), rotate: `${tilt}deg` }}
    >
      <span className="block size-full rounded-[23%] bg-lime" style={{ padding: size * (9 / 136) }}>
        <span className="block size-full overflow-hidden rounded-[19.5%] bg-forest">
          <img
            src="/mascots/mascot-primary.svg"
            alt=""
            width={size}
            height={size}
            className="size-full origin-[55%_40%]"
            style={zoom === 1 ? undefined : { scale: zoom }}
          />
        </span>
      </span>
    </span>
  );
}

/** Four-point sparkle beside stickers. Colour comes from `className` (text-*). Decorative. */
export function Sparkle({
  size = 16,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <path d="M8 0c.5 4.6 2.9 7 8 8-5.1 1-7.5 3.4-8 8-.5-4.6-2.9-7-8-8 5.1-1 7.5-3.4 8-8Z" />
    </svg>
  );
}
