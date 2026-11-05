"use client";

import { useEffect, useState, type ReactNode } from "react";
import { day } from "./classes";
import { StickyFooter } from "./ui/sticky-footer";

// The first screen of a page load just appears; later ones slide in.
let firstScreenShown = false;

/** The entrance class for a screen: none on the first screen of a page load. */
export function useEntrance(): string {
  const [entrance] = useState(() => (firstScreenShown ? day.enter : ""));
  useEffect(() => {
    firstScreenShown = true;
  }, []);
  return entrance;
}

/**
 * Shell for every step: top-aligned content and the primary action in a
 * sticky footer. Slides in from the right when it appears (not on the first
 * screen of a page load). On wide screens the footer's lift comes from
 * <FlowColumn>.
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
  const entrance = useEntrance();
  return (
    <section data-step={name} className={`flex flex-1 flex-col ${entrance} ${className}`}>
      {children}
      {footer && <StickyFooter>{footer}</StickyFooter>}
    </section>
  );
}

/**
 * The question screens' layout under the progress bar: Pesto and his bubble
 * (`says`), the question, its sub line, then the answers (`children`). The
 * main button is the footer, pinned at the bottom.
 */
export function QuestionScreen({
  name,
  says,
  eyebrow,
  question,
  questionId,
  sub,
  children,
  footer,
}: {
  name: string;
  says: ReactNode;
  /** Small caps line above the question (age screens). */
  eyebrow?: string;
  question: ReactNode;
  questionId?: string;
  sub?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <StepScreen name={name} footer={footer}>
      {says}
      {eyebrow && (
        <p className="mt-4 -mb-3 text-xs leading-4 font-extrabold tracking-[0.8px] text-lime-text uppercase">
          {eyebrow}
        </p>
      )}
      <h1
        id={questionId}
        className="mt-4 font-display text-[25px] leading-[1.15] font-extrabold tracking-[-0.3px] text-balance"
      >
        {question}
      </h1>
      {sub && <div className="mt-1 text-sm leading-5 text-day-sub">{sub}</div>}
      <div className="mt-3.5 flex flex-col">{children}</div>
    </StepScreen>
  );
}
