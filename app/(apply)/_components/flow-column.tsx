import type { ReactNode } from "react";

/**
 * The flow column. Phones (< 600px) flex with the screen, up to 440px; wider
 * touch devices (foldables, tablets) get a centred column of exactly 402px,
 * the phone design width, over the full-bleed page background.
 *
 * Wide screens also lift every step's sticky footer (`--footer-lift`) so it
 * sits 110px below its phone position, measured from the top of the column.
 * On the reference phone (402×874 in the Instagram in-app browser) the
 * viewport above the home-indicator inset is 720px tall, so the footer's
 * bottom edge goes at 720 + 110 = 830px. Phones keep it at the bottom.
 */
export function FlowColumn({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[440px] flex-col pb-[env(safe-area-inset-bottom)] min-[600px]:max-w-[402px] min-[600px]:[--footer-lift:max(0px,calc(100dvh-env(safe-area-inset-bottom)-830px))]">
      {children}
    </div>
  );
}
