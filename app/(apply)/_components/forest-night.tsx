import type { CSSProperties } from "react";
import { welcome } from "@/content/apply";
import { forest } from "./classes";
import { Sparkle } from "./ui/sticker";

/**
 * The doodle tile: star, book, music note, moon, leaf, paper plane, swirl,
 * cloud and three dots, traced from the design's forest-doodles pattern. One
 * 220px tile, drawn in lime and repeated; the layer's opacity (apply.css)
 * brings it down to about 20%. Keep TILE in sync with .pz-forest-doodles.
 */
const TILE = 220;
const DOODLES = [
  // Star.
  "M29 21.5l3 6.6 7.2.8-5.4 4.9 1.5 7.1-6.3-3.6-6.3 3.6 1.5-7.1-5.4-4.9 7.2-.8Z",
  // Open book.
  "M122 18.5l10.5 2.5v15l-10.5-2.5Zm10.5 2.5 11-2.5v15l-11 2.5",
  // Music note.
  "M199 87V75.5l11.5-3V84M199 87a2.6 2.6 0 1 1-5.2 0 2.6 2.6 0 0 1 5.2 0Zm11.5-3a2.6 2.6 0 1 1-5.2 0 2.6 2.6 0 0 1 5.2 0Z",
  // Moon.
  "M83.5 95.5a8.2 8.2 0 1 0 6.8 13.4 7 7 0 0 1-6.8-13.4Z",
  // Leaf.
  "M157.5 162.5c-2.5-8.5 3-16.5 10.5-21 2 8.5-3 16.5-10.5 21Zm0 0 7-12",
  // Paper plane.
  "M16 160.5l23.5-6.5-9.5 19-3.2-8.3Zm10.8 4.2 12.7-10.7",
  // Swirl.
  "M110.5 205.5a4.4 4.4 0 1 1 5.8-6.2m-1.8-3.3a4.4 4.4 0 1 1-5.8 6.2",
  // Cloud.
  "M180.5 207.5h16.5a4.3 4.3 0 0 0-.4-8.6 5.8 5.8 0 0 0-11.2-1.4 4.6 4.6 0 0 0-4.9 10Z",
];
const DOTS = [
  [72, 72],
  [152, 102],
  [212, 142],
];

const tile = [
  `<svg xmlns="http://www.w3.org/2000/svg" width="${TILE}" height="${TILE}" viewBox="0 0 ${TILE} ${TILE}">`,
  `<g fill="none" stroke="#bef541" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">`,
  ...DOODLES.map((d) => `<path d="${d}"/>`),
  `</g><g fill="#bef541">`,
  ...DOTS.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.2"/>`),
  `</g></svg>`,
].join("");

const doodles: CSSProperties = {
  backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(tile)}")`,
};

/**
 * Six sparkles: where they sit (share of the screen), size, colour and
 * twinkle phase. Gold, lime and cream, as in the design.
 */
const sparkles: { x: number; y: number; size: number; color: string; delay: number }[] = [
  { x: 11, y: 13, size: 20, color: "#f6c33b", delay: 0 },
  { x: 87, y: 20.5, size: 13, color: "#c8f560", delay: -1.1 },
  { x: 6.5, y: 45.5, size: 9, color: "#fffbeb", delay: -2.3 },
  { x: 93.5, y: 52, size: 9, color: "#fffbeb", delay: -0.6 },
  { x: 14.5, y: 74.5, size: 12, color: "#c8f560", delay: -1.8 },
  { x: 89, y: 83, size: 20, color: "#f6c33b", delay: -2.8 },
];

/**
 * "Forest night": the full-screen backdrop around the flow's card on
 * tablets and open foldables. Pesto's deep green, a soft lime glow in the
 * middle, faint lime doodles drifting slowly, six twinkling sparkles and the
 * cream wordmark top-left. All decorative and CSS-only (no client JS); the
 * motion stops under reduced motion. Fixed behind the page; put content
 * above it with `position: relative` and a z-index.
 */
export function ForestNight({ className = "" }: { className?: string }) {
  return (
    <div aria-hidden="true" className={`${forest.root} ${className}`}>
      <div className={forest.glow} />
      <div className={forest.doodles} style={doodles} />
      {sparkles.map((s, i) => (
        <span
          key={i}
          className={forest.sparkle}
          style={{ left: `${s.x}%`, top: `${s.y}%`, color: s.color, animationDelay: `${s.delay}s` }}
        >
          <Sparkle size={s.size} />
        </span>
      ))}
      <p className={forest.logo}>{welcome.brand}</p>
    </div>
  );
}
