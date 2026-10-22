import type { ReactNode } from "react";

/**
 * Temporary scaffolding: each step renders through this until its real
 * screen is built. Shows the step name and its state so routing can be
 * tested end to end.
 */
export function StepPlaceholder({
  name,
  state,
  children,
  footer,
}: {
  name: string;
  /** Short description of the current state, e.g. "2 of 3 picked". */
  state?: string;
  children?: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <section className="flex flex-1 flex-col gap-4 pt-4" data-step={name}>
      <p className="text-xs font-bold tracking-[0.8px] text-muted uppercase">
        Placeholder · {name}
        {state ? ` · ${state}` : ""}
      </p>
      {children}
      <div className="mt-auto flex flex-col gap-3 pt-6 pb-6">{footer}</div>
    </section>
  );
}

export function Headline({ lines }: { lines: readonly string[] }) {
  return (
    <h1 className="font-display text-[28px] leading-8 font-extrabold">
      {lines.map((line, i) => (
        <span key={i} className="block">
          {line}
        </span>
      ))}
    </h1>
  );
}

export function PrimaryButton({
  children,
  disabled,
  onClick,
}: {
  children: ReactNode;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="h-[52px] w-full rounded-full bg-forest-grad font-display text-[17px] font-extrabold text-cream shadow-primary disabled:bg-disabled disabled:bg-none disabled:text-muted disabled:shadow-none"
    >
      {children}
    </button>
  );
}

export function SecondaryButton({
  children,
  disabled,
  onClick,
}: {
  children: ReactNode;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="h-[52px] w-full rounded-full border border-hairline bg-white font-display text-[17px] font-extrabold shadow-unselected disabled:opacity-50"
    >
      {children}
    </button>
  );
}

export function Chip({
  children,
  pressed,
  disabled,
  onClick,
  icon,
}: {
  children: ReactNode;
  pressed: boolean;
  disabled?: boolean;
  onClick: () => void;
  icon?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      disabled={disabled}
      onClick={onClick}
      className={`flex h-11 items-center gap-2 rounded-full pr-4 pl-1.5 font-display text-[17px] font-bold transition-transform active:scale-[0.97] disabled:opacity-50 ${
        pressed ? "bg-lime-grad shadow-selected" : "border border-hairline bg-white shadow-unselected"
      }`}
    >
      {icon && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/icons/sm/${icon}.svg`}
          alt=""
          width={28}
          height={28}
          className="rounded-full bg-cream p-0.5"
        />
      )}
      {children}
    </button>
  );
}
