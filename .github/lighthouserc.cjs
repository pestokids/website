// Lighthouse CI settings for .github/workflows/lighthouse.yml. Collect only:
// the budgets and the PR comment live in .github/scripts/lighthouse-report.mjs.
//
// env: PREVIEW_URL (no trailing slash), PRESET ("mobile" or "desktop"),
// BYPASS, sent as x-vercel-protection-bypass on every request, and WARM_UP=1
// for one uncounted run per route (the next collect clears it).

// eslint-disable-next-line @typescript-eslint/no-require-imports -- Lighthouse CI loads this file with require().
const ROUTES = require("./lighthouse-routes.json");

const { PREVIEW_URL, PRESET, BYPASS, WARM_UP } = process.env;

module.exports = {
  ci: {
    collect: {
      url: ROUTES.map((route) => PREVIEW_URL + route),
      numberOfRuns: WARM_UP ? 1 : 3,
      settings: {
        // Mobile is Lighthouse's default (Moto G Power on slow 4G).
        ...(PRESET === "desktop" ? { preset: "desktop" } : {}),
        extraHeaders: JSON.stringify({
          ...(BYPASS ? { "x-vercel-protection-bypass": BYPASS } : {}),
          // A cookie too: Lighthouse fetches robots.txt without the extra headers.
          "x-vercel-set-bypass-cookie": "true",
          // Previews only: Vercel's toolbar script isn't part of the site.
          "x-vercel-skip-toolbar": "1",
        }),
        // Vercel sends `x-robots-tag: noindex` on every Preview, and /apply is
        // noindex on purpose, so this audit would always fail here.
        skipAudits: ["is-crawlable"],
      },
    },
  },
};
