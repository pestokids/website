"use client";

import { LinkrunnerScript } from "@linkrunner/web/next";
import { useEffect } from "react";
import { initAnalytics } from "@/lib/analytics";

/**
 * PostHog + Linkrunner, loaded once for the whole site (so the landing page
 * shares the same identity). The root layout only renders this when
 * analytics is enabled.
 */
export function Analytics({ linkrunnerToken }: { linkrunnerToken: string }) {
  useEffect(() => initAnalytics(), []);
  return <LinkrunnerScript token={linkrunnerToken} />;
}
