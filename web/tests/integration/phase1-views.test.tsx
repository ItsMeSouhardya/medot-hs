import { afterAll, expect, it } from "vitest";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import AddMedicine from "@/components/pharmacy/add-medicine";
import ProvisionForm from "@/components/provision-form";
import MedicineTwin from "@/components/patient/medicine-twin";
import RecordTimeline from "@/components/patient/record-timeline";
import type { Medicine } from "@/lib/medicine-catalog";
import type { PublicRecord } from "@/lib/tag-repository";

const medicine: Medicine = { id: "custom_software_fixture", genericName: "Fictional sample label", strength: "Fixture strength", dosageForm: "Fixture form", catalogStatus: "PACK_CHECK_REQUIRED", recordKind: "FICTIONAL_DEMO", infoEn: "Fictional software label. No treatment instructions.", infoBn: "শুধুমাত্র সফটওয়্যার ডেমো। চিকিৎসার নির্দেশনা নয়। ".repeat(8).trim() };
const record: PublicRecord = { ...medicine, token: "abcdefghijklmnopqrstuv", medicineId: medicine.id, batchNumber: "SOFTWARE-FIXTURE", expiryMonth: "2099-12", instruction: "Fictional software fixture.", usageSlots: ["EVENING", "AS_NEEDED"], createdAt: "2026-10-02T10:00:00.000Z", activatedAt: "2026-10-02T10:05:00.000Z", verifiedAt: "2026-10-02T10:05:00.000Z", verificationVersion: 1 };
const noop = () => {};
const views = {
  add: () => <div className="operator-shell"><main className="operator-main"><AddMedicine onSaved={noop} onUse={noop} /></main></div>,
  review: () => <div className="operator-shell"><main className="operator-main"><AddMedicine initialMedicine={medicine} onSaved={noop} onUse={noop} /></main></div>,
  provision: () => <div className="operator-shell"><main className="operator-main"><ProvisionForm medicines={[medicine, { ...medicine, id: "custom_second_fixture", strength: "Different fixture strength", catalogStatus: "DEMO_READY" }]} prescriptions={[]} /></main></div>,
  twin: () => <main className="patient-page"><h1>Fictional software fixture</h1><MedicineTwin record={record} /><RecordTimeline record={record} /></main>,
};

it("a recovered custom review presents exact multilingual notes and requires label and language confirmation", () => {
  const html = renderToStaticMarkup(views.review());
  expect(html).toContain(medicine.infoBn);
  expect(html).toContain('lang="bn"');
  expect(html).toContain("I checked these exact label fields");
  expect(html).toContain("I reviewed every supplied language");
  expect(html).not.toContain("Use this medicine");
});

// Static visual fixtures use real components; they do not bypass shipped auth,
// simulate an account session, activate a tag or attest a physical readback.
afterAll(async () => {
  if (process.env.MEDOT_EXPORT_PHASE1_FIXTURES !== "1") return;
  const directory = resolve(process.cwd(), "../.superpowers/sdd/2026-10-02-medot-feature-expansion/views");
  await mkdir(directory, { recursive: true });
  for (const [name, view] of Object.entries(views)) {
    await writeFile(resolve(directory, name + ".html"), `<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Phase 1 ${name} software fixture</title><link rel="stylesheet" href="/globals.css"><link rel="stylesheet" href="/pharmacy.css"></head><body><p style="font:14px sans-serif;padding:12px;background:#ddede5;color:#172f2b">PHASE 1 SOFTWARE FIXTURE. Static rendering only; no account session or physical activation.</p>${renderToStaticMarkup(view())}</body></html>`);
  }
});
