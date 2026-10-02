import Link from "next/link";
import PharmacySignOut from "@/components/pharmacy/sign-out";
import PharmacyNavigation from "@/components/pharmacy/navigation";
import { getPharmacyAccess, isPharmacyAuthConfigured } from "@/lib/pharmacy-auth";
import "@/components/pharmacy/pharmacy.css";

export default async function PharmacyLayout({ children }: { children: React.ReactNode }) {
  const access = await getPharmacyAccess();
  return (
    <div className="pharmacy-shell">
      <a className="operator-skip-link" href="#pharmacy-content">Skip to workspace</a>
      <aside className="operator-sidebar"><Link className="operator-wordmark" href="/">MEDOT<span>Pharmacy workspace</span></Link><PharmacyNavigation /><div className="operator-session"><p>{access.kind === "authorized" ? "Pharmacy access verified" : "Pharmacy sign-in required"}</p>{isPharmacyAuthConfigured() && <PharmacySignOut />}</div><p className="sidebar-note">Accessible information.<br />One medicine strip at a time.</p></aside>
      <div className="operator-content" id="pharmacy-content" tabIndex={-1}>{children}<footer className="operator-footer">Hackathon demo only. Recorded information does not establish medicine authenticity.</footer></div>
    </div>
  );
}
