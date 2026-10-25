/**
 * All copy for the landing page (/). Components import from here; nothing
 * user-facing is hard-coded in them.
 *
 * Placeholder text until the copy session; the structure stays.
 */

/** The facts every search engine, link preview and AI assistant should agree on. */
export const brand = {
  name: "Pesto",
  /** Also known as. Search should find the site under both names. */
  alternateName: "Pesto Kids",
  email: "hello@pestokids.com",
  instagram: "https://www.instagram.com/pesto.kids",
};

export const meta = {
  /** Under 60 characters, contains "Pesto". */
  title: "Pesto Kids · For kids who ask why?",
  /**
   * Under 155 characters, contains "Pesto" and "Pesto Kids". Also the one-line
   * description in the structured data and /llms.txt.
   */
  description:
    "Pesto, also known as Pesto Kids, is a warm, beautifully made learning app for curious kids aged 3 to 8. Join the Founding Families waitlist.",
  siteName: "Pesto",
  /** Alt text for the share card (scripts/share-art.mjs): the wordmark next to flat Pesto. */
  shareAlt: "The word “pesto” next to Pesto, a cartoon green parrot with a big orange beak, on dark green.",
};

/** The h1, one line per entry. The highlight is the last line, in orange. */
export const tagline = {
  lines: ["For kids", "who ask"],
  highlight: "why?",
};

export const cta = {
  label: "Get in early",
  href: "/apply",
};

export const logo = {
  text: "pesto",
  href: "/",
};

export type HeaderLink = {
  /** Stable id for tracking. */
  id: "privacy" | "terms" | "contact" | "instagram";
  label: string;
  href: string;
  /** Shown under the label in the phone menu. */
  detail?: string;
  /** Opens in a new tab, with rel="me noopener". */
  external?: boolean;
};

export const header = {
  menuLabel: "Menu",
  navLabel: "Privacy, terms, contact and Instagram",
  links: [
    { id: "privacy", label: "Privacy", href: "/privacy" },
    { id: "terms", label: "Terms", href: "/terms" },
    {
      id: "contact",
      label: "Contact",
      href: `mailto:${brand.email}`,
      detail: brand.email,
    },
    {
      id: "instagram",
      label: "Instagram",
      href: brand.instagram,
      detail: "@pesto.kids",
      external: true,
    },
  ] satisfies HeaderLink[],
};
