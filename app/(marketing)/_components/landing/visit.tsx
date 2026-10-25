"use client";

import { useEffect, useRef } from "react";
import { readAttribution } from "@/lib/attribution";
import { saveFirstTouch } from "@/lib/first-touch";
import { markLandingSeen, track } from "../../_lib/track";
import { TALL_MEDIA } from "./media";

/**
 * On load: saves the visit as the site-wide first touch (if it has a source
 * and none is saved yet), so /apply keeps it even when opened without the
 * query, then sends landing_viewed. Renders nothing.
 */
export function LandingVisit() {
  const viewed = useRef(false);
  useEffect(() => {
    if (viewed.current) return;
    viewed.current = true;
    const landingUrl = window.location.href;
    const referrer = document.referrer;
    saveFirstTouch(readAttribution(landingUrl, referrer));
    track.viewed({
      landingUrl,
      referrer,
      tall: matchMedia(TALL_MEDIA).matches,
      width: window.innerWidth,
      height: window.innerHeight,
      returning: markLandingSeen(),
    });
  }, []);
  return null;
}
