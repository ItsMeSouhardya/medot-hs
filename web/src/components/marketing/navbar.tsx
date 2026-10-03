"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import MedotLogo from "../brand/medot-logo";
import Icon from "./icon";
import { caregiverUrl, detectiveUrl, finderUrl, repositoryUrl, sharingUrl, remindersUrl } from "./site-links";

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);

  function closeDestination(event: React.MouseEvent<HTMLAnchorElement>) {
    setOpen(false);
    const hash = event.currentTarget.hash;
    if (hash && event.currentTarget.pathname === window.location.pathname) {
      document.getElementById(hash.slice(1))?.focus({ preventScroll: true });
    }
    event.currentTarget.closest("details")?.removeAttribute("open");
  }

  return (
    <header className="marketing-header">
      <a className="marketing-skip" href="#home-content">Skip to content</a>
      <nav className="marketing-nav" aria-label="Main navigation" onKeyDown={event => {
        if (event.key !== "Escape") return;
        const details = (event.target as HTMLElement).closest("details[open]");
        if (details) {
          details.removeAttribute("open");
          details.querySelector("summary")?.focus();
        } else if (open) {
          setOpen(false);
          trigger.current?.focus();
        }
      }}>
        <Link href="/" className="marketing-brand" aria-label="MEDOT home"><MedotLogo /></Link>
        <button ref={trigger} className="marketing-menu-button" aria-label={open ? "Close navigation" : "Open navigation"} aria-expanded={open} aria-controls="marketing-links" onClick={() => setOpen(!open)}>
          <Icon name={open ? "close" : "menu"} /> {open ? "Close" : "Menu"}
        </button>
        <div id="marketing-links" className={`marketing-links ${open ? "is-open" : ""}`}>
          <Link href={finderUrl} onClick={closeDestination}>Find my medicine</Link>
          <a href="#how-it-works" onClick={closeDestination}>How it works</a>
          <a href="#accessibility" onClick={closeDestination}>Accessibility</a>
          <a href="#for-pharmacies" onClick={closeDestination}>For pharmacies</a>
          <details className="marketing-dropdown">
            <summary>Resources <Icon name="chevron" /></summary>
            <div><Link href={remindersUrl} onClick={closeDestination}>Medicine reminders</Link><Link href={detectiveUrl} onClick={closeDestination}>Medication Detective</Link><Link href={sharingUrl} onClick={closeDestination}>Private sharing controls</Link><Link href={caregiverUrl} onClick={closeDestination}>Caregiver dashboard</Link><a href="#faq" onClick={closeDestination}>Frequently asked questions</a><a href={repositoryUrl} onClick={closeDestination}>GitHub repository</a></div>
          </details>
          <details className="marketing-dropdown">
            <summary>Language preview <Icon name="chevron" /></summary>
            <div>{([['en', 'English'], ['bn', 'বাংলা'], ['hi', 'हिन्दी']] as const).map(([language, label]) => <Link key={language} lang={language} href={`/?preview=${language}#language-preview`} onClick={closeDestination}>{label}</Link>)}</div>
          </details>
          <Link className="marketing-sign-in" href="/pharmacy" onClick={closeDestination}>Pharmacy sign in <Icon name="arrow" /></Link>
        </div>
      </nav>
    </header>
  );
}
