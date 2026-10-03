import type { PublicRecord } from "@/lib/tag-repository";
import { buildProvenance } from "@/lib/record-provenance";
import { dictionaries, locales, type Language } from "@/lib/i18n";

export default function RecordTimeline({ record, language = "en" }: { record: PublicRecord; language?: Language }) {
  const copy = dictionaries[language], { events } = buildProvenance(record);
  const labels = { CREATED: copy.recordCreated, ACTIVATED: copy.tagActivated, PAIRING_VERIFIED: copy.lastPairingVerification };
  const formatter = new Intl.DateTimeFormat(locales[language], { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
  return <section className="record-timeline" aria-labelledby="record-timeline-title" lang={language}>
    <h2 id="record-timeline-title">{copy.recordTimeline}</h2>
    {events.length ? <ol>{events.map(event => <li key={event.kind}><strong>{labels[event.kind]}</strong><time dateTime={event.at}>{formatter.format(new Date(event.at))}</time></li>)}</ol> : <p>{copy.noTimeline}</p>}
    <p>{copy.timelinePrivacy}</p>
  </section>;
}
