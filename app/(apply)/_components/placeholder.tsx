import type { ReactNode } from "react";
import { StickyFooter } from "./ui/sticky-footer";

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
      {footer && <StickyFooter>{footer}</StickyFooter>}
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
