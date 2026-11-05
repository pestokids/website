/**
 * Small touches of feel for the /apply flow: a tap of vibration, a short
 * synthesized chirp and the "star burst" signal. All of them are skipped when
 * the user prefers reduced motion. Browser-only; call from event handlers.
 *
 * The chirp's sound, the star burst's sparkles and the confetti live in
 * celebrate.ts, a separate chunk: `preloadCelebration()` fetches it when the
 * email step or Received mounts, well before the submit tap needs it.
 */

type Celebration = typeof import("./celebrate");

let celebration: Celebration | undefined;
let loading: Promise<Celebration> | undefined;

function loadCelebration(): Promise<Celebration> {
  loading ??= import("./celebrate").then(
    (module) => (celebration = module),
    (error) => {
      // Try again next time (a flaky network shouldn't cost the confetti for good).
      loading = undefined;
      throw error;
    },
  );
  return loading;
}

/** Starts fetching the celebration code, if it isn't loaded yet. */
export function preloadCelebration() {
  loadCelebration().catch(() => {});
}

/** Runs `run` with the celebration code: right away once it's loaded, else as soon as it is. */
export function withCelebration(run: (celebration: Celebration) => void) {
  if (celebration) run(celebration);
  else loadCelebration().then(run, () => {});
}

function reducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** A 12 ms vibration on picks, a dropped goal and a valid email (where supported). */
export function buzz() {
  if (reducedMotion()) return;
  try {
    navigator.vibrate?.(12);
  } catch {
    // Some in-app browsers throw instead of ignoring it.
  }
}

let audio: AudioContext | undefined;

/**
 * Two rising sine blips (~0.2 s), made with Web Audio: no file to load.
 * Must start from the tap itself, or Safari keeps the audio context locked:
 * the context is created and resumed here, synchronously, and the blips play
 * on it right away (or the moment celebrate.ts arrives, if it hasn't yet).
 */
export function chirp() {
  if (reducedMotion()) return;
  try {
    const Ctx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const context = (audio ??= new Ctx());
    void context.resume();
    withCelebration(({ playChirp }) => playChirp(context));
  } catch {
    // No audio is fine.
  }
}

const BURST_EVENT = "pesto:star-burst";

/** Asks the progress bar's star to burst into sparkles (final submit). */
export function burstStar() {
  if (reducedMotion()) return;
  window.dispatchEvent(new Event(BURST_EVENT));
}

export function onStarBurst(listener: () => void): () => void {
  window.addEventListener(BURST_EVENT, listener);
  return () => window.removeEventListener(BURST_EVENT, listener);
}
