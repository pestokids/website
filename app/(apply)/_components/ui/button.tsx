import type { ComponentProps, MouseEvent } from "react";
import { ArrowRightIcon } from "./icons";

type ButtonProps = ComponentProps<"button">;

const pill =
  "inline-flex h-[52px] items-center justify-center gap-1.5 rounded-full px-6 font-display text-[17px] leading-none font-extrabold whitespace-nowrap " +
  "transition-transform duration-150 ease-step motion-safe:enabled:active:scale-[0.97]";

/**
 * Primary pill: forest gradient, cream label. Full width unless `className`
 * says otherwise. Disabled: pale fill, muted label, no shadow.
 */
export function PrimaryButton({ className = "w-full", type = "button", ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={`${pill} bg-forest-grad text-cream shadow-primary disabled:bg-disabled disabled:bg-none disabled:text-muted disabled:shadow-none ${className}`}
      {...props}
    />
  );
}

/** Secondary pill: white with a field-rest outline, forest label. */
export function SecondaryButton({ className = "w-full", type = "button", ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={`${pill} border-[1.5px] border-field-rest bg-white text-forest shadow-unselected disabled:border-hairline disabled:bg-white/60 disabled:text-muted disabled:shadow-none ${className}`}
      {...props}
    />
  );
}

/**
 * 52px round submit with an arrow (email screen). No outer ring.
 * `busy` swaps the arrow for a cream spinner and swallows clicks, so a
 * double tap can't submit twice; the button keeps focus while busy.
 */
export function RoundSubmitButton({
  busy = false,
  disabled,
  onClick,
  className = "",
  type = "button",
  ...props
}: ButtonProps & { busy?: boolean; "aria-label": string }) {
  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    if (busy) {
      event.preventDefault();
      return;
    }
    onClick?.(event);
  };

  return (
    <button
      type={type}
      disabled={disabled && !busy}
      aria-disabled={busy || undefined}
      aria-busy={busy || undefined}
      onClick={handleClick}
      className={`grid size-[52px] shrink-0 place-items-center rounded-full bg-forest-grad text-cream shadow-primary transition-transform duration-150 ease-step disabled:bg-disabled disabled:bg-none disabled:text-muted disabled:shadow-none ${
        busy ? "cursor-progress" : "motion-safe:enabled:active:scale-[0.97]"
      } ${className}`}
      {...props}
    >
      {busy ? <Spinner /> : <ArrowRightIcon size={20} strokeWidth={2.2} />}
    </button>
  );
}

/** Cream ring spinner. With reduced motion it holds still (globals.css). */
export function Spinner({ size = 22 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="animate-spin [animation-duration:900ms]"
    >
      <circle cx="12" cy="12" r="9.5" stroke="currentColor" strokeOpacity="0.3" strokeWidth="2.5" />
      <path d="M12 2.5a9.5 9.5 0 0 1 9.5 9.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}
