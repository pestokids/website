import type { Viewport } from "next";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
  themeColor: "#003F2E",
};

/**
 * Flow-only shell: soft-wash page background (full-bleed). Pages put the flow
 * in a <FlowColumn>; the desktop screen uses the full width. No site nav.
 */
export default function ApplyLayout({ children }: LayoutProps<"/">) {
  return <div className="bg-soft-wash min-h-dvh">{children}</div>;
}
