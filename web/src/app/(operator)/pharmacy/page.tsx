import Link from "next/link";
import { getPharmacyAccess } from "@/lib/pharmacy-auth";
import { pharmacyPageDenied } from "@/lib/pharmacy-page-access";

export const dynamic = "force-dynamic";

export default async function PharmacyPage() {
  const access = await getPharmacyAccess();
  if (access.kind !== "authorized") return pharmacyPageDenied(access);
  return (
    <main className="operator-page">
      <p className="eyebrow">MEDOT pharmacy</p>
      <h1>Prepare a medicine clip</h1>
      <p>Match the sample strip, record its verified details, then write and independently read back the clip before activation.</p>
      <Link className="button-link" href="/pharmacy/provision">Provision a MEDOT clip</Link>
      <p><Link href="/pharmacy/tags">Resume or revoke a recent tag</Link></p>
      <p className="small-note">Hackathon demo only. Use sample packaging and recorded demo instructions.</p>
    </main>
  );
}
