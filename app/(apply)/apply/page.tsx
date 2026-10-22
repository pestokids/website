import type { Metadata } from "next";
import { Suspense } from "react";
import { meta } from "@/content/apply";
import { ApplyFlow } from "../_components/apply-flow";

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
  // The flow renders client-side only (it depends on localStorage and the URL).
  return (
    <Suspense fallback={null}>
      <ApplyFlow />
    </Suspense>
  );
}
