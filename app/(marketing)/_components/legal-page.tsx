import type { Metadata } from "next";
import { legalPages, type LegalPageName } from "@/content/legal";
import { renderLegal } from "@/lib/legal";
import { pageMetadata } from "./page-metadata";
import "./legal-page.css";

export function legalMetadata(name: LegalPageName): Metadata {
  const { title, description } = legalPages[name];
  return pageMetadata({ title, description, path: `/${name}` });
}

/**
 * /privacy and /terms: the markdown in content/legal, rendered on the server
 * into static HTML. No client JS and no footer links.
 */
export function LegalPage({ name }: { name: LegalPageName }) {
  return (
    <main className="bg-soft-wash min-h-dvh px-[var(--margin-page)] pt-10 pb-16">
      <article
        className="legal-prose mx-auto max-w-[680px]"
        dangerouslySetInnerHTML={{ __html: renderLegal(name) }}
      />
    </main>
  );
}
