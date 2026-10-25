/**
 * Builds the share card (flat Pesto and the wordmark on forest green) and the
 * app icons (the felt Pesto layer on navy).
 *
 *   node scripts/share-art.mjs
 *
 * Reads public/mascots/mascot-primary.svg, and the felt Pesto layer and
 * Baloo 2 from internal/ (private, not in the repo). Writes:
 *   public/share/card-{hash}.jpg                    1200×630 share card for /, /privacy and /terms
 *   app/(marketing)/_components/share-card.ts      its URL and size, for the page metadata
 *   app/icon.png                                    512×512, felt Pesto on a navy rounded square
 *   app/apple-icon.png                              180×180, full-bleed navy (iOS rounds the corners)
 *   app/favicon.ico                                 16, 32 and 48 px
 *
 * The hash in the card's name changes with its content, so link previews
 * fetch the new card instead of a cached one. Commit all of them. Re-run when
 * the art changes.
 */
import { createHash } from "node:crypto";
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.resolve(import.meta.dirname, "..");
const LAYERS = path.join(ROOT, "internal/landing/gpt/complete/layers/landscape");
const BALOO = path.join(ROOT, "internal/landing/fonts/Baloo2_800ExtraBold.ttf");
const MASCOT = path.join(ROOT, "public/mascots/mascot-primary.svg");
const SHARE_DIR = path.join(ROOT, "public/share");
const SHARE_MODULE = path.join(ROOT, "app/(marketing)/_components/share-card.ts");
const APP = path.join(ROOT, "app");

const NIGHT = "#13235f";
const CREAM = "#fffbeb";
const FOREST = "#003f2e";

const kb = (bytes) => `${(bytes / 1024).toFixed(0)} KB`;

/** Baloo 2 ExtraBold text as an RGBA image, from Pango markup. */
async function text(markup, { size }) {
  const { data, info } = await sharp({
    text: {
      text: `<span font_desc="Baloo 2 ExtraBold ${size}px">${markup}</span>`,
      fontfile: BALOO,
      rgba: true,
      dpi: 72,
    },
  })
    .png()
    .toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

/** The "pesto" wordmark in cream, as on the page's header logo (-0.01em tracking). */
function wordmark(size) {
  return text(`<span foreground="${CREAM}" letter_spacing="${Math.round(size * -0.01 * 1024)}">pesto</span>`, { size });
}

const WIDTH = 1200;
const HEIGHT = 630;

/**
 * 1200×630: flat Pesto on forest green, bleeding off the bottom left (the art
 * is already cut flat on those edges), with the wordmark beside him. Large
 * enough to read in a ~300px WhatsApp thumbnail.
 */
async function brandCard() {
  // Sketch writes the colours as display-p3, which librsvg can't read; and the
  // art's own background square goes, so Pesto sits on exactly FOREST.
  const svg = srgbSvg(await readFile(MASCOT, "utf8")).replace(/<polygon id="Deep-green-background"[^>]*>(<\/polygon>)?/, "");
  // 640 square, its left 40px and bottom 10px off the card.
  const size = 640;
  const pesto = await sharp(Buffer.from(svg), { density: (72 * size) / 1024 })
    .resize(size)
    .extract({ left: 40, top: 0, width: size - 40, height: HEIGHT })
    .png()
    .toBuffer();
  // Centred in the space right of Pesto, inside a 70px safe margin.
  const mark = await wordmark(200);
  const space = { left: size - 40, right: WIDTH - 70 };
  return sharp({ create: { width: WIDTH, height: HEIGHT, channels: 3, background: FOREST } })
    .composite([
      { input: pesto, left: 0, top: 0 },
      {
        input: mark.data,
        left: Math.round((space.left + space.right - mark.width) / 2),
        top: Math.round((HEIGHT - mark.height) / 2),
      },
    ])
    .png()
    .toBuffer();
}

/** Sketch's `color(display-p3 r g b)` as sRGB hex: P3 → linear → sRGB, clamped. */
function srgbSvg(svg) {
  const linear = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const encode = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);
  const P3_TO_SRGB = [
    [1.2249401, -0.2249404, 0],
    [-0.0420569, 1.0420571, 0],
    [-0.0196376, -0.0786361, 1.0982735],
  ];
  return svg.replace(/color\(display-p3 ([\d.]+) ([\d.]+) ([\d.]+)\)/g, (_, r, g, b) => {
    const rgb = [r, g, b].map((c) => linear(Number(c)));
    const hex = P3_TO_SRGB.map((row) => row.reduce((sum, m, i) => sum + m * rgb[i], 0)).map((c) =>
      Math.round(Math.min(1, Math.max(0, encode(c))) * 255)
        .toString(16)
        .padStart(2, "0"),
    );
    return `#${hex.join("")}`;
  });
}

