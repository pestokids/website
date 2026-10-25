/**
 * Runs `fn` once the browser is idle, or after `timeout` ms at the latest.
 * Safari has no requestIdleCallback, so it gets a plain timeout of half
 * that. Returns a cancel function (for effect cleanups).
 */
export function onIdle(fn: () => void, timeout: number): () => void {
  if ("requestIdleCallback" in window) {
    const id = requestIdleCallback(fn, { timeout });
    return () => cancelIdleCallback(id);
  }
  const id = setTimeout(fn, timeout / 2);
  return () => clearTimeout(id);
}
