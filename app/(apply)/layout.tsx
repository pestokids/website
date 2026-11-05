import type { Viewport } from "next";
import "./apply.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
  themeColor: "#FFFFFF",
};

/**
 * Flow-only shell: white on phones, the soft-wash background (full-bleed)
 * on wider screens (tablets, foldables, desktop). Pages put the flow in a
 * <FlowColumn>; the desktop screen uses the full width. No site nav.
 */
export default function ApplyLayout({ children }: LayoutProps<"/">) {
  return <div className="min-h-dvh bg-white min-[600px]:bg-soft-wash">{children}</div>;
}
