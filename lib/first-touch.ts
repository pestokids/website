/**
 * The visitor's first touch, kept site-wide so it outlives the page it
 * landed on (spec §11.1: the first-touch rule starts on the landing page).
 *
 * The landing page saves it; /apply's new draft takes it before reading its
 * own URL. So a visitor who lands on /?utm_source=… and opens /apply later,
 * or through a link that lost the query, keeps the source they came from.
 * Only visits that say where they came from are saved, and an earlier first
 * touch is never overwritten. Storage failures are ignored.
 */
import {
  ATTRIBUTION_PARAMS,
  classifyAttribution,
  type Attribution,
} from "./attribution";

export const FIRST_TOUCH_KEY = "pesto_first_touch_v1";

const KEYS = [...ATTRIBUTION_PARAMS, "landing_url", "referrer"] as const;

export type KeyValueStorage = Pick<Storage, "getItem" | "setItem">;

function browserStorage(): KeyValueStorage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

/**
 * Whether a visit says where it came from: a UTM, a click ID, or an external
 * referrer. `via` alone doesn't count: it never changes the source, so an
 * investor link mustn't block a later visit that has one.
 */
export function hasSource(a: Attribution): boolean {
  return (
    ATTRIBUTION_PARAMS.some((key) => key !== "via" && a[key]) ||
    classifyAttribution(a).sourceType !== "direct"
  );
}

/** Saves `attribution` as the first touch, unless it has no source or one is already saved. */
export function saveFirstTouch(attribution: Attribution, storage = browserStorage()): boolean {
  if (!storage || !hasSource(attribution)) return false;
  try {
    if (storage.getItem(FIRST_TOUCH_KEY)) return false;
    storage.setItem(FIRST_TOUCH_KEY, JSON.stringify(attribution));
    return true;
  } catch {
    return false;
  }
}

/**
 * The saved first touch, or null. Storage is untrusted: only known string
 * fields are kept (the server trims and caps them again on submit).
 */
export function loadFirstTouch(storage = browserStorage()): Attribution | null {
  let value: unknown;
  try {
    const raw = storage?.getItem(FIRST_TOUCH_KEY);
    value = raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
  if (typeof value !== "object" || value === null) return null;
  const out: Attribution = {};
  for (const key of KEYS) {
    const v = (value as Record<string, unknown>)[key];
    if (typeof v === "string" && v.trim()) out[key] = v.trim();
  }
  return hasSource(out) ? out : null;
}
