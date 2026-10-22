import type { ComponentProps, ReactNode } from "react";
import type { IconName } from "@/content/apply";
import { CheckIcon } from "./icons";

const press = "transition-transform duration-150 ease-step motion-safe:enabled:active:scale-[0.97]";

type ToggleProps = Omit<ComponentProps<"button">, "aria-pressed" | "children"> & {
  pressed: boolean;
  children: ReactNode;
};

/**
 * Option chip (goals, after school). A toggle button: `aria-pressed`, lime
 * when on, white with a hairline when off, ≈50% when disabled. The icon
 * sits on a cream badge. Put chips in a `role="group"` labelled by the
 * screen's headline.
 */
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
      className={`flex h-11 items-center gap-2 rounded-full border font-display text-[17px] leading-none font-bold whitespace-nowrap text-forest disabled:opacity-50 ${
        icon ? "pr-4 pl-1.5" : "px-4"
      } ${
        pressed
          ? "border-transparent bg-lime-grad shadow-selected"
          : "border-hairline bg-white shadow-unselected"
      } ${press} ${className}`}
      {...props}
    >
      {icon && (
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-cream">
          {/* eslint-disable-next-line @next/next/no-img-element -- tiny static SVG */}
          <img src={`/icons/sm/${icon}.svg`} alt="" width={24} height={24} />
        </span>
      )}
      {children}
    </button>
  );
}

/**
 * Small text pill for suggestions: the email domain chips and the
 * "Did you mean" fix. `highlighted` marks the one being suggested.
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
      className={`inline-flex h-10 items-center gap-1.5 rounded-full border-[1.5px] px-3.5 text-[17px] leading-none font-medium whitespace-nowrap text-forest ${
        highlighted ? "border-lime-deep bg-lime/15" : "border-hairline bg-white"
      } ${press} ${className}`}
      {...props}
    />
  );
}

/**
 * Age tile: big number with a unit under it. Single-select toggle; the
 * selected tile is lime with a forest check badge. Fills its grid cell.
 */
export function AgeTile({
  pressed,
  unit,
  children,
  className = "",
  type = "button",
  ...props
}: ToggleProps & { unit: string }) {
  return (
    <button
      type={type}
      aria-pressed={pressed}
      className={`relative flex h-20 w-full flex-col items-center justify-center rounded-[20px] border ${
        pressed
          ? "border-transparent bg-lime-grad shadow-selected"
          : "border-hairline bg-white shadow-unselected"
      } ${press} ${className}`}
      {...props}
    >
      <span className="font-display text-[30px] leading-8 font-extrabold">{children}</span>
      <span className={`text-[15px] leading-5 ${pressed ? "text-forest/75" : "text-muted"}`}>
        {unit}
      </span>
      {pressed && (
        <span className="absolute top-1.5 right-1.5 grid size-5 place-items-center rounded-full bg-forest text-lime">
          <CheckIcon size={12} strokeWidth={2.8} />
        </span>
      )}
    </button>
  );
}
