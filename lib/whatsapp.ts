/**
 * The "Say hi to Pesto" wa.me link, shared by screen 9 and the confirmation email.
 */
import { whatsappPrefillFor } from "../content/apply";

/** E.164 digits without the leading +. */
export const E164_NO_PLUS = /^[1-9]\d{7,14}$/;

export function isWhatsappNumber(value: string): boolean {
  return E164_NO_PLUS.test(value);
}

/** https://wa.me/{number}?text={prefill with the ref code} */
export function whatsappLink(number: string, refCode: string): string {
  return `https://wa.me/${number}?text=${encodeURIComponent(whatsappPrefillFor(refCode))}`;
}
