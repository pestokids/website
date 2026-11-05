import type { ComponentProps, CSSProperties, ReactNode } from "react";
import type { IconName } from "@/content/apply";
import { day } from "../classes";
import { CheckIcon } from "./icons";

type ToggleProps = Omit<ComponentProps<"button">, "aria-pressed" | "children"> & {
  pressed: boolean;
  children: ReactNode;
};

/**
 * Answer tiles: white with a 2px border and a 4px bottom edge; picked is a
 * pale lime fill with a lime border and edge. Pressing sinks the tile onto
 * its edge. Toggle buttons (`aria-pressed`); put them in a `role="group"`
 * labelled by the screen's question.
 */
const tile =
  "relative border-2 font-body text-forest transition-[transform,box-shadow,background-color,border-color] duration-100 " +
  "enabled:active:translate-y-[3px] disabled:opacity-40 " +
  "aria-pressed:border-day-lime-edge aria-pressed:bg-day-tint aria-pressed:shadow-[0_4px_0_var(--color-day-lime-edge)] " +
  "aria-[pressed=false]:border-day-border aria-[pressed=false]:bg-white aria-[pressed=false]:shadow-[0_4px_0_var(--color-day-border)] " +
  "enabled:aria-[pressed=false]:active:shadow-[0_1px_0_var(--color-day-border)]";

function Icon({ icon, size = 26 }: { icon: IconName; size?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- tiny static SVG
    <img src={`/icons/sm/${icon}.svg`} alt="" width={size} height={size} className="shrink-0" />
  );
}

/** The lime check badge in a picked tile's top-right corner. It pops in. */
function CheckBadge() {
  return (
    <span
      aria-hidden="true"
      className={`absolute -top-2 -right-2 grid size-6 place-items-center rounded-full bg-day-lime-deep text-white shadow-[0_0_0_3px_#fff] ${day.check}`}
    >
      <CheckIcon size={12} strokeWidth={2.8} />
    </span>
  );
}

/** Word pill (goals): icon and a lowercase word. 44px tall. */
export function Chip({
  pressed,
  icon,
  children,
  className = "",
  type = "button",
  ...props
}: ToggleProps & { icon?: IconName }) {
  return (
    <button
      type={type}
      aria-pressed={pressed}
      className={`${tile} inline-flex h-11 items-center gap-1.5 rounded-full pr-3 pl-[7px] text-sm leading-none font-extrabold whitespace-nowrap ${className}`}
      {...props}
    >
      {icon && <Icon icon={icon} />}
      {children}
    </button>
  );
}

/**
 * Option tile (after school): icon and a label of up to two lines, with a
 * check badge when picked. `wide` is the full-width "or" option, which shows
 * an empty radio ring until it's picked.
 */
export function OptionTile({
  pressed,
  icon,
  children,
  wide = false,
  className = "",
  type = "button",
  ...props
}: ToggleProps & { icon: IconName; wide?: boolean }) {
  return (
    <button
      type={type}
      aria-pressed={pressed}
      className={`${tile} flex items-center rounded-[15px] text-left font-extrabold ${
        wide ? "h-[52px] w-full gap-[9px] px-3 text-sm" : "h-14 gap-2 pr-2 pl-[9px] text-[13px] leading-[1.15]"
      } ${className}`}
      {...props}
    >
      <Icon icon={icon} />
      <span className="min-w-0 flex-1">{children}</span>
      {wide && !pressed && (
        <span aria-hidden="true" className="size-[22px] shrink-0 rounded-full border-2 border-day-ring" />
      )}
      <CheckBadge />
    </button>
  );
}

/**
 * Age tile: a big coloured number with the unit under it. Single-select;
 * the picked tile turns forest with a check badge. Fills its grid cell.
 */
export function AgeTile({
  pressed,
  unit,
  color,
  children,
  className = "",
  type = "button",
  ...props
}: ToggleProps & { unit: string; color: string }) {
  return (
    <button
      type={type}
      aria-pressed={pressed}
      className={`${tile} flex h-[90px] w-full flex-col items-center justify-center gap-0.5 rounded-[15px] ${className}`}
      {...props}
    >
      <span
        className="font-display text-[38px] leading-none font-extrabold"
        style={{ color: pressed ? "var(--color-forest)" : color } as CSSProperties}
      >
        {children}
      </span>
      <span className="text-xs leading-4 text-day-sub">{unit}</span>
      <CheckBadge />
    </button>
  );
}

/**
 * Small grey pill for suggestions: the email domain chips and the names
 * nudge's "Yes, that's right". 32px to look at, 44px to tap. `highlighted`
 * marks the one being suggested.
 */
export function SuggestionChip({
  highlighted = false,
  className = "",
  type = "button",
  ...props
}: ComponentProps<"button"> & { highlighted?: boolean }) {
  return (
    <button
      type={type}
      className={`relative inline-flex h-8 items-center rounded-full px-[11px] text-[13px] leading-none font-extrabold whitespace-nowrap text-forest transition-transform duration-100 before:absolute before:-inset-y-1.5 before:inset-x-0 before:content-[''] active:translate-y-px ${
        highlighted ? "border-[1.5px] border-lime-deep bg-day-tint" : "border-[1.5px] border-transparent bg-day-tile"
      } ${className}`}
      {...props}
    />
  );
}
