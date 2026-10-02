import { expect, it } from "vitest";
import { medicineCatalog } from "../medicine-catalog";
import { demoPrescriptions, DEMO_MARKER } from "../../data/demo-prescriptions";

it("has exactly 17 unique catalog labels and preserves the five original identities", () => {
  expect(medicineCatalog).toHaveLength(17);
  expect(new Set(medicineCatalog.map(item => item.id)).size).toBe(17);
  for (const [id, genericName, strength, dosageForm] of [
    ["metformin-500", "Metformin", "500 mg", "Tablet"], ["amlodipine-5", "Amlodipine", "5 mg", "Tablet"],
    ["atorvastatin-10", "Atorvastatin", "10 mg", "Tablet"], ["pantoprazole-40", "Pantoprazole", "40 mg", "Tablet"],
    ["paracetamol-500", "Paracetamol", "500 mg", "Tablet"],
  ]) expect(medicineCatalog.find(item => item.id === id)).toMatchObject({ genericName, strength, dosageForm, catalogStatus: "DEMO_READY" });
});
it("keeps all eight unverified physical pack candidates blocked", () => {
  for (const id of ["clopidogrel-75", "rosuvastatin-10", "zocmox-625-cv", "rabijoi-dsr", "adoprox-500", "impro-red", "axovit-plus", "antox"]) {
    expect(medicineCatalog.find(item => item.id === id)?.catalogStatus).toBe("PACK_CHECK_REQUIRED");
  }
  expect(medicineCatalog.filter(item => item.catalogStatus === "DEMO_READY")).toHaveLength(9);
  expect(medicineCatalog.every(item => !('instruction' in item) && !('expiryMonth' in item))).toBe(true);
});
it("keeps three explicit fictional prescriptions with six draft language variants", () => {
  expect(demoPrescriptions).toHaveLength(3);
  const items = demoPrescriptions.flatMap(prescription => prescription.items);
  expect(items).toHaveLength(6);
  expect(new Set(items.map(item => item.id)).size).toBe(6);
  for (const prescription of demoPrescriptions) {
    expect(prescription.demoMarker).toBe(DEMO_MARKER);
    expect(prescription.reviewStatus).toBe("DRAFT_REQUIRES_REVIEW");
    expect(prescription).not.toHaveProperty("patientName");
    for (const item of prescription.items) {
      expect(medicineCatalog.some(medicine => medicine.id === item.medicineId)).toBe(true);
      for (const text of [item.instruction, item.instructionBn, item.instructionHi]) expect(text.length).toBeGreaterThan(0);
      expect(item).not.toHaveProperty("expiryMonth");
      expect(item).not.toHaveProperty("batchNumber");
    }
  }
});
