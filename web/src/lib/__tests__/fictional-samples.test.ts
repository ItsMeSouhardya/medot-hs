import { expect, it } from "vitest";
import { medicineCatalog } from "../medicine-catalog";
import { demoPrescriptions, demoPresetUsable } from "../../data/demo-prescriptions";
const sources = ["clopidogrel-75", "rosuvastatin-10", "zocmox-625-cv", "rabijoi-dsr", "adoprox-500", "impro-red", "axovit-plus", "antox"];
it("provides a separate clearly fictional ready sample for each blocked pack", () => {
  for (const id of sources) {
    expect(medicineCatalog.find(row => row.id === id)?.catalogStatus).toBe("PACK_CHECK_REQUIRED");
    const sample = medicineCatalog.find(row => row.id === `fictional-${id}`);
    expect(sample).toMatchObject({ recordKind: "FICTIONAL_DEMO", catalogStatus: "DEMO_READY", strength: "Demo label only" });
    expect(sample?.genericName).toMatch(/^Fictional /);
    expect(sample?.infoEn).toContain("Do not take");
    expect(sample).not.toHaveProperty("expiryMonth"); expect(sample).not.toHaveProperty("batchNumber");
  }
});
it("offers a non-dosing demo template for every sample without marking physical prescription drafts reviewed", () => {
  const templates = demoPrescriptions.filter(group => group.reviewStatus === "DEMO_TEMPLATE");
  const items = templates.flatMap(group => group.items);
  expect(items).toHaveLength(8);
  expect(new Set(items.map(item => item.medicineId))).toEqual(new Set(sources.map(id => `fictional-${id}`)));
  expect(demoPrescriptions.filter(group => group.reviewStatus === "DRAFT_REQUIRES_REVIEW")).toHaveLength(3);
  for (const group of templates) for (const item of group.items) {
    const medicine = medicineCatalog.find(row => row.id === item.medicineId)!;
    expect(demoPresetUsable(group, medicine)).toBe(true);
    expect(demoPresetUsable(group, { ...medicine, recordKind: "PHYSICAL_PACK" })).toBe(false);
    expect(demoPresetUsable(group, { ...medicine, catalogStatus: "PACK_CHECK_REQUIRED" })).toBe(false);
    expect(item.instruction).toMatch(/^Fictional demo only\./);
    expect(item.instruction).not.toMatch(/take|dose|prescriber|\d/i);
    for (const text of [item.instruction, item.instructionBn, item.instructionHi]) expect(text.trim().length).toBeGreaterThan(0);
    expect(item.usageSlots?.length).toBeGreaterThan(0);
  }
});
