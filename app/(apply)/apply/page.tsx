import type { Metadata } from "next";
import { Suspense } from "react";
import { meta } from "@/content/apply";
import { ApplyFlow } from "../_components/apply-flow";
import { DesktopGate } from "../_components/desktop-gate";
import { FlowColumn } from "../_components/flow-column";

export const metadata: Metadata = {
  title: meta.title,
  description: meta.description,
  robots: { index: false, follow: false },
  openGraph: {
    type: "website",
    url: meta.url,
    siteName: meta.siteName,
    title: meta.title,
    description: meta.description,
  },
  twitter: { card: "summary_large_image" },
};

export default function ApplyPage() {
  // Client-side only: computers get the desktop screen, everything else the
  // flow (which depends on localStorage and the URL).
  return (
    <Suspense fallback={null}>
      <DesktopGate>
        <FlowColumn>
          <ApplyFlow />
        </FlowColumn>
      </DesktopGate>
    </Suspense>
  );
}
