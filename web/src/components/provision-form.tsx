"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import QrCode from "./qr-code";
import TagWriter from "./tag-writer";

export type MedicineOption = {
  id: string;
  genericName: string;
  strength: string;
  dosageForm: string;
  brandName?: string | null;
  catalogStatus: "DEMO_READY" | "PACK_CHECK_REQUIRED";
};

type Result = { token: string; url: string };

export default function ProvisionForm({ medicines }: { medicines: MedicineOption[] }) {
  const [medicineId, setMedicineId] = useState(medicines.find(item => item.catalogStatus === "DEMO_READY")?.id ?? "");
  const [batchNumber, setBatchNumber] = useState("");
  const [expiryMonth, setExpiryMonth] = useState("");
  const [instruction, setInstruction] = useState("");
  const [instructionBn, setInstructionBn] = useState("");
  const [instructionHi, setInstructionHi] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const selected = medicines.find((item) => item.id === medicineId);
  const ready = selected?.catalogStatus === "DEMO_READY";

  function review(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!ready || !event.currentTarget.reportValidity() || !instruction.trim() || !instructionBn.trim()) {
      setError("Select a ready demo label and enter reviewed English and Bengali instructions.");
      return;
    }
    setConfirming(true);
  }

  async function createRecord() {
    if (!selected || !ready || saving) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/admin/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ medicineId, batchNumber, expiryMonth, instruction, instructionBn,
          ...(instructionHi.trim() ? { instructionHi } : {}) }),
      });
      if (!response.ok) {
        setError(response.status === 401
          ? "Session expired. Sign in again."
          : "Could not create the tag. Check the fields and server.");
        return;
      }
      setResult(await response.json() as Result);
    } catch {
      setError("Network unavailable. Try again.");
    } finally {
      setSaving(false);
    }
  }

  if (result) {
    return (
      <section aria-labelledby="pending-title">
        <h2 id="pending-title">Record pending</h2>
        <p>Write this exact URL to one NFC tag. The QR contains the same URL.</p>
        <p className="url">{result.url}</p>
        <QrCode url={result.url} />
        <TagWriter token={result.token} url={result.url} />
        <p><Link href="/pharmacy/tags">Find this record again in Recent tags</Link></p>
      </section>
    );
  }

  if (confirming) {
    return (
      <section aria-labelledby="review-title">
        <h2 id="review-title">Check the physical strip</h2>
        <p><strong>Medicine:</strong> {selected?.genericName} {selected?.strength} {selected?.dosageForm}</p>
        <p><strong>Batch:</strong> {batchNumber}</p>
        <p><strong>Labelled expiry:</strong> {expiryMonth}</p>
        <p><strong>Recorded instruction:</strong> {instruction}</p>
        <p lang="bn"><strong>Bengali instruction:</strong> {instructionBn}</p>
        {instructionHi.trim() && <p lang="hi"><strong>Hindi instruction:</strong> {instructionHi}</p>}
        <p role="note">Confirm these fields match the sample strip in your hand. Instructions here are test data, not medical advice.</p>
        {error && <p role="alert">{error}</p>}
        <button type="button" onClick={() => setConfirming(false)}>Edit details</button>
        <button type="button" onClick={createRecord} disabled={saving}>
          {saving ? "Creating…" : "Confirm and create pending record"}
        </button>
      </section>
    );
  }

  return (
    <form onSubmit={review}>
      <label htmlFor="medicine">Medicine</label>
      <select id="medicine" value={medicineId} onChange={(event) => setMedicineId(event.target.value)} required>
        {!medicineId && <option value="" disabled>Select a ready demo label</option>}
        {medicines.map((item) => (
          <option key={item.id} value={item.id} disabled={item.catalogStatus !== "DEMO_READY"}>
            {item.brandName ? item.brandName + " — " : ""}{item.genericName} {item.strength} · {item.dosageForm}
            {item.catalogStatus === "PACK_CHECK_REQUIRED" ? " — Pack check required" : ""}
          </option>
        ))}
      </select>
      <p className="small-note">General labels are for fictional samples. Pack candidates stay unavailable until their details are verified.</p>
      <label htmlFor="batch">Batch on the sample strip</label>
      <input id="batch" value={batchNumber} onChange={(event) => setBatchNumber(event.target.value)} maxLength={64} required />
      <label htmlFor="expiry">Labelled expiry month</label>
      <input id="expiry" type="month" value={expiryMonth} onChange={(event) => setExpiryMonth(event.target.value)} required />
      <p>Enter reviewed demo instructions. No automatic translation is used.</p>
      <label htmlFor="instruction">English instruction (required)</label>
      <textarea id="instruction" lang="en" value={instruction} onChange={(event) => setInstruction(event.target.value)} maxLength={500} required />
      <label htmlFor="instruction-bn">Bengali instruction (required)</label>
      <textarea id="instruction-bn" lang="bn" value={instructionBn} onChange={(event) => setInstructionBn(event.target.value)} maxLength={500} required />
      <label htmlFor="instruction-hi">Hindi instruction (optional)</label>
      <textarea id="instruction-hi" lang="hi" value={instructionHi} onChange={(event) => setInstructionHi(event.target.value)} maxLength={500} />
      {error && <p role="alert">{error}</p>}
      <button type="submit" disabled={!ready}>Review before creating</button>
    </form>
  );
}
