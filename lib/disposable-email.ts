/**
 * Throwaway-inbox domains that applications can't use: the Founding Family
 * letter has to reach a parent who'll read it.
 *
 * Kept short on purpose: well-known temporary-mail services only. Privacy
 * relays that forward to a real inbox (Apple Hide My Email, Firefox Relay,
 * SimpleLogin, DuckDuckGo) are deliberately not listed.
 *
 * Pure and imported with relative paths only, so the Convex bundler can
 * include it (see lib/application.ts).
 */
export const disposableEmailDomains = [
  "10minutemail.com",
  "10minutemail.net",
  "1secmail.com",
  "1secmail.net",
  "1secmail.org",
  "armyspy.com",
  "binkmail.com",
  "bobmail.info",
  "chammy.info",
  "cuvox.de",
  "dayrep.com",
  "devnullmail.com",
  "discard.email",
  "dispostable.com",
  "dropmail.me",
  "einrot.com",
  "emailfake.com",
  "emailondeck.com",
  "fakeinbox.com",
  "fleckens.hu",
  "generator.email",
  "getairmail.com",
  "getnada.com",
  "grr.la",
  "guerrillamail.biz",
  "guerrillamail.com",
  "guerrillamail.de",
  "guerrillamail.info",
  "guerrillamail.net",
  "guerrillamail.org",
  "guerrillamailblock.com",
  "gustr.com",
  "harakirimail.com",
  "inboxkitten.com",
  "jourrapide.com",
  "letthemeatspam.com",
  "mailcatch.com",
  "maildrop.cc",
  "mailinater.com",
  "mailinator.com",
  "mailinator.net",
  "mailinator2.com",
  "mailnesia.com",
  "mailpoof.com",
  "mailsac.com",
  "mintemail.com",
  "moakt.com",
  "mohmal.com",
  "mytemp.email",
  "notmailinator.com",
  "pokemail.net",
  "rhyta.com",
  "sharklasers.com",
  "sogetthis.com",
  "spam4.me",
  "spamgourmet.com",
  "superrito.com",
  "teleworm.us",
  "temp-mail.io",
  "temp-mail.org",
  "tempail.com",
  "tempmailo.com",
  "tempr.email",
  "thisisnotmyrealemail.com",
  "throwawaymail.com",
  "trash-mail.com",
  "trashmail.com",
  "trashmail.de",
  "trashmail.net",
  "yopmail.com",
  "yopmail.fr",
  "yopmail.net",
] as const;

const blocked = new Set<string>(disposableEmailDomains);

/**
 * True if a normalised email's domain, or any parent domain of it, is a
 * known throwaway inbox ("x@mailinator.com", "x@eu.mailinator.com").
 */
export function isDisposableEmail(email: string): boolean {
  const domain = email.slice(email.lastIndexOf("@") + 1).toLowerCase();
  const labels = domain.split(".");
  for (let i = 0; i < labels.length - 1; i++) {
    if (blocked.has(labels.slice(i).join("."))) return true;
  }
  return false;
}
