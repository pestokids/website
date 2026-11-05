import type { ComponentProps, MouseEvent } from "react";

type ButtonProps = ComponentProps<"button">;

/**
 * Chunky button: 54px tall with a 4px darker edge underneath. Pressing sinks
 * it onto its edge.
 */
const chunky =
  "inline-flex h-[54px] items-center justify-center gap-2.5 rounded-[15px] px-6 font-display text-lg leading-none font-extrabold whitespace-nowrap " +
  "transition-[transform,box-shadow,opacity] duration-100 ease-out enabled:active:translate-y-[3px]";

/**
 * Primary: lime with a deeper lime edge, forest label. Full width unless
 * `className` says otherwise. Disabled: faded to 45%.
 */
export function PrimaryButton({ className = "w-full", type = "button", ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={`${chunky} bg-day-lime text-forest shadow-[0_4px_0_var(--color-day-lime-deep)] enabled:active:shadow-[0_1px_0_var(--color-day-lime-deep)] disabled:opacity-45 ${className}`}
      {...props}
    />
  );
}

/** Secondary: white with a grey border and edge, forest label. */
export function SecondaryButton({ className = "w-full", type = "button", ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={`${chunky} border-2 border-day-border bg-white px-4 text-forest shadow-[0_4px_0_var(--color-day-border)] enabled:active:shadow-[0_1px_0_var(--color-day-border)] disabled:opacity-45 ${className}`}
      {...props}
    />
  );
}

/**
 * The email screen's submit: a primary button that can be `busy`. Busy shows
 * a spinner before the label and swallows clicks, so a double tap can't
 * submit twice; the button keeps focus while busy.
 */
export function SubmitButton({
  busy = false,
  disabled,
  onClick,
  className = "w-full",
  type = "button",
  children,
  ...props
}: ButtonProps & { busy?: boolean }) {
  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    if (busy) {
      event.preventDefault();
      return;
    }
    onClick?.(event);
  };

  return (
    <PrimaryButton
      type={type}
      disabled={disabled && !busy}
      aria-disabled={busy || undefined}
      aria-busy={busy || undefined}
      onClick={handleClick}
      className={`${busy ? "cursor-progress" : ""} ${className}`}
      {...props}
    >
      {busy && <Spinner size={20} />}
      {children}
    </PrimaryButton>
  );
}

/** Ring spinner in the current colour. With reduced motion it holds still (globals.css). */
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
