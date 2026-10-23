import type { ReactNode } from "react";

/**
 * The flow column. Phones (< 600px) use the full width; wider touch devices
 * get a centred column (§10).
 */
export function FlowColumn({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex min-h-dvh w-full flex-col pb-[env(safe-area-inset-bottom)] min-[600px]:max-w-[440px]">
      {children}
    </div>
  );
}
