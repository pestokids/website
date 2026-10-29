/**
 * All copy for /contact: the support URL given to the App Store and Google
 * Play. Apple needs it to open a page with contact details, not a bare mailto.
 */
import { brand } from "./landing";

export const contact = {
  /** Under 60 characters, contains "Pesto". */
  title: "Contact · Pesto",
  /** Under 155 characters. */
  description:
    "Questions about Pesto or the Pesto app? Email the Pesto team at hello@pestokids.com. We usually reply within a day or two.",
  heading: "Contact us",
  button: {
    label: "Email us",
    href: `mailto:${brand.email}`,
  },
  email: brand.email,
  reply: "We usually reply within a day or two.",
  linksLabel: "Home, privacy and terms",
  links: [
    { label: "Home", href: "/" },
    { label: "Privacy", href: "/privacy" },
    { label: "Terms", href: "/terms" },
  ],
};
