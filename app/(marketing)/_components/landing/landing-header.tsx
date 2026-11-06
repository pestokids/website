"use client";

import { track } from "../../_lib/track";
import { Header } from "./header";

/** The landing page's header, which reports link clicks and menu opens. */
export function LandingHeader() {
  return <Header onLinkClick={track.linkClicked} onMenuOpen={track.menuOpened} />;
}
