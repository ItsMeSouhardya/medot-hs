import Link from "next/link";
import { getPharmacyAccess } from "@/lib/pharmacy-auth";
import { pharmacyPageDenied } from "@/lib/pharmacy-page-access";
import { getOperatorCounts, listOperatorTags, type OperatorCounts, type OperatorTag } from "@/lib/operator-tags";
import TagTable from "@/components/pharmacy/tag-table";
export const dynamic = "force-dynamic";
export default async function PharmacyPage() {
  const access = await getPharmacyAccess();
  if (access.kind !== "authorized") return pharmacyPageDenied(access);
  let counts: OperatorCounts;
  let tags: OperatorTag[];
  try { [counts, tags] = await Promise.all([getOperatorCounts(), listOperatorTags(process.env.APP_ORIGIN ?? "")]); }
  catch { return <main className="operator-page"><h1>Overview unavailable</h1><p role="alert">The saved records could not be loaded. Check the demo database and site origin, then reload.</p><Link href="/pharmacy">Reload overview</Link></main>; }
  return <main className="operator-page"><header className="operator-heading"><div><p className="eyebrow">Pharmacy workspace</p><h1>Every clip, clearly linked.</h1><p>Match a sample strip, review its details and read back the tag before activation.</p></div><Link className="button-link" href="/pharmacy/provision">Provision a clip</Link></header><div className="operator-stats" aria-label="Saved tag totals">{([['pending', 'Awaiting readback'], ['active', 'Active records'], ['revoked', 'Withdrawn tokens']] as const).map(([key, label]) => <div className={"stat-card stat-" + key} key={key}><p>{label}</p><strong>{counts[key]}</strong><span>{key === "pending" ? "Finish writing and independent readback" : key === "active" ? "Check printed expiry on each record" : "Corrections need a new token"}</span></div>)}</div><section className="operator-card"><div className="section-heading"><div><p className="eyebrow">Continue where you left off</p><h2>Recent records</h2></div><Link href="/pharmacy/tags">View all recent tags</Link></div><TagTable tags={tags.slice(0, 5)} /></section><aside className="operator-note"><strong>One strip. One clip. One record.</strong><p>Use fictional samples and reviewed instructions. Physical pack candidates stay blocked until verified. This prototype does not authenticate medicines or recommend treatment.</p></aside></main>;
}
