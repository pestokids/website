"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import { FINE_POINTER_QUERY, isDesktop } from "../_lib/desktop";
import { DesktopScreen } from "./desktop-screen";

// Decided once per page load: resizing the window never swaps screens.
let decided: boolean | undefined;

const subscribe = () => () => {};

const getSnapshot = () =>
  (decided ??= isDesktop({
    maxTouchPoints: navigator.maxTouchPoints,
    finePointer: window.matchMedia(FINE_POINTER_QUERY).matches,
    width: window.innerWidth,
  }));

/** Undecided on the server and during hydration. */
const getServerSnapshot = () => null;

/**
 * Shows the desktop screen on computers and `children` (the flow) everywhere
 * else. Renders nothing until the client has decided, so neither flashes.
 * The flow isn't mounted on desktop, so no draft or attribution is created.
 */
export function DesktopGate({ children }: { children: ReactNode }) {
  const desktop = useSyncExternalStore<boolean | null>(subscribe, getSnapshot, getServerSnapshot);
  if (desktop === null) return null;
  return desktop ? <DesktopScreen /> : children;
}
