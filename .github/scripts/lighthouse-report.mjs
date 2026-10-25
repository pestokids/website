// Checks the Lighthouse runs against the budgets and writes the PR comment.
//
//   node .github/scripts/lighthouse-report.mjs <dir> [out.md]
//
// Reads every lhr-*.json under <dir> (Lighthouse CI's collect output, one
// folder per preset), takes the median of the runs for each route and preset,
// and writes a Markdown table to out.md (default lighthouse.md) and the job
// summary. Exits 1 if anything is over budget.
//
// Plain Node, no dependencies.

import { appendFileSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const ROUTES = ['/', '/privacy', '/terms', '/apply'];
const PRESETS = ['mobile', 'desktop'];

/**
 * Lowest Performance score per preset and route. 98 leaves room for lab
 * noise. The lower ones are temporary floors at today's score: the React
 * runtime runs before the first frame and /apply renders on the client.
 */
const PERFORMANCE = {
  mobile: { '/': 94, '/apply': 96 },
  default: 98,
};

/** Compressed JavaScript, in bytes. 60 KB needs a landing page without React. */
const SCRIPT_BYTES = { '/': 170_000, default: 150_000 };

/** Everything a phone downloads for /, in bytes. */
const MOBILE_HOME_TOTAL_BYTES = 500_000;

const [dir, out = 'lighthouse.md'] = process.argv.slice(2);

function lhrFiles(root) {
  return readdirSync(root, { recursive: true })
    .filter((file) => /(^|\/)lhr-[^/]*\.json$/.test(file))
    .map((file) => path.join(root, file));
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

function transfer(lhr, resourceType) {
  const items = lhr.audits['resource-summary']?.details?.items ?? [];
  return items.find((item) => item.resourceType === resourceType)?.transferSize ?? 0;
}

const runs = new Map();
for (const file of lhrFiles(dir)) {
  const lhr = JSON.parse(readFileSync(file, 'utf8'));
  const preset = lhr.configSettings.formFactor;
  const route = new URL(lhr.requestedUrl).pathname;
  const key = `${preset} ${route}`;
  runs.set(key, [...(runs.get(key) ?? []), lhr]);
}

const kb = (bytes) => `${Math.round(bytes / 1000)} KB`;
const score = (lhr, category) => Math.round((lhr.categories[category]?.score ?? 0) * 100);

let failures = 0;
const rows = [];
for (const route of ROUTES) {
  for (const preset of PRESETS) {
    const lhrs = runs.get(`${preset} ${route}`) ?? [];
    if (lhrs.length === 0) {
      failures++;
      rows.push(`| \`${route}\` | ${preset} | no runs ❌ | | | | | | |`);
      continue;
    }
    const m = (pick) => median(lhrs.map(pick));
    const perfMin = PERFORMANCE[preset]?.[route] ?? PERFORMANCE.default;
    const scriptMax = SCRIPT_BYTES[route] ?? SCRIPT_BYTES.default;
    const totalMax = preset === 'mobile' && route === '/' ? MOBILE_HOME_TOTAL_BYTES : Infinity;

    const cell = (text, ok) => {
      if (ok) return text;
      failures++;
      return `${text} ❌`;
    };
    const perf = m((lhr) => score(lhr, 'performance'));
    const cls = m((lhr) => lhr.audits['cumulative-layout-shift'].numericValue);
    const script = m((lhr) => transfer(lhr, 'script'));
    const total = m((lhr) => transfer(lhr, 'total'));
    const cells = [
      `\`${route}\``,
      preset,
      cell(perf, perf >= perfMin),
      ...['accessibility', 'best-practices', 'seo'].map((category) => {
        const value = m((lhr) => score(lhr, category));
        return cell(value, value === 100);
      }),
      cell(cls === 0 ? '0' : cls.toFixed(3), cls === 0),
      cell(kb(script), script <= scriptMax),
      cell(kb(total), total <= totalMax),
    ];
    rows.push(`| ${cells.join(' | ')} |`);
  }
}

const floors = PRESETS.flatMap((preset) =>
  Object.entries(PERFORMANCE[preset] ?? {}).map(([route, min]) => `${min} for \`${route}\` on ${preset}`),
);
const sha = process.env.SHA ? ` of ${process.env.SHA.slice(0, 7)}` : '';
const markdown = `<!-- lighthouse -->
### Lighthouse: ${failures === 0 ? 'all on budget ✅' : `${failures} over budget ❌`}

Median of 3 runs per route on the Vercel Preview${sha}.

| Route | Device | Perf | A11y | Best pr. | SEO | CLS | JS | Total |
|---|---|---|---|---|---|---|---|---|
${rows.join('\n')}

Budgets: Performance ${PERFORMANCE.default}${floors.length ? ` (for now ${floors.join(', ')})` : ''}; Accessibility, Best Practices and SEO 100; CLS 0; JavaScript ${kb(SCRIPT_BYTES['/'])} on \`/\`, ${kb(SCRIPT_BYTES.default)} elsewhere; ${kb(MOBILE_HOME_TOTAL_BYTES)} in total for \`/\` on mobile.
`;

writeFileSync(out, markdown);
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, markdown);
console.log(markdown);
process.exit(failures === 0 ? 0 : 1);
