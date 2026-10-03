"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { dictionaries, languageNames, languages, selectInstruction, type Language } from "@/lib/i18n";
import type { TagLookup } from "@/lib/tag-repository";
import { readCurrentRecord, RecordLookupError, type RecordFailure } from "@/lib/public-record";
import { expiryState } from "@/lib/expiry";
import { formatExpiryMonth } from "@/lib/speech-text";
import ReadAloud from "@/app/m/[token]/read-aloud";
import MedotLogo from "../brand/medot-logo";
import MedicineTwin from "./medicine-twin";
import RecordTimeline from "./record-timeline";
import ShareIdentification from "./share-identification";
import Link from "next/link";
import { reminderCopy } from "@/lib/reminders/copy";
import Icon from "../marketing/icon";
export type PatientLookup = TagLookup | { kind: "unavailable" };
export default function PatientView({ token, initialLookup, initialLanguage }: { token: string; initialLookup: PatientLookup; initialLanguage: Language }) {
  const [language, setLanguage] = useState(initialLanguage), [lookup, setLookup] = useState(initialLookup);
  const [checking, setChecking] = useState(true), [revision, setRevision] = useState(0);
  const controller = useRef<AbortController | null>(null), generation = useRef(0), title = useRef<HTMLHeadingElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined), needsFocus = useRef(false);
  const copy = dictionaries[language];
  const refresh = useCallback(async () => {
    const current = ++generation.current;
    controller.current?.abort(); clearTimeout(timer.current);
    const request = new AbortController(); controller.current = request;
    setChecking(true); setRevision(previous => previous + 1);
    timer.current = setTimeout(() => {
      if (current !== generation.current) return;
      generation.current++; request.abort(); setChecking(false); setLookup({ kind: "unavailable" }); needsFocus.current = true;
    }, 10000);
    try {
      const record = await readCurrentRecord(token, request.signal);
      if (current === generation.current) setLookup({ kind: "active", record });
    } catch (error) {
      if (current === generation.current) { setLookup({ kind: error instanceof RecordLookupError ? error.kind : "unavailable" }); needsFocus.current = true; }
    } finally { if (current === generation.current) { clearTimeout(timer.current); setChecking(false); } }
  }, [token]);
  useEffect(() => {
    // Schedule the initial external lookup; all user actions remain disabled
    // until it resolves. Cleanup prevents a Strict Mode/unmount orphan request.
    const initial = setTimeout(() => void refresh(), 0);
    const cancel = () => { generation.current++; controller.current?.abort(); clearTimeout(timer.current); };
    const foreground = () => { if (document.visibilityState !== "hidden") void refresh(); };
    const visibility = () => {
      if (document.visibilityState === "hidden") { generation.current++; controller.current?.abort(); clearTimeout(timer.current); setChecking(false); setRevision(previous => previous + 1); }
      else foreground();
    };
    window.addEventListener("focus", foreground); document.addEventListener("visibilitychange", visibility);
    return () => { clearTimeout(initial); cancel(); window.removeEventListener("focus", foreground); document.removeEventListener("visibilitychange", visibility); };
  }, [refresh]);
  useEffect(() => {
    const previous = document.documentElement.lang; document.documentElement.lang = language;
    return () => { document.documentElement.lang = previous; };
  }, [language]);
  useEffect(() => { if (needsFocus.current) { title.current?.focus(); needsFocus.current = false; } }, [lookup]);
  const invalid = (kind: RecordFailure) => { generation.current++; controller.current?.abort(); clearTimeout(timer.current); setChecking(false); setLookup({ kind }); needsFocus.current = true; };
  const languageControl = <><label htmlFor="patient-language">{copy.language}</label><select id="patient-language" value={language} onChange={event => setLanguage(event.target.value as Language)}>{languages.map(code => <option key={code} value={code} lang={code}>{languageNames[code]}</option>)}</select></>;
  if (lookup.kind !== "active") {
    const stateCopy = lookup.kind === "unknown" ? [copy.unknownTitle, copy.unknownDetail] : lookup.kind === "pending" ? [copy.pendingTitle, copy.pendingDetail] : lookup.kind === "revoked" ? [copy.revokedTitle, copy.revokedDetail] : [copy.unavailableTitle, copy.unavailableDetail];
    return <main className="patient-page" lang={language}><MedotLogo />{languageControl}<h1 ref={title} tabIndex={-1}>{stateCopy[0]}</h1><p role="alert">{stateCopy[1]}</p>{checking && <p role="status">{copy.checkRecord}</p>}<button type="button" disabled={checking} onClick={() => void refresh()}>{copy.retry}</button></main>;
  }
  const record = lookup.record, instruction = selectInstruction(record, language), expired = expiryState(record.expiryMonth) === "EXPIRED";
  return <main className="patient-page" lang={language}>
    <MedotLogo />{languageControl}<p className="eyebrow">{copy.medicineIdentified}</p>
    {expired && <p className="warning" role="alert">{copy.expiryWarning}</p>}
    <h1 ref={title} tabIndex={-1}>{record.genericName}</h1>{record.brandName && <p>{record.brandName}</p>}<p className="strength">{record.strength} · {record.dosageForm}</p>
    {instruction.usedFallback && <p role="note">{copy.instructionFallback}</p>}
    {checking && <p role="status">{copy.checkRecord}</p>}
    <ReadAloud key={`${token}:${language}:${revision}`} token={token} language={language} disabled={checking} onRecord={fresh => setLookup({ kind: "active", record: fresh })} onInvalid={invalid} />
    <dl><div><dt>{copy.batch}</dt><dd>{record.batchNumber}</dd></div><div><dt>{copy.labelledExpiry}</dt><dd>{formatExpiryMonth(record.expiryMonth, language)}</dd></div><div><dt>{copy.recordedInstruction}</dt><dd lang={instruction.language}>{instruction.text}</dd></div></dl>
    <MedicineTwin record={record} language={language} /><RecordTimeline record={record} language={language} />
    {!checking&&<ShareIdentification key={`sharing:${token}:${language}:${revision}`} token={token} language={language}/>}
    {!checking&&!expired&&<Link className="button-link" href={`/reminders?medicine=${token}&lang=${language}`}><Icon name="bell"/>{reminderCopy[language].title}</Link>}
    <button type="button" disabled={checking} onClick={() => void refresh()}>{copy.refreshRecord}</button>
  </main>;
}
