import type { Viewport } from "next";
import "./apply.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
  // Phones: white, like the page. Wider screens: Forest night's green, so
  // the browser bar matches the backdrop (the desktop screen sets its own).
  // The wide entry comes first: the desktop screen retints the first meta.
  themeColor: [
    { media: "(min-width: 600px)", color: "#003f2e" },
    { media: "(max-width: 599.98px)", color: "#FFFFFF" },
  ],
};

/**
 * Flow-only shell: white on phones, the soft-wash background (full-bleed)
 * on wider screens. Pages put the flow in a <FlowColumn>, which draws Forest
 * night around the card on tablets and foldables; the desktop screen uses
 * the full width. Touch screens are deep green from the first paint, so
 * there's no flash of the wash before the flow mounts. No site nav.
 */
export default function ApplyLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="min-h-dvh bg-white min-[600px]:bg-soft-wash min-[600px]:any-pointer-coarse:bg-forest min-[600px]:any-pointer-coarse:bg-none">
      {children}
    </div>
  );
}
