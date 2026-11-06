"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FocusEvent } from "react";
import { header, logo, type HeaderLink } from "@/content/landing";
import "./header.css";

function NavLink({
  link,
  current,
  prefetch,
  onClick,
}: {
  link: HeaderLink;
  current: boolean;
  prefetch?: false;
  onClick?: () => void;
}) {
  const content = (
    <>
      {link.label}
      {link.detail && <span className="detail">{link.detail}</span>}
    </>
  );
  if (link.href.startsWith("/")) {
    return (
      <Link href={link.href} prefetch={prefetch} onClick={onClick} aria-current={current ? "page" : undefined}>
        {content}
      </Link>
    );
  }
  return (
    <a
      href={link.href}
      onClick={onClick}
      {...(link.external ? { target: "_blank", rel: "me noopener" } : {})}
    >
      {content}
    </a>
  );
}

/**
 * Logo and the four links, on the landing page and atop /privacy and /terms.
 * Inline on tablets and laptops; on phones (tall layout, under 700px) they
 * sit in a panel behind the menu button, which closes on a tap outside,
 * Escape, or focus leaving the header.
 *
 * `current` marks the page you're on. The callbacks are for the landing
 * page's events (landing-header.tsx); the legal pages pass none, so they
 * don't load the analytics code. They also pass `prefetch={false}`:
 * prefetching / would load the landing page's code on every legal page.
 */
export function Header({
  current,
  prefetch,
  onLinkClick,
  onMenuOpen,
}: {
  current?: HeaderLink["id"];
  prefetch?: false;
  onLinkClick?: (id: HeaderLink["id"]) => void;
  onMenuOpen?: () => void;
}) {
  // Next keeps a page you left in the DOM, hidden, so each page needs its own id.
  const navId = `${current ?? "landing"}-links`;
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
    <header ref={headerRef} className={open ? "night-header open" : "night-header"} onBlur={onBlur}>
      <Link className="logo" href={logo.href} prefetch={prefetch}>
        {logo.text}
      </Link>
      <button
        ref={buttonRef}
        className="menu-btn"
        type="button"
        aria-expanded={open}
        aria-controls={navId}
        aria-label={header.menuLabel}
        onClick={() => {
          if (!open) onMenuOpen?.();
          setOpen(!open);
        }}
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
      <nav className="links" id={navId} aria-label={header.navLabel} onClick={() => setOpen(false)}>
        {header.links.map((link) => (
          <NavLink
            key={link.id}
            link={link}
            current={link.id === current}
            prefetch={prefetch}
            onClick={onLinkClick && (() => onLinkClick(link.id))}
          />
        ))}
      </nav>
    </header>
  );
}
