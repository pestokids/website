import { brand, meta } from "@/content/landing";
import { absoluteUrl, SITE_URL } from "@/lib/site";

/**
 * schema.org data for /: the Organization (both names, logo, Instagram,
 * email) and the WebSite, which is where Google reads the site name it shows
 * in results.
 */
export const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: brand.name,
      alternateName: brand.alternateName,
      url: absoluteUrl("/"),
      logo: absoluteUrl("/icon.png"),
      description: meta.description,
      email: brand.email,
      contactPoint: { "@type": "ContactPoint", contactType: "customer support", email: brand.email },
      sameAs: [brand.instagram],
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      name: brand.name,
      alternateName: brand.alternateName,
      url: absoluteUrl("/"),
      description: meta.description,
      publisher: { "@id": `${SITE_URL}/#organization` },
    },
  ],
};

/** The JSON-LD script. `<` is escaped so no string in it can close the tag. */
export function StructuredData() {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }}
    />
  );
}
