import type { Metadata } from "next";
import { expiryState } from "@/lib/domain";
import { resolveTag } from "@/lib/tag-repository";
import { formatExpiryMonth } from "@/lib/speech-text";
import ReadAloud from "./read-aloud";
import MedotLogo from "@/components/brand/medot-logo";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "MEDOT medicine information",
  robots: { index: false, follow: false },
};

type Props = { params: Promise<{ token: string }> };

function Unavailable({ title, detail }: { title: string; detail: string }) {
  return (
    <main className="patient-page">
      <MedotLogo />
      <h1>{title}</h1>
      <p role="alert">{detail}</p>
    </main>
  );
}

export default async function PatientPage({ params }: Props) {
  const { token } = await params;
  let lookup;
  try {
    lookup = await resolveTag(token);
  } catch {
    return (
      <Unavailable
        title="Medicine information unavailable"
        detail="Check your connection and ask a pharmacist to verify the strip."
      />
    );
  }

  if (lookup.kind === "unknown") {
    return (
      <Unavailable
        title="Unknown MEDOT tag"
        detail="This tag could not be identified. Ask a pharmacist to verify the strip."
      />
    );
  }
  if (lookup.kind === "pending") {
    return (
      <Unavailable
        title="Tag awaiting activation"
        detail={"This tag is not active. Token ending " + token.slice(-6) + "."}
      />
    );
  }
  if (lookup.kind === "revoked") {
    return (
      <Unavailable
        title="MEDOT tag revoked"
        detail="Do not rely on this tag to identify the strip. Ask a pharmacist."
      />
    );
  }

  const { record } = lookup;
  const expired = expiryState(record.expiryMonth) === "EXPIRED";

  return (
    <main className="patient-page">
      <MedotLogo />
      <p className="eyebrow">Medicine identified</p>
      {expired && (
        <p className="warning" role="alert">
          Labelled expiry has passed. Verify this medicine with a pharmacist.
        </p>
      )}
      <h1>{record.genericName}</h1>
      <p className="strength">{record.strength} · {record.dosageForm}</p>
      <ReadAloud key={token} token={token} />
      <dl>
        <div><dt>Batch</dt><dd>{record.batchNumber}</dd></div>
        <div><dt>Labelled expiry</dt><dd>{formatExpiryMonth(record.expiryMonth)}</dd></div>
        <div><dt>Recorded instruction</dt><dd>{record.instruction}</dd></div>
      </dl>
    </main>
  );
}
