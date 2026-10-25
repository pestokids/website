"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { cta } from "@/content/landing";
import { withAttribution } from "@/lib/attribution";

// The query string never changes while the page is open.
const subscribe = () => () => {};

/**
 * The one button: /apply, carrying the visit's UTMs, click IDs and `via`.
 * The prerendered HTML links to plain /apply; hydration adds the query.
 */
export function GetInEarly() {
  const search = useSyncExternalStore(
    subscribe,
    () => window.location.search,
    () => "",
  );
  return (
    <Link className="cta" href={withAttribution(cta.href, search)}>
      {cta.label}
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M5 12h14M13 6l6 6-6 6" />
      </svg>
    </Link>
  );
}
