import { ATTRIBUTION_PARAMS } from "@/lib/attribution";

/**
 * Computers get the "continue on your phone" screen instead of the flow.
 * Tablets and foldables report touch points, so they keep the flow.
 */

export const DESKTOP_MIN_WIDTH = 1024;
export const FINE_POINTER_QUERY = "(pointer: fine)";

export type DeviceSignals = {
  maxTouchPoints: number;
  finePointer: boolean;
  width: number;
};

export function isDesktop({ maxTouchPoints, finePointer, width }: DeviceSignals): boolean {
  return maxTouchPoints === 0 && finePointer && width >= DESKTOP_MIN_WIDTH;
}

/**
 * The link the desktop screen hands to the phone: the current page with the
 * tracked attribution params (UTMs, click IDs) plus `via=desktop`, so the
 * visit keeps its source. Anything else is dropped to keep the QR code light.
 */
export function handoffUrl(href: string): string {
  const current = new URL(href);
  const url = new URL(current.origin + current.pathname);
  for (const key of ATTRIBUTION_PARAMS) {
    const value = current.searchParams.get(key);
    if (value) url.searchParams.set(key, value);
  }
  url.searchParams.set("via", "desktop");
  return url.toString();
}
