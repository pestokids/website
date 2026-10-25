/**
 * Pointer parallax for the landing scene. Writes --mx and --my (−1…1) on the
 * scene; each layer shifts by its depth (landing.css). With no pointer moving
 * (phones, or a still mouse) the scene drifts slowly on its own.
 *
 * Returns a cleanup function.
 */
export function startParallax(scene: HTMLElement): () => void {
  let raf = 0;
  let loop = 0;
  let tx = 0;
  let ty = 0;
  let idle = true;
  let idleTimer: ReturnType<typeof setTimeout> | undefined;
  const t0 = performance.now();

  const apply = () => {
    raf = 0;
    scene.style.setProperty("--mx", tx.toFixed(3));
    scene.style.setProperty("--my", ty.toFixed(3));
  };
  const schedule = () => {
    if (!raf) raf = requestAnimationFrame(apply);
  };

  const onMove = (e: PointerEvent) => {
    const r = scene.getBoundingClientRect();
    tx = ((e.clientX - r.left) / r.width - 0.5) * -2;
    ty = ((e.clientY - r.top) / r.height - 0.5) * -2;
    schedule();
    idle = false;
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => (idle = true), 2500);
  };
  const onLeave = () => {
    tx = 0;
    ty = 0;
    schedule();
  };

  const drift = (now: number) => {
    if (idle) {
      const t = (now - t0) / 1000;
      tx = Math.sin(t * 0.35) * 0.5;
      ty = Math.cos(t * 0.27) * 0.3;
      apply();
    }
    loop = requestAnimationFrame(drift);
  };

  scene.addEventListener("pointermove", onMove, { passive: true });
  scene.addEventListener("pointerleave", onLeave);
  loop = requestAnimationFrame(drift);

  return () => {
    scene.removeEventListener("pointermove", onMove);
    scene.removeEventListener("pointerleave", onLeave);
    cancelAnimationFrame(raf);
    cancelAnimationFrame(loop);
    clearTimeout(idleTimer);
  };
}
