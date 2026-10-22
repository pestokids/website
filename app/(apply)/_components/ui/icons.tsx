import type { ReactNode, SVGProps } from "react";

/** Small stroke glyphs used inside the shared controls. Decorative: always aria-hidden. */
type GlyphProps = Omit<SVGProps<SVGSVGElement>, "children"> & { size?: number };

function Glyph({ size = 16, children, ...props }: GlyphProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  );
}

export function ChevronLeftIcon(props: GlyphProps) {
  return (
    <Glyph strokeWidth={2.2} {...props}>
      <path d="M10.5 2.5 5 8l5.5 5.5" />
    </Glyph>
  );
}

export function ArrowRightIcon(props: GlyphProps) {
  return (
    <Glyph {...props}>
      <path d="M2.5 8h11M9 3.5 13.5 8 9 12.5" />
    </Glyph>
  );
}

export function CheckIcon(props: GlyphProps) {
  return (
    <Glyph strokeWidth={2.4} {...props}>
      <path d="m3 8.5 3.2 3L13 4.5" />
    </Glyph>
  );
}

export function CloseIcon(props: GlyphProps) {
  return (
    <Glyph {...props}>
      <path d="m4 4 8 8M12 4l-8 8" />
    </Glyph>
  );
}
