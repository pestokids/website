"use client";

import { create } from "qrcode";
import { useMemo } from "react";

/**
 * QR code drawn as one SVG path, generated in the browser (no QR web
 * service). Forest on white; the white tile around it is the quiet zone.
 * Error correction is High (30%), so a small face can sit in the middle and
 * it still scans. Anti-aliased on purpose: with `crispEdges`, WebKit at 1x
 * snaps fractional modules unevenly and long links stop scanning.
 */
export function QrCode({ value, size = 200, label }: { value: string; size?: number; label: string }) {
  const { count, path } = useMemo(() => {
    const { modules } = create(value, { errorCorrectionLevel: "H" });
    let d = "";
    for (let row = 0; row < modules.size; row++) {
      for (let col = 0; col < modules.size; col++) {
        if (!modules.get(row, col)) continue;
        // Merge each horizontal run of dark modules into one rect.
        let run = 1;
        while (col + run < modules.size && modules.get(row, col + run)) run++;
        d += `M${col} ${row}h${run}v1h-${run}z`;
        col += run - 1;
      }
    }
    return { count: modules.size, path: d };
  }, [value]);

  return (
    <svg
      role="img"
      aria-label={label}
      width={size}
      height={size}
      viewBox={`0 0 ${count} ${count}`}
      className="block bg-white"
    >
      <path d={path} className="fill-forest" />
    </svg>
  );
}
