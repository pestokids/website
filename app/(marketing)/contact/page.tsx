import type { CSSProperties } from "react";
import type { Viewport } from "next";
import { contact } from "@/content/contact";
import { logo } from "@/content/landing";
import { pageMetadata } from "../_components/page-metadata";
import "./contact.css";

// Prerendered at build time; nothing here may read the request.
export const ensureStatic = "navigation";

export const metadata = pageMetadata({ title: contact.title, description: contact.description, path: "/contact" });

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#13235f",
};

/** Felt-yellow stars that twinkle in the sky, in % of the page. */
const TWINKLES = [
  { left: 12, top: 18, size: 9, time: 3.6, delay: 0 },
  { left: 26, top: 8, size: 6, time: 5, delay: -1.2 },
  { left: 64, top: 12, size: 7, time: 4.2, delay: -2.4 },
  { left: 90, top: 34, size: 6, time: 3.2, delay: -0.6 },
  { left: 8, top: 62, size: 7, time: 4.8, delay: -3 },
  { left: 84, top: 72, size: 9, time: 5.4, delay: -1.8 },
  { left: 40, top: 84, size: 5, time: 3.9, delay: -2 },
];

/**
 * /contact: the support URL for the app stores. The landing page's night sky
 * without the art, one button that opens an email, and the address in plain
 * text for devices with no mail app. Plain links, not next/link: the page
 * ships no navigation code of its own.
 */
export default function ContactPage() {
  return (
    <main className="contact">
      <div className="sky" aria-hidden="true">
        {TWINKLES.map((t) => (
          <i
            key={`${t.left}-${t.top}`}
            className="twinkle"
            style={
              {
                left: `${t.left}%`,
                top: `${t.top}%`,
                "--s": `${t.size}px`,
                "--t": `${t.time}s`,
                "--delay": `${t.delay}s`,
              } as CSSProperties
            }
          />
        ))}
      </div>
      <header>
        <a className="logo" href={logo.href}>
          {logo.text}
        </a>
      </header>
      <section className="copy">
        <h1>{contact.heading}</h1>
        <a className="cta" href={contact.button.href}>
          {contact.button.label}
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <rect x="3" y="5.5" width="18" height="13" rx="2.5" />
            <path d="m4 7.5 8 6 8-6" />
          </svg>
        </a>
        <p className="address">{contact.email}</p>
        <p className="reply">{contact.reply}</p>
      </section>
      <nav className="links" aria-label={contact.linksLabel}>
        {contact.links.map((link) => (
          <a key={link.href} href={link.href}>
            {link.label}
          </a>
        ))}
      </nav>
    </main>
  );
}
