import type { PublicRecord } from "@/lib/tag-repository";
import { buildProvenance } from "@/lib/record-provenance";
import { dictionaries, type Language } from "@/lib/i18n";

export default function MedicineTwin({ record, language = "en" }: { record: PublicRecord; language?: Language }) {
  const copy = dictionaries[language], provenance = buildProvenance(record);
  const labels = { MORNING: copy.slotMorning, AFTERNOON: copy.slotAfternoon, EVENING: copy.slotEvening, NIGHT: copy.slotNight, AS_NEEDED: copy.slotAsNeeded };
  return <section className="medicine-twin" aria-labelledby="medicine-twin-title" lang={language}>
    <h2 id="medicine-twin-title">{copy.medicineTwin}</h2>
    <p className="pairing-state">{provenance.verification === "PAIRING_VERIFIED" ? copy.pairingVerified : copy.pairingUnavailable}</p>
    <p>{provenance.source === "FICTIONAL_DEMO" ? copy.fictionalLabel : provenance.source === "PHYSICAL_PACK" ? copy.packReviewed : copy.legacySource}</p>
    <p>{copy.pairingMeaning}</p>
    <dl><div><dt>{copy.recordedTiming}</dt><dd>{record.usageSlots?.length ? record.usageSlots.map(slot => labels[slot]).join(", ") : copy.timingUnknown}</dd></div></dl>
    {record.infoEn && <div className="medicine-information"><h3>{copy.medicineInformation}</h3><p lang="en">{record.infoEn}</p>{record.infoBn && <p lang="bn">{record.infoBn}</p>}{record.infoHi && <p lang="hi">{record.infoHi}</p>}</div>}
  </section>;
}
