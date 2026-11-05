import type { ReactNode } from "react";
import { card } from "./classes";
import { ForestNight } from "./forest-night";

/**
 * The flow column. Phones (< 600px) flex with the screen, up to 440px, on a
 * white page; the sticky footer sits at the bottom.
 *
 * Wider touch devices (foldables, tablets) get the column at exactly 402px,
 * the phone design width, as a white card centred over Forest night (styles
 * in apply.css, `.pz-card`). The card is as tall as a phone's view and its
 * screens scroll inside it. It also sets `--footer-lift`, which raises every
 * step's sticky footer so its bottom edge sits at most 830px below the top
 * of the column: on the reference phone (402×874 in the Instagram in-app
 * browser) the viewport above the home-indicator inset is 720px tall, and
 * the footer goes 110px below that, at 720 + 110 = 830px.
 */
export function FlowColumn({ children }: { children: ReactNode }) {
  return (
    <div className={card.stage}>
      <ForestNight className="max-[600px]:hidden" />
      <div
        className={`${card.card} mx-auto flex flex-col max-[600px]:min-h-dvh max-[600px]:w-full max-[600px]:max-w-[440px] max-[600px]:pb-[env(safe-area-inset-bottom)]`}
      >
        {children}
      </div>
    </div>
  );
}
