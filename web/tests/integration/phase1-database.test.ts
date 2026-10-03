import { randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import nextEnv from "@next/env";
import { getSql } from "@/lib/db";
import { generateToken } from "@/lib/domain";
import { createMedicine, reviewMedicine } from "@/lib/medicine-create";
import { listMedicines } from "@/lib/medicine-repository";
import { provisionRepository, resolveTag } from "@/lib/tag-repository";
import { findOperatorTag } from "@/lib/operator-tags";

// Explicit opt-in against the already authorized demo Neon database.
// Fixtures stay PENDING; this test never attests or performs physical readback.
describe.skipIf(process.env.MEDOT_RUN_PHASE1_DB_TESTS !== "1")("Phase 1 real database persistence", () => {
  const actor = "phase1-software-fixture", requests = new Set<string>(), tokens = new Set<string>();
  let originalMedicines: unknown[], originalTags: unknown[];
  beforeAll(async () => {
    nextEnv.loadEnvConfig(process.cwd());
    const sql = getSql();
    originalMedicines = await sql`SELECT * FROM medicines ORDER BY id`;
    originalTags = await sql`SELECT * FROM tags ORDER BY token`;
  });
  afterEach(async () => {
    const sql = getSql();
    for (const token of tokens) await sql`DELETE FROM tags WHERE token = ${token} AND status = 'PENDING' AND created_by = ${actor} AND batch_number = 'E1-SOFTWARE-FIXTURE'`;
    for (const id of requests) await sql`DELETE FROM medicines WHERE creation_request_id = ${id} AND created_by = ${actor} AND NOT EXISTS (SELECT 1 FROM tags WHERE medicine_id = medicines.id)`;
    tokens.clear(); requests.clear();
  });
  afterAll(async () => {
    const sql = getSql();
    expect(await sql`SELECT * FROM medicines ORDER BY id`).toEqual(originalMedicines);
    expect(await sql`SELECT * FROM tags ORDER BY token`).toEqual(originalTags);
  });
  function draft(strength = "500 mg") {
    const requestId = randomUUID(); requests.add(requestId);
    return { requestId, genericName: "E1 fictional software label", strength, dosageForm: "Tablet", recordKind: "FICTIONAL_DEMO", infoEn: "Software fixture only. No treatment instruction.", infoBn: "শুধুমাত্র সফটওয়্যার ডেমো।" };
  }
  function reviewBody(input: ReturnType<typeof draft>) {
    const { requestId: _requestId, ...expected } = input;
    void _requestId;
    return { labelReviewed: true, languagesReviewed: true, expected };
  }
  it("persists blocked data, preserves exact retry identity and refuses conflicting requests", async () => {
    const input = draft();
    const [first, second] = await Promise.all([createMedicine(input, actor), createMedicine(input, actor)]);
    expect(first.id).toBe(second.id);
    expect([first.created, second.created].sort()).toEqual([false, true]);
    expect(await provisionRepository.medicineExists(first.id)).toBe(false);
    const selected = (await listMedicines()).find(row => row.id === first.id);
    expect(selected).toMatchObject({ catalogStatus: "PACK_CHECK_REQUIRED", infoEn: input.infoEn, infoBn: input.infoBn });
    expect(selected).not.toHaveProperty("createdBy");
    await expect(createMedicine({ ...input, strength: "1000 mg" }, actor)).rejects.toMatchObject({ code: "CONFLICT" });
    await expect(createMedicine(input, "unrelated-software-actor")).rejects.toMatchObject({ code: "CONFLICT" });
  }, 30000);
  it("reviews only exact immutable values and recovers a pending strip with explicit timing", async () => {
    const input = draft(), saved = await createMedicine(input, actor);
    await expect(reviewMedicine(saved.id, { ...reviewBody(input), expected: { ...reviewBody(input).expected, strength: "1000 mg" } }, actor)).rejects.toMatchObject({ code: "CONFLICT" });
    const reviewed = await reviewMedicine(saved.id, reviewBody(input), actor);
    expect(reviewed.catalogStatus).toBe("DEMO_READY");
    expect(await provisionRepository.medicineExists(saved.id)).toBe(true);
    const token = generateToken(); tokens.add(token);
    await provisionRepository.insertPending({ token, medicineId: saved.id, batchNumber: "E1-SOFTWARE-FIXTURE", expiryMonth: "2028-12", instruction: "Software fixture only.", instructionBn: "শুধুমাত্র সফটওয়্যার ডেমো।", usageSlots: ["EVENING"], createdBy: actor, status: "PENDING" });
    expect(await resolveTag(token)).toEqual({ kind: "pending" });
    const recovered = await findOperatorTag(token, "https://medot.example");
    expect(recovered).toMatchObject({ medicineId: saved.id, usageSlots: ["EVENING"], infoEn: input.infoEn, infoBn: input.infoBn, recordKind: "FICTIONAL_DEMO", activationReady: true });
    expect(recovered?.verifiedAt).toBeUndefined();
    const sql = getSql();
    expect(await sql`SELECT verified_at, verification_version FROM tags WHERE token = ${token}`).toEqual([{ verified_at: null, verification_version: null }]);
  }, 30000);
  it("allows a new same-name identity without changing the earlier medicine row", async () => {
    const one = await createMedicine(draft(), actor), two = await createMedicine(draft("1000 mg"), actor);
    expect(one.id).not.toBe(two.id);
    const rows = await listMedicines();
    expect(rows.find(row => row.id === one.id)?.strength).toBe("500 mg");
    expect(rows.find(row => row.id === two.id)?.strength).toBe("1000 mg");
  }, 30000);
});
