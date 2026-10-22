import type { Viewport } from "next";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
  themeColor: "#003F2E",
};

/**
 * Flow-only shell: soft-wash page background (full-bleed) and the flow column.
 * Phones (< 600px) use the full width; wider touch devices get a centred
 * column (§10). No site nav.
 */
export default function ApplyLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="bg-soft-wash min-h-dvh">
      <div className="mx-auto flex min-h-dvh w-full flex-col pb-[env(safe-area-inset-bottom)] min-[600px]:max-w-[440px]">
        {children}
      </div>
    </div>
  );
}
