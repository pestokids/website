/**
 * localStorage persistence for the draft and the submitted record.
 * Every call tolerates storage being unavailable (private modes, in-app
 * browsers with storage blocked): reads return null, writes are dropped.
 */
import { sanitizeDraft, sanitizeSubmitted, type Draft, type Submitted } from "./flow";

export const DRAFT_KEY = "pesto_ff_draft_v1";
export const SUBMITTED_KEY = "pesto_ff_submitted_v1";

export type KeyValueStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function browserStorage(): KeyValueStorage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

function readJson(storage: KeyValueStorage | null, key: string): unknown {
  try {
    const raw = storage?.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeJson(storage: KeyValueStorage | null, key: string, value: unknown) {
  try {
    storage?.setItem(key, JSON.stringify(value));
  } catch {
    // Quota or disabled storage: the flow still works for this page view.
  }
}

export function loadDraft(storage = browserStorage()): Draft | null {
  return sanitizeDraft(readJson(storage, DRAFT_KEY));
}

export function saveDraft(draft: Draft, storage = browserStorage()) {
  writeJson(storage, DRAFT_KEY, draft);
}

export function loadSubmitted(storage = browserStorage()): Submitted | null {
  return sanitizeSubmitted(readJson(storage, SUBMITTED_KEY));
}

/** Stores the submitted record and clears the draft. */
export function saveSubmitted(submitted: Submitted, storage = browserStorage()) {
  writeJson(storage, SUBMITTED_KEY, submitted);
  try {
    storage?.removeItem(DRAFT_KEY);
  } catch {
    // ignore
  }
}
