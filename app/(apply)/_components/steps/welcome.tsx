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
 * Screen 1. No header. Content is top-aligned; the button and footer line sit
 * at the bottom (lifted on wide screens by <FlowColumn>).
 *
 * Wide screens use a fixed top padding: 8% of the reference phone's 720px
 * visible height, so the content keeps its phone position. The footer line
 * sits 8px above the bottom edge, closer than other steps' buttons do.
 */
export function WelcomeStep() {
  const { advance } = useFlow();
  const [plain, emphasis] = [welcome.headline.slice(0, -1), welcome.headline.at(-1)];

  return (
    <section
      data-step="welcome"
      className="flex flex-1 flex-col items-center pt-[clamp(16px,8dvh,64px)] min-[600px]:pt-[58px]"
    >
      <div className="relative h-[154px] w-[260px] shrink-0">
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

      <div className="relative mt-[27px] mb-7 flex w-full max-w-[343px] justify-between px-1">
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
        <p className="text-center text-[13px] leading-[18px] text-muted">
          {welcome.footer(config.admissionsCloseDate.short)}
        </p>
      </StickyFooter>
    </section>
  );
}
