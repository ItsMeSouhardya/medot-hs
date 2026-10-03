"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
const items = [
  { href: "/pharmacy", label: "Overview", path: "M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z" },
  { href: "/pharmacy/provision", label: "Provision a clip", path: "M12 5v14 M5 12h14" },
  { href: "/pharmacy/tags", label: "Recent tags", path: "M4 4h16v16H4z M8 8h8 M8 12h8 M8 16h5" },
  { href: "/pharmacy/sharing", label: "Caregiver setup", path: "M4 11h16v10H4z M8 11V7a4 4 0 018 0v4" },
];
export default function PharmacyNavigation() {
  const pathname = usePathname();
  return <nav className="operator-navigation" aria-label="Pharmacy navigation">{items.map(item => <Link key={item.href} href={item.href} aria-current={pathname === item.href ? "page" : undefined}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={item.path} /></svg>{item.label}</Link>)}</nav>;
}
