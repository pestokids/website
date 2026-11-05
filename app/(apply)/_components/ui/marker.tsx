import type { CSSProperties, ReactNode } from "react";
import { day } from "../classes";

/**
 * Soft lime highlight behind a word (kids' names in headings, "storybook" on
 * welcome): #d9f78a on the lower 42% of the line, 6px corners. It sweeps in
 * left to right once, `delay` seconds after the screen appears; under reduced
 * motion it's already drawn.
 */
export function Marker({ children, delay = 0.35 }: { children: ReactNode; delay?: number }) {
  return (
    <span className={day.marker} style={{ "--marker-delay": `${delay}s` } as CSSProperties}>
      {children}
    </span>
  );
}
