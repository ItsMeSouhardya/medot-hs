import Link from "next/link";
import { getPharmacyAccess } from "@/lib/pharmacy-auth";
import { pharmacyPageDenied } from "@/lib/pharmacy-page-access";
import { findOperatorTag, listOperatorTags, parseTagReference, type OperatorTag } from "@/lib/operator-tags";
import TagTable from "@/components/pharmacy/tag-table";
import TagDetail from "@/components/pharmacy/tag-detail";
export const dynamic = "force-dynamic";
type Props = { searchParams: Promise<{ tag?: string }> };
export default async function OperatorTagsPage({ searchParams }: Props) {
  const access = await getPharmacyAccess();
  if (access.kind !== "authorized") return pharmacyPageDenied(access);
  const { tag } = await searchParams;
  const reference = tag?.trim() ?? "";
  const origin = process.env.APP_ORIGIN ?? "";
  const searchedToken = reference ? parseTagReference(reference, origin) : null;
  let tags: OperatorTag[];
  try {
    if (reference) { const found = searchedToken ? await findOperatorTag(searchedToken, origin) : null; tags = found ? [found] : []; }
    else tags = await listOperatorTags(origin);
  } catch { return <main className="operator-page"><h1>Recent tags unavailable</h1><p role="alert">Check the demo database and APP_ORIGIN configuration.</p><Link href="/pharmacy/tags">Reload saved records</Link></main>; }
  return <main className="operator-page"><header className="operator-heading"><div><p className="eyebrow">Saved records</p><h1>Recent tags</h1><p>Resume a pending write, check saved instructions or withdraw a token.</p></div><Link href="/pharmacy/provision" className="button-link">Provision another clip</Link></header><form method="get" action="/pharmacy/tags" className="operator-card tag-search"><label htmlFor="tag-search">Tag URL or token</label><div className="search-row"><input id="tag-search" name="tag" defaultValue={reference} maxLength={2048} placeholder="Paste the full MEDOT URL or 22-character token" /><button type="submit">Find tag</button></div><p className="small-note">Find older records by their exact URL or full token. The table shows the latest 50.</p></form>{reference && <p><Link href="/pharmacy/tags">Show recent tags</Link></p>}{reference && !searchedToken && <p className="operator-alert" role="alert">Enter a MEDOT tag URL from this site or a 22-character token.</p>}{reference && searchedToken && tags.length === 0 && <p className="empty-state" role="status">No tag found for that URL or token.</p>}{reference ? tags.map(record => <TagDetail key={record.token} tag={record} />) : <section className="operator-card"><h2>Latest records</h2><TagTable tags={tags} /></section>}</main>;
}
