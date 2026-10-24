/**
 * Can an email domain receive mail? Answers from DNS: MX records, or an A/AAAA
 * record when there are none (RFC 5321 implicit MX). A null MX (RFC 7505,
 * "." meaning "no mail here") or a domain that doesn't exist can't.
 *
 * Pure: the resolver is passed in (node:dns/promises on the server, a fake in
 * tests), so this file is safe to import from client code for
 * `isKnownMailDomain`.
 */
import { emailDomains, emailKnownDomains, emailTypoDomains } from "../content/apply";

/** `unknown`: the lookup failed or timed out. Treated as deliverable: never block on our own error. */
export type MailDomainStatus = "deliverable" | "undeliverable" | "unknown";

export type MailResolver = {
  resolveMx(domain: string): Promise<{ exchange: string; priority: number }[]>;
  resolve4(domain: string): Promise<string[]>;
  resolve6(domain: string): Promise<string[]>;
};

/**
 * Domains that skip the lookup: the big providers (from the email screen's
 * chips and typo lists) and the RFC 2606 example domains. Those can't receive
 * mail, but they're reserved for tests, and the e2e suite submits with them.
 */
const KNOWN_MAIL_DOMAINS = new Set<string>([
  ...emailDomains,
  ...emailTypoDomains,
  ...emailKnownDomains,
  "example.com",
  "example.org",
  "example.net",
]);

export function isKnownMailDomain(domain: string): boolean {
  return KNOWN_MAIL_DOMAINS.has(domain.toLowerCase());
}

/** The part after the last "@", lowercased, or null if there isn't one. */
export function domainOf(email: string): string | null {
  const at = email.lastIndexOf("@");
  const domain = at === -1 ? "" : email.slice(at + 1).trim().toLowerCase();
  return domain || null;
}

// Only syntactically plausible hostnames are looked up.
const HOSTNAME = /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;

export function isLookupableDomain(domain: string): boolean {
  return HOSTNAME.test(domain);
}

const NO_SUCH_DOMAIN = "ENOTFOUND";
const NO_RECORDS = "ENODATA";

function errorCode(error: unknown): string | undefined {
  return typeof error === "object" && error !== null && "code" in error
    ? String((error as { code: unknown }).code)
    : undefined;
}

/** Address records exist? `null` when the lookup itself failed. */
async function hasAddress(resolver: MailResolver, domain: string): Promise<boolean | null> {
  const results = await Promise.allSettled([resolver.resolve4(domain), resolver.resolve6(domain)]);
  if (results.some((r) => r.status === "fulfilled" && r.value.length > 0)) return true;
  const definite = results.every(
    (r) =>
      r.status === "fulfilled" || [NO_SUCH_DOMAIN, NO_RECORDS].includes(errorCode(r.reason) ?? ""),
  );
  return definite ? false : null;
}

export async function mailDomainStatus(
  domain: string,
  resolver: MailResolver,
): Promise<MailDomainStatus> {
  const name = domain.toLowerCase();
  if (isKnownMailDomain(name)) return "deliverable";
  if (!isLookupableDomain(name)) return "undeliverable";

  try {
    const records = await resolver.resolveMx(name);
    // Node reports a null MX as an empty exchange.
    const usable = records.filter((r) => r.exchange !== "" && r.exchange !== ".");
    if (usable.length > 0) return "deliverable";
    if (records.length > 0) return "undeliverable";
  } catch (error) {
    const code = errorCode(error);
    if (code === NO_SUCH_DOMAIN) return "undeliverable";
    if (code !== NO_RECORDS) return "unknown";
  }

  // No MX records: mail goes to the domain's own address, if it has one.
  const address = await hasAddress(resolver, name);
  return address === null ? "unknown" : address ? "deliverable" : "undeliverable";
}
