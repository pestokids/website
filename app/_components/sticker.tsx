/* eslint-disable @next/next/no-img-element -- tiny static SVGs */
import type { CSSProperties } from "react";
import type { IconName } from "@/content/apply";

/** An md icon, or "delete": a trash can drawn inline (there's no md icon for it yet). */
export type StickerIcon = IconName | "delete";

export type StickerTint = "peach" | "butter" | "lime" | "pale";

const tintClasses: Record<StickerTint, string> = {
  peach: "bg-sticker-peach",
  butter: "bg-sticker-butter",
  lime: "bg-sticker-lime",
  pale: "bg-pale",
};

/** Tile colour per icon, unless the caller picks one. Anything not listed sits on pale. */
const tints: Partial<Record<StickerIcon, StickerTint>> = {
  diya: "peach",
  moon: "pale",
  bow: "butter",
  deer: "lime",
  book: "butter",
  bubble: "lime",
  dice: "peach",
  delete: "peach",
};

/** A stroked trash can in the deep orange, sized like the md icons. */
function TrashIcon({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--color-day-orange-text)"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M4 7h16M9.5 7V5.2c0-.7.5-1.2 1.2-1.2h2.6c.7 0 1.2.5 1.2 1.2V7M6.5 7l.8 11.6c.1 1 .9 1.9 2 1.9h5.4c1.1 0 1.9-.9 2-1.9L17.5 7M10.2 11v5.5M13.8 11v5.5" />
    </svg>
  );
}

/**
 * Tilted icon sticker: an md icon on a tinted tile with a white border
 * (welcome, desktop corners, how it works, the legal pages' short version).
 * The corner radius scales with `size`. Decorative.
 */
export function IconSticker({
  icon,
  tint,
  tilt = 0,
  size = 72,
  border = 5,
  className = "",
  style,
}: {
  icon: StickerIcon;
  /** Tile colour. Defaults to the icon's own. */
  tint?: StickerTint;
  /** Degrees, clockwise. */
  tilt?: number;
  size?: number;
  /** White border width, in px. */
  border?: number;
  className?: string;
  style?: CSSProperties;
}) {
  const art = size * 0.56;
  return (
    <span
      aria-hidden="true"
      className={`grid shrink-0 place-items-center border-solid border-white shadow-sticker ${tintClasses[tint ?? tints[icon] ?? "pale"]} ${className}`}
      style={{
        width: size,
        height: size,
        borderWidth: border,
        borderRadius: size * (22 / 72),
        rotate: `${tilt}deg`,
        ...style,
      }}
    >
      {icon === "delete" ? (
        <TrashIcon size={art} />
      ) : (
        <img src={`/icons/md/${icon}.svg`} alt="" width={art} height={art} />
      )}
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
