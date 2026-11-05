"use client";

import { useId, useRef, type ComponentProps, type ReactNode } from "react";
import { CheckIcon, CloseIcon } from "./icons";

type InputProps = Omit<ComponentProps<"input">, "value" | "children" | "className">;

export type TextFieldProps = InputProps & {
  label: ReactNode;
  value: string;
  /** Error copy under the field. Turns the border and ring orange and is announced. */
  error?: ReactNode;
  /** Helper under the field when there's no error (e.g. the privacy line). */
  hint?: ReactNode;
  /** Shows the lime check badge at the end of the field. */
  valid?: boolean;
  /** Shows a clear (×) button while there's text. Focus returns to the input. */
  onClear?: () => void;
  /** Accessible name of the clear button. Required with `onClear`. */
  clearLabel?: string;
  /** Ghost completion drawn right after the typed text, at 35% (e.g. "@gmail.com"). */
  ghost?: string;
  /** Extra classes on the outer wrapper. */
  className?: string;
};

/**
 * 56px text field with the label above, in the tiles' style: a 2px border
 * and a 3px bottom edge. States: rest (grey), focus (lime border and edge on
 * a pale lime fill), error (peach border and fill; the message shows in a
 * peach note, announced politely), valid (check badge), clear (×), ghost
 * completion. Read-only drops back to the rest look (e.g. while submitting).
 *
 * The message slot is always mounted (and never display:none), so screen
 * readers pick up the error the moment it appears.
 */
export function TextField({
  label,
  value,
  error,
  hint,
  valid = false,
  onClear,
  clearLabel,
  ghost,
  className = "",
  id,
  readOnly,
  ref,
  ...inputProps
}: TextFieldProps) {
  const autoId = useId();
  const inputId = id ?? `${autoId}-input`;
  const messageId = `${autoId}-message`;
  const innerRef = useRef<HTMLInputElement | null>(null);

  const hasError = Boolean(error);
  const showClear = Boolean(onClear) && value.length > 0 && !readOnly;
  const showValid = valid && !hasError;
  const message = error ?? hint;

  const setRef = (node: HTMLInputElement | null) => {
    innerRef.current = node;
    if (typeof ref === "function") ref(node);
    else if (ref) ref.current = node;
  };

  // Border, edge and fill. Error wins; read-only never shows focus.
  const frame = hasError
    ? "border-day-error-edge bg-day-error-fill shadow-[0_3px_0_var(--color-day-error-edge)]"
    : readOnly
      ? "border-day-border bg-white shadow-[0_3px_0_var(--color-day-border)]"
      : "border-day-border bg-white shadow-[0_3px_0_var(--color-day-border)] focus-within:border-day-lime-edge focus-within:bg-day-tint focus-within:shadow-[0_3px_0_var(--color-day-lime-edge)]";

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label htmlFor={inputId} className="text-[13px] leading-[18px] font-extrabold text-day-sub">
        {label}
      </label>

      <div
        className={`relative flex h-14 items-center rounded-[13px] border-2 transition-[background-color,border-color,box-shadow] duration-150 ${frame}`}
      >
        {ghost && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 left-0 flex items-center overflow-hidden pl-3.5 text-lg font-bold whitespace-pre"
          >
            <span className="invisible">{value}</span>
            <span className="text-forest/35">{ghost}</span>
          </div>
        )}
        <input
          ref={setRef}
          id={inputId}
          value={value}
          readOnly={readOnly}
          aria-invalid={hasError || undefined}
          aria-describedby={messageId}
          className="h-full min-w-0 flex-1 rounded-[11px] bg-transparent px-3.5 text-lg leading-6 font-bold text-forest outline-none placeholder:font-semibold placeholder:text-forest/35"
          {...inputProps}
        />
        {showValid && (
          <span className="mr-3 grid size-7 shrink-0 place-items-center rounded-full bg-day-lime-deep text-white">
            <CheckIcon size={15} />
          </span>
        )}
        {showClear && (
          <button
            type="button"
            aria-label={clearLabel}
            onClick={() => {
              onClear?.();
              innerRef.current?.focus();
            }}
            className="mr-1.5 grid size-11 shrink-0 place-items-center rounded-full"
          >
            <span className="grid size-6 place-items-center rounded-full bg-forest/20 text-white">
              <CloseIcon size={12} strokeWidth={2.6} />
            </span>
          </button>
        )}
      </div>

      <p
        id={messageId}
        aria-live="polite"
        className={`text-[13px] leading-[18px] empty:-mt-1.5 ${
          hasError
            ? "mt-1 rounded-xl bg-day-peach px-3 py-2.5 font-bold text-day-orange-text"
            : "font-semibold text-day-sub"
        }`}
      >
        {message}
      </p>
    </div>
  );
}
