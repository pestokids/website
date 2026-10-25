/**
 * Public runtime config, read from NEXT_PUBLIC_* env vars and validated.
 *
 * Each var is read with a literal `process.env.NEXT_PUBLIC_…` so Next.js can
 * inline it into the client bundle. `next.config.ts` imports this module, so a
 * missing or malformed required var fails `next dev` / `next build` early.
 */
import { parseIsoDate, type DateConfig } from "./dates";
import { isWhatsappNumber } from "./whatsapp";

export { parseIsoDate, type DateConfig } from "./dates";

export type RawPublicEnv = {
  NEXT_PUBLIC_BETA_DATE?: string;
  NEXT_PUBLIC_ADMISSIONS_CLOSE_DATE?: string;
  NEXT_PUBLIC_WHATSAPP_NUMBER?: string;
  NEXT_PUBLIC_ANALYTICS_ENABLED?: string;
  NEXT_PUBLIC_POSTHOG_KEY?: string;
  NEXT_PUBLIC_LINKRUNNER_TOKEN?: string;
  NEXT_PUBLIC_CONVEX_URL?: string;
};

export type PublicConfig = {
  betaDate: DateConfig;
  admissionsCloseDate: DateConfig;
  /** E.164 without the leading +. */
  whatsappNumber: string;
  convexUrl: string;
  analytics:
    | { enabled: false }
    | {
        enabled: true;
        posthogKey: string;
        linkrunnerToken: string;
      };
};

export class ConfigError extends Error {
  constructor(problems: string[]) {
    super(
      `Invalid environment config:\n${problems.map((p) => `  - ${p}`).join("\n")}\n` +
        "Copy .env.example to .env.local and fill it in (or set the vars in Vercel).",
    );
    this.name = "ConfigError";
  }
}

function parseBoolean(value: string | undefined): boolean | null {
  const v = (value ?? "").trim().toLowerCase();
  if (v === "" || v === "false" || v === "0") return false;
  if (v === "true" || v === "1") return true;
  return null;
}

function isUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export function parsePublicEnv(env: RawPublicEnv): PublicConfig {
  const problems: string[] = [];
  const get = (key: keyof RawPublicEnv) => env[key]?.trim() ?? "";

  const requireDate = (key: keyof RawPublicEnv): DateConfig => {
    const raw = get(key);
    if (!raw) problems.push(`${key} is required (YYYY-MM-DD)`);
    const parsed = raw ? parseIsoDate(raw) : null;
    if (raw && !parsed) problems.push(`${key} must be a real date in YYYY-MM-DD form, got "${raw}"`);
    return parsed ?? { iso: "", short: "", long: "" };
  };

  const betaDate = requireDate("NEXT_PUBLIC_BETA_DATE");
  const admissionsCloseDate = requireDate("NEXT_PUBLIC_ADMISSIONS_CLOSE_DATE");

  const whatsappNumber = get("NEXT_PUBLIC_WHATSAPP_NUMBER");
  if (!whatsappNumber) problems.push("NEXT_PUBLIC_WHATSAPP_NUMBER is required");
  else if (!isWhatsappNumber(whatsappNumber)) {
    problems.push("NEXT_PUBLIC_WHATSAPP_NUMBER must be E.164 digits without the + (8–15 digits)");
  }

  const convexUrl = get("NEXT_PUBLIC_CONVEX_URL");
  if (!convexUrl) problems.push("NEXT_PUBLIC_CONVEX_URL is required (run `pnpm convex dev`)");
  else if (!isUrl(convexUrl)) problems.push("NEXT_PUBLIC_CONVEX_URL must be a URL");

  const analyticsEnabled = parseBoolean(env.NEXT_PUBLIC_ANALYTICS_ENABLED);
  if (analyticsEnabled === null) {
    problems.push('NEXT_PUBLIC_ANALYTICS_ENABLED must be "true" or "false"');
  }

  let analytics: PublicConfig["analytics"] = { enabled: false };
  if (analyticsEnabled) {
    const posthogKey = get("NEXT_PUBLIC_POSTHOG_KEY");
    const linkrunnerToken = get("NEXT_PUBLIC_LINKRUNNER_TOKEN");
    if (!posthogKey) problems.push("NEXT_PUBLIC_POSTHOG_KEY is required when analytics is enabled");
    if (!linkrunnerToken) {
      problems.push("NEXT_PUBLIC_LINKRUNNER_TOKEN is required when analytics is enabled");
    }
    analytics = { enabled: true, posthogKey, linkrunnerToken };
  }

  if (problems.length > 0) throw new ConfigError(problems);

  return { betaDate, admissionsCloseDate, whatsappNumber, convexUrl, analytics };
}

export const config: PublicConfig = parsePublicEnv({
  NEXT_PUBLIC_BETA_DATE: process.env.NEXT_PUBLIC_BETA_DATE,
  NEXT_PUBLIC_ADMISSIONS_CLOSE_DATE: process.env.NEXT_PUBLIC_ADMISSIONS_CLOSE_DATE,
  NEXT_PUBLIC_WHATSAPP_NUMBER: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER,
  NEXT_PUBLIC_ANALYTICS_ENABLED: process.env.NEXT_PUBLIC_ANALYTICS_ENABLED,
  NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY,
  NEXT_PUBLIC_LINKRUNNER_TOKEN: process.env.NEXT_PUBLIC_LINKRUNNER_TOKEN,
  NEXT_PUBLIC_CONVEX_URL: process.env.NEXT_PUBLIC_CONVEX_URL,
});
