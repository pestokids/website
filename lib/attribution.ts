/**
 * First-touch attribution: read the landing URL + referrer once, then classify
 * the visit into sourceType / source / campaign.
 *
 * Rules (first match wins):
 *   paid     click ID (fbclid/gclid/ttclid) or a paid utm_medium
 *            → utm_source, else meta/google/tiktok from the click ID
 *   organic  utm_source present → utm_source
 *   organic  external referrer  → instagram/facebook/whatsapp/google/linkedin/x, else the host
 *   direct   nothing            → "direct"
 *
 * `via` (e.g. via=desktop from the desktop QR code) is stored but never changes the source.
 */

export const ATTRIBUTION_PARAMS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "utm_id",
  "fbclid",
  "gclid",
  "ttclid",
  "via",
] as const;

export type AttributionParam = (typeof ATTRIBUTION_PARAMS)[number];

/** Raw first touch. All fields optional; empty values are dropped. */
export type Attribution = Partial<Record<AttributionParam | "landing_url" | "referrer", string>>;

export type SourceType = "paid" | "organic" | "direct";

export type Classification = {
  sourceType: SourceType;
  source: string;
  campaign: string | null;
};

const PAID_MEDIUMS = new Set(["paid", "cpc", "paid_social", "ads"]);

const CLICK_ID_SOURCES = [
  ["fbclid", "meta"],
  ["gclid", "google"],
  ["ttclid", "tiktok"],
] as const;

/** Known referrer hosts. Matched against the host and all its parent domains. */
const REFERRER_SOURCES: Record<string, string> = {
  "instagram.com": "instagram",
  "facebook.com": "facebook",
  "fb.com": "facebook",
  "fb.me": "facebook",
  "messenger.com": "facebook",
  "whatsapp.com": "whatsapp",
  "whatsapp.net": "whatsapp",
  "wa.me": "whatsapp",
  "linkedin.com": "linkedin",
  "lnkd.in": "linkedin",
  "x.com": "x",
  "twitter.com": "x",
  "t.co": "x",
};

// google.com, google.co.in, google.com.au, …
const GOOGLE_HOST = /(^|\.)google\.(com|[a-z]{2}|com?\.[a-z]{2})$/;

function clean(value: string | null | undefined): string | undefined {
  const v = value?.trim();
  return v ? v : undefined;
}

function hostOf(url: string | undefined): string | null {
  if (!url) return null;
  try {
    const { hostname, protocol } = new URL(url);
    // Android app referrers look like android-app://com.instagram.android/
    if (protocol === "android-app:") return hostname.toLowerCase();
    return hostname.toLowerCase().replace(/^www\./, "") || null;
  } catch {
    return null;
  }
}

/** Collects the attribution params from a landing URL plus the document referrer. */
export function readAttribution(landingUrl: string, referrer: string): Attribution {
  const out: Attribution = {};
  let params: URLSearchParams;
  try {
    params = new URL(landingUrl).searchParams;
  } catch {
    params = new URLSearchParams();
  }
  for (const key of ATTRIBUTION_PARAMS) {
    const value = clean(params.get(key));
    if (value) out[key] = value;
  }
  const landing = clean(landingUrl);
  if (landing) out.landing_url = landing;
  const ref = clean(referrer);
  if (ref) out.referrer = ref;
  return out;
}

/** Maps a referrer host to a source name: a known network, else the bare host. */
export function sourceFromReferrerHost(host: string): string {
  if (GOOGLE_HOST.test(host)) return "google";
  // Android app referrers: android-app://com.instagram.android etc.
  if (host.startsWith("com.instagram.")) return "instagram";
  if (host.startsWith("com.facebook.")) return "facebook";
  if (host.startsWith("com.whatsapp")) return "whatsapp";
  if (host.startsWith("com.google.")) return "google";
  if (host.startsWith("com.linkedin.")) return "linkedin";
  if (host.startsWith("com.twitter.")) return "x";

  const labels = host.split(".");
  for (let i = 0; i < labels.length - 1; i++) {
    const match = REFERRER_SOURCES[labels.slice(i).join(".")];
    if (match) return match;
  }
  return host;
}

/** Referrer host if it's external to the landing page's site, else null. */
function externalReferrerHost(a: Attribution): string | null {
  const refHost = hostOf(a.referrer);
  if (!refHost) return null;
  const ownHost = hostOf(a.landing_url);
  if (ownHost && refHost === ownHost) return null;
  return refHost;
}

export function classifyAttribution(a: Attribution): Classification {
  const campaign = clean(a.utm_campaign) ?? null;
  const utmSource = clean(a.utm_source)?.toLowerCase();
  const utmMedium = clean(a.utm_medium)?.toLowerCase();
  const refHost = externalReferrerHost(a);

  const clickSource = CLICK_ID_SOURCES.find(([key]) => clean(a[key]))?.[1];
  if (clickSource || (utmMedium && PAID_MEDIUMS.has(utmMedium))) {
    const source =
      utmSource ?? clickSource ?? (refHost ? sourceFromReferrerHost(refHost) : "unknown");
    return { sourceType: "paid", source, campaign };
  }

  if (utmSource) return { sourceType: "organic", source: utmSource, campaign };

  if (refHost) return { sourceType: "organic", source: sourceFromReferrerHost(refHost), campaign };

  return { sourceType: "direct", source: "direct", campaign };
}