/** JPEG, well under the ~300 KB above which WhatsApp drops preview images. */
const jpeg = (png) => sharp(png).jpeg({ quality: 86, mozjpeg: true }).toBuffer();

async function writeShareCard(png) {
  const out = await jpeg(png);
  const name = `card-${createHash("sha256").update(out).digest("hex").slice(0, 8)}.jpg`;
  await rm(SHARE_DIR, { recursive: true, force: true });
  await mkdir(SHARE_DIR, { recursive: true });
  await writeFile(path.join(SHARE_DIR, name), out);
  await writeFile(
    SHARE_MODULE,
    `// Generated by scripts/share-art.mjs. Don't edit by hand; re-run the script.

/** The share card in public/. Its alt text is meta.shareAlt in content/landing.ts. */
export const shareCard = {
  url: "/share/${name}",
  width: ${WIDTH},
  height: ${HEIGHT},
  type: "image/jpeg",
} as const;
`,
  );
  console.log(`share/${name}: ${kb(out.length)}`);
}

/**
 * Pesto's head from the felt layer on navy, `size` px square. The layer's
 * straight bottom edge runs off the bottom of the icon, so it never shows.
 * `radius` rounds the corners (0 for a full square).
 */
async function icon(size, { radius }) {
  const trimmed = await sharp(path.join(LAYERS, "04-pesto.png")).trim().png().toBuffer({ resolveWithObject: true });
  // Head fills 92% of the width, sitting slightly right and low, like the page.
  const headWidth = Math.round(size * 0.92);
  const head = await sharp(trimmed.data).resize({ width: headWidth, kernel: "lanczos3" }).png().toBuffer();
  const headHeight = Math.round((trimmed.info.height / trimmed.info.width) * headWidth);
  const top = size - Math.round(headHeight * 0.94);
  const left = Math.round(size * 0.06);
  const cropped = await sharp({ create: { width: size, height: size, channels: 4, background: NIGHT } })
    .composite([{ input: head, top, left }])
    .png()
    .toBuffer();
  if (!radius) return sharp(cropped).flatten({ background: NIGHT }).png().toBuffer();
  const mask = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${radius}" ry="${radius}"/></svg>`,
  );
  return sharp(cropped)
    .composite([{ input: mask, blend: "dest-in" }])
    .png()
    .toBuffer();
}

/** An .ico holding PNG images (supported by every current browser). */
function ico(pngs) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(pngs.length, 4);
  let offset = 6 + 16 * pngs.length;
  const entries = pngs.map(({ size, data }) => {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size % 256, 0);
    entry.writeUInt8(size % 256, 1);
    entry.writeUInt16LE(1, 4); // colour planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(data.length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += data.length;
    return entry;
  });
  return Buffer.concat([header, ...entries, ...pngs.map(({ data }) => data)]);
}

async function icons() {
  const big = await icon(512, { radius: 112 });
  // Browsers fetch this on every first visit: a palette keeps it small.
  await writeFile(path.join(APP, "icon.png"), await sharp(big).png({ palette: true, quality: 90, effort: 10 }).toBuffer());
  const apple = await icon(180, { radius: 0 });
  await writeFile(path.join(APP, "apple-icon.png"), apple);
  const small = await Promise.all(
    [16, 32, 48].map(async (size) => ({
      size,
      data: await sharp(big).resize({ width: size, kernel: "lanczos3" }).png().toBuffer(),
    })),
  );
  const favicon = ico(small);
  await writeFile(path.join(APP, "favicon.ico"), favicon);
  const { size } = await stat(path.join(APP, "icon.png"));
  console.log(`icon.png: ${kb(size)}, apple-icon.png: ${kb(apple.length)}, favicon.ico: ${kb(favicon.length)}`);
}

await writeShareCard(await brandCard());
await icons();
