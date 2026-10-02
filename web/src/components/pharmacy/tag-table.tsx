import Link from "next/link";
import type { OperatorTag } from "@/lib/operator-tags";

export default function TagTable({ tags }: { tags: OperatorTag[] }) {
  if (tags.length === 0) return <p className="empty-state">No saved tags yet. Provision a fictional sample to begin.</p>;
  return <div className="tag-table-wrap"><table className="tag-table"><caption className="sr-only">Saved medicine tags</caption><thead><tr><th scope="col">Medicine / strip</th><th scope="col">Status</th><th scope="col">Token ending</th><th scope="col">Action</th></tr></thead><tbody>{tags.map(tag => <tr key={tag.token}><td data-label="Medicine"><strong>{tag.brandName ?? tag.genericName}</strong><span>{tag.brandName ? tag.genericName + " · " : ""}{tag.strength} · {tag.dosageForm}</span><span>Batch {tag.batchNumber} · Expiry {tag.expiryMonth}</span></td><td data-label="Status"><span className={"status-pill status-" + tag.status.toLowerCase()}>{tag.status}</span></td><td data-label="Token ending"><code>{tag.token.slice(-6)}</code></td><td><Link className="table-action" href={"/pharmacy/tags?tag=" + encodeURIComponent(tag.token)} aria-label={(tag.status === "PENDING" ? "Resume" : "View") + " tag ending " + tag.token.slice(-6)}>{tag.status === "PENDING" ? "Resume" : "View record"}</Link></td></tr>)}</tbody></table></div>;
}
