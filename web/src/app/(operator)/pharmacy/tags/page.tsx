import Link from "next/link";
import { getPharmacyAccess } from "@/lib/pharmacy-auth";
import { pharmacyPageDenied } from "@/lib/pharmacy-page-access";

import {
  findOperatorTag,
  listOperatorTags,
  parseTagReference,
  type OperatorTag,
} from "@/lib/operator-tags";
import QrCode from "@/components/qr-code";
import TagWriter from "@/components/tag-writer";

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
    if (reference) {
      const found = searchedToken ? await findOperatorTag(searchedToken, origin) : null;
      tags = found ? [found] : [];
    } else {
      tags = await listOperatorTags(origin);
    }
  } catch {
    return (
      <main className="operator-page">
        <h1>Recent tags unavailable</h1>
        <p>Check the demo database and APP_ORIGIN configuration.</p>
      </main>
    );
  }

  return (
    <main className="operator-page">
      <p className="eyebrow">MEDOT operator</p>
      <h1>Recent tags</h1>
      <p>Resume a pending write or revoke a tag after leaving the provisioning screen. Search by its full URL or token to find an older tag.</p>
      <Link href="/pharmacy/provision">Provision another tag</Link>
      <form method="get" action="/pharmacy/tags">
        <label htmlFor="tag-search">Tag URL or token</label>
        <input id="tag-search" name="tag" defaultValue={reference} />
        <button type="submit">Find tag</button>
      </form>
      {reference && <p><Link href="/pharmacy/tags">Show recent tags</Link></p>}
      {reference && !searchedToken && <p role="alert">Enter a MEDOT tag URL or 22-character token.</p>}
      {reference && searchedToken && tags.length === 0 && <p role="status">No tag found for that URL or token.</p>}
      {!reference && tags.length === 0 && <p>No tags have been created yet.</p>}
      {tags.map((tag) => (
        <section className="tag-card" key={tag.token}>
          <h2>{tag.genericName} {tag.strength} · {tag.dosageForm}</h2>
          <p><strong>Batch:</strong> {tag.batchNumber}</p>
          <p><strong>Labelled expiry:</strong> {tag.expiryMonth}</p>
          <p><strong>Status:</strong> {tag.status}</p>
          <p><strong>Token ending:</strong> {tag.token.slice(-6)}</p>
          <p className="url">{tag.url}</p>
          {tag.status === "PENDING" && <QrCode url={tag.url} />}
          {tag.status !== "REVOKED" && (
            <TagWriter token={tag.token} url={tag.url} initialStatus={tag.status} />
          )}
        </section>
      ))}
    </main>
  );
}
