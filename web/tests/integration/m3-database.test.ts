import { afterEach, beforeAll, describe, expect, it } from "vitest";
import nextEnv from "@next/env";
import { getSql } from "@/lib/db";
import { generateToken } from "@/lib/domain";
import { createPendingTag } from "@/lib/provision";
import { lifecycleRepository, provisionRepository, resolveTag } from "@/lib/tag-repository";
import { findOperatorTag, getOperatorCounts } from "@/lib/operator-tags";
import { medicineCatalog } from "@/lib/medicine-catalog";

// Opt in against the authorized demo database only. Never run on each test/build.
describe.skipIf(process.env.MEDOT_RUN_DB_TESTS !== "1")("M3 real Neon persistence", () => {
  const created = new Set<string>();
  const input = { medicineId: "paracetamol-500", batchNumber: "M3-SOFTWARE-CHECK", expiryMonth: "2028-12",
    instruction: "Software demo only. Not a treatment instruction.",
    instructionBn: "শুধুমাত্র সফটওয়্যার ডেমো। চিকিৎসার নির্দেশনা নয়।",
    instructionHi: "केवल सॉफ़्टवेयर डेमो। उपचार का निर्देश नहीं।" };
  beforeAll(() => { nextEnv.loadEnvConfig(process.cwd()); });
  afterEach(async () => {
    const sql = getSql();
    for (const token of created) await sql`DELETE FROM tags WHERE token = ${token} AND status = 'PENDING' AND batch_number = 'M3-SOFTWARE-CHECK'`;
    created.clear();
  });

  it("has 17 labels and rejects all eight unverified packs through the real repository", async () => {
    for (const medicine of medicineCatalog) {
      expect(await provisionRepository.medicineExists(medicine.id)).toBe(medicine.catalogStatus === "DEMO_READY");
    }
    const sql = getSql();
    const [{ count }] = await sql`SELECT count(*)::int AS count FROM medicines`;
    expect(count).toBe(17);
  }, 30000);

  it("persists exact multilingual text/creator on a pending fixture and keeps it nonpublic", async () => {
    // Reserve the generated ID before insertion so cleanup also covers a failed assertion.
    const token = generateToken();
    created.add(token);
    await provisionRepository.insertPending({ ...input, token, status: "PENDING", createdBy: "m3-integration-only" });
    expect(await resolveTag(token)).toEqual({ kind: "pending" });
    const stored = await findOperatorTag(token, "https://medot.example");
    expect(stored).toMatchObject({ instruction: input.instruction, instructionBn: input.instructionBn, instructionHi: input.instructionHi,
      batchNumber: input.batchNumber, expiryMonth: input.expiryMonth, token, createdBy: "m3-integration-only", status: "PENDING", url: "https://medot.example/m/" + token });
    const sql = getSql();
    const [row] = await sql`SELECT instruction_bn, instruction_hi, created_by FROM tags WHERE token = ${token}`;
    expect(row).toEqual({ instruction_bn: input.instructionBn, instruction_hi: input.instructionHi, created_by: "m3-integration-only" });
  }, 30000);

  it("rechecks pack readiness atomically at insertion and refuses blocked IDs", async () => {
    const token = generateToken();
    created.add(token);
    await expect(provisionRepository.insertPending({ ...input, medicineId: "rabijoi-dsr", token, status: "PENDING" }))
      .rejects.toMatchObject({ code: "UNKNOWN_MEDICINE" });
    await expect(createPendingTag({ ...input, medicineId: "rabijoi-dsr" }, provisionRepository, "https://medot.example"))
      .rejects.toMatchObject({ code: "UNKNOWN_MEDICINE" });
    const sql = getSql();
    expect(await sql`SELECT token FROM tags WHERE token = ${token}`).toHaveLength(0);
  }, 30000);

  it("creates a new pending record with Bengali and no Hindi through the domain service", async () => {
    const repository = { ...provisionRepository, insertPending: async (record: Parameters<typeof provisionRepository.insertPending>[0]) => {
      created.add(record.token);
      await provisionRepository.insertPending(record);
    } };
    const result = await createPendingTag({ ...input, instructionHi: undefined }, repository, "https://medot.example", "m3-integration-only");
    const sql = getSql();
    const [row] = await sql`SELECT instruction_bn, instruction_hi, created_by, status FROM tags WHERE token = ${result.token}`;
    expect(row).toEqual({ instruction_bn: input.instructionBn, instruction_hi: null, created_by: "m3-integration-only", status: "PENDING" });
    expect(result.url).toBe("https://medot.example/m/" + result.token);
  }, 30000);

  it("cannot activate a legacy pending record without Bengali", async () => {
    const sql = getSql();
    const token = generateToken();
    created.add(token);
    await sql`INSERT INTO tags (token, medicine_id, batch_number, expiry_month, instruction, status)
      VALUES (${token}, 'paracetamol-500', 'M3-SOFTWARE-CHECK', '2028-12', 'Software fixture only.', 'PENDING')`;
    expect(await lifecycleRepository.setActiveIfPending(token)).toBe(false);
    expect(await resolveTag(token)).toEqual({ kind: "pending" });
  }, 30000);

  it("has persistent audio/budget tables ready for M4 without generating speech", async () => {
    const sql = getSql();
    expect(await sql`SELECT token, language, content_hash, audio_base64, created_at FROM tag_audio LIMIT 0`).toEqual([]);
    expect(await sql`SELECT day, generation_count FROM speech_budget LIMIT 0`).toEqual([]);
  }, 30000);

  it("shows real totals and recovers a saved pending record without activating it", async () => {
    const before = await getOperatorCounts();
    const token = generateToken(); created.add(token);
    await provisionRepository.insertPending({ ...input, token, status: "PENDING", createdBy: "m3-integration-only" });
    expect(await getOperatorCounts()).toEqual({ ...before, pending: before.pending + 1 });
    const recovered = await findOperatorTag(token, "https://medot.example");
    expect(recovered).toMatchObject({ status: "PENDING", url: "https://medot.example/m/" + token, activationReady: true });
  }, 30000);
});
