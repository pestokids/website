/**
 * Restarts a one-shot CSS animation class on `el` (squish, wiggle, …) and
 * removes it once it's done. Skipped under reduced motion.
 */
export function replayClass(el: Element | null | undefined, cls: string, ms = 500) {
  if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  el.classList.remove(cls);
  void (el as HTMLElement).offsetWidth;
  el.classList.add(cls);
  setTimeout(() => el.classList.remove(cls), ms);
}
