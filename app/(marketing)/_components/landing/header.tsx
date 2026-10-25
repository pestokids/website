"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FocusEvent } from "react";
import { header, logo, type HeaderLink } from "@/content/landing";

const NAV_ID = "landing-links";

function NavLink({ link }: { link: HeaderLink }) {
  const content = (
    <>
      {link.label}
      {link.detail && <span className="detail">{link.detail}</span>}
    </>
  );
  if (link.href.startsWith("/")) return <Link href={link.href}>{content}</Link>;
  return (
    <a
      href={link.href}
      {...(link.external ? { target: "_blank", rel: "me noopener" } : {})}
    >
      {content}
    </a>
  );
}

/**
 * Logo and the four links. Inline on tablets and laptops; on phones (tall
 * layout, under 700px) they sit in a panel behind the menu button, which
 * closes on a tap outside, Escape, or focus leaving the header.
 */
export function Header() {
  const [open, setOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!headerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      if (headerRef.current?.contains(document.activeElement)) buttonRef.current?.focus();
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const onBlur = (e: FocusEvent<HTMLElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false);
  };

  return (
    <header ref={headerRef} className={open ? "top open" : "top"} onBlur={onBlur}>
      <Link className="logo" href={logo.href}>
        {logo.text}
      </Link>
      <button
        ref={buttonRef}
        className="menu-btn"
        type="button"
        aria-expanded={open}
        aria-controls={NAV_ID}
        aria-label={header.menuLabel}
        onClick={() => setOpen((o) => !o)}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <path d="M5 8h14M5 16h14" />
        </svg>
      </button>
      <nav className="links" id={NAV_ID} aria-label={header.navLabel} onClick={() => setOpen(false)}>
        {header.links.map((link) => (
          <NavLink key={link.id} link={link} />
        ))}
      </nav>
    </header>
  );
}
