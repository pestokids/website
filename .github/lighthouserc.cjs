// Lighthouse CI settings for .github/workflows/lighthouse.yml. Collect only:
// the budgets and the PR comment live in .github/scripts/lighthouse-report.mjs.
//
// env: PREVIEW_URL (no trailing slash), PRESET ("mobile" or "desktop") and
// BYPASS, sent as x-vercel-protection-bypass on every request.

const ROUTES = ["/", "/privacy", "/terms", "/apply"];
const { PREVIEW_URL, PRESET, BYPASS } = process.env;

module.exports = {
  ci: {
    collect: {
      url: ROUTES.map((route) => PREVIEW_URL + route),
      numberOfRuns: 3,
      settings: {
        // Mobile is Lighthouse's default (Moto G Power on slow 4G).
        ...(PRESET === "desktop" ? { preset: "desktop" } : {}),
        extraHeaders: JSON.stringify(BYPASS ? { "x-vercel-protection-bypass": BYPASS } : {}),
        // Vercel sends `x-robots-tag: noindex` on every Preview, and /apply is
        // noindex on purpose, so this audit would always fail here.
        skipAudits: ["is-crawlable"],
      },
    },
  },
};
