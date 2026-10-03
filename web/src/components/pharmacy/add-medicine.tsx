"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import type { Medicine } from "@/lib/medicine-catalog";

type Draft = { genericName: string; strength: string; dosageForm: string; brandName: string; recordKind: string; infoEn: string; infoBn: string; infoHi: string };
const empty: Draft = { genericName: "", strength: "", dosageForm: "", brandName: "", recordKind: "", infoEn: "", infoBn: "", infoHi: "" };
function identity(draft: Draft | Medicine) {
  return { genericName: draft.genericName.trim(), strength: draft.strength.trim(), dosageForm: draft.dosageForm.trim(), recordKind: draft.recordKind,
    ...(draft.brandName?.trim() ? { brandName: draft.brandName.trim() } : {}),
    ...(draft.infoEn?.trim() ? { infoEn: draft.infoEn.trim() } : {}), ...(draft.infoBn?.trim() ? { infoBn: draft.infoBn.trim() } : {}),
    ...(draft.infoHi?.trim() ? { infoHi: draft.infoHi.trim() } : {}) };
}
export default function AddMedicine({ initialMedicine, onSaved, onUse, onBusyChange }: { initialMedicine?: Medicine; onSaved: (medicine: Medicine) => void; onUse: (id: string) => void; onBusyChange?: (busy: boolean) => void }) {
  const [draft, setDraft] = useState(empty);
  const [saved, setSaved] = useState<Medicine | null>(initialMedicine ?? null);
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [expired, setExpired] = useState(false);
  const [labelChecked, setLabelChecked] = useState(false);
  const [languagesChecked, setLanguagesChecked] = useState(false);
  const requestBody = useRef<string | null>(null);
  const lock = useRef(false);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus(); }, [saved]);
  const field = (key: keyof Draft, value: string) => setDraft(previous => ({ ...previous, [key]: value }));
  async function mutate(review: boolean) {
    if (lock.current || (review && (!saved || !labelChecked || !languagesChecked))) return;
    lock.current = true; setBusy(true); onBusyChange?.(true); setError(""); setExpired(false);
    try {
      if (!review && !requestBody.current) {
        requestBody.current = JSON.stringify({ ...identity(draft), requestId: crypto.randomUUID() });
        setSubmitted(true);
      }
      const response = await fetch(review ? `/api/admin/medicines/${encodeURIComponent(saved!.id)}/review` : "/api/admin/medicines", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: review ? JSON.stringify({ labelReviewed: true, languagesReviewed: true, expected: identity(saved!) }) : requestBody.current!,
      });
      if (!response.ok) {
        setExpired(response.status === 401);
        setError(response.status === 401 ? "Session expired. Your draft is still here. Sign in and retry."
          : response.status === 403 ? "Pharmacy access denied. Check your account and site origin."
          : response.status === 409 ? "Saved data conflict. Reload the catalog before reviewing this medicine."
          : response.status === 400 ? "Check the label fields and matching language information."
          : "Could not confirm the save. Retry the exact request to recover its saved result.");
        if (!review && response.status === 400) { requestBody.current = null; setSubmitted(false); }
        return;
      }
      const medicine = await response.json() as Medicine;
      // Do not turn a malformed response into a selectable identity.
      const acceptableStatus = review ? medicine.catalogStatus === "DEMO_READY"
        : medicine.catalogStatus === "PACK_CHECK_REQUIRED" || medicine.catalogStatus === "DEMO_READY";
      if (!medicine.id || !medicine.genericName || !medicine.strength || !medicine.dosageForm ||
          !["FICTIONAL_DEMO", "PHYSICAL_PACK"].includes(medicine.recordKind) ||
          !acceptableStatus || (review && medicine.id !== saved!.id)) throw new Error("Invalid catalog response");
      setSaved(medicine); onSaved(medicine); setLabelChecked(false); setLanguagesChecked(false);
    } catch { setError("Network unavailable or save unconfirmed. Retry the exact request; it may already be saved."); }
    finally { lock.current = false; setBusy(false); onBusyChange?.(false); }
  }
  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!event.currentTarget.reportValidity()) return;
    if (Boolean(draft.infoEn.trim()) !== Boolean(draft.infoBn.trim()) || draft.infoHi.trim() && !draft.infoEn.trim()) {
      setError("Supply matching English and Bengali information together. Hindi needs the same source information."); return;
    }
    void mutate(false);
  }
  const errors = error && <div role="alert" className="operator-alert"><p>{error}</p>{expired && <a href="/sign-in" target="_blank" rel="noopener noreferrer">Sign in again in a new tab</a>}</div>;
  return <section className="operator-card custom-medicine" aria-labelledby="custom-medicine-heading">
    <h2 id="custom-medicine-heading" tabIndex={-1} ref={heading}>{saved ? "Review saved medicine" : "Add medicine data"}</h2>
    <p>Store a demo label of your choice. Saving keeps it blocked until its exact label and language information are reviewed.</p>
    {saved ? <>
      <dl className="review-details"><div><dt>Medicine</dt><dd>{saved.brandName && `${saved.brandName} - `}{saved.genericName} {saved.strength} · {saved.dosageForm}</dd></div><div><dt>Label source</dt><dd>{saved.recordKind === "FICTIONAL_DEMO" ? "Fictional demo label" : "Physical pack label"}</dd></div><div><dt>Catalog ID ending</dt><dd>{saved.id.slice(-6)}</dd></div></dl>
      {saved.infoEn && <div className="instruction-review"><h3>Saved medicine information</h3><p lang="en">{saved.infoEn}</p><p lang="bn">{saved.infoBn}</p>{saved.infoHi && <p lang="hi">{saved.infoHi}</p>}</div>}
      <p>Identity and notes stay unchanged. A correction needs a new catalog entry and a replacement token for any affected strip.</p>
      {saved.catalogStatus === "DEMO_READY" ? <><p role="status">Reviewed and ready for provisioning. Physical URL readback is still required before activating a tag.</p><button type="button" onClick={() => onUse(saved.id)}>Use this medicine</button></> : <>
        <label className="confirmation-check"><input type="checkbox" checked={labelChecked} onChange={e => setLabelChecked(e.target.checked)} disabled={busy} />I checked these exact label fields against the {saved.recordKind === "FICTIONAL_DEMO" ? "fictional sample label" : "physical pack in hand"}.</label>
        <label className="confirmation-check"><input type="checkbox" checked={languagesChecked} onChange={e => setLanguagesChecked(e.target.checked)} disabled={busy} />I reviewed every supplied language for matching information. No medicine advice was generated.</label>
        <button type="button" disabled={busy || !labelChecked || !languagesChecked} onClick={() => void mutate(true)}>{busy ? "Saving review…" : "Mark reviewed and ready"}</button>
      </>}{errors}
    </> : <form onSubmit={save}>
      <fieldset disabled={busy || submitted}>
        <legend>Demo medicine label</legend>
        <label htmlFor="custom-name">Medicine name</label><input id="custom-name" value={draft.genericName} onChange={e => field("genericName", e.target.value)} maxLength={64} required />
        <div className="field-pair"><div><label htmlFor="custom-strength">Strength</label><input id="custom-strength" value={draft.strength} onChange={e => field("strength", e.target.value)} maxLength={64} required /></div><div><label htmlFor="custom-form">Form</label><input id="custom-form" value={draft.dosageForm} onChange={e => field("dosageForm", e.target.value)} maxLength={64} required /></div></div>
        <label htmlFor="custom-brand">Brand (optional)</label><input id="custom-brand" value={draft.brandName} onChange={e => field("brandName", e.target.value)} maxLength={64} />
        <label htmlFor="custom-source">Label source</label><select id="custom-source" value={draft.recordKind} onChange={e => field("recordKind", e.target.value)} required><option value="" disabled>Select the source</option><option value="FICTIONAL_DEMO">Fictional demo label</option><option value="PHYSICAL_PACK">Physical pack requiring review</option></select>
        <label htmlFor="custom-info-en">Medicine information in English (optional)</label><textarea id="custom-info-en" lang="en" value={draft.infoEn} onChange={e => field("infoEn", e.target.value)} maxLength={500} />
        <label htmlFor="custom-info-bn">Matching Bengali information</label><textarea id="custom-info-bn" lang="bn" value={draft.infoBn} onChange={e => field("infoBn", e.target.value)} maxLength={500} required={Boolean(draft.infoEn.trim())} />
        <label htmlFor="custom-info-hi">Matching Hindi information (optional)</label><textarea id="custom-info-hi" lang="hi" value={draft.infoHi} onChange={e => field("infoHi", e.target.value)} maxLength={500} />
        <p className="small-note">Notes contain only label/demo information. Record per-strip instructions separately; do not invent doses, translate prescriptions automatically or enter patient identifiers.</p>
      </fieldset>{errors}<button type="submit" disabled={busy}>{busy ? "Saving…" : submitted ? "Retry exact save" : "Save blocked medicine"}</button>
    </form>}
  </section>;
}
