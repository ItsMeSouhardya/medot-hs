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
};

type Result = { token: string; url: string };

export default function ProvisionForm({ medicines }: { medicines: MedicineOption[] }) {
  const [medicineId, setMedicineId] = useState(medicines[0]?.id ?? "");
  const [batchNumber, setBatchNumber] = useState("");
  const [expiryMonth, setExpiryMonth] = useState("");
  const [instruction, setInstruction] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const selected = medicines.find((item) => item.id === medicineId);

  function review(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setConfirming(true);
  }

  async function createRecord() {
    if (!selected || saving) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/admin/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ medicineId, batchNumber, expiryMonth, instruction }),
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
        {medicines.map((item) => (
          <option key={item.id} value={item.id}>
            {item.genericName} {item.strength} · {item.dosageForm}
          </option>
        ))}
      </select>
      <label htmlFor="batch">Batch on the sample strip</label>
      <input id="batch" value={batchNumber} onChange={(event) => setBatchNumber(event.target.value)} maxLength={64} required />
      <label htmlFor="expiry">Labelled expiry month</label>
      <input id="expiry" type="month" value={expiryMonth} onChange={(event) => setExpiryMonth(event.target.value)} required />
      <label htmlFor="instruction">Sample instruction (test data)</label>
      <textarea id="instruction" value={instruction} onChange={(event) => setInstruction(event.target.value)} maxLength={500} required />
      <button type="submit" disabled={!selected}>Review before creating</button>
    </form>
  );
}
