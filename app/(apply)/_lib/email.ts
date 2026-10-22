/**
 * Email field helpers for screen 8: the ghost completion, domain chips and
 * the "Did you mean" fix. Client-side niceties only; the format rule itself
 * is shared with the server (lib/application.ts).
 */
import {
  emailDomains,
  emailGhostDomain,
  emailKnownDomains,
  emailTypoDomains,
} from "@/content/apply";
import { isValidEmail, normaliseEmail } from "@/lib/application";

export { isValidEmail, normaliseEmail };

/** Whether the normalised value passes the shared format check. */
export function isEmailFormatValid(value: string): boolean {
  return isValidEmail(normaliseEmail(value));
}

/**
 * The domain the ghost would complete to, while the user is still typing:
 *  - no "@" yet → `preferred` (gmail.com unless a chip was picked first)
 *  - "priya@" → `preferred`
 *  - "priya@ic" → the first chip domain starting with "ic"
 * Null once the domain is complete or matches no chip.
 */
export function ghostDomain(value: string, preferred: string = emailGhostDomain): string | null {
  if (!value || /\s/.test(value)) return null;
  const at = value.indexOf("@");
  if (at === -1) return preferred;
  if (at === 0 || value.indexOf("@", at + 1) !== -1) return null;
  const typed = value.slice(at + 1).toLowerCase();
  if (typed === "") return preferred;
  return emailDomains.find((d) => d !== typed && d.startsWith(typed)) ?? null;
}

/** The text drawn after the caret: "@gmail.com", "gmail.com" or "ail.com". */
export function ghostText(value: string, preferred?: string): string | null {
  const domain = ghostDomain(value, preferred);
  if (!domain) return null;
  const at = value.indexOf("@");
  if (at === -1) return `@${domain}`;
  return domain.slice(value.length - at - 1);
}

/** "priya" / "priya@gm" + "icloud.com" → "priya@icloud.com". */
export function completeWith(value: string, domain: string): string {
  const local = value.split("@")[0].trim();
  return `${local}@${domain}`;
}

// ── Typo check (mailcheck-style) ─────────────────────────────────────────────

/** Edit distance where swapping two neighbours counts as one edit ("gmial"). */
export function editDistance(a: string, b: string): number {
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  );
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }
  return d[a.length][b.length];
}

const knownDomains = new Set<string>([...emailTypoDomains, ...emailKnownDomains]);

/** Short names ("gmail") allow one slip; longer ones ("hotmail") two. */
const maxNameDistance = (name: string) => (name.length <= 5 ? 1 : 2);

/** "con", "co", "cmo", "comm"… but not real endings like "ca" or "co.uk". */
const isComTypo = (tld: string) => tld !== "com" && editDistance(tld, "com") <= 1;

/**
 * The common domain `domain` is probably a typo of, or null. Fixes the name
 * ("gmial.com", "yahooo.co.in") and a mistyped ".com" ("gmail.con"), keeps
 * other endings ("yahoo.ca"), and leaves known real domains alone.
 */
export function domainTypo(domain: string): string | null {
  domain = domain.toLowerCase();
  if (!domain || knownDomains.has(domain)) return null;

  const labels = domain.split(".");
  if (labels.length === 1) {
    // No dot at all: "gmail", "gmailcom", "gmial".
    for (const known of emailTypoDomains) {
      const [name] = known.split(".");
      if (editDistance(domain, known.replace(".", "")) <= 1) return known;
      if (editDistance(domain, name) <= maxNameDistance(name)) return known;
    }
    return null;
  }

  const [name, ...rest] = labels;
  const tld = rest.join(".");
  // Only name.tld or name.co.uk shapes; "mail.yahoo.com" is someone's own server.
  if (rest.length > 2 || rest[0].length > 4) return null;

  let best: { domain: string; distance: number } | null = null;
  for (const known of emailTypoDomains) {
    const [knownName, knownTld] = known.split(".");
    const distance = editDistance(name, knownName);
    if (distance > maxNameDistance(knownName)) continue;
    const fixedTld = tld === knownTld || (knownTld === "com" && isComTypo(tld)) ? knownTld : tld;
    const candidate = `${knownName}.${fixedTld}`;
    if (candidate === domain) continue;
    if (!best || distance < best.distance) best = { domain: candidate, distance };
  }
  return best?.domain ?? null;
}

/**
 * What to offer under "Did you mean" for the value as typed, or null:
 *  - a missing or half-typed domain → the ghost completion
 *  - a typo of a common domain → the fixed address
 */
export function emailSuggestion(value: string, preferred?: string): string | null {
  const email = normaliseEmail(value);
  if (!email || /\s/.test(email)) return null;
  const local = email.split("@")[0];
  if (!local) return null;

  const ghost = ghostDomain(email, preferred);
  if (ghost) return `${local}@${ghost}`;

  const at = email.indexOf("@");
  if (email.indexOf("@", at + 1) !== -1) return null;
  const fixed = domainTypo(email.slice(at + 1));
  if (!fixed) return null;
  const suggestion = `${local}@${fixed}`;
  return isValidEmail(suggestion) ? suggestion : null;
}
