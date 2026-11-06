import type { Metadata, Viewport } from "next";
import type { CSSProperties } from "react";
import { IconSticker, PestoSticker, Sparkle } from "@/app/_components/sticker";
import { legalChrome, legalPages, type LegalPageName } from "@/content/legal";
import { DELETE_ACCOUNT_ID, isAccountDeletion, readLegal, type LegalSection } from "@/lib/legal";
import { Header } from "./landing/header";
import { pageMetadata } from "./page-metadata";
import "./legal-page.css";

export function legalMetadata(name: LegalPageName): Metadata {
  const { title, description } = legalPages[name];
  return pageMetadata({ title, description, path: `/${name}` });
}

/** The night sky tints the browser's bars, as on the landing page. */
export const legalViewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#13235f",
};

/** Sticker tilts for the short version's bullets, in turn. */
const TILTS = [-4, 3.5, -3, 4];

/** Static stars, in % of the hero, and their size in px. */
const STARS = [
  { left: 2, top: 24, size: 8 },
  { left: 31, top: 2, size: 6 },
  { left: 74, top: 4, size: 7 },
  { left: 97, top: 46, size: 8 },
  { left: 64, top: 96, size: 6 },
  { left: 90, top: 100, size: 5 },
]

/** A few static stars and a crescent moon, in felt yellow. Decorative. */
function NightSky() {
  return (
    <div className="legal-sky" aria-hidden="true">
      {STARS.map((star) => (
        <span
          key={`${star.left}-${star.top}`}
          className="legal-star"
          style={{ left: `${star.left}%`, top: `${star.top}%` } as CSSProperties}
        >
          <Sparkle size={star.size} />
        </span>
      ))}
      <svg className="legal-moon" viewBox="0 0 40 40" focusable="false">
        <path d="M26 4a17 17 0 1 0 10.5 26.5A14 14 0 0 1 26 4Z" />
      </svg>
    </div>
  );
}

function Chevron() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

/** The numbered list of sections, for the phone disclosure and the desktop sidebar. */
function SectionList({ sections }: { sections: LegalSection[] }) {
  return (
    <ol className="legal-toc-list">
      {sections.map((s) => (
        <li key={s.id}>
          <a href={`#${s.id}`} className={isAccountDeletion(s) ? "is-delete" : undefined}>
            <span className="legal-toc-num">{s.number}.</span> {s.title}
          </a>
        </li>
      ))}
    </ol>
  );
}

function Section({ section }: { section: LegalSection }) {
  const highlighted = section.id === DELETE_ACCOUNT_ID;
  return (
    <section className={highlighted ? "legal-section is-delete" : "legal-section"} aria-labelledby={section.id}>
      {/* The number stays real text, so the heading reads "10. Deleting your account". */}
      <h2 id={section.id}>
        <span className="legal-num">
          {section.number}
          <span className="sr-only">.</span>
        </span>{" "}
        {section.title}
      </h2>
      {section.note && (
        <div className="legal-note">
          <PestoSticker size={34} tilt={-6} className="legal-note-pesto" />
          <p>
            <span className="legal-note-label">
              {legalChrome.noteLabel}
              <span className="sr-only">:</span>
            </span>{" "}
            <span className="legal-note-text" dangerouslySetInnerHTML={{ __html: section.note }} />
          </p>
        </div>
      )}
      <div className="legal-text" dangerouslySetInnerHTML={{ __html: section.html }} />
    </section>
  );
}

/**
 * /privacy and /terms: the landing page's night sky on top, a white
 * "daylight" sheet for reading, and the night again at the bottom. The text
 * is the markdown in content/legal, rendered on the server into static HTML;
 * the only client JS is the header's phone menu.
 */
export function LegalPage({ name }: { name: LegalPageName }) {
  const page = legalPages[name];
  const { intro, short, sections } = readLegal(name);

  return (
    <main className="legal">
      <div className="legal-hero">
        <NightSky />
        <div className="legal-wrap">
          <Header current={name} prefetch={false} />
          <div className="legal-hero-body">
            <p className="legal-chip">{legalChrome.updated}</p>
            <h1>
              {page.heading.lead} <span className="legal-accent">{page.heading.accent}</span>
            </h1>
            <p className="legal-sub">{page.subtitle}</p>
            <div className="legal-mascot" aria-hidden="true">
              <p className="legal-bubble">{page.bubble}</p>
              <PestoSticker size={148} tilt={6} className="legal-mascot-pesto" />
            </div>
          </div>
        </div>
      </div>

      <div className="legal-sheet">
        <div className="legal-wrap legal-layout">
          <nav className="legal-sidebar" aria-labelledby="legal-sidebar-title">
            <p id="legal-sidebar-title" className="legal-sidebar-title">
              {legalChrome.onThisPage}
            </p>
            <SectionList sections={sections} />
          </nav>

          <article className="legal-content">
            <div className="legal-intro legal-text" dangerouslySetInnerHTML={{ __html: intro }} />

            {short && (
              <section className="legal-short" aria-labelledby="short-version">
                <h2 id="short-version">{short.title}</h2>
                <ul>
                  {short.items.map((item, i) => {
                    const { icon, tint } = page.icons[i % page.icons.length];
                    return (
                      <li key={item}>
                        <IconSticker icon={icon} tint={tint} size={44} border={3} tilt={TILTS[i % TILTS.length]} />
                        <span dangerouslySetInnerHTML={{ __html: item }} />
                      </li>
                    );
                  })}
                </ul>
                {short.after && <div className="legal-short-after" dangerouslySetInnerHTML={{ __html: short.after }} />}
              </section>
            )}

            <details className="legal-jump">
              <summary>
                {legalChrome.jumpTo}
                <Chevron />
              </summary>
              <nav aria-label={legalChrome.jumpTo}>
                <SectionList sections={sections} />
              </nav>
            </details>

            {sections.map((section) => (
              <Section key={section.id} section={section} />
            ))}
          </article>
        </div>
      </div>

      <footer className="legal-foot">
        <div className="legal-wrap legal-foot-row">
          <div className="legal-foot-copy">
            <p className="legal-foot-title">{legalChrome.questions}</p>
            <p className="legal-foot-sub">{legalChrome.replies}</p>
          </div>
          <a className="legal-cta" href={`mailto:${page.email}`}>
            {page.email}
          </a>
          <nav className="legal-foot-links" aria-label={legalChrome.linksLabel}>
            {legalChrome.links.map((link) => (
              <a key={link.id} href={link.href} aria-current={link.id === name ? "page" : undefined}>
                {link.label}
              </a>
            ))}
          </nav>
        </div>
      </footer>
    </main>
  );
}
