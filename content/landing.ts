/**
 * All copy for the landing page (/). Components import from here; nothing
 * user-facing is hard-coded in them.
 *
 * Placeholder text until the copy session; the structure stays.
 */

export const meta = {
  /** Under 60 characters, contains "Pesto". */
  title: "Pesto · For kids who ask why?",
  /** Under 155 characters, contains "Pesto Kids". */
  description:
    "Pesto Kids is a warm, beautifully made app for curious kids who ask why. Join the Founding Families waitlist.",
  url: "https://pestokids.com/",
  siteName: "Pesto",
  /** Describes the felt scene, for the share image. The page itself hides the scene from screen readers. */
  sceneAlt:
    "Pesto the green parrot peeks out of a felt meadow of flowers under a starry night sky with a crescent moon.",
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
      href: "mailto:hello@pestokids.com",
      detail: "hello@pestokids.com",
    },
    {
      id: "instagram",
      label: "Instagram",
      href: "https://www.instagram.com/pesto.kids",
      detail: "@pesto.kids",
      external: true,
    },
  ] satisfies HeaderLink[],
};
