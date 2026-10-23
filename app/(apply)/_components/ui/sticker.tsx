/* eslint-disable @next/next/no-img-element -- tiny static SVGs */
import type { CSSProperties } from "react";
import type { IconName } from "@/content/apply";

/** Tile colour per icon. Anything not listed sits on pale. */
const tints: Partial<Record<IconName, string>> = {
  diya: "bg-sticker-peach",
  moon: "bg-pale",
  bow: "bg-sticker-butter",
  deer: "bg-sticker-lime",
};

const stickerShadow = "shadow-[0_10px_22px_-8px_rgb(0_63_46/0.22),0_2px_4px_rgb(0_63_46/0.06)]";

/**
 * Tilted icon sticker: an md icon on a tinted tile with a white border
 * (welcome, desktop corners). Decorative.
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
      className={`grid place-items-center rounded-[22px] border-[5px] border-white ${tints[icon] ?? "bg-pale"} ${stickerShadow} ${className}`}
      style={{ width: size, height: size, rotate: `${tilt}deg`, ...style }}
    >
      <img src={`/icons/md/${icon}.svg`} alt="" width={size * 0.56} height={size * 0.56} />
    </span>
  );
}

/** The Pesto mascot as a tilted app-icon sticker: lime frame, white border. Decorative. */
export function PestoSticker({
  tilt = -4,
  size = 136,
  className = "",
}: {
  tilt?: number;
  size?: number;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={`block rounded-[34px] bg-white p-[5px] ${stickerShadow} ${className}`}
      style={{ width: size, height: size, rotate: `${tilt}deg` }}
    >
      <span className="block size-full rounded-[29px] bg-lime p-[9px]">
        <img
          src="/mascots/mascot-primary.svg"
          alt=""
          width={size}
          height={size}
          className="size-full rounded-[21px]"
        />
      </span>
    </span>
  );
}
