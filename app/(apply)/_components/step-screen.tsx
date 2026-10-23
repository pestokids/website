import type { ReactNode } from "react";
import { StickyFooter } from "./ui/sticky-footer";

/**
 * Shell for every step: top-aligned content and the primary action in a
 * sticky footer. On wide screens the footer's lift comes from <FlowColumn>.
 */
export function StepScreen({
  name,
  children,
  footer,
  className = "",
}: {
  /** The step's name, for tests and debugging (`data-step`). */
  name: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  return (
    <section
      data-step={name}
      className={`flex flex-1 flex-col pt-3 ${className}`}
    >
      {children}
      {footer && <StickyFooter>{footer}</StickyFooter>}
    </section>
  );
}
