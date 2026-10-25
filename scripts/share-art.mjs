/**
 * Builds the share card and the app icons from the felt night-scene art.
 *
 *   node scripts/share-art.mjs
 *
 * Reads the wide source layers and Baloo 2 from internal/ (private, not in the
 * repo), and the tagline from content/landing.ts. Writes:
 *   public/share/card-{hash}.jpg                    1200×630 share card for /, /privacy and /terms
 *   app/(marketing)/_components/share-card.ts      its URL and size, for the page metadata
 *   app/icon.png                                    512×512, felt Pesto on a navy rounded square
 *   app/apple-icon.png                              180×180, full-bleed navy (iOS rounds the corners)
 *   app/favicon.ico                                 16, 32 and 48 px
 *
 * The hash in the card's name changes with its content, so link previews
 * fetch the new card instead of a cached one. Commit all of them. Re-run when
 * the art or the tagline changes.
 */
import { createHash } from "node:crypto";
import { mkdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { tagline } from "../content/landing.ts";

const ROOT = path.resolve(import.meta.dirname, "..");
const LAYERS = path.join(ROOT, "internal/landing/gpt/complete/layers/landscape");
const BALOO = path.join(ROOT, "internal/landing/fonts/Baloo2_800ExtraBold.ttf");
const SHARE_DIR = path.join(ROOT, "public/share");
const SHARE_MODULE = path.join(ROOT, "app/(marketing)/_components/share-card.ts");
const APP = path.join(ROOT, "app");

/** Bottom to top, as in scripts/landing-art.mjs. */
const LAYER_FILES = ["01-sky.png", "02-stars-moon.png", "03-back-meadow.png", "04-pesto.png", "05-front-flowers.png"];

const NIGHT = "#13235f";
const CREAM = "#fffbeb";
const ORANGE = "#ff6420";

const kb = (bytes) => `${(bytes / 1024).toFixed(0)} KB`;
const escape = (text) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

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

/**
 * The tagline, centred, one line per entry with the highlight in orange.
 * Each line is set on its own and stacked at the page's 0.9 line height:
 * Baloo's own line box is much taller.
 */
async function taglineGlyphs(size) {
  const entries = [
    ...tagline.lines.map((line) => ({ line, colour: CREAM })),
    { line: tagline.highlight, colour: ORANGE },
  ];
  const lines = await Promise.all(
    entries.map(({ line, colour }) =>
      text(`<span foreground="${colour}" letter_spacing="${Math.round(size * -0.015 * 1024)}">${escape(line)}</span>`, {
        size,
      }),
    ),
  );
  const advance = Math.round(size * 0.9);
  const width = Math.max(...lines.map((line) => line.width));
  const height = advance * (lines.length - 1) + lines.at(-1).height;
  const data = await sharp({ create: { width, height, channels: 4, background: "#0000" } })
    .composite(lines.map((line, i) => ({ input: line.data, top: i * advance, left: Math.round((width - line.width) / 2) })))
    .png()
    .toBuffer();
  return { data, width, height };
}

/**
 * The page's text shadow (0 2px 0 black at 18%, then 0 10px 30px navy at
 * 45%), as two tinted copies of the text's alpha under it.
 */
async function shadowed(glyphs) {
  const pad = 60;
  const alpha = await sharp(glyphs.data).extractChannel("alpha").toBuffer();
  const tint = async (rgb, opacity, blur, dy) => {
    let shadow = sharp({ create: { width: glyphs.width, height: glyphs.height, channels: 3, background: rgb } })
      .joinChannel(alpha)
      .linear([1, 1, 1, opacity], [0, 0, 0, 0])
      .extend({ top: pad, bottom: pad, left: pad, right: pad, background: "#0000" });
    if (blur) shadow = sharp(await shadow.png().toBuffer()).blur(blur);
    return { input: await shadow.png().toBuffer(), top: dy, left: 0 };
  };
  const layers = [await tint("#080e2d", 0.45, 15, 10), await tint("#000000", 0.18, 0, 2)];
  const canvas = { width: glyphs.width + pad * 2, height: glyphs.height + pad * 2 };
  const data = await sharp({ create: { ...canvas, channels: 4, background: "#0000" } })
    .composite([...layers, { input: glyphs.data, top: pad, left: pad }])
    .png()
    .toBuffer();
  return { data, ...canvas, pad };
}

/** The five wide layers flattened into one 2400×1600 image. */
async function flatScene() {
  const [sky, ...rest] = LAYER_FILES.map((file) => path.join(LAYERS, file));
  return sharp(sky)
    .composite(rest.map((input) => ({ input })))
    .png()
    .toBuffer();
}

/**
 * 1200×630: the scene scaled to 1200 wide and cropped like the page crops it
 * on wide screens, but lower (60% of the overflow off the top) so more of
 * Pesto's face shows, with the tagline centred in the sky above him.
 */
async function shareCard() {
  const width = 1200;
  const height = 630;
  const scaledHeight = 800;
  const scene = await sharp(await flatScene())
    .resize({ width, kernel: "lanczos3" })
    .extract({ left: 0, top: Math.round((scaledHeight - height) * 0.6), width, height })
    .png()
    .toBuffer();

  const headline = await shadowed(await taglineGlyphs(104));
  const png = await sharp(scene)
    .composite([{ input: headline.data, left: Math.round((width - headline.width) / 2), top: 44 - headline.pad }])
    .png()
    .toBuffer();
  // JPEG: the felt texture makes a PNG over 500 KB, and WhatsApp drops
  // preview images over about 300 KB.
  const out = await sharp(png).jpeg({ quality: 86, mozjpeg: true }).toBuffer();
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
  width: ${width},
  height: ${height},
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

await shareCard();
await icons();
