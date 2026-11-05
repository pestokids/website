"use client";

import { createElement, useSyncExternalStore, type ComponentType, type ReactNode } from "react";
import { FINE_POINTER_QUERY, isDesktop } from "../_lib/desktop";

// Decided once per page load: resizing the window never swaps screens.
let decided: boolean | undefined;

/**
 * The desktop screen (and the QR code library) is its own chunk, fetched only
 * once the gate has decided "desktop": phones and tablets never download it.
 * Loaded by hand rather than with lazy() and Suspense, which would hold the
 * screen back a further ~300 ms after the code arrives (React throttles
 * Suspense reveals).
 */
let DesktopScreen: ComponentType | undefined;
let loading: Promise<void> | undefined;
const listeners = new Set<() => void>();

function loadDesktopScreen() {
  loading ??= import("./desktop-screen").then(
    (module) => {
      DesktopScreen = module.DesktopScreen;
      listeners.forEach((listener) => listener());
    },
    (error: unknown) => {
      loading = undefined;
      console.warn("The desktop screen failed to load", error);
    },
  );
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

type Shown = "flow" | "desktop" | null;

/** The flow, or the desktop screen once its code is in (null until then). */
const getSnapshot = (): Shown => {
  decided ??= isDesktop({
    maxTouchPoints: navigator.maxTouchPoints,
    finePointer: window.matchMedia(FINE_POINTER_QUERY).matches,
    width: window.innerWidth,
  });
  if (!decided) return "flow";
  if (!DesktopScreen) loadDesktopScreen();
  return DesktopScreen ? "desktop" : null;
};

/** Undecided on the server and during hydration. */
const getServerSnapshot = (): Shown => null;

/**
 * Shows the desktop screen on computers and `children` (the flow) everywhere
 * else. Renders nothing until the client has decided, and on computers until
 * the desktop screen's code has loaded, so neither flashes.
 * The flow isn't mounted on desktop, so no draft or attribution is created.
 */
export function DesktopGate({ children }: { children: ReactNode }) {
  const shown = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  if (shown === "flow") return children;
  return shown === "desktop" && DesktopScreen ? createElement(DesktopScreen) : null;
}
