"use client";
import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import QrCode from "./qr-code";
import TagWriter from "./tag-writer";
import ProvisionProgress from "./pharmacy/progress";
import { DEMO_MARKER, demoPrescriptions, type DemoPrescription } from "@/data/demo-prescriptions";
export type MedicineOption = { id: string; genericName: string; strength: string; dosageForm: string; brandName?: string | null; catalogStatus: "DEMO_READY" | "PACK_CHECK_REQUIRED" };
type Result = { token: string; url: string };
export default function ProvisionForm({ medicines, prescriptions = demoPrescriptions }: { medicines: MedicineOption[]; prescriptions?: DemoPrescription[] }) {
  const [medicineId, setMedicineId] = useState(medicines.find(item => item.catalogStatus === "DEMO_READY")?.id ?? "");
  const [search, setSearch] = useState("");
  const [batchNumber, setBatchNumber] = useState("");
  const [expiryMonth, setExpiryMonth] = useState("");
  const [instruction, setInstruction] = useState("");
  const [instructionBn, setInstructionBn] = useState("");
  const [instructionHi, setInstructionHi] = useState("");
  const [presetId, setPresetId] = useState("");
  const [translationNotice, setTranslationNotice] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [physicalChecked, setPhysicalChecked] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [sessionExpired, setSessionExpired] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const submitLock = useRef(false);
  const reviewTitle = useRef<HTMLHeadingElement>(null);
  const resultTitle = useRef<HTMLHeadingElement>(null);
  const selected = medicines.find(item => item.id === medicineId);
  const ready = selected?.catalogStatus === "DEMO_READY";
  const query = search.trim().toLowerCase();
  const matches = medicines.filter(item => [item.brandName, item.genericName, item.strength, item.dosageForm].filter(Boolean).join(" ").toLowerCase().includes(query));
  const options = medicines.filter(item => item.id === medicineId || matches.includes(item));
  const current = result ? 4 : confirming ? 3 : batchNumber.trim() && expiryMonth ? 2 : ready ? 1 : 0;
  useEffect(() => { if (result) resultTitle.current?.focus(); else if (confirming) reviewTitle.current?.focus(); }, [confirming, result]);
  function changeMedicine(id: string) {
    setMedicineId(id); setBatchNumber(""); setExpiryMonth(""); setInstruction(""); setInstructionBn(""); setInstructionHi(""); setPresetId(""); setTranslationNotice(""); setPhysicalChecked(false);
  }
  function choosePreset(id: string) {
    if (!id) { setPresetId(""); return; }
    const group = prescriptions.find(p => p.reviewStatus === "REVIEWED" && p.items.some(item => item.id === id));
    const item = group?.items.find(item => item.id === id);
    const medicine = medicines.find(m => m.id === item?.medicineId);
    if (!item || medicine?.catalogStatus !== "DEMO_READY") return;
    if (medicineId !== medicine.id) changeMedicine(medicine.id);
    setPresetId(id); setInstruction(item.instruction); setInstructionBn(item.instructionBn); setInstructionHi(item.instructionHi); setTranslationNotice("");
  }
  function editEnglish(value: string) {
    if (value !== instruction && (instructionBn || instructionHi)) { setInstructionBn(""); setInstructionHi(""); setTranslationNotice("English changed. Enter and review the matching Bengali and optional Hindi again."); }
    setInstruction(value); setPresetId("");
  }
  function review(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError("");
    if (!ready || !event.currentTarget.reportValidity() || !instruction.trim() || !instructionBn.trim() || !batchNumber.trim()) { setError("Select a ready demo label and enter reviewed English and Bengali instructions."); return; }
    setPhysicalChecked(false); setConfirming(true);
  }
  async function createRecord() {
    if (!selected || !ready || !physicalChecked || submitLock.current) return;
    submitLock.current = true; setSaving(true); setError(""); setSessionExpired(false);
    try {
      const response = await fetch("/api/admin/tags", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ medicineId, batchNumber: batchNumber.trim(), expiryMonth, instruction: instruction.trim(), instructionBn: instructionBn.trim(), ...(instructionHi.trim() ? { instructionHi: instructionHi.trim() } : {}) }) });
      if (!response.ok) {
        setSessionExpired(response.status === 401);
        setError(response.status === 401 ? "Session expired. Your draft is still here. Sign in in a new tab, then return and retry."
          : response.status === 403 ? "Pharmacy access denied. Check your authorized account and site origin."
          : response.status === 400 ? "The medicine or fields are no longer valid. Edit and review the details again."
          : "Could not confirm creation. Check Recent tags before retrying to avoid creating a second record.");
        return;
      }
      setResult(await response.json() as Result);
    } catch { setError("Network unavailable. Check Recent tags before retrying; a pending record may already have been saved."); }
    finally { submitLock.current = false; setSaving(false); }
  }
  const errorPanel = error && <div className="operator-alert" role="alert"><p>{error}</p>{sessionExpired && <a href="/sign-in" target="_blank" rel="noopener noreferrer">Sign in again in a new tab</a>}<p><Link href="/pharmacy/tags" target="_blank" rel="noopener noreferrer">Check saved records in a new tab</Link></p></div>;
  return <div className="provision-workflow"><ProvisionProgress current={current} /><p className="demo-notice">{DEMO_MARKER}</p>
    {result ? <section className="operator-card" aria-labelledby="pending-title"><p className="eyebrow">Saved safely · Awaiting readback</p><h2 id="pending-title" ref={resultTitle} tabIndex={-1}>Record pending</h2><p>Write this exact URL to one NFC tag. The QR contains the same URL.</p><p>Token ending <strong className="token-ending">{result.token.slice(-6)}</strong></p><p className="url">{result.url}</p><div className="pending-grid"><QrCode url={result.url} /><TagWriter token={result.token} url={result.url} /></div><p><Link href={"/pharmacy/tags?tag=" + encodeURIComponent(result.token)}>Resume this saved record later</Link></p><Link href="/pharmacy/provision" className="button-link secondary-button" onClick={() => { setResult(null); setConfirming(false); setPhysicalChecked(false); changeMedicine(medicineId); }}>Prepare another clip</Link></section>
    : confirming ? <section className="operator-card" aria-labelledby="review-title"><p className="eyebrow">Step 4 · Compare with the strip</p><h2 id="review-title" ref={reviewTitle} tabIndex={-1}>Check the physical strip</h2><dl className="review-details"><div><dt>Medicine</dt><dd>{selected?.brandName && <strong>{selected.brandName} — </strong>}{selected?.genericName} {selected?.strength} · {selected?.dosageForm}</dd></div><div><dt>Batch</dt><dd>{batchNumber.trim()}</dd></div><div><dt>Labelled expiry</dt><dd>{expiryMonth}</dd></div></dl><div className="instruction-review"><h3>Recorded instruction · English</h3><p lang="en">{instruction.trim()}</p><h3>Bengali instruction</h3><p lang="bn">{instructionBn.trim()}</p>{instructionHi.trim() && <><h3>Hindi instruction</h3><p lang="hi">{instructionHi.trim()}</p></>}</div><p role="note">Keep actual printed dates, including expired dates. These are recorded demo instructions, not medical advice.</p><label className="confirmation-check"><input type="checkbox" checked={physicalChecked} onChange={e => setPhysicalChecked(e.target.checked)} disabled={saving} />I checked the medicine, strength, batch, printed expiry and every instruction against this sample strip.</label>{errorPanel}<div className="action-row"><button type="button" className="secondary-button" disabled={saving} onClick={() => { setConfirming(false); setPhysicalChecked(false); }}>Edit details</button><button type="button" onClick={createRecord} disabled={saving || !physicalChecked}>{saving ? "Creating…" : "Confirm and create pending record"}</button></div></section>
    : <form onSubmit={review} className="operator-card provision-form">
      <fieldset><legend><span className="eyebrow">Step 1</span>Choose the medicine</legend><label htmlFor="catalog-search">Search medicine catalog</label><input id="catalog-search" type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Brand, generic name or strength" />{query && matches.length === 0 && <p role="status">No matching catalog labels. Your selected medicine stays unchanged.</p>}<label htmlFor="medicine">Medicine</label><select id="medicine" value={medicineId} onChange={e => changeMedicine(e.target.value)} required>{!medicineId && <option value="" disabled>Select a ready demo label</option>}{options.map(item => <option key={item.id} value={item.id} disabled={item.catalogStatus !== "DEMO_READY"}>{item.brandName ? item.brandName + " — " : ""}{item.genericName} {item.strength} · {item.dosageForm}{item.catalogStatus === "PACK_CHECK_REQUIRED" ? " — Pack check required" : ""}</option>)}</select><p className="small-note">Selected: {selected?.genericName ?? "None"} {selected?.strength}. General labels are for fictional samples. Unverified packs stay unavailable.</p></fieldset>
      <fieldset><legend><span className="eyebrow">Step 2</span>Read the printed details</legend><div className="field-pair"><div><label htmlFor="batch">Batch on the sample strip</label><input id="batch" value={batchNumber} onChange={e => setBatchNumber(e.target.value)} maxLength={64} required /></div><div><label htmlFor="expiry">Labelled expiry month</label><input id="expiry" type="month" value={expiryMonth} onChange={e => setExpiryMonth(e.target.value)} required /></div></div><p className="small-note">Copy the exact label. Never replace an expired date to hide a warning.</p></fieldset>
      <fieldset><legend><span className="eyebrow">Step 3</span>Record reviewed instructions</legend><label htmlFor="demo-preset">Reviewed demo preset</label><select id="demo-preset" value={presetId} onChange={e => choosePreset(e.target.value)}><option value="">Enter instructions manually</option>{prescriptions.map(p => <optgroup key={p.id} label={p.id}>{p.items.map(item => { const medicine = medicines.find(m => m.id === item.medicineId); const usable = p.reviewStatus === "REVIEWED" && medicine?.catalogStatus === "DEMO_READY"; return <option key={item.id} value={item.id} disabled={!usable}>{item.id} · {medicine?.brandName ?? medicine?.genericName ?? item.medicineId}{!usable ? " — Review required" : ""}</option>; })}</optgroup>)}</select><p className="small-note">Draft presets stay blocked until language review and catalog verification. No automatic translation is used.</p>{translationNotice && <p role="status" className="operator-note">{translationNotice}</p>}<label htmlFor="instruction">English instruction (required)</label><textarea id="instruction" lang="en" value={instruction} onChange={e => editEnglish(e.target.value)} maxLength={500} required /><label htmlFor="instruction-bn">Bengali instruction (required)</label><textarea id="instruction-bn" lang="bn" value={instructionBn} onChange={e => { setInstructionBn(e.target.value); setPresetId(""); }} maxLength={500} required /><label htmlFor="instruction-hi">Hindi instruction (optional)</label><textarea id="instruction-hi" lang="hi" value={instructionHi} onChange={e => { setInstructionHi(e.target.value); setPresetId(""); }} maxLength={500} /><p className="small-note">Changing English clears translations so they can be reviewed against the new text.</p></fieldset>{errorPanel}<button type="submit" disabled={!ready}>Review before creating</button>
    </form>}
  </div>;
}
