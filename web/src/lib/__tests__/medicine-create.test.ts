import { expect, it } from "vitest";
import { createMedicine, reviewMedicine, type MedicineCreateRepository, type StoredMedicine } from "../medicine-create";

const input = { requestId: "134fc157-78f4-4af2-bce2-1d2a6858cb9a", genericName: "Demo Metformin", strength: "500 mg", dosageForm: "Tablet", recordKind: "FICTIONAL_DEMO" };
function memoryRepository(): MedicineCreateRepository {
  const rows = new Map<string, StoredMedicine>();
  return {
    async insert(record) {
      const previous = [...rows.values()].find(row => row.requestId === record.requestId);
      if (previous) return previous;
      rows.set(record.id, record);
      return record;
    },
    async review(id, expected, actor) {
      const row = rows.get(id);
      if (!row) return null;
      for (const key of ["genericName", "strength", "dosageForm", "brandName", "infoEn", "infoBn", "infoHi", "recordKind"] as const) {
        if (row[key] !== expected[key]) return null;
      }
      const reviewed = { ...row, catalogStatus: "DEMO_READY" as const, reviewedAt: "2026-10-02T18:20:00.000Z", reviewedBy: actor };
      rows.set(id, reviewed);
      return reviewed;
    },
    async find(id) { return rows.get(id) ?? null; },
  };
}
it("saves trimmed custom data blocked with a generated identity, without exposing actor metadata", async () => {
  const repository = memoryRepository();
  const result = await createMedicine({ ...input, genericName: " Demo Metformin ", infoEn: " Fictional label only. ", infoBn: " শুধুমাত্র ডেমো। " }, "operator-one", repository);
  expect(result.id).toMatch(/^custom_[A-Za-z0-9_-]{22}$/);
  expect(result).toMatchObject({ genericName: "Demo Metformin", infoEn: "Fictional label only.", infoBn: "শুধুমাত্র ডেমো।", catalogStatus: "PACK_CHECK_REQUIRED", recordKind: "FICTIONAL_DEMO", created: true });
  expect(result).not.toHaveProperty("createdBy");
  expect(result).not.toHaveProperty("requestId");
});
it.each([
  { ...input, createdBy: "forged" }, { ...input, catalogStatus: "DEMO_READY" }, { ...input, verifiedAt: "2026-10-02" },
  { ...input, genericName: " " }, { ...input, strength: "x".repeat(65) }, { ...input, recordKind: "LEGACY" },
  { ...input, infoEn: "Missing Bengali" }, { ...input, infoBn: "Missing English" }, { ...input, infoHi: "No source" },
  { ...input, infoEn: "x".repeat(501), infoBn: "ডেমো" },
])("rejects invalid or forged fields before saving", async raw => {
  await expect(createMedicine(raw, "operator-one", memoryRepository())).rejects.toMatchObject({ code: "INVALID_INPUT" });
});
it("makes repeated/concurrent creation idempotent and rejects content/actor collisions", async () => {
  const repository = memoryRepository();
  const [first, second] = await Promise.all([createMedicine(input, "operator-one", repository), createMedicine(input, "operator-one", repository)]);
  expect(first.id).toBe(second.id);
  expect([first.created, second.created].sort()).toEqual([false, true]);
  await expect(createMedicine({ ...input, strength: "1000 mg" }, "operator-one", repository)).rejects.toMatchObject({ code: "CONFLICT" });
  await expect(createMedicine(input, "another-operator", repository)).rejects.toMatchObject({ code: "CONFLICT" });
});
it("allows intentional duplicate names under new IDs without relabelling earlier records", async () => {
  const repository = memoryRepository();
  const first = await createMedicine(input, "operator-one", repository);
  const second = await createMedicine({ ...input, requestId: "934fc157-78f4-4af2-bce2-1d2a6858cb9a", strength: "1000 mg" }, "operator-one", repository);
  expect(second.id).not.toBe(first.id);
  expect((await repository.find(first.id))?.strength).toBe("500 mg");
});
it("requires explicit review of the exact saved identity and notes before readiness", async () => {
  const repository = memoryRepository();
  const saved = await createMedicine(input, "operator-one", repository);
  const expected = { genericName: input.genericName, strength: input.strength, dosageForm: input.dosageForm, recordKind: input.recordKind };
  await expect(reviewMedicine(saved.id, { labelReviewed: false, languagesReviewed: true, expected }, "operator-one", repository)).rejects.toMatchObject({ code: "INVALID_INPUT" });
  await expect(reviewMedicine(saved.id, { labelReviewed: true, languagesReviewed: true, expected: { ...expected, strength: "1000 mg" } }, "operator-one", repository)).rejects.toMatchObject({ code: "CONFLICT" });
  const reviewed = await reviewMedicine(saved.id, { labelReviewed: true, languagesReviewed: true, expected }, "operator-one", repository);
  expect(reviewed.catalogStatus).toBe("DEMO_READY");
  expect(reviewed.id).toBe(saved.id);
  expect(reviewed).not.toHaveProperty("reviewedBy");
  await expect(reviewMedicine("unknown", { labelReviewed: true, languagesReviewed: true, expected }, "operator-one", repository)).rejects.toMatchObject({ code: "NOT_FOUND" });
});
