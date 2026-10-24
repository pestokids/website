"use client";

import { welcome } from "@/content/apply";
import { config } from "@/lib/config";
import { useFlow } from "../apply-flow";
import { PrimaryButton } from "../ui/button";
import { StickyFooter } from "../ui/sticky-footer";
import { IconSticker, PestoSticker, Sparkle } from "../ui/sticker";

/** Tilt and drop (px) of each icon sticker, in `welcome.stickers` order. */
const stickerLayout: { tilt: number; drop: number }[] = [
  { tilt: -9, drop: 2 },
  { tilt: 4, drop: 20 },
  { tilt: -4, drop: 0 },
  { tilt: 7, drop: 18 },
];

/**
 * Screen 1. No header: a scrolling lime strip at the very top, then the
 * content, top-aligned; the button and consent line sit at the bottom (lifted
 * on wide screens by <FlowColumn>).
 *
 * The strip sits in the top padding, so the sticker and headline keep their
 * position: 8% of the visible height below the top edge (wide screens: 8% of
 * the reference phone's 720px). The consent line sits 8px above the bottom
 * edge, closer than other steps' buttons do.
 */
export function WelcomeStep() {
  const { advance } = useFlow();
  const [plain, emphasis] = [welcome.headline.slice(0, -1), welcome.headline.at(-1)];

  return (
    <section data-step="welcome" className="flex flex-1 flex-col items-center">
      <Marquee items={welcome.marquee(config.admissionsCloseDate.short)} />

      <div className="relative mt-[clamp(4px,calc(8dvh-32px),32px)] h-[154px] w-[260px] shrink-0 min-[600px]:mt-[26px]">
        <Sparkle size={18} className="absolute top-[15px] left-[25px] text-lime-deep" />
        <Sparkle size={12} className="absolute top-[11px] left-[221px] text-orange" />
        <Sparkle size={16} className="absolute top-[108px] left-[242px] text-lime-deep" />
        <PestoSticker size={136} tilt={-5} glow className="absolute top-[15px] left-[62px]" />
      </div>

      <h1 className="mt-2 text-center font-display text-[58px] leading-[62px] font-extrabold">
        {plain.map((line) => (
          <span key={line} className="block">
            {line}
          </span>
        ))}
        <span className="block text-orange">{emphasis}</span>
      </h1>

      {/* A small bottom margin: on short phones (360×640) the screen fits without scrolling. */}
      <div className="relative mt-[27px] mb-2 flex w-full max-w-[343px] justify-between px-1">
        {welcome.stickers.map((icon, i) => (
          <IconSticker
            key={icon}
            icon={icon}
            size={70}
            tilt={stickerLayout[i].tilt}
            style={{ marginTop: stickerLayout[i].drop }}
          />
        ))}
        <Sparkle size={10} className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-orange" />
      </div>

      <StickyFooter className="w-full pb-2!">
        <PrimaryButton onClick={() => advance()}>{welcome.cta}</PrimaryButton>
        {/* Fine print, in the footer line's old slot (18px), so the button stays put. */}
        <p className="text-center text-xs leading-[18px] text-balance text-muted">
          {welcome.consent.before}
          <ConsentLink {...welcome.consent.terms} />
          {welcome.consent.between}
          <ConsentLink {...welcome.consent.privacy} />
          {welcome.consent.after}
        </p>
      </StickyFooter>
    </section>
  );
}

function ConsentLink({ label, href }: { label: string; href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener"
      className="whitespace-nowrap underline decoration-muted/40 underline-offset-2"
    >
      {label}
    </a>
  );
}

/** Copies per half of the track: enough for one half to cover a wide tablet. */
const MARQUEE_COPIES = 6;

/**
 * Lime strip with "3 minutes ✦ 100 families ✦ …" scrolling right to left.
 * The track is two identical halves and slides by exactly one half, so the
 * loop is seamless whatever the font. Full-bleed, fixed height (no layout
 * shift). Screen readers get the first copy once; the other copies and the
 * stars are hidden. With reduced motion it's one static, centred copy.
 */
function Marquee({ items }: { items: string[] }) {
  return (
    <div className="mt-[env(safe-area-inset-top)] flex h-8 w-dvw shrink-0 items-center overflow-hidden bg-lime text-[13px] leading-[18px] font-semibold text-forest">
      <div className="flex w-max animate-marquee motion-reduce:w-full motion-reduce:animate-none motion-reduce:justify-center">
        {Array.from({ length: MARQUEE_COPIES * 2 }, (_, copy) => (
          <span
            key={copy}
            aria-hidden={copy > 0 || undefined}
            className={`flex shrink-0 whitespace-nowrap ${copy > 0 ? "motion-reduce:hidden" : ""}`}
          >
            {items.map((item, i) => {
              const last = i === items.length - 1;
              return (
                <span key={item} className="flex">
                  {item}
                  {copy === 0 && !last && <span className="sr-only">, </span>}
                  {/* The trailing star joins this copy to the next; none when static. */}
                  <span
                    aria-hidden
                    className={`px-2.5 text-orange motion-reduce:px-1.5 ${last ? "motion-reduce:hidden" : ""}`}
                  >
                    {welcome.marqueeSeparator}
                  </span>
                </span>
              );
            })}
          </span>
        ))}
      </div>
    </div>
  );
}
