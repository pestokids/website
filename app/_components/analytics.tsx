"use client";

import { LinkrunnerScript } from "@linkrunner/web/next";
import { useEffect, useState } from "react";
import { initAnalytics } from "@/lib/analytics";
import { onIdle } from "@/lib/idle";

/** Longest wait for an idle moment before loading anyway. */
const IDLE_TIMEOUT_MS = 2000;

/**
 * PostHog + Linkrunner, loaded once for the whole site (so the landing page
 * shares the same identity). The root layout only renders this when
 * analytics is enabled.
 *
 * Both load once the page is idle, after first paint, so neither competes
 * with the scene and fonts. Events fired before then are queued (lib/
 * analytics). Linkrunner records its visit when its script runs, from the
 * URL and referrer at that moment; the landing page keeps its URL until the
 * visitor leaves, and the button carries the UTMs on to /apply.
 */
export function Analytics({ linkrunnerToken }: { linkrunnerToken: string }) {
  const [idle, setIdle] = useState(false);
  useEffect(
    () =>
      onIdle(() => {
        initAnalytics();
        setIdle(true);
      }, IDLE_TIMEOUT_MS),
    [],
  );
  // Rendered only once idle, which also keeps its preload out of the server HTML.
  return idle ? <LinkrunnerScript token={linkrunnerToken} /> : null;
}
