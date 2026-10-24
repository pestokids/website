/**
 * Asks the server whether the address's domain can receive mail
 * (app/api/email-domain). Fails open: only a definite "undeliverable" answer
 * returns false, so a slow or broken check never stops a submit.
 */
import { domainOf, isKnownMailDomain, type MailDomainStatus } from "@/lib/mail-domain";

const TIMEOUT_MS = 5_000;

export async function canReceiveMail(email: string, fetchImpl: typeof fetch = fetch): Promise<boolean> {
  const domain = domainOf(email);
  if (!domain || isKnownMailDomain(domain)) return true;
  try {
    const response = await fetchImpl(`/api/email-domain?domain=${encodeURIComponent(domain)}`, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) return true;
    const { status } = (await response.json()) as { status?: MailDomainStatus };
    return status !== "undeliverable";
  } catch {
    return true;
  }
}
