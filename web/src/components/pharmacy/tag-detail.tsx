import type { OperatorTag } from "@/lib/operator-tags";
import { expiryState } from "@/lib/domain";
import QrCode from "@/components/qr-code";
import TagWriter from "@/components/tag-writer";
import MedicineTwin from "@/components/patient/medicine-twin";
import RecordTimeline from "@/components/patient/record-timeline";
import Link from "next/link";

export default function TagDetail({ tag }: { tag: OperatorTag }) {
  const sharing=tag.status==="ACTIVE"?<p><Link href="/pharmacy/sharing">Prepare private caregiver setup</Link></p>:null;
  return <section className="operator-card tag-detail"><p className="eyebrow">Saved record · Token ending {tag.token.slice(-6)}</p><h2>{tag.brandName ?? tag.genericName}</h2>{tag.brandName && <p>{tag.genericName}</p>}<p className="strength">{tag.strength} · {tag.dosageForm}</p><dl className="review-details"><div><dt>Batch</dt><dd>{tag.batchNumber}</dd></div><div><dt>Labelled expiry</dt><dd>{tag.expiryMonth}</dd></div><div><dt>Saved status</dt><dd>{tag.status}</dd></div></dl>{expiryState(tag.expiryMonth) === "EXPIRED" && <p className="operator-note">The printed expiry month has passed. Preserve the warning on this demo record.</p>}<details className="saved-instructions"><summary>Review saved instructions</summary><h3>English</h3><p lang="en">{tag.instruction ?? "Not available"}</p><h3>Bengali</h3><p lang="bn">{tag.instructionBn ?? "Translation not recorded"}</p>{tag.instructionHi && <><h3>Hindi</h3><p lang="hi">{tag.instructionHi}</p></>}</details><MedicineTwin record={{ ...tag, instruction: tag.instruction ?? "" }} /><RecordTimeline record={{ ...tag, instruction: tag.instruction ?? "" }} />{sharing}<p className="url">{tag.url}</p><div className="pending-grid">{tag.status === "PENDING" && <QrCode url={tag.url} />}<TagWriter token={tag.token} url={tag.url} initialStatus={tag.status} activationReady={tag.activationReady} /></div></section>;
}
