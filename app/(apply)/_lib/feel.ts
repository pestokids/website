/**
 * Small touches of feel for the /apply flow: a tap of vibration, a short
 * synthesized chirp and the "star burst" signal. All of them are skipped when
 * the user prefers reduced motion. Browser-only; call from event handlers.
 */

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
 * Must start from the tap itself, or Safari keeps the audio context locked.
 */
export function chirp() {
  if (reducedMotion()) return;
  try {
    const Ctx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    audio ??= new Ctx();
    void audio.resume();
    const t = audio.currentTime;
    for (const [delay, from, to] of [
      [0, 1900, 2900],
      [0.11, 2300, 3400],
    ]) {
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(from, t + delay);
      osc.frequency.exponentialRampToValueAtTime(to, t + delay + 0.07);
      gain.gain.setValueAtTime(0, t + delay);
      gain.gain.linearRampToValueAtTime(0.18, t + delay + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, t + delay + 0.09);
      osc.connect(gain).connect(audio.destination);
      osc.start(t + delay);
      osc.stop(t + delay + 0.1);
    }
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
