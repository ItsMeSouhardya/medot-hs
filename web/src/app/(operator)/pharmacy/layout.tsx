import Link from "next/link";
import PharmacySignOut from "@/components/pharmacy/sign-out";
import { isPharmacyAuthConfigured } from "@/lib/pharmacy-auth";

export default function PharmacyLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="pharmacy-nav">
        <nav aria-label="Pharmacy navigation">
          <Link href="/">MEDOT</Link>
          <Link href="/pharmacy">Overview</Link>
          <Link href="/pharmacy/provision">Provision a clip</Link>
          <Link href="/pharmacy/tags">Recent tags</Link>
          {isPharmacyAuthConfigured() && <PharmacySignOut />}
        </nav>
      </header>
      {children}
    </>
  );
}
