import type { CSSProperties } from "react";
import { preload } from "react-dom";
import { LayerFade } from "./layer-fade";
import { TALL_MEDIA } from "./media";
import { sceneArt, sceneLayers } from "./scene-art";

type SetName = keyof typeof sceneArt;
type LayerName = (typeof sceneLayers)[number];
type Format = "avif" | "webp";

const WIDE_MEDIA = `not all and ${TALL_MEDIA}`;

/**
 * Rendered width of the stage (landing.css): it covers the screen at the
 * art's ratio, scaled 1.04 (wide) or 1.015 (tall).
 */
const SIZES: Record<SetName, string> = {
  wide: "(min-aspect-ratio: 3/2) 104vw, 156vh",
  tall: "(max-aspect-ratio: 3/5) 61vh, 102vw",
};

/**
 * Load order. First, preloaded: the stars (on phones their layer sits lower
 * than the others, so it shows the most and is the page's largest paint; a
 * few KB) and Pesto. Next, from the HTML at low priority: the sky. The meadow
 * and the flowers load once the page is laid out. The blurred placeholder
 * covers the scene until each layer arrives; <LayerFade> fades in the late ones.
 */
const LOAD: Record<LayerName, "first" | "next" | "after-layout"> = {
  sky: "next",
  stars: "first",
  back: "after-layout",
  pesto: "first",
  front: "after-layout",
};

/** Felt-yellow stars that twinkle over the art, in % of the stage. */
const TWINKLES = [
  { left: 22, top: 14, size: 9, time: 3.6, delay: 0 },
  { left: 31, top: 31, size: 6, time: 5, delay: -1.2 },
  { left: 63, top: 9, size: 8, time: 4.2, delay: -2.4 },
  { left: 72, top: 27, size: 6, time: 3.2, delay: -0.6 },
  { left: 12, top: 41, size: 7, time: 4.8, delay: -3 },
  { left: 88, top: 47, size: 9, time: 5.4, delay: -1.8 },
  { left: 48, top: 6, size: 5, time: 3.9, delay: -2 },
  { left: 41, top: 44, size: 5, time: 4.4, delay: -0.3 },
];

/** The content-hashed URL of one file (scene-art.ts). */
function file(set: SetName, layer: LayerName, width: number, format: Format): string {
  const files: Record<string, string> = sceneArt[set].files;
  return files[`${layer}-${width}.${format}`];
}

function srcSet(set: SetName, layer: LayerName, format: Format) {
  return sceneArt[set].widths.map((w) => `${file(set, layer, w, format)} ${w}w`).join(", ");
}

function largest(set: SetName, layer: LayerName, format: Format) {
  return file(set, layer, sceneArt[set].widths.at(-1)!, format);
}

function preloadLayer(set: SetName, layer: LayerName) {
  preload(largest(set, layer, "avif"), {
    as: "image",
    type: "image/avif",
    imageSrcSet: srcSet(set, layer, "avif"),
    imageSizes: SIZES[set],
    media: set === "tall" ? TALL_MEDIA : WIDE_MEDIA,
    fetchPriority: "high",
  });
}

/** One layer. Each screen downloads only its own art set, AVIF where supported. */
function Layer({ name, children }: { name: LayerName; children?: React.ReactNode }) {
  const load = LOAD[name];
  const { width, height } = sceneArt.wide;
  return (
    <div className={`layer ${name}`}>
      <picture>
        <source media={TALL_MEDIA} type="image/avif" srcSet={srcSet("tall", name, "avif")} sizes={SIZES.tall} />
        <source media={TALL_MEDIA} type="image/webp" srcSet={srcSet("tall", name, "webp")} sizes={SIZES.tall} />
        <source type="image/avif" srcSet={srcSet("wide", name, "avif")} sizes={SIZES.wide} />
        <img
          src={largest("wide", name, "webp")}
          srcSet={srcSet("wide", name, "webp")}
          sizes={SIZES.wide}
          width={width}
          height={height}
          alt=""
          decoding="async"
          fetchPriority={load === "first" ? "high" : "low"}
          loading={load === "after-layout" ? "lazy" : "eager"}
        />
      </picture>
      {children}
    </div>
  );
}

/** The felt night scene: five layers, bottom to top. Decorative. */
export function Scene() {
  for (const layer of sceneLayers.filter((l) => LOAD[l] === "first")) {
    preloadLayer("tall", layer);
    preloadLayer("wide", layer);
  }

  const placeholders = {
    "--placeholder-wide": `url(${sceneArt.wide.placeholder})`,
    "--placeholder-tall": `url(${sceneArt.tall.placeholder})`,
  } as CSSProperties;

  return (
    <div className="stage" aria-hidden="true">
      <div className="placeholder" style={placeholders} />
      <Layer name="sky" />
      <Layer name="stars">
        {TWINKLES.map((t) => (
          <i
            key={`${t.left}-${t.top}`}
            className="twinkle"
            style={
              {
                left: `${t.left}%`,
                top: `${t.top}%`,
                "--s": `${t.size}px`,
                "--t": `${t.time}s`,
                "--delay": `${t.delay}s`,
              } as CSSProperties
            }
          />
        ))}
      </Layer>
      <Layer name="back" />
      <Layer name="pesto" />
      <Layer name="front" />
      <LayerFade />
    </div>
  );
}
