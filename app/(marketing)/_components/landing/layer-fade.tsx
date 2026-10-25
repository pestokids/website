"use client";

import { useEffect } from "react";

/**
 * Fades in the scene layers still loading when the page hydrates; layers
 * already in stay as they are. Before hydration a late layer simply appears
 * over the placeholder. Renders nothing.
 */
export function LayerFade() {
  useEffect(() => {
    const images = document.querySelectorAll<HTMLImageElement>(".landing .layer img");
    for (const img of images) {
      if (img.complete) continue;
      img.dataset.loading = "";
      const done = () => delete img.dataset.loading;
      img.addEventListener("load", done, { once: true });
      img.addEventListener("error", done, { once: true });
    }
  }, []);
  return null;
}
