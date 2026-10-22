import type { ComponentProps } from "react";

/**
 * Frosted card (screens 3 and 9): translucent white with a 36px backdrop
 * blur, white hairline and inner top highlight. Falls back to solid
 * white/90% where backdrop-filter isn't supported (`frosted` in tokens.css).
 * `solid` forces the fallback.
 */
export function FrostedCard({
  solid = false,
  className = "",
  ...props
}: ComponentProps<"div"> & { solid?: boolean }) {
  return (
    <div className={`rounded-card-lg ${solid ? "frosted-solid" : "frosted"} ${className}`} {...props} />
  );
}
